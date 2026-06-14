'use strict';

/**
 * clipboard.js — pure formatters + Clipboard helper.
 *
 * Import-safe under Jest/Node: all DOM/global access is guarded inside
 * function bodies or behind typeof checks, never at module load time.
 */

// ── Pure formatters ──────────────────────────────────────────────────────────

/**
 * Build a Markdown link.  Square brackets inside the title are
 * backslash-escaped so the output is valid Markdown.
 *
 * @param {string} title
 * @param {string} url
 * @returns {string}
 */
function markdownLink(title, url) {
  const escaped = title.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
  return `[${escaped}](${url})`;
}

/**
 * Format a page descriptor into the string representation selected by `kind`.
 *
 * @param {'url'|'title'|'mdlink'|'selection'|'anchor'} kind
 * @param {{ title: string, url: string, selection?: string, anchor?: string }} page
 * @returns {string}
 */
function formatYank(kind, page) {
  switch (kind) {
    case 'url':       return page.url;
    case 'title':     return page.title;
    case 'mdlink':    return markdownLink(page.title, page.url);
    case 'selection': return page.selection || '';
    case 'anchor':    return page.anchor || '';
    default:          return page.url;
  }
}

// ── Clipboard helper ─────────────────────────────────────────────────────────

const Clipboard = {
  /**
   * Write text to the clipboard.
   *
   * Uses navigator.clipboard.writeText when available (modern browsers /
   * secure contexts).  Falls back to the deprecated textarea +
   * document.execCommand('copy') approach for older environments.
   *
   * @param {string} text
   * @returns {Promise<void>}
   */
  async write(text) {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      await navigator.clipboard.writeText(text);
      return;
    }

    // Fallback: textarea + execCommand
    if (typeof document === 'undefined') return;

    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.left = '-9999px';
    document.documentElement.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
    } finally {
      ta.remove();
    }
  },

  /**
   * Read text from the clipboard.
   *
   * Uses navigator.clipboard.readText when available; returns '' otherwise.
   *
   * @returns {Promise<string>}
   */
  async read() {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.readText === 'function'
    ) {
      return navigator.clipboard.readText();
    }
    return '';
  },

  /**
   * Gather a page descriptor from the current document.
   *
   * Returns a safe empty descriptor when called outside a browser context.
   *
   * @returns {{ title: string, url: string, selection: string, anchor: string }}
   */
  currentPage() {
    if (typeof document === 'undefined') {
      return { title: '', url: '', selection: '', anchor: '' };
    }

    const title = document.title || '';
    const url   = (typeof location !== 'undefined') ? location.href : '';

    const selection =
      (typeof window !== 'undefined' && window.getSelection)
        ? window.getSelection().toString()
        : '';

    // Nearest anchor: check the actively focused element or the last element
    // that received a mouseenter event (stored on the body dataset by the
    // mouseover listener registered in init).  Fall back to ''.
    let anchor = '';
    if (typeof document !== 'undefined') {
      // Walk up from the focused element looking for an <a href>
      let el = document.activeElement;
      while (el && el !== document.documentElement) {
        if (el.tagName === 'A' && el.href) {
          anchor = el.href;
          break;
        }
        el = el.parentElement;
      }
    }

    return { title, url, selection, anchor };
  },
};

module.exports = { markdownLink, formatYank, Clipboard };
