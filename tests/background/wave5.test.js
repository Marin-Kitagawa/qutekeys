'use strict';

/**
 * Wave 5 background command tests:
 *  - zoom-in / zoom-out / zoom-reset  (zoom.js)
 *  - capture-visible                  (capture.js)
 *  - history-delete-old               (history.js)
 *  - view-source                      (tabs.js)
 */

const { fakeChrome } = require('../helpers/fake-chrome');
const { registerZoomCommands }    = require('../../src/background/zoom');
const { registerCaptureCommands } = require('../../src/background/capture');
const { registerHistoryCommands } = require('../../src/background/history');
const { registerTabCommands }     = require('../../src/background/tabs');
const { CommandRegistry }         = require('../../src/core/registry');

function makeRegistry() {
  return new CommandRegistry();
}

function makeCtx(tabId = 1, tabUrl = 'https://example.com/') {
  return { sender: { tab: { id: tabId, url: tabUrl } } };
}

function makeParsed(args = []) {
  return { args, flags: {} };
}

// ── zoom ─────────────────────────────────────────────────────────────────────

describe('zoom commands', () => {
  let chrome, registry;

  beforeEach(() => {
    chrome = fakeChrome();
    globalThis.chrome = chrome;
    registry = makeRegistry();
    registerZoomCommands(registry);
  });

  afterEach(() => { delete globalThis.chrome; });

  test('zoom-in calls getZoom then setZoom with factor+0.1', async () => {
    // default zoom is 1 from fake
    await registry.get('zoom-in').handler(makeCtx(1), makeParsed());
    expect(chrome.tabs._zoomSetCalls).toHaveLength(1);
    expect(chrome.tabs._zoomSetCalls[0]).toEqual({ tabId: 1, factor: 1.1 });
  });

  test('zoom-out calls setZoom with factor-0.1', async () => {
    await registry.get('zoom-out').handler(makeCtx(1), makeParsed());
    expect(chrome.tabs._zoomSetCalls[0]).toEqual({ tabId: 1, factor: 0.9 });
  });

  test('zoom-reset calls setZoom with 0', async () => {
    await registry.get('zoom-reset').handler(makeCtx(1), makeParsed());
    expect(chrome.tabs._zoomSetCalls[0]).toEqual({ tabId: 1, factor: 0 });
  });

  test('zoom-in stacks: 1.0 → 1.1 → 1.2', async () => {
    const ctx = makeCtx(1);
    await registry.get('zoom-in').handler(ctx, makeParsed());
    await registry.get('zoom-in').handler(ctx, makeParsed());
    // After first call _zoomMap[1] = 1.1, so second call reads 1.1 → 1.2
    expect(chrome.tabs._zoomSetCalls[1].factor).toBeCloseTo(1.2, 5);
  });

  test('zoom commands are context:background', () => {
    expect(registry.get('zoom-in').context).toBe('background');
    expect(registry.get('zoom-out').context).toBe('background');
    expect(registry.get('zoom-reset').context).toBe('background');
  });
});

// ── capture-visible ──────────────────────────────────────────────────────────

describe('capture-visible command', () => {
  let chrome, registry;

  beforeEach(() => {
    chrome = fakeChrome();
    globalThis.chrome = chrome;
    registry = makeRegistry();
    registerCaptureCommands(registry);
  });

  afterEach(() => { delete globalThis.chrome; });

  test('capture-visible calls captureVisibleTab', async () => {
    await registry.get('capture-visible').handler(makeCtx(), makeParsed());
    expect(chrome.tabs._captureVisibleCalls).toHaveLength(1);
  });

  test('capture-visible opens the dataUrl in a new tab', async () => {
    await registry.get('capture-visible').handler(makeCtx(), makeParsed());
    const allTabs = chrome.tabs._all();
    const dataTab = allTabs.find(t => t.url && t.url.startsWith('data:image/png'));
    expect(dataTab).toBeDefined();
  });

  test('capture-visible is context:background', () => {
    expect(registry.get('capture-visible').context).toBe('background');
  });
});

// ── history-delete-old ───────────────────────────────────────────────────────

describe('history-delete-old command', () => {
  let chrome, registry;

  beforeEach(() => {
    chrome = fakeChrome();
    globalThis.chrome = chrome;
    registry = makeRegistry();
    registerHistoryCommands(registry);
  });

  afterEach(() => { delete globalThis.chrome; });

  test('history-delete-old calls history.deleteRange with startTime:0 and endTime ~30d ago', async () => {
    const before = Date.now();
    await registry.get('history-delete-old').handler(makeCtx(), makeParsed());
    const after = Date.now();

    expect(chrome.history._deleteRangeCalls).toHaveLength(1);
    const { startTime, endTime } = chrome.history._deleteRangeCalls[0];
    expect(startTime).toBe(0);

    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    expect(endTime).toBeGreaterThanOrEqual(before - thirtyDaysMs);
    expect(endTime).toBeLessThanOrEqual(after - thirtyDaysMs + 100); // 100ms tolerance
  });

  test('history-delete-old is context:background', () => {
    expect(registry.get('history-delete-old').context).toBe('background');
  });
});

// ── view-source ──────────────────────────────────────────────────────────────

describe('view-source command', () => {
  let chrome, registry;

  beforeEach(() => {
    chrome = fakeChrome();
    globalThis.chrome = chrome;
    registry = makeRegistry();
    registerTabCommands(registry);
  });

  afterEach(() => { delete globalThis.chrome; });

  test('view-source opens a new tab with view-source: prepended to the sender URL', async () => {
    const tabUrl = 'https://example.com/page';
    await registry.get('view-source').handler(makeCtx(1, tabUrl), makeParsed());
    const allTabs = chrome.tabs._all();
    const vsTab = allTabs.find(t => t.url && t.url.startsWith('view-source:'));
    expect(vsTab).toBeDefined();
    expect(vsTab.url).toBe('view-source:' + tabUrl);
  });

  test('view-source does nothing when sender tab is missing', async () => {
    const before = chrome.tabs._all().length;
    await registry.get('view-source').handler({ sender: null }, makeParsed());
    expect(chrome.tabs._all().length).toBe(before);
  });

  test('view-source is context:background', () => {
    expect(registry.get('view-source').context).toBe('background');
  });
});
