const { fakeChrome } = require('../helpers/fake-chrome');
const { CommandRegistry } = require('../../src/core/registry');
const { registerTabCommands } = require('../../src/background/tabs');
const { _setMru } = require('../../src/background/tab-mru');
beforeEach(() => { globalThis.chrome = fakeChrome(); _setMru([]); });
afterEach(() => { delete globalThis.chrome; });
test('tab-new creates a tab with the given url', async () => {
  const reg = new CommandRegistry(); registerTabCommands(reg);
  await reg.get('tab-new').handler({ sender: { tab: { id: 1 } } }, { args: ['https://new.com'] });
  expect(globalThis.chrome.tabs._all().some(t => t.url === 'https://new.com')).toBe(true);
});
test('tab-close removes the sender tab', async () => {
  globalThis.chrome = fakeChrome({ tabs: [{ id: 7, index:0, active:true, url:'https://x.com', windowId:1, pinned:false, mutedInfo:{muted:false} }] });
  const reg = new CommandRegistry(); registerTabCommands(reg);
  await reg.get('tab-close').handler({ sender: { tab: { id: 7 } } }, { args: [] });
  expect(globalThis.chrome.tabs._all().length).toBe(0);
});
test('tab-undo restores the most recently closed tab by sessionId', async () => {
  globalThis.chrome = fakeChrome();
  const reg = new CommandRegistry(); registerTabCommands(reg);
  await reg.get('tab-undo').handler({ sender: { tab: { id: 1 } } }, { args: [] });
  expect(globalThis.chrome.sessions._restored).toContain('s1');
});
test('tab-list returns all tabs', async () => {
  globalThis.chrome = fakeChrome();
  const reg = new CommandRegistry(); registerTabCommands(reg);
  const res = await reg.get('tab-list').handler({}, { args: [] });
  expect(Array.isArray(res)).toBe(true);
});
test('tab-activate activates the given tab id', async () => {
  globalThis.chrome = fakeChrome({ tabs: [
    { id: 3, index:0, active:false, url:'https://a.com', windowId:1, pinned:false, mutedInfo:{muted:false} },
    { id: 4, index:1, active:true,  url:'https://b.com', windowId:1, pinned:false, mutedInfo:{muted:false} },
  ]});
  const reg = new CommandRegistry(); registerTabCommands(reg);
  await reg.get('tab-activate').handler({}, { args: [3] });
  expect(globalThis.chrome.tabs._all().find(t=>t.id===3).active).toBe(true);
});

// Wave 1 tests
test('tab-close-left removes the left neighbor', async () => {
  globalThis.chrome = fakeChrome({ tabs: [
    { id: 10, index: 0, active: false, url: 'https://a.com', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: false },
    { id: 11, index: 1, active: true,  url: 'https://b.com', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: false },
    { id: 12, index: 2, active: false, url: 'https://c.com', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: false },
  ]});
  const reg = new CommandRegistry(); registerTabCommands(reg);
  await reg.get('tab-close-left').handler({ sender: { tab: { id: 11 } } }, { args: [] });
  const ids = globalThis.chrome.tabs._all().map(t => t.id);
  expect(ids).not.toContain(10);
  expect(ids).toContain(11);
  expect(ids).toContain(12);
});

test('tab-close-right removes the right neighbor', async () => {
  globalThis.chrome = fakeChrome({ tabs: [
    { id: 10, index: 0, active: false, url: 'https://a.com', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: false },
    { id: 11, index: 1, active: true,  url: 'https://b.com', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: false },
    { id: 12, index: 2, active: false, url: 'https://c.com', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: false },
  ]});
  const reg = new CommandRegistry(); registerTabCommands(reg);
  await reg.get('tab-close-right').handler({ sender: { tab: { id: 11 } } }, { args: [] });
  const ids = globalThis.chrome.tabs._all().map(t => t.id);
  expect(ids).toContain(10);
  expect(ids).toContain(11);
  expect(ids).not.toContain(12);
});

test('tab-close-left-all removes all tabs to the left', async () => {
  globalThis.chrome = fakeChrome({ tabs: [
    { id: 10, index: 0, active: false, url: 'https://a.com', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: false },
    { id: 11, index: 1, active: false, url: 'https://b.com', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: false },
    { id: 12, index: 2, active: true,  url: 'https://c.com', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: false },
    { id: 13, index: 3, active: false, url: 'https://d.com', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: false },
  ]});
  const reg = new CommandRegistry(); registerTabCommands(reg);
  await reg.get('tab-close-left-all').handler({ sender: { tab: { id: 12 } } }, { args: [] });
  const ids = globalThis.chrome.tabs._all().map(t => t.id);
  expect(ids).not.toContain(10);
  expect(ids).not.toContain(11);
  expect(ids).toContain(12);
  expect(ids).toContain(13);
});

test('tab-close-right-all removes all tabs to the right', async () => {
  globalThis.chrome = fakeChrome({ tabs: [
    { id: 10, index: 0, active: false, url: 'https://a.com', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: false },
    { id: 11, index: 1, active: true,  url: 'https://b.com', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: false },
    { id: 12, index: 2, active: false, url: 'https://c.com', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: false },
    { id: 13, index: 3, active: false, url: 'https://d.com', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: false },
  ]});
  const reg = new CommandRegistry(); registerTabCommands(reg);
  await reg.get('tab-close-right-all').handler({ sender: { tab: { id: 11 } } }, { args: [] });
  const ids = globalThis.chrome.tabs._all().map(t => t.id);
  expect(ids).toContain(10);
  expect(ids).toContain(11);
  expect(ids).not.toContain(12);
  expect(ids).not.toContain(13);
});

test('tab-close-audible closes audible tabs only', async () => {
  globalThis.chrome = fakeChrome({ tabs: [
    { id: 10, index: 0, active: false, url: 'https://a.com', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: true },
    { id: 11, index: 1, active: true,  url: 'https://b.com', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: false },
    { id: 12, index: 2, active: false, url: 'https://c.com', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: true },
  ]});
  const reg = new CommandRegistry(); registerTabCommands(reg);
  await reg.get('tab-close-audible').handler({ sender: { tab: { id: 11 } } }, { args: [] });
  const ids = globalThis.chrome.tabs._all().map(t => t.id);
  expect(ids).not.toContain(10);
  expect(ids).toContain(11);
  expect(ids).not.toContain(12);
});

test('tab-last-used switches to the MRU other tab', async () => {
  globalThis.chrome = fakeChrome({ tabs: [
    { id: 1, index: 0, active: false, url: 'https://a.com', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: false },
    { id: 2, index: 1, active: true,  url: 'https://b.com', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: false },
  ]});
  _setMru([2, 1]); // current=2, last-used other=1
  const reg = new CommandRegistry(); registerTabCommands(reg);
  await reg.get('tab-last-used').handler({ sender: { tab: { id: 2 } } }, { args: [] });
  expect(globalThis.chrome.tabs._all().find(t => t.id === 1).active).toBe(true);
});

test('window-new calls windows.create with no args', async () => {
  globalThis.chrome = fakeChrome();
  const reg = new CommandRegistry(); registerTabCommands(reg);
  await reg.get('window-new').handler({}, { args: [] });
  expect(globalThis.chrome.windows._created.length).toBe(1);
  expect(globalThis.chrome.windows._created[0]).not.toHaveProperty('incognito');
});

test('window-new-private calls windows.create with incognito:true', async () => {
  globalThis.chrome = fakeChrome();
  const reg = new CommandRegistry(); registerTabCommands(reg);
  await reg.get('window-new-private').handler({}, { args: [] });
  expect(globalThis.chrome.windows._created.length).toBe(1);
  expect(globalThis.chrome.windows._created[0].incognito).toBe(true);
});

test('tab-new-background opens a tab with active:false', async () => {
  globalThis.chrome = fakeChrome();
  const reg = new CommandRegistry(); registerTabCommands(reg);
  await reg.get('tab-new-background').handler({}, { args: ['https://bg.com'] });
  const bgTab = globalThis.chrome.tabs._all().find(t => t.url === 'https://bg.com');
  expect(bgTab).toBeDefined();
  expect(bgTab.active).toBe(false);
});
