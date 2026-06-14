/** @jest-environment jsdom */
const { renderStatus } = require('../../src/content_scripts/ui/statusline');
test('renderStatus shows mode badge, host, and percent', () => {
  const el = renderStatus({ mode: 'normal', host: 'example.com', percent: 34 });
  const text = el.textContent;
  expect(text.toUpperCase()).toContain('NORMAL');
  expect(text).toContain('example.com');
  expect(text).toContain('34%');
});
test('renderStatus reflects different modes', () => {
  expect(renderStatus({ mode:'insert', host:'a.com', percent:0 }).textContent.toUpperCase()).toContain('INSERT');
});
