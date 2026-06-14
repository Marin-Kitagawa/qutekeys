'use strict';

const { Dispatcher } = require('../../src/content_scripts/dispatcher');

test('run passes count to content handler', async () => {
  const handler = jest.fn();
  const registry = { get: () => ({ name:'scroll-down', context:'content', handler }) };
  const d = new Dispatcher(registry, { sendMessage: async()=>({ok:true}) });
  await d.run('scroll-down', { args: [], flags: {}, count: 3 });
  const parsed = handler.mock.calls[0][1];
  expect(parsed.count).toBe(3);
});

test('run forwards count to background message', async () => {
  let sent;
  const registry = { get: () => ({ name:'tab-next', context:'background' }) };
  const d = new Dispatcher(registry, { sendMessage: m => { sent = m; return Promise.resolve({ok:true}); } });
  await d.run('tab-next', { args: [], flags: {}, count: 5 });
  expect(sent.count).toBe(5);
});
