'use strict';

const { granularityFor, wordAt, nextCharIndex } = require('../../src/content_scripts/visual');

// ── granularityFor ────────────────────────────────────────────────────────────

test('granularityFor maps basic motions to Selection.modify granularities', () => {
  expect(granularityFor('h')).toEqual({ dir:'left',  granularity:'character' });
  expect(granularityFor('l')).toEqual({ dir:'right', granularity:'character' });
  expect(granularityFor('j')).toEqual({ dir:'right', granularity:'line' });   // down via line
  expect(granularityFor('k')).toEqual({ dir:'left',  granularity:'line' });
  expect(granularityFor('w')).toEqual({ dir:'right', granularity:'word' });
  expect(granularityFor('b')).toEqual({ dir:'left',  granularity:'word' });
  expect(granularityFor('0')).toEqual({ dir:'left',  granularity:'lineboundary' });
  expect(granularityFor('$')).toEqual({ dir:'right', granularity:'lineboundary' });
  expect(granularityFor('z')).toBeNull();
});

test('granularityFor maps word-end motion e', () => {
  expect(granularityFor('e')).toEqual({ dir:'right', granularity:'word' });
});

test('granularityFor maps sentence motions ) and (', () => {
  expect(granularityFor(')')).toEqual({ dir:'right', granularity:'sentence' });
  expect(granularityFor('(')).toEqual({ dir:'left',  granularity:'sentence' });
});

test('granularityFor maps paragraph/block motions } and {', () => {
  expect(granularityFor('}')).toEqual({ dir:'right', granularity:'paragraph' });
  expect(granularityFor('{')).toEqual({ dir:'left',  granularity:'paragraph' });
});

test('granularityFor maps G to document-boundary forward', () => {
  expect(granularityFor('G')).toEqual({ dir:'right', granularity:'documentboundary' });
});

test('granularityFor returns null for unknown keys', () => {
  expect(granularityFor('g')).toBeNull(); // gg is handled by state machine
  expect(granularityFor('o')).toBeNull();
  expect(granularityFor('*')).toBeNull();
  expect(granularityFor('z')).toBeNull();
});

// ── wordAt ────────────────────────────────────────────────────────────────────

test('wordAt returns word at index in middle of word', () => {
  expect(wordAt('hello world', 2)).toBe('hello');
  expect(wordAt('hello world', 7)).toBe('world');
});

test('wordAt returns word when index is at word boundary', () => {
  expect(wordAt('hello world', 0)).toBe('hello');
  expect(wordAt('hello world', 4)).toBe('hello');
  expect(wordAt('hello world', 6)).toBe('world');
  expect(wordAt('hello world', 10)).toBe('world');
});

test('wordAt returns empty string when index is in whitespace', () => {
  expect(wordAt('hello world', 5)).toBe('');
});

test('wordAt returns empty string for out-of-bounds index', () => {
  expect(wordAt('hello', -1)).toBe('');
  expect(wordAt('hello', 5)).toBe('');
  expect(wordAt('hello', 100)).toBe('');
});

test('wordAt returns empty string for empty text', () => {
  expect(wordAt('', 0)).toBe('');
});

test('wordAt handles single word with no spaces', () => {
  expect(wordAt('word', 0)).toBe('word');
  expect(wordAt('word', 3)).toBe('word');
});

test('wordAt handles multiple spaces between words', () => {
  expect(wordAt('foo  bar', 0)).toBe('foo');
  expect(wordAt('foo  bar', 5)).toBe('bar');
  expect(wordAt('foo  bar', 3)).toBe('');   // first space
  expect(wordAt('foo  bar', 4)).toBe('');   // second space
});

// ── nextCharIndex ─────────────────────────────────────────────────────────────

test('nextCharIndex finds next occurrence forward', () => {
  expect(nextCharIndex('hello world', 0, 'l', 'forward')).toBe(2);
  expect(nextCharIndex('hello world', 2, 'l', 'forward')).toBe(3);
  expect(nextCharIndex('hello world', 3, 'l', 'forward')).toBe(9);
});

test('nextCharIndex finds next occurrence backward', () => {
  expect(nextCharIndex('hello world', 10, 'l', 'backward')).toBe(9);
  expect(nextCharIndex('hello world', 9, 'l', 'backward')).toBe(3);
  expect(nextCharIndex('hello world', 3, 'l', 'backward')).toBe(2);
});

test('nextCharIndex returns -1 when not found', () => {
  expect(nextCharIndex('hello', 4, 'z', 'forward')).toBe(-1);
  expect(nextCharIndex('hello', 0, 'z', 'backward')).toBe(-1);
  expect(nextCharIndex('hello', 0, 'h', 'backward')).toBe(-1); // exclusive: starts from index-1
});

test('nextCharIndex excludes fromIndex itself (exclusive)', () => {
  // fromIndex=0, char at 0 is 'h' — forward search starts at 1
  expect(nextCharIndex('hello', 0, 'h', 'forward')).toBe(-1);
  // fromIndex=2 (l), backward search starts at 1 — no 'l' before index 2
  expect(nextCharIndex('hello', 2, 'l', 'backward')).toBe(-1);
});

test('nextCharIndex returns -1 for invalid inputs', () => {
  expect(nextCharIndex('hello', 0, 'xy', 'forward')).toBe(-1); // char must be single
  expect(nextCharIndex(null, 0, 'h', 'forward')).toBe(-1);
});
