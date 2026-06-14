// Verify glass themes render and switching via storage works.
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(__dirname, '../dist/chrome');
const OUT = path.resolve(__dirname, '../dist');
const log = (...a) => console.log('[themes]', ...a);

const HTML = `<!DOCTYPE html><html><head><title>theme test</title>
<style>body{font:16px sans-serif;margin:0;padding:40px;background:linear-gradient(135deg,#1a3a5a,#3a1a4a)}
h1{color:#fff}a{color:#9cf;display:inline-block;margin:8px}</style></head>
<body><h1>Theme test page</h1>
<p style="color:#dde"><a href="/a">alpha link</a> <a href="/b">beta link</a> <a href="/c">gamma</a></p>
<div style="height:1500px"></div></body></html>`;
const server = http.createServer((q, r) => { r.writeHead(200, {'Content-Type':'text/html'}); r.end(HTML); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PAGE_URL = `http://127.0.0.1:${server.address().port}/`;

const browser = await puppeteer.launch({ headless: 'new', args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
await new Promise((r) => setTimeout(r, 800));

// Find extension id from the service worker target.
const sw = browser.targets().find((t) => t.type() === 'service_worker' && /background\.js/.test(t.url() || ''));
const extId = sw ? new URL(sw.url()).host : null;
log('extension id:', extId);

async function omnibarShot(name) {
  const p = await browser.newPage();
  await p.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 700));
  await p.bringToFront();
  await p.mouse.click(400, 300);
  await p.keyboard.down('Shift'); await p.keyboard.press('Semicolon'); await p.keyboard.up('Shift'); // ':'
  await new Promise((r) => setTimeout(r, 350));
  await p.screenshot({ path: path.join(OUT, name) });
  const err = await p.evaluate(() => !!document.getElementById('qutesurf-host'));
  log(`${name}: host present=${err}`);
  return p;
}

// 1) default (aurora)
await omnibarShot('theme-aurora.png');

// 2) switch theme to amber by writing config in an extension page context
if (extId) {
  const opt = await browser.newPage();
  await opt.goto(`chrome-extension://${extId}/pages/options.html`, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 400));
  await opt.screenshot({ path: path.join(OUT, 'theme-options.png') });
  // Write theme=amber into the same config key the extension uses.
  const wrote = await opt.evaluate(async () => {
    const KEY = 'qutesurf:config';
    const cur = (await chrome.storage.local.get(KEY))[KEY] || {};
    cur.options = cur.options || {};
    cur.options.theme = 'amber';
    await chrome.storage.local.set({ [KEY]: cur });
    return cur.options.theme;
  });
  log('wrote theme via options ctx:', wrote);
  await new Promise((r) => setTimeout(r, 300));
  // 3) new content tab should now render amber
  await omnibarShot('theme-amber.png');
} else {
  log('no extension id — skipped switch test');
}

await browser.close(); server.close(); log('done');
