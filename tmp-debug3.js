const http = require('http');
const puppeteer = require('puppeteer');
const path = require('path');
const EXT_PATH = path.resolve(__dirname, 'dist/chrome');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body><div><p>ignore me</p></div><article><h1>Title</h1><p>Article body paragraph with content.</p></article></body></html>');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`, '--no-sandbox'],
  });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  await page.goto(baseUrl + '/article', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#qutesurf-host', { timeout: 5000 }).catch(() => {});
  await wait(300);
  await page.keyboard.type(':');
  await wait(250);
  await page.keyboard.type('reader-view');
  await wait(250);
  await page.keyboard.press('Enter');
  await wait(1500);
  const pages = await browser.pages();
  const preview = pages.find((p) => p.url().includes('markdown.html'));
  console.log('preview found:', !!preview);
  if (preview) {
    const info = await preview.evaluate(async () => {
      const stored = await new Promise((r) => chrome.storage.local.get('qutesurf:preview', (v) => r(v)));
      return {
        storedType: typeof (stored && stored['qutesurf:preview']),
        storedSnippet: stored && stored['qutesurf:preview'] ? stored['qutesurf:preview'].slice(0, 60) : '(none)',
        scripts: Array.from(document.scripts).map((s) => s.src.split('/').pop() || 'inline'),
        hasRenderer: typeof window.__qutesurfRenderMarkdown,
        contentLen: document.getElementById('content').textContent.length,
      };
    });
    console.log('preview info:', JSON.stringify(info, null, 2));
  }

  await browser.close();
  await new Promise((r) => server.close(r));
  process.exit(0);
})();
