
export default {
  packageManager: 'npm',
  testRunner: 'jest',

  mutate: [
    'src/services/**/*.js',
    '!src/server.js'
  ],

  reporters: [
    'html',
    'clear-text',
    'progress'
  ],

  coverageAnalysis: 'perTest',

  thresholds: {
    high: 90,
    low: 80,
    break: 80
  },

  timeoutMS: 10000,

  jest: {
    projectType: 'custom',
    config: {
      testEnvironment: 'node',
      testMatch: ['**/tests/**/*.test.js']
    }
  }
};