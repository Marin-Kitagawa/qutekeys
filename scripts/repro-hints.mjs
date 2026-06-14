// Verify hint labels sit ON their targets, even when the page is scrolled.
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(__dirname, '../dist/chrome');
const log = (...a) => console.log('[hints]', ...a);

const HTML = `<!DOCTYPE html><html><head><title>hints</title>
<style>body{font:16px sans-serif;margin:0;padding:0}a{display:block;margin:40px;padding:8px;background:#eef}</style></head>
<body><div style="height:800px;background:#fafafa">spacer (scroll past me)</div>
<a id="L1" href="/a">Link one</a><a id="L2" href="/b">Link two</a>
<div style="height:400px"></div><a id="L3" href="/c">Link three</a>
<div style="height:1200px"></div></body></html>`;

const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(HTML); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL = `http://127.0.0.1:${server.address().port}/`;

const browser = await puppeteer.launch({ headless: 'new', args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 700 });
const errs = []; page.on('pageerror', (e) => errs.push(String(e.message)));
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 500));

// Scroll down so links are mid-viewport — this is the condition that broke positioning.
await page.evaluate(() => window.scrollTo(0, 700));
await new Promise((r) => setTimeout(r, 200));

// Report each visible link's viewport rect (where a correct label must sit).
const linkRects = await page.evaluate(() => ['L1', 'L2', 'L3'].map((id) => {
  const r = document.getElementById(id).getBoundingClientRect();
  return { id, left: Math.round(r.left), top: Math.round(r.top), visible: r.top >= 0 && r.top < innerHeight };
}));
log('link viewport rects after scroll:', JSON.stringify(linkRects));

await page.bringToFront();
await page.mouse.click(500, 350);
await page.keyboard.press('f');
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: path.resolve(__dirname, '../dist/shot-hints-scrolled.png') });
log('screenshot 1 (hints shown at scroll 700) written');

// THE FAILING SCENARIO: wheel-scroll AFTER hints are shown. Labels must follow.
await page.evaluate(() => window.scrollBy(0, -250)); // scroll up 250px while hints visible
await new Promise((r) => setTimeout(r, 300));
const after = await page.evaluate(() => ['L1', 'L2', 'L3'].map((id) => {
  const r = document.getElementById(id).getBoundingClientRect();
  return { id, top: Math.round(r.top), visible: r.top >= 0 && r.top < innerHeight };
}));
log('link rects after scrolling UP 250 while hints up:', JSON.stringify(after));
await page.screenshot({ path: path.resolve(__dirname, '../dist/shot-hints-after-scroll.png') });
log('screenshot 2 (after scroll-up while hints up) written; pageerrors:', errs.length ? errs : 'none');

await browser.close(); server.close(); log('done');
