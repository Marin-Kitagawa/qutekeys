'use strict';

const { resolveUrl } = require('../../src/commands/yank-commands');

describe('paste-and-go resolveUrl — dangerous-scheme rejection', () => {
  test('javascript:/data:/vbscript: clipboard text becomes a search, not a navigation', () => {
    expect(resolveUrl('javascript:alert(document.cookie)'))
      .toMatch(/^https:\/\/www\.google\.com\/search\?q=/);
    expect(resolveUrl('data:text/html,<script>alert(1)</script>'))
      .toMatch(/^https:\/\/www\.google\.com\/search\?q=/);
    expect(resolveUrl('vbscript:msgbox(1)'))
      .toMatch(/^https:\/\/www\.google\.com\/search\?q=/);
  });

  test('legitimate URLs still resolve normally', () => {
    expect(resolveUrl('https://example.com/x')).toBe('https://example.com/x');
    expect(resolveUrl('example.com/page')).toBe('https://example.com/page');
    expect(resolveUrl('ftp://files.example.com')).toBe('ftp://files.example.com');
  });

  test('plain text falls back to search', () => {
    expect(resolveUrl('hello world')).toMatch(/^https:\/\/www\.google\.com\/search\?q=/);
  });
});
