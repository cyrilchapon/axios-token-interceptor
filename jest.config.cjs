/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: "node",
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  coverageDirectory: './coverage/',
  collectCoverage: true,

  // Support ESM
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '<regex_match_files': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
}
