/** @jest-environment jsdom */
const { ShadowHost } = require('../../src/content_scripts/ui/host');
test('creates a shadow root and mounts elements', () => {
  const h = new ShadowHost();
  const div = document.createElement('div'); div.textContent = 'hi';
  h.mount(div);
  expect(h.root).toBeTruthy();
});

test('replaceStyle replaces a previously injected style by marker', () => {
  const h = new ShadowHost();
  h.replaceStyle('theme', ':host { --qs-accent: red; }');
  h.replaceStyle('theme', ':host { --qs-accent: blue; }');
  // Only one theme <style> should exist
  const styles = Array.from(h.root.querySelectorAll('style[data-qs-marker]'));
  expect(styles).toHaveLength(1);
  expect(styles[0].textContent).toContain('blue');
});

test('replaceStyle with new marker creates a new style element', () => {
  const h = new ShadowHost();
  h.replaceStyle('a', ':host { --a: 1; }');
  h.replaceStyle('b', ':host { --b: 2; }');
  const styles = Array.from(h.root.querySelectorAll('style[data-qs-marker]'));
  expect(styles).toHaveLength(2);
});
