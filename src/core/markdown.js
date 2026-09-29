'use strict';

/**
 * Minimal, escape-first Markdown → HTML renderer (Wave 8 markdown preview).
 *
 * Pure function — no DOM, fully testable. Every text run is HTML-escaped
 * BEFORE any inline markup is applied, so untrusted markdown can never inject
 * markup beyond the constructs this renderer itself produces. Only
 * http(s)/mailto links are emitted as <a>; everything else stays text.
 *
 * Supported blocks:
 *   # … ###### headings, - / * / + and 1. lists (nested by 2 spaces),
 *   > blockquotes, ``` fenced code blocks, --- / *** rules, paragraphs.
 * Supported inline: **bold**, *italic*, `code`, [text](url), autolinks.
 */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeHref(url) {
  const trimmed = String(url || '').trim();
  return (/^(https?:\/\/|mailto:)/i.test(trimmed)) ? trimmed : null;
}

function autolink(escaped) {
  // http(s) URLs already escaped (no < > & quotes remain raw except entities)
  return escaped.replace(/\bhttps?:\/\/[^\s<>"')\]]+/g, (m) => {
    return `<a href="${m}">${m}</a>`;
  });
}

function renderInline(text) {
  let out = escapeHtml(text);
  // Inline code first — protect its content from further formatting
  const codeParts = [];
  out = out.replace(/`([^`]+)`/g, (_, code) => {
    codeParts.push(code);
    return `\u0000${codeParts.length - 1}\u0000`;
  });
  // Markdown links next — stash the produced <a> so autolink cannot
  // double-wrap the href inside the attribute.
  const links = [];
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => {
    const safe = safeHref(href);
    if (!safe) return m;
    links.push(`<a href="${safe}">${label}</a>`);
    return `\u0001${links.length - 1}\u0001`;
  });
  out = autolink(out);
  out = out.replace(/\u0001(\d+)\u0001/g, (_, i) => links[Number(i)]);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Restore inline code
  out = out.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codeParts[Number(i)]}</code>`);
  return out;
}

/**
 * Render markdown text to an HTML string.
 * @param {string} markdown
 * @returns {string}
 */
function renderMarkdown(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const out = [];
  let i = 0;

  let listStack = []; // 'ul' | 'ol'

  function closeListsTo(depth) {
    while (listStack.length > depth) {
      out.push(`</${listStack.pop()}>`);
    }
  }

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      closeListsTo(0);
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      const lang = fence[1] || '';
      const langAttr = lang ? ` data-lang="${escapeHtml(lang)}"` : '';
      out.push(`<pre${langAttr}><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    // Heading
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeListsTo(0);
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      closeListsTo(0);
      out.push('<hr>');
      i++;
      continue;
    }

    // Blockquote
    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      closeListsTo(0);
      const quoteLines = [quote[1]];
      i++;
      while (i < lines.length) {
        const m = lines[i].match(/^\s*>\s?(.*)$/);
        if (!m) break;
        quoteLines.push(m[1]);
        i++;
      }
      out.push(`<blockquote><p>${quoteLines.map(renderInline).join('<br>')}</p></blockquote>`);
      continue;
    }

    // Unordered list item
    const ul = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (ul) {
      const depth = Math.floor(ul[1].length / 2);
      if (listStack.length <= depth || listStack[listStack.length - 1] === 'ol') {
        closeListsTo(depth);
        listStack.push('ul');
        out.push('<ul>');
      }
      out.push(`<li>${renderInline(ul[2])}</li>`);
      i++;
      continue;
    }

    // Ordered list item
    const ol = line.match(/^(\s*)\d+[.)]\s+(.*)$/);
    if (ol) {
      const depth = Math.floor(ol[1].length / 2);
      if (listStack.length <= depth || listStack[listStack.length - 1] === 'ul') {
        closeListsTo(depth);
        listStack.push('ol');
        out.push('<ol>');
      }
      out.push(`<li>${renderInline(ol[2])}</li>`);
      i++;
      continue;
    }

    // Blank line
    if (/^\s*$/.test(line)) {
      closeListsTo(0);
      i++;
      continue;
    }

    // Paragraph (consume consecutive non-empty, non-structural lines)
    closeListsTo(0);
    const paraLines = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^\s*>/.test(lines[i]) &&
      !/^(\s*)[-*+]\s+/.test(lines[i]) &&
      !/^(\s*)\d+[.)]\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    out.push(`<p>${paraLines.map(renderInline).join('<br>')}</p>`);
  }

  closeListsTo(0);
  return out.join('\n');
}

const api = { renderMarkdown, escapeHtml, renderInline };

// CommonJS (content-script / tests) and browser-global (markdown preview page)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof window !== 'undefined') {
  window.__qutesurfRenderMarkdown = renderMarkdown;
}
