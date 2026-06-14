const { KeyMap } = require('../../src/core/keymap');

test('resolves a complete sequence to a command string', () => {
  const km = new KeyMap();
  km.bind('gg', 'scroll-to-perc 0');
  km.bind('G', 'scroll-to-perc');
  expect(km.feed('g')).toEqual({ status: 'pending', candidates: ['gg'] });
  expect(km.feed('g')).toEqual({ status: 'matched', command: 'scroll-to-perc 0', count: null });
});

test('captures a numeric count prefix', () => {
  const km = new KeyMap(); km.bind('J', 'tab-next');
  expect(km.feed('3')).toEqual({ status: 'pending', candidates: expect.any(Array) });
  expect(km.feed('J')).toEqual({ status: 'matched', command: 'tab-next', count: 3 });
});

test('reports no match for unbound key', () => {
  const km = new KeyMap();
  expect(km.feed('z')).toEqual({ status: 'nomatch' });
});

// Extra test: nomatch mid-sequence resets state so next feed starts fresh
test('nomatch mid-sequence resets, next feed works independently', () => {
  const km = new KeyMap();
  km.bind('gg', 'scroll-to-perc 0');
  km.bind('J', 'tab-next');
  expect(km.feed('g')).toEqual({ status: 'pending', candidates: ['gg'] });
  // 'x' cannot extend 'g' prefix and isn't bound
  expect(km.feed('x')).toEqual({ status: 'nomatch' });
  // After reset, 'J' should resolve cleanly
  expect(km.feed('J')).toEqual({ status: 'matched', command: 'tab-next', count: null });
});

// Extra test: multi-digit count prefix (e.g. 12J)
test('captures multi-digit count prefix', () => {
  const km = new KeyMap();
  km.bind('J', 'tab-next');
  expect(km.feed('1')).toEqual({ status: 'pending', candidates: expect.any(Array) });
  expect(km.feed('2')).toEqual({ status: 'pending', candidates: expect.any(Array) });
  expect(km.feed('J')).toEqual({ status: 'matched', command: 'tab-next', count: 12 });
});

test('resolvePending fires the shorter binding when it is also a prefix', () => {
  const km = new KeyMap(); km.bind('d', 'tab-close'); km.bind('dd', 'tab-only');
  expect(km.feed('d')).toEqual({ status: 'pending', candidates: expect.arrayContaining(['d','dd']) });
  expect(km.resolvePending()).toEqual({ command: 'tab-close', count: null });
  // after resolve, state is reset:
  expect(km.feed('d')).toEqual({ status: 'pending', candidates: expect.arrayContaining(['d','dd']) });
});
