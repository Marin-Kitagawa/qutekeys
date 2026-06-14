/** @jest-environment jsdom */
const { extractInputValue, writeBackValue } = require('../../src/content_scripts/ui/editor');
test('extract/writeBack round-trips a textarea value', () => {
  const ta = document.createElement('textarea'); ta.value = 'hello\nworld';
  expect(extractInputValue(ta)).toBe('hello\nworld');
  writeBackValue(ta, 'changed text');
  expect(ta.value).toBe('changed text');
});
test('extract/writeBack round-trips an input value', () => {
  const inp = document.createElement('input'); inp.value = 'abc';
  expect(extractInputValue(inp)).toBe('abc');
  writeBackValue(inp, 'xyz');
  expect(inp.value).toBe('xyz');
});
test('extract/writeBack round-trips a contenteditable element', () => {
  const div = document.createElement('div'); div.setAttribute('contenteditable','true'); div.textContent = 'editable';
  expect(extractInputValue(div)).toBe('editable');
  writeBackValue(div, 'new content');
  expect(div.textContent).toBe('new content');
});
test('writeBackValue dispatches an input event for frameworks', () => {
  const ta = document.createElement('textarea'); let fired = false;
  ta.addEventListener('input', () => { fired = true; });
  writeBackValue(ta, 'x');
  expect(fired).toBe(true);
});
