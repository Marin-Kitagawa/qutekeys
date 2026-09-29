'use strict';

const { renderMarkdown, renderInline, escapeHtml } = require('../../src/core/markdown');

describe('markdown renderer (escape-first)', () => {
  test('escapes HTML in text', () => {
    const html = renderMarkdown('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  test('renders headings, hr, paragraphs', () => {
    const html = renderMarkdown('# Title\n\ntext\n\n---\nmore');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<p>text</p>');
    expect(html).toContain('<hr>');
    expect(html).toContain('<p>more</p>');
  });

  test('renders bold, italic, inline code', () => {
    const html = renderInline('a **bold** and *it* and `code`');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>it</em>');
    expect(html).toContain('<code>code</code>');
  });

  test('allows only safe link hrefs', () => {
    const html = renderMarkdown('[x](https://ok.com) [y](javascript:alert(1))');
    expect(html).toContain('href="https://ok.com"');
    // javascript: hrefs are dropped; the syntax stays as escaped plain text
    expect(html).not.toMatch(/<a [^>]*javascript:/);
    expect(html).toContain('[y](javascript:alert(1))');
  });

  test('autolinks plain urls', () => {
    const html = renderInline('see https://example.com/x now');
    expect(html).toContain('<a href="https://example.com/x">https://example.com/x</a>');
  });

  test('fenced code blocks escape content', () => {
    const html = renderMarkdown('```\n<img src=x>\n```');
    expect(html).toContain('&lt;img src=x&gt;');
  });

  test('lists nest and close', () => {
    const html = renderMarkdown('- a\n- b\n  - b1\n\nafter');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>a</li>');
    expect(html).toContain('<li>b1</li>');
    expect(html).toContain('<p>after</p>');
  });

  test('ordered lists', () => {
    const html = renderMarkdown('1. one\n2. two');
    expect(html).toContain('<ol>');
    expect(html).toContain('<li>two</li>');
  });

  test('blockquote groups lines', () => {
    const html = renderMarkdown('> line1\n> line2');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('line1<br>line2');
  });

  test('exposes browser global without breaking CommonJS', () => {
    // In jsdom window exists — the module should have installed the hook
    expect(typeof window.__qutesurfRenderMarkdown).toBe('function');
    expect(window.__qutesurfRenderMarkdown('# hi')).toContain('<h1>hi</h1>');
  });
});
