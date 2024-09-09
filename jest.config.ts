import type { JestConfigWithTsJest } from 'ts-jest'

const jestConfig: JestConfigWithTsJest = {
  roots: ['./src'],
  verbose: true,
  clearMocks: true,
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'ts'],
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  coverageReporters: ['json-summary', 'text', 'lcov'],
  collectCoverage: true,
  collectCoverageFrom: ['./src/**'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  extensionsToTreatAsEsm: ['.ts'],
  transform: {},
  preset: 'ts-jest/presets/default-esm'
}

export default jestConfig
