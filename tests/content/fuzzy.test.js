const { fuzzyRank } = require('../../src/content_scripts/ui/fuzzy');
test('ranks subsequence matches and returns highlight ranges', () => {
  const items = ['example.com', 'other-site.org', 'sample-page.net'];
  const res = fuzzyRank('exmpl', items, x => x);
  expect(res[0].item).toBe('example.com');
  expect(res.every(r => Array.isArray(r.ranges))).toBe(true);
  // 'exmpl' is a subsequence of 'example.com'
  expect(res[0].ranges.length).toBeGreaterThan(0);
});
test('non-matching items are excluded', () => {
  const res = fuzzyRank('zzz', ['abc', 'def'], x => x);
  expect(res.length).toBe(0);
});
test('empty query returns all items in original order with empty ranges', () => {
  const res = fuzzyRank('', ['a', 'b'], x => x);
  expect(res.map(r => r.item)).toEqual(['a', 'b']);
  expect(res[0].ranges).toEqual([]);
});
