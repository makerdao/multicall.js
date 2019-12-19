module.exports = {
  verbose: true,
  bail: true,
  rootDir: './',
  roots: ['src', 'tests'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupJest.js'],
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)']
};
