const { parseCommandLine, splitChain } = require('../../src/core/cmdline');

test('parses name, positional args, short and long flags', () => {
  const p = parseCommandLine('open -t --rapid example.com search terms');
  expect(p.name).toBe('open');
  expect(p.flags).toEqual({ t: true, rapid: true });
  expect(p.args).toEqual(['example.com', 'search', 'terms']);
});

test('respects quoted args', () => {
  expect(parseCommandLine('session-save "my session"').args).toEqual(['my session']);
});

test('splits ;; chains', () => {
  expect(splitChain('clear-keychain ;; search ;; fullscreen --leave'))
    .toEqual(['clear-keychain', 'search', 'fullscreen --leave']);
});
