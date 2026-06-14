const { version } = require('../package.json');

test('package has a version', () => {
  expect(version).toBe('0.1.0');
});
