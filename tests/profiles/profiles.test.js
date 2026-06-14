const { getProfile, listProfiles } = require('../../src/profiles');
test('three profiles exist', () => {
  expect(listProfiles().sort()).toEqual(['hybrid', 'qute', 'surfingkeys']);
});
test('qute profile binds J to tab-next and f to hint in normal mode', () => {
  const p = getProfile('qute');
  expect(p.bindings.normal['J']).toBe('tab-next');
  expect(p.bindings.normal['f']).toMatch(/^hint/);
});
test('surfingkeys profile binds E/R to tab cycling', () => {
  const p = getProfile('surfingkeys');
  expect(p.bindings.normal['E']).toMatch(/tab/);
  expect(p.bindings.normal['R']).toMatch(/tab/);
});
test('every binding references a known command name', () => {
  const { CANONICAL_COMMANDS } = require('../../src/profiles/index');
  for (const name of listProfiles()) {
    const p = getProfile(name);
    for (const mode of Object.keys(p.bindings)) {
      for (const seq of Object.keys(p.bindings[mode])) {
        const cmd = p.bindings[mode][seq].split(/\s+/)[0];
        expect(CANONICAL_COMMANDS).toContain(cmd);
      }
    }
  }
});
