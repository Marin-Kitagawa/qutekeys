'use strict';

const { fakeChrome } = require('../helpers/fake-chrome');
const { CommandRegistry } = require('../../src/core/registry');
const { registerTabCommands } = require('../../src/background/tabs');
const { registerHistoryCommands } = require('../../src/background/history');
const { registerDownloadCommands } = require('../../src/background/downloads');
const { registerSessionCommands } = require('../../src/background/sessions');
const { registerMiscCommands, isAllowedBrowserUrl } = require('../../src/background/misc');

beforeEach(() => {
  globalThis.chrome = fakeChrome({
    tabs: [
      { id: 10, index: 0, active: true, url: 'https://a.com', title: 'Page A', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: false },
    ],
  });
});
afterEach(() => { delete globalThis.chrome; });

// ── tab-reload-hard ──────────────────────────────────────────────────────────

test('tab-reload-hard reloads the sender tab bypassing cache', async () => {
  const reg = new CommandRegistry();
  registerTabCommands(reg);
  await reg.get('tab-reload-hard').handler({ sender: { tab: { id: 10 } } }, { args: [] });
  expect(globalThis.chrome._reloadCalls).toEqual([{ tabId: 10, opts: { bypassCache: true } }]);
});

// ── history-delete-url / history-clear ───────────────────────────────────────

test('history-delete-url deletes the given URL', async () => {
  const reg = new CommandRegistry();
  registerHistoryCommands(reg);
  await reg.get('history-delete-url').handler({}, { args: ['https://bad.com'] });
  expect(globalThis.chrome.history._deletedUrls).toContain('https://bad.com');
});

// ── download manager ─────────────────────────────────────────────────────────

test('download-list returns normalized download items', async () => {
  const reg = new CommandRegistry();
  registerDownloadCommands(reg);
  const items = await reg.get('download-list').handler({}, { args: [] });
  expect(items.length).toBe(2);
  expect(items[0]).toHaveProperty('id');
  expect(items[0]).toHaveProperty('state');
});

test('download-cancel / open / show target an id or the most recent download', async () => {
  const reg = new CommandRegistry();
  registerDownloadCommands(reg);
  await reg.get('download-cancel').handler({}, { args: [] });
  await reg.get('download-open').handler({}, { args: ['1'] });
  await reg.get('download-show').handler({}, { args: [] });
  const calls = globalThis.chrome.downloads._calls;
  expect(calls).toContainEqual(['open', 1]);
  expect(calls).toContainEqual(['show', 1]);
  const cancel = calls.find(c => c[0] === 'cancel');
  expect(cancel).toBeTruthy();
});

test('download-clear erases finished downloads', async () => {
  const reg = new CommandRegistry();
  registerDownloadCommands(reg);
  await reg.get('download-clear').handler({}, { args: [] });
  const erase = globalThis.chrome.downloads._calls.find(c => c[0] === 'erase');
  expect(erase[1]).toEqual({ state: 'complete' });
});

test('download-dataurl rejects non-image data URLs', async () => {
  const reg = new CommandRegistry();
  registerDownloadCommands(reg);
  await expect(
    reg.get('download-dataurl').handler({}, { args: ['data:text/html;base64,AAAA'] })
  ).rejects.toThrow(/data:image/);
});

test('download-dataurl accepts image data URLs', async () => {
  const reg = new CommandRegistry();
  registerDownloadCommands(reg);
  const id = await reg.get('download-dataurl').handler({}, { args: ['data:image/png;base64,AAAA', 'shot.png'] });
  expect(id).toBe(42);
});

// ── sessions ZZ / ZR ──────────────────────────────────────────────────────────

test('session-save-and-close saves "last" and closes the sender window', async () => {
  const reg = new CommandRegistry();
  registerSessionCommands(reg);
  await reg.get('session-save-and-close').handler({ sender: { tab: { windowId: 7 } } }, { args: [] });
  expect(globalThis.chrome.windows._removed).toContain(7);
  // Session "last" persisted in storage
  const stored = await globalThis.chrome.storage.local.get('qutesurf:sessions');
  expect(stored['qutesurf:sessions'].last).toBeTruthy();
  expect(stored['qutesurf:sessions'].last.tabs[0].url).toBe('https://a.com');
});

test('session-restore-last restores tabs from the "last" session', async () => {
  const reg = new CommandRegistry();
  registerSessionCommands(reg);
  await reg.get('session-save-and-close').handler({ sender: { tab: { windowId: 7 } } }, { args: [] });
  await reg.get('session-restore-last').handler({}, { args: [] });
  const all = globalThis.chrome.tabs._all();
  expect(all.some(t => t.url === 'https://a.com')).toBe(true);
});

// ── open-browser-url ─────────────────────────────────────────────────────────

test('open-browser-url allows whitelisted pages and rejects others', async () => {
  const reg = new CommandRegistry();
  registerMiscCommands(reg);
  await reg.get('open-browser-url').handler({}, { args: ['chrome://settings'] });
  await expect(
    reg.get('open-browser-url').handler({}, { args: ['chrome://unknown-page'] })
  ).rejects.toThrow(/not allowed/);
  await expect(
    reg.get('open-browser-url').handler({}, { args: ['javascript:alert(1)'] })
  ).rejects.toThrow(/not allowed/);
});

test('isAllowedBrowserUrl covers chrome:// and about: prefixes only', () => {
  expect(isAllowedBrowserUrl('chrome://downloads')).toBe(true);
  expect(isAllowedBrowserUrl('about:addons')).toBe(true);
  expect(isAllowedBrowserUrl('chrome://settings/?search=x')).toBe(true);
  expect(isAllowedBrowserUrl('https://evil.com')).toBe(false);
  expect(isAllowedBrowserUrl('')).toBe(false);
  expect(isAllowedBrowserUrl(null)).toBe(false);
});

// ── jseval ────────────────────────────────────────────────────────────────────

test('jseval throws when the scripting API is unavailable', async () => {
  const reg = new CommandRegistry();
  registerMiscCommands(reg);
  await expect(
    reg.get('jseval').handler({ sender: { tab: { id: 10 } } }, { args: ['1+1'], flags: {} })
  ).rejects.toThrow(/scripting API unavailable/);
});
