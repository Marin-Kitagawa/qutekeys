'use strict';

const { buildQuery, stepIndex } = require('../../src/content_scripts/find');

test('buildQuery respects case sensitivity and regex flag', () => {
  const q1 = buildQuery('Foo', { caseSensitive: false, regex: false });
  expect(q1.test('a foo bar')).toBe(true);   // case-insensitive literal
  expect(q1.test('a FOO bar')).toBe(true);

  const q2 = buildQuery('Foo', { caseSensitive: true, regex: false });
  expect(q2.test('a foo bar')).toBe(false);   // case-sensitive
  expect(q2.test('a Foo bar')).toBe(true);

  const q3 = buildQuery('f.o', { caseSensitive: false, regex: true });
  expect(q3.test('fxo')).toBe(true);          // regex

  const q4 = buildQuery('a+b', { caseSensitive: false, regex: false });
  expect(q4.test('a+b')).toBe(true);          // literal escapes regex meta
  expect(q4.test('aaab')).toBe(false);
});

test('stepIndex wraps forward and backward over match count', () => {
  expect(stepIndex(0, +1, 3)).toBe(1);
  expect(stepIndex(2, +1, 3)).toBe(0);   // wrap forward
  expect(stepIndex(0, -1, 3)).toBe(2);   // wrap backward
  expect(stepIndex(1, -1, 3)).toBe(0);
  expect(stepIndex(0, +1, 0)).toBe(-1);  // no matches → -1
});
