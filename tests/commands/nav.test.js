const { scrollDelta, urlUp, urlRoot, stripQuery, stripHash, incrementUrl, findRelLink } = require('../../src/commands/nav-helpers');

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

// ── Wave 5: new nav-helper tests ─────────────────────────────────────────────

test('stripQuery removes the query string and everything after', () => {
  expect(stripQuery('https://a.com/path?foo=1&bar=2')).toBe('https://a.com/path');
  expect(stripQuery('https://a.com/path?foo=1#hash')).toBe('https://a.com/path');
  expect(stripQuery('https://a.com/path')).toBe('https://a.com/path');
  expect(stripQuery('https://a.com/')).toBe('https://a.com/');
});

test('stripHash removes the fragment and everything after', () => {
  expect(stripHash('https://a.com/path#section')).toBe('https://a.com/path');
  expect(stripHash('https://a.com/path?q=1#section')).toBe('https://a.com/path?q=1');
  expect(stripHash('https://a.com/path')).toBe('https://a.com/path');
});

test('incrementUrl increments the last number in a URL', () => {
  expect(incrementUrl('https://a.com/page/3', 1)).toBe('https://a.com/page/4');
  expect(incrementUrl('https://a.com/page/3', -1)).toBe('https://a.com/page/2');
  // Last number wins (query param 9 > path segment 3)
  expect(incrementUrl('http://a.com/p3?x=9', 1)).toBe('http://a.com/p3?x=10');
  // Clamp at zero
  expect(incrementUrl('https://a.com/page/0', -5)).toBe('https://a.com/page/0');
  // No number → unchanged
  expect(incrementUrl('https://a.com/no-numbers', 1)).toBe('https://a.com/no-numbers');
  // Multi-digit
  expect(incrementUrl('https://a.com/item/99', 1)).toBe('https://a.com/item/100');
});

// findRelLink tests use the jest-jsdom document global (testEnvironment: 'jsdom')
function makeDoc(html) {
  // DOMParser is available in the jsdom test environment
  return new DOMParser().parseFromString(html, 'text/html');
}

test('findRelLink finds <link rel="next"> in head', () => {
  const doc = makeDoc('<html><head><link rel="next" href="https://a.com/page/2"></head><body></body></html>');
  expect(findRelLink(doc, 'next')).toBe('https://a.com/page/2');
});

test('findRelLink finds <a rel="prev"> in body', () => {
  const doc = makeDoc('<html><body><a rel="prev" href="https://a.com/page/1">Back</a></body></html>');
  expect(findRelLink(doc, 'prev')).toBe('https://a.com/page/1');
});

test('findRelLink falls back to heuristic anchor text "Next"', () => {
  const doc = makeDoc('<html><body><a href="https://a.com/3">Next</a></body></html>');
  expect(findRelLink(doc, 'next')).toBe('https://a.com/3');
});

test('findRelLink returns null when no link matches', () => {
  const doc = makeDoc('<html><body><p>no links here</p></body></html>');
  expect(findRelLink(doc, 'next')).toBeNull();
});
