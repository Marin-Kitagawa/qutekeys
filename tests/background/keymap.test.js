const { fakeChrome } = require('../helpers/fake-chrome');
const { CommandRegistry } = require('../../src/core/registry');
const { registerKeymapCommands } = require('../../src/background/keymap');

beforeEach(() => { globalThis.chrome = fakeChrome(); });
afterEach(() => { delete globalThis.chrome; });

test('keymap-get returns the active profile bindings (defaults to hybrid)', async () => {
  const reg = new CommandRegistry();
  registerKeymapCommands(reg);
  const res = await reg.get('keymap-get').handler({}, { args: [] });
  expect(res.activeProfile).toBe('hybrid');
  // hybrid binds J -> tab-next and f -> hint in normal mode
  expect(res.profileBindings.normal.J).toBe('tab-next');
  expect(res.profileBindings.normal.f).toMatch(/^hint/);
  expect(res.userBindings).toHaveProperty('normal');
});

test('keymap-get reflects a stored active profile and user overrides', async () => {
  // Seed storage with profile=qute and a user override.
  await globalThis.chrome.storage.local.set({
    'qutesurf:config': { options: {}, activeProfile: 'qute', userBindings: { normal: { gh: 'home' }, insert: {}, visual: {} } },
  });
  const reg = new CommandRegistry();
  registerKeymapCommands(reg);
  const res = await reg.get('keymap-get').handler({}, { args: [] });
  expect(res.activeProfile).toBe('qute');
  expect(res.userBindings.normal.gh).toBe('home');
});
