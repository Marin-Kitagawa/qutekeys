'use strict';

const { isSafeNavUrl } = require('../../src/core/url-safety');

describe('isSafeNavUrl — dangerous scheme allowlist', () => {
  test('rejects javascript: / data: / vbscript: / blob: / file:', () => {
    expect(isSafeNavUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeNavUrl('JavaScript:alert(1)')).toBe(false);
    expect(isSafeNavUrl('  javascript:alert(1)')).toBe(false);
    expect(isSafeNavUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeNavUrl('vbscript:msgbox(1)')).toBe(false);
    expect(isSafeNavUrl('blob:https://x/abc')).toBe(false);
    expect(isSafeNavUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeNavUrl('filesystem:https://x/temp')).toBe(false);
  });

  test('allows http/https/ftp/mailto and bare hosts/phrases', () => {
    expect(isSafeNavUrl('https://example.com')).toBe(true);
    expect(isSafeNavUrl('http://example.com/x')).toBe(true);
    expect(isSafeNavUrl('ftp://files.example.com')).toBe(true);
    expect(isSafeNavUrl('mailto:a@b.com')).toBe(true);
    expect(isSafeNavUrl('example.com/foo')).toBe(true);
    expect(isSafeNavUrl('search terms here')).toBe(true);
  });

  test('rejects empty / non-string', () => {
    expect(isSafeNavUrl('')).toBe(false);
    expect(isSafeNavUrl('   ')).toBe(false);
    expect(isSafeNavUrl(null)).toBe(false);
    expect(isSafeNavUrl(undefined)).toBe(false);
    expect(isSafeNavUrl(123)).toBe(false);
  });

  test('rejects unknown/custom schemes that are not on the allowlist', () => {
    expect(isSafeNavUrl('chrome://settings')).toBe(false);
    expect(isSafeNavUrl('chrome-extension://abc/x')).toBe(false);
  });
});
