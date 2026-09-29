'use strict';

const { fakeChrome } = require('../helpers/fake-chrome');
const { CommandRegistry } = require('../../src/core/registry');
const { registerQueueCommands, readQueue, writeQueue, STORAGE_KEY } = require('../../src/background/queue');
const { registerPdfCommands, PDF_URL_RE, isEnabled, setEnabled } = require('../../src/background/pdfviewer');
const { decodeJsonArg } = require('../../src/background/llm');
const { registerContainerCommands } = require('../../src/background/containers');

beforeEach(() => {
  globalThis.chrome = fakeChrome();
});
afterEach(() => { delete globalThis.chrome; });

// ── tab queue ────────────────────────────────────────────────────────────────

describe('tab queue', () => {
  test('queue-add stores the sender tab URL', async () => {
    const reg = new CommandRegistry();
    registerQueueCommands(reg);
    const sender = { tab: { url: 'https://queued.com', title: 'Q' } };
    const res = await reg.get('queue-add').handler({ sender }, { args: [], flags: {} });
    expect(res).toMatch(/queued \(1 total\)/);
    const queue = await readQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].url).toBe('https://queued.com');
    expect(queue[0].title).toBe('Q');
  });

  test('queue-add rejects unsafe urls', async () => {
    const reg = new CommandRegistry();
    registerQueueCommands(reg);
    await expect(
      reg.get('queue-add').handler({}, { args: ['javascript:alert(1)'], flags: {} })
    ).rejects.toThrow(/refused unsafe/);
  });

  test('queue-remove deletes by index', async () => {
    await writeQueue([{ url: 'https://a.com', title: '', queuedAt: 1 }, { url: 'https://b.com', title: '', queuedAt: 2 }]);
    const reg = new CommandRegistry();
    registerQueueCommands(reg);
    await reg.get('queue-remove').handler({}, { args: ['0'], flags: {} });
    const queue = await readQueue();
    expect(queue.map(q => q.url)).toEqual(['https://b.com']);
  });

  test('queue-clear empties the queue', async () => {
    await writeQueue([{ url: 'https://a.com', title: '', queuedAt: 1 }]);
    const reg = new CommandRegistry();
    registerQueueCommands(reg);
    await reg.get('queue-clear').handler({}, { args: [], flags: {} });
    expect(await readQueue()).toEqual([]);
  });

  test('queue-open-all opens background tabs and clears', async () => {
    await writeQueue([{ url: 'https://q1.com', title: '', queuedAt: 1 }, { url: 'https://q2.com', title: '', queuedAt: 2 }]);
    const reg = new CommandRegistry();
    registerQueueCommands(reg);
    const res = await reg.get('queue-open-all').handler({}, { args: [], flags: {} });
    expect(res).toBe('opened 2 tab(s)');
    expect(await readQueue()).toEqual([]);
    const all = globalThis.chrome.tabs._all();
    expect(all.filter(t => t.url === 'https://q1.com').length).toBe(1);
  });

  test('queue-list returns the stored entries', async () => {
    await writeQueue([{ url: 'https://a.com', title: 'A', queuedAt: 1 }]);
    const reg = new CommandRegistry();
    registerQueueCommands(reg);
    const items = await reg.get('queue-list').handler({}, { args: [], flags: {} });
    expect(items.length).toBe(1);
    expect(items[0]).toHaveProperty('url', 'https://a.com');
  });

  test('storage key is namespaced', () => {
    expect(STORAGE_KEY).toBe('qutesurf:queue');
  });
});

// ── pdf viewer ───────────────────────────────────────────────────────────────

describe('pdf viewer', () => {
  test('PDF_URL_RE matches http(s) .pdf urls only', () => {
    expect(PDF_URL_RE.test('https://x.com/doc.pdf')).toBe(true);
    expect(PDF_URL_RE.test('https://x.com/doc.pdf?dl=1')).toBe(true);
    expect(PDF_URL_RE.test('http://x.com/a/b.PDF#page=2')).toBe(true);
    expect(PDF_URL_RE.test('https://x.com/doc.pdfx')).toBe(false);
    expect(PDF_URL_RE.test('https://x.com/page?file=a.pdf')).toBe(false);
    expect(PDF_URL_RE.test('chrome-extension://e/pages/pdf.html')).toBe(false);
    expect(PDF_URL_RE.test('https://x.com/')).toBe(false);
  });

  test('toggle persists state', async () => {
    await setEnabled(false);
    expect(await isEnabled()).toBe(false);
    await setEnabled(true);
    expect(await isEnabled()).toBe(true);
  });

  test('pdf-viewer-toggle flips and reports state', async () => {
    const reg = new CommandRegistry();
    registerPdfCommands(reg);
    const first = await reg.get('pdf-viewer-toggle').handler({}, { args: [], flags: {} });
    const second = await reg.get('pdf-viewer-toggle').handler({}, { args: [], flags: {} });
    expect([first, second]).toEqual(['PDF viewer: on', 'PDF viewer: off']);
  });

  test('pdf-viewer-open requires an http(s) url', async () => {
    const reg = new CommandRegistry();
    registerPdfCommands(reg);
    await expect(
      reg.get('pdf-viewer-open').handler({}, { args: [], flags: {} })
    ).rejects.toThrow(/no http\(s\) URL/i);
  });
});

// ── llm arg decoding ─────────────────────────────────────────────────────────

describe('llm helpers', () => {
  test('decodeJsonArg handles URL-encoded JSON and plain text', () => {
    const messages = [{ role: 'user', content: 'hi there' }];
    const token = encodeURIComponent(JSON.stringify(messages));
    expect(decodeJsonArg(token)).toEqual(messages);
    expect(decodeJsonArg(encodeURIComponent('plain text'))).toBe('plain text');
    expect(() => decodeJsonArg('')).toThrow(/missing argument/);
  });
});

// ── containers ───────────────────────────────────────────────────────────────

describe('firefox containers', () => {
  test('reports unsupported when contextualIdentities is missing (Chrome)', async () => {
    const reg = new CommandRegistry();
    registerContainerCommands(reg);
    await expect(
      reg.get('open-in-container').handler(
        { sender: { tab: { url: 'https://x.com' } } },
        { args: ['Personal'], flags: {} }
      )
    ).rejects.toThrow(/not supported/);
  });

  test('matches a container case-insensitively and opens the tab (Firefox)', async () => {
    globalThis.chrome.contextualIdentities = {
      query: async (q) => {
        if (q && q.name) {
          // exact-match query returns nothing for partial names
          return [{ cookieStoreId: 'id-1', name: 'Personal' }];
        }
        return [{ cookieStoreId: 'id-1', name: 'Personal' }, { cookieStoreId: 'id-2', name: 'Work' }];
      },
    };
    const reg = new CommandRegistry();
    registerContainerCommands(reg);
    const created = await reg.get('open-in-container').handler(
      { sender: { tab: { url: 'https://x.com' } } },
      { args: ['personal'], flags: {} }
    );
    expect(created).toBeTruthy();
    expect(created.cookieStoreId).toBe('id-1');
  });

  test('errors on unknown container', async () => {
    globalThis.chrome.contextualIdentities = {
      query: async (q) => (q && q.name ? [] : [{ cookieStoreId: 'id-2', name: 'Work' }]),
    };
    const reg = new CommandRegistry();
    registerContainerCommands(reg);
    await expect(
      reg.get('open-in-container').handler(
        { sender: { tab: { url: 'https://x.com' } } },
        { args: ['Nope'], flags: {} }
      )
    ).rejects.toThrow(/no container named/);
  });
});
