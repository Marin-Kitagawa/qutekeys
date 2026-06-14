// Verify tab-next / tab-prev switch the active tab in a real browser.
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(__dirname, '../dist/chrome');
const log = (...a) => console.log('[tabs]', ...a);

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<!DOCTYPE html><title>tab${req.url}</title><body><h1>tab ${req.url}</h1></body>`);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const browser = await puppeteer.launch({
  headless: 'new',
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

// Open three tabs.
const pages = [];
for (let i = 0; i < 3; i++) {
  const p = i === 0 ? (await browser.pages())[0] : await browser.newPage();
  await p.goto(`http://127.0.0.1:${PORT}/${i}`, { waitUntil: 'domcontentloaded' });
  pages.push(p);
}
await new Promise((r) => setTimeout(r, 700));

async function activeIndex() {
  for (let i = 0; i < pages.length; i++) {
    const vis = await pages[i].evaluate(() => document.visibilityState);
    if (vis === 'visible') return i;
  }
  return -1;
}
async function pressShift(page, code) {
  await page.bringToFront();
  await page.keyboard.down('Shift');
  await page.keyboard.press(code);
  await page.keyboard.up('Shift');
  await new Promise((r) => setTimeout(r, 300));
}

await pages[0].bringToFront();
await new Promise((r) => setTimeout(r, 200));
log('initial active tab index:', await activeIndex(), '(expect 0)');

await pressShift(pages[await activeIndex()], 'KeyJ'); // tab-next → 1
log('after J (tab-next):', await activeIndex(), '(expect 1)');

await pressShift(pages[await activeIndex()], 'KeyJ'); // tab-next → 2
log('after J (tab-next):', await activeIndex(), '(expect 2)');

await pressShift(pages[await activeIndex()], 'KeyK'); // tab-prev → 1
log('after K (tab-prev):', await activeIndex(), '(expect 1)');

await pressShift(pages[await activeIndex()], 'KeyK'); // tab-prev → 0
await pressShift(pages[await activeIndex()], 'KeyK'); // tab-prev wraps → 2
log('after K,K (tab-prev, wrap):', await activeIndex(), '(expect 2)');

await browser.close();
server.close();
log('done');
