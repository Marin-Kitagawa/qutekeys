/** @jest-environment jsdom */
const { ShadowHost } = require('../../src/content_scripts/ui/host');
test('creates a shadow root and mounts elements', () => {
  const h = new ShadowHost();
  const div = document.createElement('div'); div.textContent = 'hi';
  h.mount(div);
  expect(h.root).toBeTruthy();
});
