const { Dispatcher } = require('../../src/content_scripts/dispatcher');
test('runs content command locally, sends background command over messaging', async () => {
  const sent = [];
  const contentHandler = jest.fn();
  const registry = { get: n => ({
    'scroll-down': { name:'scroll-down', context:'content', handler: contentHandler },
    'tab-close':  { name:'tab-close',  context:'background' },
  }[n]) };
  const d = new Dispatcher(registry, { sendMessage: m => { sent.push(m); return Promise.resolve({ ok:true }); } });
  await d.run('scroll-down', { count: 2 });
  expect(contentHandler).toHaveBeenCalled();
  await d.run('tab-close', {});
  expect(sent[0]).toMatchObject({ type:'command', name:'tab-close' });
});
test('forwards a background command that is NOT in the content registry', async () => {
  // Background commands (tab-next, tab-close, …) live only in the background
  // registry, so the content-side registry returns null for them. They must
  // still be forwarded to the background, not dropped as "unknown".
  const sent = [];
  const registry = { get: () => null };
  const d = new Dispatcher(registry, { sendMessage: m => { sent.push(m); return Promise.resolve({ ok: true }); } });
  await d.run('tab-next', { count: 3 });
  expect(sent[0]).toMatchObject({ type: 'command', name: 'tab-next', count: 3 });
});
test('run parses a command string with args into name + parsed', async () => {
  const handler = jest.fn();
  const registry = { get: () => ({ name:'omnibar-open', context:'content', handler }) };
  const d = new Dispatcher(registry, { sendMessage: async()=>({ok:true}) });
  await d.runString('omnibar-open https://example.com');
  expect(handler).toHaveBeenCalled();
  const parsed = handler.mock.calls[0][1];
  expect(parsed.args).toContain('https://example.com');
});
