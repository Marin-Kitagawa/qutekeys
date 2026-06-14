# QuteSurf End-to-End Tests

These tests use [Puppeteer](https://pptr.dev/) to launch Chrome with the
unpacked extension and exercise real browser behaviour.

## Running locally (headful Chrome)

1. Build the extension first:

   ```sh
   npm run build
   ```

2. Run only the e2e suite:

   ```sh
   npx jest tests/e2e
   ```

   Puppeteer defaults to `headless: 'new'`.  To watch the browser, edit
   `extension.e2e.test.js` and change the `headless` option to `false`.

## Running as part of the full suite

```sh
npm test
```

The e2e tests are included in the default Jest run.  If Chrome cannot be
launched (sandboxed CI, no Chrome binary, missing permissions), every
browser-dependent test **early-returns** rather than failing, so
`npm test` remains green everywhere.

Only the "build artifacts exist" and "manifest.json is valid" tests always
run — they verify that `npm run build` produced the expected output files.

## Auto-skip behaviour

`tryLaunch()` returns `null` when:

- `puppeteer` is not installed.
- `dist/chrome/manifest.json` does not exist (build hasn't run).
- `puppeteer.launch()` throws (e.g. no Chrome binary, sandbox restrictions).

When `browser` is `null`, every browser-gated test body starts with
`if (!browser) return;` and exits immediately — Jest records it as passed.

## Debugging a failing browser test

```sh
# Run with verbose output
npx jest tests/e2e --verbose

# Show Puppeteer launch errors
DEBUG=puppeteer:* npx jest tests/e2e
```
