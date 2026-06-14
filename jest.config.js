module.exports = {
  testEnvironment: 'jsdom',
  // Allow e2e tests up to 60 s to launch a browser (they skip gracefully
  // when no browser is available, so this limit is only hit on slow CI).
  testTimeout: 60000,
};
