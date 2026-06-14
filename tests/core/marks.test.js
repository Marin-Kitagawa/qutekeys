'use strict';

const { Config } = require('../../src/core/config');
const { Marks } = require('../../src/core/marks');
function fakeStorage() { const mem = {}; return { get: async k => ({ [k]: mem[k] }), set: async o => { Object.assign(mem, o); } }; }
test('setMark/getMark round-trips a location', async () => {
  const cfg = new Config(fakeStorage()); await cfg.load();
  const marks = new Marks(cfg);
  await marks.setMark('a', { url: 'https://e.com/x', scrollY: 120 });
  expect(marks.getMark('a')).toEqual({ url: 'https://e.com/x', scrollY: 120 });
});
test('quickmarks round-trip and persist through config reload', async () => {
  const store = fakeStorage();
  const cfg = new Config(store); await cfg.load();
  const marks = new Marks(cfg);
  await marks.setQuickmark('gh', 'https://github.com');
  const cfg2 = new Config(store); await cfg2.load();
  const marks2 = new Marks(cfg2);
  expect(marks2.getQuickmark('gh')).toBe('https://github.com');
});
test('listQuickmarks returns all saved quickmarks', async () => {
  const cfg = new Config(fakeStorage()); await cfg.load();
  const marks = new Marks(cfg);
  await marks.setQuickmark('gh', 'https://github.com');
  await marks.setQuickmark('so', 'https://stackoverflow.com');
  expect(marks.listQuickmarks()).toEqual({ gh: 'https://github.com', so: 'https://stackoverflow.com' });
});
