'use strict';

const { fakeChrome } = require('../helpers/fake-chrome');
const { CommandRegistry } = require('../../src/core/registry');
const { registerSessionCommands } = require('../../src/background/sessions');
const { registerTabCommands } = require('../../src/background/tabs');

beforeEach(() => {
  globalThis.chrome = fakeChrome({
    tabs: [
      { id: 10, index: 0, active: true,  url: 'https://a.com', title: 'Page A', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: false },
      { id: 11, index: 1, active: false, url: 'https://b.com', title: 'Page B', windowId: 2, pinned: false, mutedInfo: { muted: false }, audible: false },
    ],
  });
});
afterEach(() => { delete globalThis.chrome; });

// ── sessions-recently-closed ─────────────────────────────────────────────────

test('sessions-recently-closed returns an array with url and title', async () => {
  const reg = new CommandRegistry();
  registerSessionCommands(reg);
  const result = await reg.get('sessions-recently-closed').handler({}, { args: [] });
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBeGreaterThan(0);
  expect(result[0]).toHaveProperty('url', 'https://closed.com');
  expect(result[0]).toHaveProperty('title', 'Closed');
  expect(result[0]).toHaveProperty('sessionId', 's1');
});

test('sessions-recently-closed skips window-only entries', async () => {
  globalThis.chrome.sessions.getRecentlyClosed = async () => [
    { window: { sessionId: 'w1', tabs: [] } },
    { tab: { sessionId: 't1', title: 'Tab', url: 'https://t.com' } },
  ];
  const reg = new CommandRegistry();
  registerSessionCommands(reg);
  const result = await reg.get('sessions-recently-closed').handler({}, { args: [] });
  expect(result.length).toBe(1);
  expect(result[0].sessionId).toBe('t1');
});

// ── windows-list ─────────────────────────────────────────────────────────────

test('windows-list returns an array with id and tabCount', async () => {
  const reg = new CommandRegistry();
  registerTabCommands(reg);
  const result = await reg.get('windows-list').handler({}, { args: [] });
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBeGreaterThan(0);
  expect(result[0]).toHaveProperty('id', 1);
  expect(result[0]).toHaveProperty('focused', true);
  expect(result[0]).toHaveProperty('tabCount', 1);
  expect(result[0]).toHaveProperty('title', 'A');
});

test('windows-list uses fallback title when no active tab', async () => {
  globalThis.chrome.windows.getAll = async () => [{ id: 5, focused: false, tabs: [] }];
  const reg = new CommandRegistry();
  registerTabCommands(reg);
  const result = await reg.get('windows-list').handler({}, { args: [] });
  expect(result[0].title).toBe('Window 5');
});

// ── tab-close-id ─────────────────────────────────────────────────────────────

test('tab-close-id removes the tab with the given id', async () => {
  const reg = new CommandRegistry();
  registerTabCommands(reg);
  await reg.get('tab-close-id').handler({}, { args: [10] });
  const ids = globalThis.chrome.tabs._all().map(t => t.id);
  expect(ids).not.toContain(10);
  expect(ids).toContain(11);
});

test('tab-close-id does nothing for NaN id', async () => {
  const reg = new CommandRegistry();
  registerTabCommands(reg);
  const before = globalThis.chrome.tabs._all().length;
  await reg.get('tab-close-id').handler({}, { args: ['notanumber'] });
  expect(globalThis.chrome.tabs._all().length).toBe(before);
});

// ── tab-move-to-window ───────────────────────────────────────────────────────

test('tab-move-to-window calls tabs.move with the given windowId', async () => {
  const _moveCalls = [];
  const origMove = globalThis.chrome.tabs.move;
  globalThis.chrome.tabs.move = async (id, props) => { _moveCalls.push({ id, props }); return origMove(id, props); };

  const reg = new CommandRegistry();
  registerTabCommands(reg);
  await reg.get('tab-move-to-window').handler({ sender: { tab: { id: 10 } } }, { args: [2] });
  expect(_moveCalls.length).toBe(1);
  expect(_moveCalls[0].id).toBe(10);
  expect(_moveCalls[0].props.windowId).toBe(2);
  expect(_moveCalls[0].props.index).toBe(-1);
});

test('tab-move-to-window does nothing without sender tab', async () => {
  const _moveCalls = [];
  globalThis.chrome.tabs.move = async (id, props) => { _moveCalls.push({ id, props }); };
  const reg = new CommandRegistry();
  registerTabCommands(reg);
  await reg.get('tab-move-to-window').handler({}, { args: [2] });
  expect(_moveCalls.length).toBe(0);
});
