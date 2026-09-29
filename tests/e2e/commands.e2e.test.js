/**
 * @jest-environment node
 */
'use strict';

/**
 * Functional e2e verification — drives the real unpacked extension in
 * headless Chromium and checks that commands actually WORK (clipboard,
 * navigation, DOM effects), not just that the page stays alive.
 *
 * Uses a local HTTP server (content scripts do not run on data: URLs).
 * Clipboard assertions rely on clipboard permissions granted to the origin.
 */

const path = require('path');
const fs = require('fs');
const http = require('http');

const EXT_PATH = path.resolve(__dirname, '../../dist/chrome');

let puppeteer = null;
let puppeteerError = null;
try { puppeteer = require('puppeteer'); } catch (e) { puppeteerError = e; }

let browser = null;
let server = null;
let baseUrl = '';

beforeAll(async () => {
  if (!puppeteer || !fs.existsSync(path.join(EXT_PATH, 'manifest.json'))) return;

  // Minimal static server
  server = http.createServer((req, res) => {
    const routes = {
      '/': '<html><body><h1>Home</h1><a id="l1" href="/dest">the only link</a><p>filler text</p></body></html>',
      '/dest': '<html><body><h1>Destination</h1></body></html>',
      '/img': '<html><body><img id="pic" src="/pixel.png"></body></html>',
      '/pixel.png': null, // handled below
      '/find': '<html><body><p>the needle is here</p><p>another needle too</p></body></html>',
      '/article': '<html><body><div><p>ignore me</p></div><article><h1>Title</h1><p>Article body paragraph with content.</p></article></body></html>',
      '/tall': '<html><body style="height:3000px"><p>top</p><p id="bottom">bottom text</p></body></html>',
      '/input': '<html><body style="height:3000px"><input id="inp" type="text"><p>rest</p></body></html>',
    };
    if (req.url === '/pixel.png') {
      // 1x1 transparent PNG
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(png);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(routes[req.url] !== undefined ? routes[req.url] : '<html><body>404</body></html>');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        `--disable-extensions-except=${EXT_PATH}`,
        `--load-extension=${EXT_PATH}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });
    await browser.defaultBrowserContext().overridePermissions(baseUrl, [
      'clipboard-read',
      'clipboard-write',
      'clipboard-sanitized-write',
    ]);
  } catch (_) {
    browser = null;
  }
}, 30000);

afterAll(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((r) => server.close(r));
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Open a page, wait for the content script host to appear. */
async function open(urlPath) {
  const page = await browser.newPage();
  await page.goto(baseUrl + urlPath, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#qutesurf-host', { timeout: 5000 }).catch(() => {});
  await wait(250);
  // Make sure we're in normal mode with body focused
  await page.keyboard.press('Escape');
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await wait(80);
  return page;
}

const readClipboard = (page) => page.evaluate(() => navigator.clipboard.readText());
const scrollY = (page) => page.evaluate(() => window.scrollY);

describe('functional verification (real browser)', () => {
  test('environment can launch a browser', () => {
    if (puppeteerError) console.log('[e2e] puppeteer require failed:', puppeteerError.stack);
    if (!puppeteer) console.log('[e2e] puppeteer missing — functional tests skipped');
    expect(!!browser || !puppeteer).toBe(true);
  });

  // ── Hints ──────────────────────────────────────────────────────────────────

  test(';y yanks a link URL to the clipboard', async () => {
    if (!browser) return;
    const page = await open('/');
    await page.keyboard.press('Semicolon');
    await page.keyboard.press('y');
    await wait(200);
    await page.keyboard.press('a'); // single hint target → label 'a'
    await wait(250);
    expect(await readClipboard(page)).toBe(baseUrl + '/dest');
    await page.close();
  });

  test(';y yanks a bare image URL (the reported bug)', async () => {
    if (!browser) return;
    const page = await open('/img');
    await page.keyboard.press('Semicolon');
    await page.keyboard.press('y');
    await wait(200);
    await page.keyboard.press('a');
    await wait(250);
    expect(await readClipboard(page)).toBe(baseUrl + '/pixel.png');
    await page.close();
  });

  test('f follows the hinted link (navigates)', async () => {
    if (!browser) return;
    const page = await open('/');
    await page.keyboard.press('f');
    await wait(200);
    await page.keyboard.press('a');
    await wait(600);
    expect(page.url()).toBe(baseUrl + '/dest');
    await page.close();
  });

  // ── Find ──────────────────────────────────────────────────────────────────

  test('/ find highlights matches and wraps in <mark>', async () => {
    if (!browser) return;
    const page = await open('/find');
    await page.keyboard.press('Slash');
    await wait(150);
    await page.keyboard.type('needle');
    await page.keyboard.press('Enter');
    await wait(250);
    const marks = await page.evaluate(() => document.querySelectorAll('mark').length);
    expect(marks).toBeGreaterThan(0);
    await page.close();
  });

  // ── Visual mode ───────────────────────────────────────────────────────────

  test('v (caret/visual) motions select text and y yanks it', async () => {
    if (!browser) return;
    const page = await open('/find');
    await page.keyboard.press('v');
    await wait(150);
    for (const k of ['w', 'w', 'w']) { await page.keyboard.press(k); await wait(60); }
    await page.keyboard.press('y');
    await wait(250);
    const text = await readClipboard(page);
    expect(typeof text).toBe('string');
    expect(text.trim().length).toBeGreaterThan(0);
    await page.close();
  });

  // ── Marks ─────────────────────────────────────────────────────────────────

  test('mark set + jump restores scroll position', async () => {
    if (!browser) return;
    const page = await open('/tall');
    // Scroll to bottom (G), set mark 'b'
    await page.keyboard.press('G');
    await wait(250);
    const bottomY = await scrollY(page);
    expect(bottomY).toBeGreaterThan(300);
    await page.keyboard.press('m');
    await page.keyboard.press('b');
    await wait(150);
    // Back to top, then jump with ' (mark-jump; ` would overwrite the mark)
    await page.keyboard.press('g');
    await page.keyboard.press('g');
    await wait(250);
    expect(await scrollY(page)).toBeLessThan(100);
    await page.keyboard.type("'");
    await page.keyboard.press('b');
    await wait(350);
    const restored = await scrollY(page);
    expect(Math.abs(restored - bottomY)).toBeLessThan(80);
    await page.close();
  });

  // ── Insert mode ───────────────────────────────────────────────────────────

  test('typing goes to inputs; after Esc, j scrolls instead of typing', async () => {
    if (!browser) return;
    const page = await open('/input');
    await page.click('#inp');
    await wait(150);
    await page.keyboard.type('hello');
    await wait(100);
    let value = await page.evaluate(() => document.getElementById('inp').value);
    expect(value).toBe('hello');
    await page.keyboard.press('Escape');
    await wait(100);
    await page.keyboard.press('j'); // must scroll, not type
    await wait(200);
    value = await page.evaluate(() => document.getElementById('inp').value);
    expect(value).toBe('hello');
    expect(await scrollY(page)).toBeGreaterThan(0);
    await page.close();
  });

  // ── Omnibar / command execution ───────────────────────────────────────────

  test(': cmdline executes a command (tab-new opens a tab)', async () => {
    if (!browser) return;
    const page = await open('/');
    const before = (await browser.pages()).length;
    await page.keyboard.type(':');
    await wait(250);
    await page.keyboard.type('tab-new');
    await wait(200);
    await page.keyboard.press('Enter');
    await wait(700);
    const after = (await browser.pages()).length;
    expect(after).toBe(before + 1);
    await page.close();
  });

  test(': feedkeys gg scrolls to top', async () => {
    if (!browser) return;
    const page = await open('/tall');
    await page.keyboard.press('G');
    await wait(250);
    expect(await scrollY(page)).toBeGreaterThan(300);
    await page.keyboard.type(':');
    await wait(250);
    await page.keyboard.type('feedkeys gg');
    await wait(200);
    await page.keyboard.press('Enter');
    await wait(500);
    expect(await scrollY(page)).toBeLessThan(100);
    await page.close();
  });

  // ── Page features ─────────────────────────────────────────────────────────

  test(':reader-view opens the markdown preview with extracted content', async () => {
    if (!browser) return;
    const page = await open('/article');
    await page.keyboard.type(':');
    await wait(250);
    await page.keyboard.type('reader-view');
    await wait(200);
    await page.keyboard.press('Enter');
    await wait(900);
    const pages = await browser.pages();
    const preview = pages.find((p) => p.url().includes('markdown.html'));
    expect(preview).toBeTruthy();
    const text = await preview.evaluate(() => document.getElementById('content').textContent);
    expect(text).toContain('Article body paragraph');
    await page.close();
    await preview.close();
  });

  test('zi zooms in (zoom factor increases)', async () => {
    if (!browser) return;
    const page = await open('/');
    const before = await page.evaluate(() => window.devicePixelRatio);
    await page.keyboard.press('z');
    await page.keyboard.press('i');
    await wait(400);
    const after = await page.evaluate(() => window.devicePixelRatio);
    expect(after).toBeGreaterThan(before);
    await page.close();
  });
});
