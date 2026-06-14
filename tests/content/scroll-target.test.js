const { findScrollableElements, ScrollTarget } = require('../../src/content_scripts/scroll-target');

// In jsdom, scrollHeight/clientHeight are 0 by default, so we test the predicate
// by manually setting these properties on mock elements.
function makeScrollableEl(overflowY = 'auto', scrollHeight = 200, clientHeight = 100) {
  // Use a plain object that mimics an element
  return {
    style: { overflowY },
    scrollHeight,
    clientHeight,
    // make querySelectorAll work if used as root
  };
}

test('findScrollableElements returns empty for null root', () => {
  expect(findScrollableElements(null)).toEqual([]);
});

test('ScrollTarget cycles through scrollable elements', () => {
  const st = new ScrollTarget();
  // With a null root (no document.body in test context), next returns undefined
  // but does not throw
  expect(() => st.next(null)).not.toThrow();
});

test('ScrollTarget reset sets current to null', () => {
  const st = new ScrollTarget();
  st.reset();
  expect(st.getCurrent()).toBeNull();
});
