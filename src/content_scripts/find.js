'use strict';

/**
 * Find — pure match utilities + Find controller for in-page text search.
 *
 * Import-safe under Jest/Node: no DOM globals are accessed at module level.
 * All DOM/window usage is guarded inside the Find class methods.
 */

/**
 * Build a RegExp for the given search text and options.
 *
 * NOTE: Does NOT include the 'g' flag — a global regex with .test() advances
 * lastIndex, making repeated calls on the same object unreliable.  The
 * controller uses a fresh regex (or addeds 'g') when scanning the DOM.
 *
 * @param {string} text
 * @param {{ caseSensitive: boolean, regex: boolean }} opts
 * @returns {RegExp}
 */
function buildQuery(text, { caseSensitive = false, regex = false } = {}) {
  const pattern = regex
    ? text
    : text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const flags = caseSensitive ? '' : 'i';
  return new RegExp(pattern, flags);
}

/**
 * Advance the current match index by `dir` (+1 or -1) within `count` matches,
 * wrapping around.  Returns -1 when there are no matches.
 *
 * @param {number} current  Current zero-based index
 * @param {number} dir      +1 (forward) or -1 (backward)
 * @param {number} count    Total number of matches
 * @returns {number}
 */
function stepIndex(current, dir, count) {
  if (count <= 0) return -1;
  return (current + dir + count) % count;
}

// ─── Find controller ─────────────────────────────────────────────────────────

/**
 * Find controller — renders the Glass find bar into the shadow host, wires
 * keyboard events, highlights matches in the document using <mark> wrappers,
 * and manages find-mode lifecycle.
 *
 * @param {{ host: import('./ui/host').ShadowHost, modes: import('../core/modes').ModeStack, config?: import('../core/config').Config }} opts
 */
class Find {
  constructor({ host, modes, config } = {}) {
    this._host   = host;
    this._modes  = modes;
    this._config = config || null;

    this._marks        = [];   // <mark> elements currently in the DOM
    this._matchIndex   = -1;
    this._lastQuery    = '';
    this._barEl        = null; // find-bar container element
    this._inputEl      = null; // <input> inside the bar
    this._countEl      = null; // count display span
    this._active       = false;
    this._keydownBound = this._onKeydown.bind(this);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Open the find bar and enter find mode.
   * @param {{ backwards?: boolean }} [opts]
   */
  start({ backwards = false } = {}) {
    if (typeof document === 'undefined') return;

    this._backwards = backwards;
    this._renderBar();
    this._modes.enter('find');
    this._active = true;

    // Focus the input after a micro-tick so shadow DOM attachment completes
    if (this._inputEl) {
      this._inputEl.value = this._lastQuery;
      this._inputEl.focus();
      this._inputEl.select();
    }
  }

  /** Move to the next match. */
  next() {
    if (!this._active && this._lastQuery) {
      this._runSearch(this._lastQuery);
    }
    if (this._marks.length === 0) return;
    this._matchIndex = stepIndex(this._matchIndex, +1, this._marks.length);
    this._scrollToMatch();
    this._updateCount();
  }

  /** Move to the previous match. */
  prev() {
    if (!this._active && this._lastQuery) {
      this._runSearch(this._lastQuery);
    }
    if (this._marks.length === 0) return;
    this._matchIndex = stepIndex(this._matchIndex, -1, this._marks.length);
    this._scrollToMatch();
    this._updateCount();
  }

  /** Remove all <mark> wrappers and leave find mode. */
  clearHighlights() {
    this._removeMarks();
    this._closeBar();
    if (this._active) {
      this._modes.leave();
      this._active = false;
    }
  }

  // ── Private — bar rendering ─────────────────────────────────────────────────

  _renderBar() {
    if (!this._host || !this._host.root) return;
    if (this._barEl) return; // already rendered

    const { FINDBAR_CSS } = require('./ui/findbar.css');
    this._host.addStyle(FINDBAR_CSS);

    const bar = document.createElement('div');
    bar.className = 'qs-findbar';

    const input = document.createElement('input');
    input.type        = 'text';
    input.className   = 'qs-findbar__input';
    input.placeholder = 'Find…';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');

    const count = document.createElement('span');
    count.className   = 'qs-findbar__count';
    count.textContent = '';

    bar.appendChild(input);
    bar.appendChild(count);

    this._host.mount(bar);

    this._barEl   = bar;
    this._inputEl = input;
    this._countEl = count;

    // Wire events
    input.addEventListener('input', () => {
      const val = input.value;
      this._lastQuery = val;
      if (val) {
        this._runSearch(val);
      } else {
        this._removeMarks();
        this._updateCount();
      }
    });

    document.addEventListener('keydown', this._keydownBound, true);
  }

  _closeBar() {
    if (this._barEl && this._host && this._host.root) {
      try {
        this._host.root.removeChild(this._barEl);
      } catch (_) { /* already removed */ }
    }
    this._barEl   = null;
    this._inputEl = null;
    this._countEl = null;

    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', this._keydownBound, true);
    }
  }

  // ── Private — keydown handler ───────────────────────────────────────────────

  _onKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.clearHighlights();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        this.prev();
      } else {
        this.next();
      }
    }
  }

  // ── Private — search & highlight ───────────────────────────────────────────

  _runSearch(text) {
    this._removeMarks();
    if (!text) { this._updateCount(); return; }

    const caseSensitive = this._config
      ? Boolean(this._config.get('findcasesensitive'))
      : false;

    // Build a global regex for DOM scanning
    const base = buildQuery(text, { caseSensitive, regex: false });
    const flags = base.flags.includes('g') ? base.flags : base.flags + 'g';
    const re = new RegExp(base.source, flags);

    this._marks = [];

    if (typeof document !== 'undefined') {
      const walker = document.createTreeWalker(
        document.body,
        // eslint-disable-next-line no-undef
        typeof NodeFilter !== 'undefined' ? NodeFilter.SHOW_TEXT : 0x4,
        null,
        false
      );

      const textNodes = [];
      let node;
      while ((node = walker.nextNode())) {
        // Skip nodes inside our own shadow host
        const parent = node.parentElement;
        if (parent && parent.closest && parent.closest('#qutesurf-host')) continue;
        // Skip script/style text
        const tag = parent ? parent.tagName : '';
        if (tag === 'SCRIPT' || tag === 'STYLE') continue;
        if (node.nodeValue && re.test(node.nodeValue)) {
          textNodes.push(node);
        }
        re.lastIndex = 0;
      }

      for (const tn of textNodes) {
        this._highlightNode(tn, re);
        re.lastIndex = 0;
      }
    }

    this._matchIndex = this._marks.length > 0 ? 0 : -1;
    this._scrollToMatch();
    this._updateCount();
  }

  /**
   * Wrap each match in `textNode` with a <mark> element.
   * @param {Text} textNode
   * @param {RegExp} re  Global regex
   */
  _highlightNode(textNode, re) {
    const text = textNode.nodeValue;
    const parent = textNode.parentNode;
    if (!parent) return;

    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    let match;
    re.lastIndex = 0;

    while ((match = re.exec(text)) !== null) {
      if (match.index > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const mark = document.createElement('mark');
      mark.className = 'qs-find-highlight';
      mark.textContent = match[0];
      frag.appendChild(mark);
      this._marks.push(mark);
      lastIndex = re.lastIndex;
      if (match[0].length === 0) { re.lastIndex++; } // guard against zero-length matches
    }

    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    parent.replaceChild(frag, textNode);
  }

  _removeMarks() {
    for (const mark of this._marks) {
      const parent = mark.parentNode;
      if (!parent) continue;
      // Replace mark with its text content
      const text = document.createTextNode(mark.textContent);
      parent.replaceChild(text, mark);
      // Merge adjacent text nodes
      if (parent.normalize) parent.normalize();
    }
    this._marks = [];
    this._matchIndex = -1;
  }

  _scrollToMatch() {
    if (this._matchIndex < 0 || this._matchIndex >= this._marks.length) return;
    const mark = this._marks[this._matchIndex];
    if (mark && mark.scrollIntoView) {
      mark.scrollIntoView({ block: 'center', inline: 'nearest' });
    }
  }

  _updateCount() {
    if (!this._countEl) return;
    const total = this._marks.length;
    if (total === 0) {
      this._countEl.textContent = this._lastQuery ? '0/0' : '';
    } else {
      this._countEl.textContent = `${this._matchIndex + 1}/${total}`;
    }
  }
}

module.exports = { buildQuery, stepIndex, Find };
