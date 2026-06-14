const { Config } = require('../../src/core/config');
function fakeStorage() { const mem = {}; return { mem, get: async k => ({ [k]: mem[k] }), set: async o => { Object.assign(mem, o); } }; }
test('set/get round-trips and persists', async () => {
  const fake = fakeStorage();
  const c = new Config(fake); await c.load();
  await c.set('hintcharacters', 'asdfgh');
  expect(c.get('hintcharacters')).toBe('asdfgh');
  const c2 = new Config(fake); await c2.load();
  expect(c2.get('hintcharacters')).toBe('asdfgh');
});
test('bind adds a user binding for a mode', async () => {
  const fake = fakeStorage();
  const c = new Config(fake); await c.load();
  await c.bind('normal', 'gh', 'omnibar-open https://example.com');
  expect(c.getUserBindings('normal')['gh']).toBe('omnibar-open https://example.com');
});
test('unbind removes a user binding', async () => {
  const fake = fakeStorage();
  const c = new Config(fake); await c.load();
  await c.bind('normal', 'gh', 'home');
  await c.unbind('normal', 'gh');
  expect(c.getUserBindings('normal')['gh']).toBeUndefined();
});
test('setProfile/getActiveProfile round-trips and defaults to hybrid', async () => {
  const fake = fakeStorage();
  const c = new Config(fake); await c.load();
  expect(c.getActiveProfile()).toBe('hybrid');
  await c.setProfile('qute');
  expect(c.getActiveProfile()).toBe('qute');
});
test('get returns default for unset option', async () => {
  const fake = fakeStorage();
  const c = new Config(fake); await c.load();
  expect(c.get('hintcharacters')).toBe('asdfg'); // default
});
test('config.get("theme") returns aurora by default', () => {
  const storage = { get: async () => ({}), set: async () => {} };
  const c = new Config(storage);
  expect(c.get('theme')).toBe('aurora');
});
