const { CommandRegistry } = require('../../src/core/registry');

test('registers and looks up a command by name and alias', () => {
  const r = new CommandRegistry();
  const handler = jest.fn();
  r.register({ name: 'tab-close', aliases: ['tabclose'], description: 'Close tab', args: [], context: 'background', modes: ['normal'], handler });
  expect(r.get('tab-close').description).toBe('Close tab');
  expect(r.get('tabclose').name).toBe('tab-close');
  expect(r.all().length).toBe(1);
});

test('rejects duplicate names', () => {
  const r = new CommandRegistry();
  r.register({ name: 'x', handler(){} });
  expect(() => r.register({ name: 'x', handler(){} })).toThrow(/already registered/);
});

test('search matches name and description substrings', () => {
  const r = new CommandRegistry();
  r.register({ name: 'tab-close', description: 'Close the current tab', handler(){} });
  r.register({ name: 'scroll-down', description: 'Scroll down', handler(){} });
  expect(r.search('tab').map(c => c.name)).toContain('tab-close');
  expect(r.search('current').map(c => c.name)).toContain('tab-close');
});
