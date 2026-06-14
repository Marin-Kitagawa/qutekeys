'use strict';

const { markdownLink, formatYank } = require('../../src/content_scripts/clipboard');
test('markdownLink builds a markdown link, escaping brackets in the title', () => {
  expect(markdownLink('Example', 'https://e.com')).toBe('[Example](https://e.com)');
  expect(markdownLink('a [b] c', 'https://e.com')).toBe('[a \\[b\\] c](https://e.com)');
});
test('formatYank produces the right string per kind', () => {
  const page = { title: 'My Page', url: 'https://e.com/p', selection: 'picked text' };
  expect(formatYank('url', page)).toBe('https://e.com/p');
  expect(formatYank('title', page)).toBe('My Page');
  expect(formatYank('mdlink', page)).toBe('[My Page](https://e.com/p)');
  expect(formatYank('selection', page)).toBe('picked text');
});
