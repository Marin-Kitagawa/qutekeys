/** @jest-environment jsdom */
const { renderWhichKey } = require('../../src/content_scripts/ui/whichkey');
test('renderWhichKey lists each candidate sequence and its command', () => {
  const el = renderWhichKey(['gg','gi','gt'], seq => ({ gg:'scroll-to-top', gi:'hint-input', gt:'omnibar-tabs' }[seq]));
  const text = el.textContent;
  expect(text).toContain('gg'); expect(text).toContain('scroll-to-top');
  expect(text).toContain('gi'); expect(text).toContain('hint-input');
  expect(text).toContain('gt'); expect(text).toContain('omnibar-tabs');
});
test('renderWhichKey handles missing command lookup gracefully', () => {
  const el = renderWhichKey(['zz'], () => undefined);
  expect(el.textContent).toContain('zz'); // no throw
});
