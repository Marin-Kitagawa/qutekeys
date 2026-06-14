// Reproduce the caret/hints mode bugs with concrete measurements.
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(__dirname, '../dist/chrome');
const log = (...a) => console.log('[repro]', ...a);

// Tall page so scrolling is measurable; one link near top.
const HTML = `<!DOCTYPE html><html><head><title>repro</title></head><body>
<p id="top">Top. Some <a id="lnk" href="http://127.0.0.1:PORT/target">selectable link text here</a> to test.</p>
<div style="height:3000px"></div><p>bottom</p></body></html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(HTML.replace('PORT', String(server.address().port)));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const URL = `http://127.0.0.1:${PORT}/`;

const browser = await puppeteer.launch({
  headless: 'new',
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e.message)));
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 700));

const measure = () => page.evaluate(() => ({
  scrollY: window.scrollY,
  href: location.href,
  selection: (window.getSelection && window.getSelection().toString()) || '',
}));

await page.bringToFront();
await page.mouse.click(10, 10);

// --- CARET MODE TEST ---
log('before v:', await measure());
await page.keyboard.press('v');               // enter caret-mode
await new Promise((r) => setTimeout(r, 150));
await page.keyboard.press('j');               // in caret mode, j must NOT scroll
await new Promise((r) => setTimeout(r, 120));
log('after v + j (caret): scrollY should stay 0 →', (await measure()).scrollY);
for (let i = 0; i < 5; i++) { await page.keyboard.press('l'); await new Promise((r)=>setTimeout(r,40)); } // move/select right
await new Promise((r) => setTimeout(r, 150));
const afterMotion = await measure();
log('after v + 5×l:', afterMotion, '→ EXPECT selection text non-empty OR caret moved, scrollY unchanged');
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 150));
log('after Escape: pressing j should scroll only if back in normal');
const beforeJ = (await measure()).scrollY;
await page.keyboard.press('j');
await new Promise((r) => setTimeout(r, 150));
const afterJ = (await measure()).scrollY;
log(`escape worked? j after escape changed scrollY: ${beforeJ} -> ${afterJ} (normal mode → should scroll)`);

// reset scroll
await page.evaluate(() => window.scrollTo(0, 0));

// --- HINTS TEST ---
await page.keyboard.press('f');               // enter hints
await new Promise((r) => setTimeout(r, 250));
// read the label assigned to #lnk is not directly knowable (closed shadow);
// type the first label char-by-char by trying the charset until href changes.
const before = await measure();
// The first single-char label is the first hintchar (default 'A'); type 'a'.
await page.keyboard.press('a');
await new Promise((r) => setTimeout(r, 300));
const afterHint = await measure();
log('hints: before', before.href, 'after typing label "a":', afterHint.href, afterHint.scrollY,
    '→ EXPECT href = /target if hint followed; scrollY unchanged');

log('pageerrors:', errs.length ? errs : 'none');
await browser.close();
server.close();
log('done');
