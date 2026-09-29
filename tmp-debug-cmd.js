const http = require('http');
const puppeteer = require('puppeteer');
const path = require('path');
const EXT_PATH = path.resolve(__dirname, 'dist/chrome');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body><a href="/dest">link</a></body></html>');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`, '--no-sandbox'],
  });
  const page = await browser.newPage();
  page.on('console', (m) => console.log('[page-console]', m.text()));
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  await page.goto(baseUrl + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#qutesurf-host', { timeout: 5000 }).catch(() => {});
  await wait(300);

  const pages0 = await browser.pages();
  console.log('pages before:', pages0.map((p) => p.url().slice(0, 60)));

  await page.keyboard.type(':');
  await wait(300);
  await page.keyboard.type('tab-new');
  await wait(300);
  await page.keyboard.press('Enter');
  await wait(900);
  const pages1 = await browser.pages();
  console.log('pages after:', pages1.map((p) => p.url().slice(0, 60)));

  await browser.close();
  await new Promise((r) => server.close(r));
  process.exit(0);
})();
