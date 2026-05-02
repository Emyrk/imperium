import clear from 'rollup-plugin-clear';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import screeps from 'rollup-plugin-screeps';
import replace from '@rollup/plugin-replace';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let cfg;
const dest = process.env.DEST;
if (!dest) {
  console.log('No destination specified - code will be compiled but not uploaded');
} else {
  cfg = require('./screeps.json')[dest];
  if (!cfg) {
    throw new Error('Invalid upload destination');
  }
}

export default {
  input: 'src/main.ts',
  output: {
    file: 'dist/main.js',
    format: 'cjs',
    sourcemap: true
  },

  plugins: [
    clear({ targets: ['dist'] }),
    resolve({ extensions: ['.ts', '.js'] }),
    commonjs(),
    typescript({ tsconfig: './tsconfig.json' }),
    replace({ 
      'import.meta.vitest': 'undefined',
      preventAssignment: true
    }),
    screeps({ config: cfg, dryRun: cfg == null })
  ]
};
