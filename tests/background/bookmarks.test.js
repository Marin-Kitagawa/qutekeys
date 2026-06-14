'use strict';

const { fakeChrome } = require('../helpers/fake-chrome');
const { CommandRegistry } = require('../../src/core/registry');
const { registerBookmarkCommands } = require('../../src/background/bookmarks');

beforeEach(() => { globalThis.chrome = fakeChrome(); });
afterEach(() => { delete globalThis.chrome; });

test('bookmark-add creates a bookmark from sender tab title/url', async () => {
  const reg = new CommandRegistry();
  registerBookmarkCommands(reg);
  const ctx = { sender: { tab: { title: 'My Page', url: 'https://example.com/' } } };
  const result = await reg.get('bookmark-add').handler(ctx, { args: [] });
  expect(result).toMatchObject({ title: 'My Page', url: 'https://example.com/' });
  expect(result.id).toBeDefined();
  expect(globalThis.chrome.bookmarks._bookmarks).toHaveLength(1);
});

test('bookmark-remove removes bookmarks matching sender tab url', async () => {
  const reg = new CommandRegistry();
  registerBookmarkCommands(reg);
  const ctx = { sender: { tab: { title: 'My Page', url: 'https://example.com/' } } };
  // Add first
  await reg.get('bookmark-add').handler(ctx, { args: [] });
  expect(globalThis.chrome.bookmarks._bookmarks).toHaveLength(1);
  // Remove
  const removed = await reg.get('bookmark-remove').handler(ctx, { args: [] });
  expect(removed).toBe(1);
  expect(globalThis.chrome.bookmarks._bookmarks).toHaveLength(0);
});

test('bookmark-remove returns 0 when no matching bookmark exists', async () => {
  const reg = new CommandRegistry();
  registerBookmarkCommands(reg);
  const ctx = { sender: { tab: { title: 'X', url: 'https://notbookmarked.com/' } } };
  const removed = await reg.get('bookmark-remove').handler(ctx, { args: [] });
  expect(removed).toBe(0);
});

test('bookmark-add returns null when no sender tab', async () => {
  const reg = new CommandRegistry();
  registerBookmarkCommands(reg);
  const result = await reg.get('bookmark-add').handler({ sender: null }, { args: [] });
  expect(result).toBeNull();
});

test('bookmark-search still works with string query (backward compat)', async () => {
  const reg = new CommandRegistry();
  registerBookmarkCommands(reg);
  // With empty _bookmarks array, search falls back to hardcoded result
  const result = await reg.get('bookmark-search').handler({}, { args: ['test'] });
  // Should return the backward-compat entry
  expect(Array.isArray(result)).toBe(true);
});
