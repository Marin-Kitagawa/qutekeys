// Live driver: load the unpacked extension in Chromium and exercise it.
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(__dirname, '../dist/chrome');
const SHOT = path.resolve(__dirname, '../dist');

const log = (...a) => console.log('[drive]', ...a);

const PAGE_HTML = `<!DOCTYPE html><html><head><title>QuteSurf Demo</title>
<style>body{font:16px sans-serif;padding:30px;background:#0d1117;color:#c9d1d9}a{color:#58a6ff}</style></head>
<body><h1>QuteSurf live test</h1>
<p>The <a href="https://example.com/report">quarterly report</a> showed growth across
<a href="https://example.com/markets">regional markets</a>. Analysts
<a href="https://example.com/expect">expect</a> the trend.</p>
<input placeholder="a text field"><button>A button</button>
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
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 700)); // let content script init

const hostPresent = await page.evaluate(() => !!document.getElementById('qutesurf-host'));
log('shadow host #qutesurf-host present:', hostPresent);

// helper: count nodes inside the closed shadow root is impossible from page,
// so check the host + use the content script's own observable effects.
async function shadowHas(selectorText) {
  return page.evaluate((sel) => {
    const host = document.getElementById('qutesurf-host');
    if (!host) return false;
    // closed shadow root isn't accessible via host.shadowRoot; instead the
    // content script may expose a hook. Fall back to scanning for our text.
    return document.documentElement.innerHTML.includes(sel) || false;
  }, selectorText);
}

// Drive: focus body, press ':' to open the command palette.
await page.bringToFront();
await page.mouse.click(200, 200); // focus the page
await page.keyboard.down('Shift'); await page.keyboard.press('Semicolon'); await page.keyboard.up('Shift');
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: path.join(SHOT, 'shot-cmdline.png') });
log('typed ":" — screenshot shot-cmdline.png');

// Press Escape, then 'f' to trigger hints.
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 150));
await page.keyboard.press('f');
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: path.join(SHOT, 'shot-hints.png') });
log('typed "f" — screenshot shot-hints.png');

log('console errors:', consoleErrors.length ? consoleErrors : 'none');

// Inspect the service worker / extension targets.
const targets = browser.targets().map((t) => `${t.type()}:${(t.url() || '').slice(0, 60)}`);
log('targets:', targets.filter((t) => t.includes('extension') || t.includes('worker')));

await browser.close();
server.close();
log('done');
