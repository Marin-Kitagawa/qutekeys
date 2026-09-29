'use strict';

/**
 * Inline query bubble (Wave 8, SurfingKeys OmniQuery/`registerInlineQuery`
 * parity).
 *
 * Shows a small shadow-DOM bubble with the response of a user-configured
 * endpoint (config option `inlinequery.url`, a GET template with a %s
 * placeholder — e.g. a dictionary or translate API). The actual HTTP request
 * runs in the background (`inline-query` command) to avoid page-CORS limits.
 *
 * Import-safe under Jest: DOM access guarded.
 */

const { wordAt } = require('./visual');

const BUBBLE_CSS = `
  #qs-inlinequery {
    position: fixed; z-index: 2147483647;
    max-width: 420px; max-height: 320px; overflow-y: auto;
    background: rgba(30, 30, 40, 0.97);
    border: 1px solid rgba(124, 92, 255, 0.45);
    border-radius: 12px; padding: 10px 14px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    color: #e8e8ef; font: 13px/1.5 'Hanken Grotesk', system-ui, sans-serif;
    white-space: pre-wrap; word-break: break-word;
  }
  #qs-inlinequery .qs-iq-query { color: #a78bfa; font-weight: 600; margin-bottom: 4px; }
`;

function InlineQuery({ host, messaging }) {
  let _bubble = null;
  let _escListener = null;

  function close() {
    if (_bubble) { _bubble.remove(); _bubble = null; }
    if (_escListener && typeof document !== 'undefined') {
      document.removeEventListener('keydown', _escListener, true);
      _escListener = null;
    }
  }

  function installEsc() {
    if (_escListener || typeof document === 'undefined') return;
    _escListener = (e) => {
      if (e.key === 'Escape') { close(); e.preventDefault(); e.stopPropagation(); }
    };
    document.addEventListener('keydown', _escListener, true);
  }

  function show(query, response, error) {
    if (typeof document === 'undefined') return;
    close();
    host.replaceStyle('inlinequery', BUBBLE_CSS);
    _bubble = document.createElement('div');
    _bubble.id = 'qs-inlinequery';
    const q = document.createElement('div');
    q.className = 'qs-iq-query';
    q.textContent = query;
    _bubble.appendChild(q);
    const body = document.createElement('div');
    body.textContent = error ? ('⚠ ' + error) : String(response || '(empty response)');
    _bubble.appendChild(body);
    // Anchor near the top-right viewport area, below any selection
    _bubble.style.top = '60px';
    _bubble.style.right = '20px';
    host.mount(_bubble);
    installEsc();
    _bubble.addEventListener('mousedown', () => close());
  }

  /**
   * Look up `text` through the configured endpoint and display the bubble.
   * @param {string} text
   */
  async function query(text) {
    const q = String(text || '').trim();
    if (!q) return;
    if (!messaging || typeof messaging.sendMessage !== 'function') return;
    show(q, '…', null);
    try {
      const res = await messaging.sendMessage({
        type: 'command', name: 'inline-query',
        args: [encodeURIComponent(q)], flags: {}, count: null,
      });
      const value = res && typeof res === 'object' && 'ok' in res
        ? (res.ok ? res.result : null)
        : res;
      if (value == null) {
        const err = (res && res.error) || 'query failed';
        show(q, null, err);
      } else {
        show(q, value, null);
      }
    } catch (err) {
      show(q, null, String(err && err.message ? err.message : err));
    }
  }

  /**
   * Query the word under the caret (or the current selection).
   */
  function queryWord() {
    if (typeof window === 'undefined' || !window.getSelection) return;
    const sel = window.getSelection();
    let text = '';
    if (sel && !sel.isCollapsed) {
      text = sel.toString().trim();
    } else if (sel && sel.focusNode && sel.focusNode.nodeType === 3) {
      text = wordAt(sel.focusNode.textContent || '', sel.focusOffset);
    }
    return query(text);
  }

  return { query, queryWord, close, isVisible: () => !!_bubble };
}

module.exports = { InlineQuery };
