const { fakeChrome } = require('../helpers/fake-chrome');
const { CommandRegistry } = require('../../src/core/registry');
const { registerSessionCommands } = require('../../src/background/sessions');
beforeEach(() => { globalThis.chrome = fakeChrome({ tabs: [
  { id:1, index:0, active:true,  url:'https://a.com', windowId:1, pinned:false, mutedInfo:{muted:false} },
  { id:2, index:1, active:false, url:'https://b.com', windowId:1, pinned:false, mutedInfo:{muted:false} },
]}); });
afterEach(() => { delete globalThis.chrome; });
test('session-save stores current window tab urls under a name', async () => {
  const reg = new CommandRegistry(); registerSessionCommands(reg);
  await reg.get('session-save').handler({}, { args: ['work'] });
  const list = await reg.get('session-list').handler({}, { args: [] });
  expect(list).toContain('work');
});
test('session-load opens the saved urls', async () => {
  const reg = new CommandRegistry(); registerSessionCommands(reg);
  await reg.get('session-save').handler({}, { args: ['work'] });
  // close everything by replacing tabs
  globalThis.chrome.tabs._all().length = 0;
  await reg.get('session-load').handler({}, { args: ['work'] });
  const urls = globalThis.chrome.tabs._all().map(t => t.url);
  expect(urls).toEqual(expect.arrayContaining(['https://a.com','https://b.com']));
});
test('session-delete removes a session', async () => {
  const reg = new CommandRegistry(); registerSessionCommands(reg);
  await reg.get('session-save').handler({}, { args: ['work'] });
  await reg.get('session-delete').handler({}, { args: ['work'] });
  const list = await reg.get('session-list').handler({}, { args: [] });
  expect(list).not.toContain('work');
});
