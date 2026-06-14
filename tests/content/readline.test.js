const { killToStart, killToEnd, deleteWordBack, wordBack, wordForward } = require('../../src/content_scripts/ui/readline');

test('killToStart removes text before caret', () => {
  const r = killToStart('hello world', 5);
  expect(r.value).toBe(' world');
  expect(r.caret).toBe(0);
});

test('killToEnd removes text from caret to end', () => {
  const r = killToEnd('hello world', 5);
  expect(r.value).toBe('hello');
  expect(r.caret).toBe(5);
});

test('deleteWordBack deletes word before caret', () => {
  const r = deleteWordBack('hello world', 11);
  expect(r.value).toBe('hello ');
  expect(r.caret).toBe(6);
});

test('deleteWordBack skips trailing space then deletes word', () => {
  const r = deleteWordBack('foo bar  ', 9);
  expect(r.value).toBe('foo ');
  expect(r.caret).toBe(4);
});

test('deleteWordBack at caret 0 is a no-op', () => {
  const r = deleteWordBack('hello', 0);
  expect(r.value).toBe('hello');
  expect(r.caret).toBe(0);
});

test('wordBack moves to start of previous word', () => {
  expect(wordBack('hello world', 11)).toBe(6);
  expect(wordBack('hello world', 6)).toBe(0);
  expect(wordBack('hello world', 0)).toBe(0);
});

test('wordForward moves to end of next word', () => {
  expect(wordForward('hello world', 0)).toBe(5);
  expect(wordForward('hello world', 5)).toBe(11);
  expect(wordForward('hello world', 11)).toBe(11);
});

test('wordForward skips leading spaces', () => {
  expect(wordForward('hello  world', 5)).toBe(12);
});
