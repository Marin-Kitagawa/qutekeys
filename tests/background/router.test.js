const { makeRouter } = require('../../src/background/index');
test('routes a background command message to its handler', async () => {
  const handler = jest.fn().mockResolvedValue('ok');
  const registry = { get: () => ({ name: 'tab-close', context: 'background', handler }) };
  const route = makeRouter(registry);
  const res = await route({ type: 'command', name: 'tab-close', args: [], sender: { tab: { id: 5 } } });
  expect(res).toEqual({ ok: true, result: 'ok' });
  expect(handler).toHaveBeenCalled();
});
test('returns ok:false for unknown command', async () => {
  const registry = { get: () => null };
  const route = makeRouter(registry);
  const res = await route({ type: 'command', name: 'nope', args: [] });
  expect(res.ok).toBe(false);
});
test('returns ok:false when handler throws', async () => {
  const registry = { get: () => ({ name:'x', context:'background', handler: async () => { throw new Error('boom'); } }) };
  const res = await makeRouter(registry)({ type:'command', name:'x', args: [] });
  expect(res.ok).toBe(false);
  expect(res.error).toMatch(/boom/);
});
test('refuses to run a content-context command via the background router', async () => {
  const handler = jest.fn().mockResolvedValue('should not run');
  const registry = { get: () => ({ name: 'scroll-down', context: 'content', handler }) };
  const res = await makeRouter(registry)({ type: 'command', name: 'scroll-down', args: [] });
  expect(res.ok).toBe(false);
  expect(res.error).toMatch(/not allowed in background/);
  expect(handler).not.toHaveBeenCalled();
});
test('refuses a command with no/unknown context', async () => {
  const handler = jest.fn();
  const registry = { get: () => ({ name: 'mystery', handler }) };
  const res = await makeRouter(registry)({ type: 'command', name: 'mystery', args: [] });
  expect(res.ok).toBe(false);
  expect(handler).not.toHaveBeenCalled();
});
