const { buildPac } = require('../../src/background/proxy');
test('buildPac routes matching hosts through the proxy and others DIRECT', () => {
  const pac = buildPac([{ host: '*.example.com', proxy: 'PROXY 127.0.0.1:8080' }], 'DIRECT');
  expect(typeof pac).toBe('string');
  expect(pac).toContain('FindProxyForURL');
  expect(pac).toContain('example.com');
  expect(pac).toContain('PROXY 127.0.0.1:8080');
  expect(pac).toContain('DIRECT');
});
test('buildPac with no rules returns an all-DIRECT pac', () => {
  const pac = buildPac([], 'DIRECT');
  expect(pac).toContain('return "DIRECT"');
});
test('buildPac escapes/handles multiple rules in order', () => {
  const pac = buildPac([
    { host: '*.a.com', proxy: 'PROXY p1:1' },
    { host: 'b.org',  proxy: 'SOCKS5 p2:2' },
  ], 'DIRECT');
  expect(pac.indexOf('a.com')).toBeLessThan(pac.indexOf('b.org'));
  expect(pac).toContain('SOCKS5 p2:2');
});
