const { CommandRegistry } = require('../../src/core/registry');
const { Config } = require('../../src/core/config');
const { registerConfigCommands } = require('../../src/commands/config-commands');
function fakeStorage() { const mem = {}; return { get: async k => ({ [k]: mem[k] }), set: async o => { Object.assign(mem, o); } }; }
test(':set command updates config', async () => {
  const reg = new CommandRegistry(); const cfg = new Config(fakeStorage()); await cfg.load();
  registerConfigCommands(reg, cfg);
  await reg.get('set').handler({ cfg }, { args: ['hintcharacters', 'qwerty'] });
  expect(cfg.get('hintcharacters')).toBe('qwerty');
});
test(':bind command adds binding; :profile switches profile', async () => {
  const reg = new CommandRegistry(); const cfg = new Config(fakeStorage()); await cfg.load();
  registerConfigCommands(reg, cfg);
  await reg.get('bind').handler({ cfg }, { args: ['normal', 'gh', 'home'] });
  expect(cfg.getUserBindings('normal')['gh']).toBe('home');
  await reg.get('profile').handler({ cfg }, { args: ['qute'] });
  expect(cfg.getActiveProfile()).toBe('qute');
});
