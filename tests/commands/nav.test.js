const { scrollDelta, urlUp, urlRoot } = require('../../src/commands/nav-helpers');
test('scrollDelta computes directional deltas', () => {
  const vp = { width: 1000, height: 800 };
  expect(scrollDelta('down', vp, 70)).toEqual({ x: 0, y: 70 });
  expect(scrollDelta('up', vp, 70)).toEqual({ x: 0, y: -70 });
  expect(scrollDelta('left', vp, 70)).toEqual({ x: -70, y: 0 });
  expect(scrollDelta('right', vp, 70)).toEqual({ x: 70, y: 0 });
  expect(scrollDelta('halfpage-down', vp, 70)).toEqual({ x: 0, y: 400 });
  expect(scrollDelta('halfpage-up', vp, 70)).toEqual({ x: 0, y: -400 });
  expect(scrollDelta('page-down', vp, 70)).toEqual({ x: 0, y: 800 });
  expect(scrollDelta('page-up', vp, 70)).toEqual({ x: 0, y: -800 });
});
test('urlUp removes the last path segment', () => {
  expect(urlUp('https://a.com/x/y/z')).toBe('https://a.com/x/y');
  expect(urlUp('https://a.com/x/')).toBe('https://a.com/x');
  expect(urlUp('https://a.com/')).toBe('https://a.com/');
});
test('urlRoot returns the origin root', () => {
  expect(urlRoot('https://a.com/x/y?q=1')).toBe('https://a.com/');
});
