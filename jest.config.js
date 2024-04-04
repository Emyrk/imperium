// Look into https://github.com/gatsbyjs/gatsby/issues/28027
module.exports = {
  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    'src/**/*.{js,ts}'
  ],

  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: [
    '/dist/',
    '\\.d\\.ts$',
    'src/utils/ErrorMapper.ts'
  ],

  // An array of directory names to be searched recursively up from the requiring module's location
  moduleDirectories: [
    'node_modules',
    'src'
  ],

  setupFiles: [
    "<rootDir>/src/test-utils/helpers.ts"
  ],

  setupFilesAfterEnv: [
    "<rootDir>/src/test-utils/setupTests.ts"
  ],

  // A preset that is used as a base for Jest's configuration
  preset: 'ts-jest',

  // The test environment that will be used for testing
  testEnvironment: '<rootDir>/src/test-utils/TestEnvironment.ts',

  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/*.spec.ts',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
};
