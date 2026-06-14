'use strict';

const { parseMeta, globToRegExp, matchScripts } = require('../../src/core/userscripts');
test('parseMeta extracts @name and @match directives', () => {
  const src = `// ==UserScript==\n// @name   Hello\n// @match  https://*.example.com/*\n// @match  https://test.org/*\n// ==/UserScript==\nconsole.log('hi');`;
  const meta = parseMeta(src);
  expect(meta.name).toBe('Hello');
  expect(meta.match).toEqual(['https://*.example.com/*', 'https://test.org/*']);
});
test('globToRegExp matches @match patterns with * wildcards', () => {
  const re = globToRegExp('https://*.example.com/*');
  expect(re.test('https://www.example.com/page')).toBe(true);
  expect(re.test('https://example.com/page')).toBe(false); // *. requires a subdomain segment
  expect(re.test('http://www.example.com/')).toBe(false);   // scheme mismatch
});
test('matchScripts returns scripts whose match patterns include the url', () => {
  const scripts = [
    { name:'A', match:['https://*.example.com/*'], body:'1' },
    { name:'B', match:['https://other.com/*'], body:'2' },
  ];
  const m = matchScripts('https://www.example.com/x', scripts);
  expect(m.map(s => s.name)).toEqual(['A']);
});
