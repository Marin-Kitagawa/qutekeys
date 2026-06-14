const { sourceBadge } = require('../../src/content_scripts/ui/sources');
test('sourceBadge labels items by their source type', () => {
  expect(sourceBadge({ type: 'bookmark' })).toBe('BOOKMARK');
  expect(sourceBadge({ type: 'history' })).toBe('HISTORY');
  expect(sourceBadge({ type: 'tab' })).toBe('TAB');
  expect(sourceBadge({ type: 'command' })).toBe('CMD');
  expect(sourceBadge({ type: 'search' })).toBe('SEARCH');
});
test('sourceBadge maps url and mark', () => {
  const { sourceBadge } = require('../../src/content_scripts/ui/sources');
  expect(sourceBadge({ type:'url' })).toBe('URL');
  expect(sourceBadge({ type:'mark' })).toBe('MARK');
});
