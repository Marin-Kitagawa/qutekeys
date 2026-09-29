module.exports = {
  testEnvironment: 'jsdom',
  // Allow e2e tests up to 60 s to launch a browser (they skip gracefully
  // when no browser is available, so this limit is only hit on slow CI).
  testTimeout: 60000,
  // Puppeteer ships some ESM files — let babel transpile the whole puppeteer
  // chain so `require()` works under Jest's CJS runtime (needed for the
  // real-browser e2e suites). Everything else in node_modules stays ignored.
  transformIgnorePatterns: [
    'node_modules/(?!(puppeteer|puppeteer-core|@puppeteer|chromium-bidi|devtools-protocol|ws)/)',
  ],
};
