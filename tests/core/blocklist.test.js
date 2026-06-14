const { Blocklist } = require('../../src/core/blocklist');

function makeConfig(initial = []) {
  let data = { blocklist: [...initial] };
  return {
    get(k) { return data[k]; },
    async set(k, v) { data[k] = v; },
    _data: data,
  };
}

test('isBlocked returns false for unknown host', () => {
  const bl = new Blocklist(makeConfig());
  expect(bl.isBlocked('example.com')).toBe(false);
});

test('toggle adds host to blocklist', async () => {
  const cfg = makeConfig();
  const bl = new Blocklist(cfg);
  await bl.toggle('example.com');
  expect(bl.isBlocked('example.com')).toBe(true);
});

test('toggle removes host if already blocked', async () => {
  const cfg = makeConfig(['example.com']);
  const bl = new Blocklist(cfg);
  expect(bl.isBlocked('example.com')).toBe(true);
  await bl.toggle('example.com');
  expect(bl.isBlocked('example.com')).toBe(false);
});

test('toggle persists to config', async () => {
  const cfg = makeConfig();
  const bl = new Blocklist(cfg);
  await bl.toggle('foo.com');
  expect(cfg.get('blocklist')).toContain('foo.com');
});
