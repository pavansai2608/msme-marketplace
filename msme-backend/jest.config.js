module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  testTimeout: 30000,
  // lcov for humans, cobertura for the Jenkins coverage plugin, text-summary
  // so a failing build shows the number in the console log.
  coverageReporters: ['text-summary', 'lcov', 'cobertura'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
    'routes/**/*.js',
    'app.js',
  ],
  // Each suite gets its own in-memory mongod; serial keeps that predictable.
  maxWorkers: 1,
}
