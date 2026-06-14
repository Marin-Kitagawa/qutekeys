// Live driver: Wave-2 hint mode verification
// Tests: af (hint-newtab-fg), yi (hint-yank-input), q (hint-click-media),
//        ;b (hint-newtab-bg), yq (hint-yank-pre), table column hints
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(__dirname, '../dist/chrome');
const SHOT = path.resolve(__dirname, '../dist');

const log = (...a) => console.log('[wave2]', ...a);

const PAGE_HTML = `<!DOCTYPE html><html><head><title>Wave-2 Test</title>
<style>
  body{font:16px sans-serif;padding:30px;background:#0d1117;color:#c9d1d9}
  a{color:#58a6ff;display:inline-block;margin:4px 0}
  img{width:60px;height:60px;background:#333;display:inline-block}
  pre{background:#111;color:#0f0;padding:10px;border-radius:4px}
  table{border-collapse:collapse;margin:16px 0}
  td,th{border:1px solid #444;padding:6px 12px}
</style></head>
<body>
  <h1>Wave-2 Hints Test Page</h1>

  <h2>Links</h2>
  <a href="https://example.com/alpha">Alpha Link</a>
  <a href="https://example.com/beta">Beta Link</a>
  <a href="https://example.com/gamma">Gamma Link</a>

  <h2>Image</h2>
  <img src="data:image/png;base64,iVBORw0KGgo=" alt="test img" id="testimg">

  <h2>Inputs</h2>
  <input id="inp1" placeholder="First input" value="hello world">
  <textarea id="inp2">textarea content</textarea>
  <select id="inp3"><option>Option A</option><option>Option B</option></select>

  <h2>Pre block</h2>
  <pre id="pre1">const x = 42; // some code</pre>

  <h2>Table</h2>
  <table id="t1">
    <tr><th>Name</th><th>Score</th><th>Team</th></tr>
    <tr><td>Alice</td><td>90</td><td>Red</td></tr>
    <tr><td>Bob</td><td>85</td><td>Blue</td></tr>
    <tr><td>Carol</td><td>92</td><td>Red</td></tr>
  </table>

  <h2>URL-like text (for detect-links)</h2>
  <p id="urltext">https://example.com/detected</p>

  <button id="btn1">Click Me</button>
</body></html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(PAGE_HTML);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const URL = `http://127.0.0.1:${PORT}/`;
log('serving test page at', URL);

const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    `--disable-extensions-except=${EXT}`,
    `--load-extension=${EXT}`,
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
  ],
});
log('launched chromium');

const page = await browser.newPage();
const consoleErrors = [];
const consoleAll = [];
page.on('console', (m) => {
  consoleAll.push(`[${m.type()}] ${m.text()}`);
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 800));

const hostPresent = await page.evaluate(() => !!document.getElementById('qutesurf-host'));
log('shadow host present:', hostPresent);

// Helper: send key sequence to page
async function sendKeys(keys) {
  for (const key of keys) {
    if (key.startsWith('<') && key.endsWith('>')) {
      const inner = key.slice(1, -1);
      await page.keyboard.press(inner);
    } else {
      await page.keyboard.type(key);
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

// Helper: bring page to front + click to ensure focus
async function resetFocus() {
  await page.bringToFront();
  await page.mouse.click(200, 100);
  await new Promise((r) => setTimeout(r, 200));
}

// ── Test 1: hint-input-first (gi) ────────────────────────────────────────────
await resetFocus();
log('\n--- Test 1: gi → hint-input-first ---');
await sendKeys(['g', 'i']);
await new Promise((r) => setTimeout(r, 300));
const firstInputFocused = await page.evaluate(() =>
  document.activeElement && document.activeElement.id === 'inp1'
);
log('hint-input-first focused first input:', firstInputFocused);
await page.screenshot({ path: path.join(SHOT, 'wave2-gi.png') });

// ── Test 2: hint labels render (f key) ───────────────────────────────────────
await resetFocus();
log('\n--- Test 2: f → hint labels render ---');
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 100));
await sendKeys(['f']);
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: path.join(SHOT, 'wave2-hints-f.png') });
log('f hint session started — screenshot wave2-hints-f.png');
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 200));

// ── Test 3: yi → hint-yank-input ─────────────────────────────────────────────
await resetFocus();
log('\n--- Test 3: yi → hint-yank-input ---');
await sendKeys(['y', 'i']);
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: path.join(SHOT, 'wave2-yi-hints.png') });
log('yi hint session started — screenshot wave2-yi-hints.png');
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 200));

// ── Test 4: q → hint-click-media ─────────────────────────────────────────────
await resetFocus();
log('\n--- Test 4: q → hint-click-media ---');
await sendKeys(['q']);
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: path.join(SHOT, 'wave2-q-hints.png') });
log('q hint session started — screenshot wave2-q-hints.png');
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 200));

// ── Test 5: yq → hint-yank-pre ────────────────────────────────────────────────
await resetFocus();
log('\n--- Test 5: yq → hint-yank-pre ---');
await sendKeys(['y', 'q']);
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: path.join(SHOT, 'wave2-yq-hints.png') });
log('yq hint session started — screenshot wave2-yq-hints.png');
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 200));

// ── Test 6: yc → hint-yank-column ─────────────────────────────────────────────
await resetFocus();
log('\n--- Test 6: yc → hint-yank-column ---');
await sendKeys(['y', 'c']);
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: path.join(SHOT, 'wave2-yc-hints.png') });
log('yc hint session started — screenshot wave2-yc-hints.png');
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 200));

// ── Test 7: af → hint-newtab-fg ───────────────────────────────────────────────
await resetFocus();
log('\n--- Test 7: af → hint-newtab-fg ---');
await sendKeys(['a', 'f']);
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: path.join(SHOT, 'wave2-af-hints.png') });
log('af hint session (newtab-fg) started — screenshot wave2-af-hints.png');
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 200));

// ── Test 8: ;b → hint-newtab-bg ───────────────────────────────────────────────
await resetFocus();
log('\n--- Test 8: ;b → hint-newtab-bg ---');
await sendKeys([';', 'b']);
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: path.join(SHOT, 'wave2-sb-hints.png') });
log(';b hint session (newtab-bg) started — screenshot wave2-sb-hints.png');
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 200));

// ── Summary ────────────────────────────────────────────────────────────────────
log('\n=== Summary ===');
log('Console errors:', consoleErrors.length ? consoleErrors : 'none');
log('Shadow host present:', hostPresent);
log('hint-input-first (gi) focused first input:', firstInputFocused);

const targets = browser.targets().map((t) => `${t.type()}:${(t.url() || '').slice(0, 60)}`);
log('Extension targets:', targets.filter((t) => t.includes('extension') || t.includes('worker')));

await browser.close();
server.close();
log('done');
