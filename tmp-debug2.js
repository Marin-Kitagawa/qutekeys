const http = require('http');
const puppeteer = require('puppeteer');
const path = require('path');
const EXT_PATH = path.resolve(__dirname, 'dist/chrome');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const server = http.createServer((req, res) => {
    const routes = {
      '/': '<html><body><a href="/dest">link</a></body></html>',
      '/tall': '<html><body style="height:3000px"><p>top</p><p id="bottom">bottom</p></body></html>',
      '/article': '<html><body><div><p>ignore me</p></div><article><h1>Title</h1><p>Article body paragraph with content.</p></article></body></html>',
    };
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(routes[req.url] || '404');
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
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) console.log('[nav]', f.url()); });

  // â”€â”€ feedkeys flow â”€â”€
  await page.goto(baseUrl + '/tall', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#qutesurf-host', { timeout: 5000 }).catch(() => {});
  await wait(300);
  await page.keyboard.press('G');
  await wait(300);
  console.log('scrollY after G:', await page.evaluate(() => window.scrollY));
  await page.keyboard.type(':');
  await wait(250);
  await page.keyboard.type('feedkeys gg');
  await wait(250);
  await page.keyboard.press('Enter');
  await wait(800);
  console.log('after feedkeys scrollY:', await page.evaluate(() => window.scrollY).catch((e) => 'ERR ' + e.message.split('\n')[0]));
  console.log('url now:', page.url());

  // â”€â”€ reader-view flow â”€â”€
  await page.goto(baseUrl + '/article', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#qutesurf-host', { timeout: 5000 }).catch(() => {});
  await wait(300);
  await page.keyboard.type(':');
  await wait(250);
  await page.keyboard.type('reader-view');
  await wait(250);
  await page.keyboard.press('Enter');
  await wait(1200);
  const pages = await browser.pages();
  const preview = pages.find((p) => p.url().includes('markdown.html'));
  console.log('preview found:', !!preview, preview && preview.url().slice(0, 80));
  if (preview) {
    preview.on('pageerror', (e) => console.log('[preview pageerror]', e.message));
    preview.on('console', (m) => console.log('[preview console]', m.text()));
    await wait(500);
    const info = await preview.evaluate(async () => { const stored = await new Promise(r => chrome.storage.local.get('qutesurf:preview', r)); return { stored: stored && stored['qutesurf:preview'] ? stored['qutesurf:preview'].slice(0, 60) : String(stored && stored['qutesurf:preview']), scripts: Array.from(document.scripts).map(s => s.src || 'inline') }; const 
      
      
      
      
    }).catch((e) => 'ERR ' + e.message.split('\n')[0]);
    console.log('preview info:', info);
  }

  await browser.close();
  await new Promise((r) => server.close(r));
  process.exit(0);
})();
