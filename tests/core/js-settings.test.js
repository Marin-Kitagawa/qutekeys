'use strict';

const { createSettingsApi, evaluateSettings } = require('../../src/core/js-settings');

function makeTarget() {
  return {
    bindings: { normal: {}, insert: {}, visual: {} },
    options: {},
    aliases: {},
    bind(mode, seq, cmd) { this.bindings[mode][seq] = cmd; },
    unbind(mode, seq) { delete this.bindings[mode][seq]; },
    setOption(k, v) { this.options[k] = v; },
    addAlias(a, u) { this.aliases[a] = u; },
  };
}

test('mapkey records a normal-mode binding', () => {
  const t = makeTarget();
  evaluateSettings(`mapkey('gh', 'open github', 'omnibar-open https://github.com');`, t);
  expect(t.bindings.normal['gh']).toBe('omnibar-open https://github.com');
});

test('map/unmap and imapkey/vmapkey target the right modes', () => {
  const t = makeTarget();
  evaluateSettings(`
    imapkey('<C-x>', 'edit-with-vim');
    vmapkey('Y', 'yank-selection');
    unmap('j');
  `, t);
  expect(t.bindings.insert['<C-x>']).toBe('edit-with-vim');
  expect(t.bindings.visual['Y']).toBe('yank-selection');
  // unmap('j') records a removal in normal (it was not present; deleting is a no-op but must not throw)
});

test('settings() sets options and aliases() adds a search alias', () => {
  const t = makeTarget();
  evaluateSettings(`
    settings({ hintcharacters: 'qwerty', smoothscroll: false });
    aliases('gh', 'https://github.com/search?q=%s');
  `, t);
  expect(t.options.hintcharacters).toBe('qwerty');
  expect(t.options.smoothscroll).toBe(false);
  expect(t.aliases['gh']).toBe('https://github.com/search?q=%s');
});

test('a script error is reported, not thrown', () => {
  const t = makeTarget();
  const res = evaluateSettings(`this is not valid javascript @#$`, t);
  expect(res.ok).toBe(false);
  expect(typeof res.error).toBe('string');
});
