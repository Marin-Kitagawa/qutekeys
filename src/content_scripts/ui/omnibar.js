'use strict';

/**
 * Omnibar — Glass overlay that opens in a given source mode, shows ranked
 * suggestions as the user types, and executes the selection on Enter.
 *
 * Module import-safe: no DOM or chrome access at require() time; all DOM
 * access is guarded inside methods.
 */

const { fuzzyRank }    = require('./fuzzy');
const { sourceBadge, urlAndSearch, bookmarks, history, tabs, commands, marks } = require('./sources');
const { OMNIBAR_CSS }  = require('./omnibar.css');
const { isSafeNavUrl } = require('../../core/url-safety');

// Maximum number of results rendered at once
const MAX_RESULTS = 48;

// ── Badge CSS class helper ───────────────────────────────────────────────────
function _badgeClass(type) {
  const MAP = { bookmark: 'badge-bookmark', history: 'badge-history', tab: 'badge-tab',
                command: 'badge-cmd', cmd: 'badge-cmd', search: 'badge-search',
                url: 'badge-url', mark: 'badge-mark' };
  return MAP[type] || '';
}

// ── Highlight ranges → HTML (safe, no XSS — text nodes split around spans) ──
function _highlightHtml(text, ranges) {
  if (!ranges || !ranges.length) return _escHtml(text);
  let result = '';
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) result += _escHtml(text.slice(cursor, start));
    result += `<span class="qs-omni-hl">${_escHtml(text.slice(start, end))}</span>`;
    cursor = end;
  }
  if (cursor < text.length) result += _escHtml(text.slice(cursor));
  return result;
}

function _escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Favicon URL ──────────────────────────────────────────────────────────────
function _faviconUrl(url) {
  if (!url) return null;
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`; } catch (_) { return null; }
}

// ────────────────────────────────────────────────────────────────────────────
class Omnibar {
  /**
   * @param {{ host, modes, dispatcher, registry, config, messaging }} opts
   */
  constructor({ host, modes, dispatcher, registry, config, messaging } = {}) {
    this._host       = host;
    this._modes      = modes;
    this._dispatcher = dispatcher;
    this._registry   = registry;
    this._config     = config;
    this._messaging  = messaging;

    this._overlay    = null;
    this._input      = null;
    this._resultsList= null;
    this._results    = [];   // current ranked result objects
    this._selected   = 0;
    this._sourceName = null;
    this._styleInjected = false;
    this._onKey      = this._handleKey.bind(this);
    this._onOverlayClick = this._handleOverlayClick.bind(this);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  open(sourceName) {
    if (this._overlay) this.close();

    this._sourceName = sourceName;

    if (this._modes) this._modes.enter('command');

    this._render();
    this._query('');

    if (this._input) this._input.focus();
  }

  close() {
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
    }
    this._overlay = null;
    this._input   = null;
    this._resultsList = null;

    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', this._onKey, true);
    }

    if (this._modes) this._modes.leave();
  }

  // ── DOM rendering ──────────────────────────────────────────────────────────

  _injectStyle() {
    if (this._styleInjected) return;
    if (this._host && this._host.addStyle) {
      this._host.addStyle(OMNIBAR_CSS);
      this._styleInjected = true;
    }
  }

  _render() {
    if (typeof document === 'undefined') return;

    this._injectStyle();

    const overlay = document.createElement('div');
    overlay.id = 'qs-omnibar-overlay';

    const panel = document.createElement('div');
    panel.id = 'qs-omnibar-panel';

    // Input row
    const inputRow = document.createElement('div');
    inputRow.id = 'qs-omnibar-input-row';

    const dot = document.createElement('div');
    dot.id = 'qs-omnibar-dot';

    const input = document.createElement('input');
    input.id = 'qs-omnibar-input';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = this._placeholderFor(this._sourceName);

    inputRow.appendChild(dot);
    inputRow.appendChild(input);

    // Results list
    const results = document.createElement('div');
    results.id = 'qs-omnibar-results';

    panel.appendChild(inputRow);
    panel.appendChild(results);
    overlay.appendChild(panel);

    this._overlay      = overlay;
    this._input        = input;
    this._resultsList  = results;

    // Wire events
    input.addEventListener('input', () => this._query(input.value));
    overlay.addEventListener('mousedown', this._onOverlayClick);
    document.addEventListener('keydown', this._onKey, true);

    // Mount into shadow host or document body
    if (this._host && this._host.mount) {
      this._host.mount(overlay);
    } else {
      (document.body || document.documentElement).appendChild(overlay);
    }
  }

  _renderResults() {
    if (!this._resultsList) return;
    const list = this._resultsList;
    list.innerHTML = '';

    if (!this._results.length) {
      const empty = document.createElement('div');
      empty.id = 'qs-omnibar-empty';
      empty.textContent = 'No results';
      list.appendChild(empty);
      return;
    }

    for (let i = 0; i < this._results.length; i++) {
      const { item, ranges } = this._results[i];
      const row = document.createElement('div');
      row.className = 'qs-omni-row' + (i === this._selected ? ' selected' : '');
      row.dataset.index = String(i);

      // Favicon
      const favUrl = _faviconUrl(item.url);
      if (favUrl) {
        const img = document.createElement('img');
        img.className = 'qs-omni-favicon';
        img.src = favUrl;
        img.width = 16; img.height = 16;
        img.onerror = () => { img.style.display = 'none'; };
        row.appendChild(img);
      } else {
        const ph = document.createElement('div');
        ph.className = 'qs-omni-favicon-placeholder';
        row.appendChild(ph);
      }

      // Text
      const textBlock = document.createElement('div');
      textBlock.className = 'qs-omni-text';

      const titleEl = document.createElement('div');
      titleEl.className = 'qs-omni-title';
      titleEl.innerHTML = _highlightHtml(item.title || item.url || item.name || '', ranges);

      textBlock.appendChild(titleEl);

      if (item.url) {
        const urlEl = document.createElement('div');
        urlEl.className = 'qs-omni-url';
        urlEl.textContent = item.url;
        textBlock.appendChild(urlEl);
      }

      row.appendChild(textBlock);

      // Badge
      const badge = sourceBadge(item);
      if (badge) {
        const badgeEl = document.createElement('span');
        badgeEl.className = `qs-omni-badge ${_badgeClass(item.type)}`;
        badgeEl.textContent = badge;
        row.appendChild(badgeEl);
      }

      // Click handler
      row.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this._selected = i;
        this._execute();
      });

      list.appendChild(row);
    }
  }

  // ── Source resolution ──────────────────────────────────────────────────────

  async _query(q) {
    const rawItems = await this._resolveSource(this._sourceName, q);
    const searchKey = item => [item.title, item.url, item.name, item.description].filter(Boolean).join(' ');
    const ranked = fuzzyRank(q, rawItems, searchKey);
    this._results = ranked.slice(0, MAX_RESULTS);
    this._selected = 0;
    this._renderResults();
  }

  async _resolveSource(name, q) {
    const m = this._messaging;
    const r = this._registry;
    const c = this._config;

    switch (name) {
      case 'open':
      case 'open-newtab': {
        const [u, h, b] = await Promise.all([
          urlAndSearch(q, {}),
          history(q, m),
          bookmarks(q, m),
        ]);
        return [...u, ...h, ...b];
      }
      case 'bookmarks':
        return bookmarks(q, m);
      case 'history':
        return history(q, m);
      case 'tabs':
        return tabs(q, m);
      case 'commands':
        return commands(q, r);
      case 'marks':
        return marks(q, c);
      default:
        return commands(q, r);
    }
  }

  // ── Execution ──────────────────────────────────────────────────────────────

  _execute() {
    if (!this._results.length) {
      // If there's text in the input, treat it as a URL/search
      const val = this._input ? this._input.value.trim() : '';
      if (val) {
        this._openUrl(val, this._sourceName === 'open-newtab');
      }
      this.close();
      return;
    }

    const { item } = this._results[this._selected] || {};
    if (!item) { this.close(); return; }

    const action = item.action || {};
    this.close();

    switch (action.kind) {
      case 'open':
        this._openUrl(action.url, this._sourceName === 'open-newtab');
        break;
      case 'activate-tab':
        if (this._messaging) {
          this._messaging.sendMessage({ type: 'command', name: 'tab-activate', args: [action.tabId], flags: {}, count: null }).catch(() => {});
        }
        break;
      case 'run-command':
        if (this._dispatcher) {
          this._dispatcher.run(action.name, { args: [], flags: {} }).catch(() => {});
        }
        break;
      default:
        if (action.url) this._openUrl(action.url, false);
    }
  }

  _openUrl(url, newTab) {
    // Defense-in-depth: never navigate to a dangerous scheme that may have
    // arrived via an attacker-controlled bookmark/history/mark URL.
    if (!isSafeNavUrl(url)) return;

    const finalUrl = /^https?:\/\//i.test(url) ? url
      : url.includes('.') ? 'https://' + url
      : `https://www.google.com/search?q=${encodeURIComponent(url)}`;

    if (newTab && this._messaging) {
      this._messaging.sendMessage({ type: 'command', name: 'tab-new', args: [finalUrl], flags: {}, count: null }).catch(() => {});
    } else if (typeof location !== 'undefined') {
      location.href = finalUrl;
    }
  }

  // ── Keyboard navigation ────────────────────────────────────────────────────

  _handleKey(e) {
    switch (e.key) {
      case 'Escape':
        e.preventDefault(); e.stopPropagation();
        this.close();
        break;
      case 'Enter':
        e.preventDefault(); e.stopPropagation();
        this._execute();
        break;
      case 'ArrowDown':
      case 'Tab':
        e.preventDefault(); e.stopPropagation();
        this._moveSelection(1);
        break;
      case 'ArrowUp':
        e.preventDefault(); e.stopPropagation();
        this._moveSelection(-1);
        break;
      case 'n':
        if (e.ctrlKey) { e.preventDefault(); e.stopPropagation(); this._moveSelection(1); }
        break;
      case 'p':
        if (e.ctrlKey) { e.preventDefault(); e.stopPropagation(); this._moveSelection(-1); }
        break;
    }
  }

  _handleOverlayClick(e) {
    // Click directly on the overlay backdrop (not the panel) → close
    if (e.target === this._overlay) this.close();
  }

  _moveSelection(delta) {
    if (!this._results.length) return;
    this._selected = (this._selected + delta + this._results.length) % this._results.length;
    this._renderResults();
    // Scroll selected row into view
    if (this._resultsList) {
      const rows = this._resultsList.querySelectorAll('.qs-omni-row');
      if (rows[this._selected]) rows[this._selected].scrollIntoView({ block: 'nearest' });
    }
  }

  _placeholderFor(name) {
    const MAP = {
      'open': 'Open URL or search…',
      'open-newtab': 'Open in new tab…',
      'bookmarks': 'Search bookmarks…',
      'history': 'Search history…',
      'tabs': 'Switch to tab…',
      'commands': 'Run command…',
      'marks': 'Jump to mark…',
    };
    return MAP[name] || 'Type to search…';
  }
}

module.exports = { Omnibar };
