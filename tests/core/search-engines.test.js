const { resolveQuery, isUrlLike, DEFAULT_ENGINES } = require('../../src/core/search-engines');
const opts = { engines: DEFAULT_ENGINES, defaultEngine: 'g' };
test('alias prefix expands to the engine search URL', () => {
  expect(resolveQuery('g cats', opts)).toBe('https://www.google.com/search?q=cats');
  expect(resolveQuery('d hello world', opts)).toBe('https://duckduckgo.com/?q=hello%20world');
});
test('bare URL passes through (adding https when missing)', () => {
  expect(resolveQuery('https://example.com/x', opts)).toBe('https://example.com/x');
  expect(resolveQuery('example.com', opts)).toBe('http://example.com');
});
test('non-URL non-alias uses the default engine', () => {
  expect(resolveQuery('how to vim', opts)).toBe('https://www.google.com/search?q=how%20to%20vim');
});
test('isUrlLike detects urls and domains, not plain phrases', () => {
  expect(isUrlLike('example.com')).toBe(true);
  expect(isUrlLike('https://a.b/c')).toBe(true);
  expect(isUrlLike('localhost:3000')).toBe(true);
  expect(isUrlLike('how to vim')).toBe(false);
  expect(isUrlLike('just-a-word')).toBe(false);
});
