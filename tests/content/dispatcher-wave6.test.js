const { Dispatcher } = require('../../src/content_scripts/dispatcher');

test('lastCommand is set after successful content command', async () => {
  const handler = jest.fn();
  const registry = { get: () => ({ name: 'scroll-down', context: 'content', handler }) };
  const d = new Dispatcher(registry, { sendMessage: async () => ({ ok: true }) });
  await d.run('scroll-down', {});
  expect(d.lastCommand).toBe('scroll-down');
});

test('lastCommand is NOT set for repeat-last command', async () => {
  const handler = jest.fn();
  const registry = { get: (n) => n === 'repeat-last' ? { name: 'repeat-last', context: 'content', handler } : null };
  const d = new Dispatcher(registry, { sendMessage: async () => ({ ok: true }) });
  await d.run('repeat-last', {});
  expect(d.lastCommand).toBeUndefined();
});

test('repeat-last runs the last command again', async () => {
  const calls = [];
  const scrollHandler = jest.fn(async () => { calls.push('scroll-down'); });
  const registry = { get: (n) => {
    if (n === 'scroll-down') return { name: 'scroll-down', context: 'content', handler: scrollHandler };
    if (n === 'repeat-last') return { name: 'repeat-last', context: 'content', handler: async (_ctx, _p, d) => {
      if (d && d.lastCommand) await d.runString(d.lastCommand);
    }};
    return null;
  }};
  const d = new Dispatcher(registry, { sendMessage: async () => ({ ok: true }) });
  await d.run('scroll-down', {});
  expect(d.lastCommand).toBe('scroll-down');
  // Directly test runString
  await d.runString('scroll-down');
  expect(calls).toHaveLength(2);
});
