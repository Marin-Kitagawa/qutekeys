const { buildCheatsheet, categorize } = require('../../src/pages/help-data');
const { CommandRegistry } = require('../../src/core/registry');
function reg() {
  const r = new CommandRegistry();
  r.register({ name:'tab-close', description:'Close the current tab' });
  r.register({ name:'scroll-down', description:'Scroll down' });
  r.register({ name:'hint', description:'Follow a link hint' });
  r.register({ name:'omnibar-open', description:'Open URL or search' });
  return r;
}
test('categorize groups commands by prefix/topic', () => {
  expect(categorize('tab-close')).toBe('Tabs');
  expect(categorize('scroll-down')).toBe('Navigation');
  expect(categorize('hint')).toBe('Hints');
  expect(categorize('omnibar-open')).toBe('Omnibar');
});
test('buildCheatsheet pairs bound keys with commands and groups them', () => {
  const profile = { bindings: { normal: { J:'tab-next', d:'tab-close', f:'hint' }, insert:{}, visual:{} } };
  // tab-next isn't in the registry above; still include the binding row using the command name
  const sheet = buildCheatsheet(reg(), profile, { normal: {} });
  // sheet is an array of groups: { category, rows:[{keys, command, description, mode}] }
  const tabs = sheet.find(g => g.category === 'Tabs');
  expect(tabs).toBeTruthy();
  const closeRow = tabs.rows.find(r => r.command === 'tab-close');
  expect(closeRow.keys).toContain('d');     // bound to 'd' in this profile
  expect(closeRow.description).toBe('Close the current tab');
});
test('user bindings override/add to profile bindings', () => {
  const profile = { bindings: { normal: { f:'hint' }, insert:{}, visual:{} } };
  const sheet = buildCheatsheet(reg(), profile, { normal: { gh:'omnibar-open' } });
  const omni = sheet.flatMap(g => g.rows).find(r => r.command === 'omnibar-open');
  expect(omni.keys).toContain('gh');
});
test('commands with no binding are flagged (keys empty)', () => {
  const profile = { bindings: { normal: {}, insert:{}, visual:{} } };
  const sheet = buildCheatsheet(reg(), profile, { normal: {} });
  const sd = sheet.flatMap(g => g.rows).find(r => r.command === 'scroll-down');
  expect(sd.keys).toBe(''); // no binding
});
