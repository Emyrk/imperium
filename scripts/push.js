const fs = require("fs/promises")
const https = require("https")
const path = require("path")
const targets = require("../screeps.json")

// TOOD: Make this support libraries, then we can switch to it?

async function main() {
  const target = process.argv[2]
  if (!target) {
    throw new Error(`Please pass one of these targets: [${Object.keys(targets)}]`)
  } else if (!targets[target]) {
    throw new Error(`${target} does not exist in [${Object.keys(targets)}]`)
  }

  const modules = {}
  const distDir = path.resolve(__dirname, "../dist")
  const search = async (dir) => {
    const files = await fs.readdir(dir)
    for (const file of files) {
      const filePath = path.join(dir, file)
      const stat = await fs.stat(filePath)
      if (stat.isDirectory() && file !== "test") {
        await search(filePath)
      } else if (file.endsWith(".js")
                 && !file.endsWith(".test.js")
                 && !file.endsWith(".js.map")) {
        console.log("Adding", filePath)
        // Very haphazardly and incompletely replace imports and exports since
        // we cannot upload directories and I do not want to bundle.
        const sanitizedPath = path.relative(distDir, filePath)
              .replace("/", ".")
              .replace(".js", "")
        modules[sanitizedPath] = (await fs.readFile(filePath, "utf8"))
            .replace("export {", "module.exports = {")
            .replace("export default ", "module.exports = ")
            .replace(/export const (.+) =/g, "module.exports.$1 =")
            .replace(/export function (.+)\(/g, "module.exports.$1 = $1\nfunction $1(")
        const matches = modules[sanitizedPath].matchAll(/import (.+) from "(.+)"/g)
        for (const match of matches) {
          const importPath = path.resolve(dir, match[2])
          const sanitized = path.relative(distDir, importPath)
                .replace("/", ".")
          const asMatch = match[1].match(/{ (.+) as (.+) }/)
          const replaced = asMatch === null
                ? `const ${match[1]} = require("${sanitized}")`
                : `const ${asMatch[2]} = require("${sanitized}").${asMatch[1]}`
          modules[sanitizedPath] = modules[sanitizedPath]
            .replace(match[0], replaced)
        }
      }
    }
  }
  await search(distDir)

  // console.log(modules)
  // process.exit(0)

  console.log(`Pushing to ${targets[target].hostname}`)

  await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: targets[target].hostname,
      port: targets[target].port,
      path: path.posix.join(targets[target].path, "/api/user/code"),
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "X-Token": targets[target].token,
      },
    }, (res) => {
      console.log("Status code:", res.statusCode)
      const chunks = []
      let bufferLength = 0
      res.on("data", (chunk) => {
        bufferLength += chunk.length
        chunks.push(chunk)
      })
      res.on("error", reject)
      res.on("end", () => {
        console.log("Response:", Buffer.concat(chunks, bufferLength).toString())
        resolve()
      })
    })

    req.on("error", reject)
    req.on("timeout", () => reject(new Error("timeout")))

    req.write(JSON.stringify({
      branch: targets[target].branch,
      modules,
    }))

    req.end()
  })
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
