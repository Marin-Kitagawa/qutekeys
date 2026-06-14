'use strict';

/**
 * QuteSurf Hints Engine
 *
 * Pure functions (unit-tested):
 *   generateHintLabels(count, charset) → string[]
 *   collectTargets(root?)              → Element[]
 *   filterTargets(hints, typed)        → { matches, exact }
 *   isUrlLike(text)                    → boolean
 *   getTableColumnCells(th)            → Element[]
 *   joinYankedUrls(hrefs)              → string
 *
 * HintsController — ties pure logic to ModeStack, ShadowHost, and Dispatcher.
 * All DOM/window access is guarded so requiring this module under Node/Jest
 * does not crash.
 */

const { isSafeNavUrl } = require('../core/url-safety');

// ── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Generate `count` unique uppercase labels from `charset`.
 *
 * Uses a Vimium-style breadth-first leaf-only algorithm so labels are as
 * short as possible and the set is guaranteed prefix-free: no label is a
 * strict prefix of another label in the returned array.
 *
 * Algorithm (BFS leaf promotion):
 *   Seed a queue with all single-character candidates.  While the queue has
 *   fewer entries than `count`, dequeue the front entry (it becomes an
 *   internal/consumed node) and enqueue all its children.  Return the first
 *   `count` remaining queue entries — these are all leaves, so no returned
 *   label is a prefix of another.
 *
 * @param {number} count
 * @param {string} charset  — e.g. 'ASDFGHJKL'
 * @returns {string[]}
 */
function generateHintLabels(count, charset) {
  const chars = [...new Set(charset.toUpperCase().split(''))]; // dedupe
  if (count <= 0) return [];

  // Prefix-free BFS (Vimium-style leaf-only algorithm):
  //
  // Maintain a queue of candidate leaf labels.  Whenever we need more labels
  // than the queue contains, dequeue the front entry (it becomes an internal
  // node, so it can never be returned as a leaf) and enqueue all its children.
  // Return the first `count` entries left in the queue — all are leaves whose
  // ancestors were consumed, so no returned label is a prefix of another.
  const queue = [...chars]; // seed with single-char candidates

  let i = 0; // index of the next candidate to potentially expand
  while (queue.length - i < count) {
    const prefix = queue[i++]; // promote to internal node (never returned)
    for (const ch of chars) {
      queue.push(prefix + ch);
    }
  }

  // The remaining queue entries from index i onwards are all leaves.
  return queue.slice(i, i + count).sort();
}

// ── Pure Wave-2 helpers ──────────────────────────────────────────────────────

/**
 * Return true if `text` looks like a bare URL (starts with a common scheme or
 * www.) — used by hint-detect-links to find URL-like text nodes.
 *
 * @param {string} text
 * @returns {boolean}
 */
function isUrlLike(text) {
  if (typeof text !== 'string') return false;
  const t = text.trim();
  return /^(https?:\/\/|ftp:\/\/|www\.)\S+/.test(t);
}

/**
 * Given a table header cell (`<th>`) or a table data cell that is the column
 * head, return all data cells in the same column index across all body rows.
 *
 * Works by finding the column index of `th` in its row and then collecting
 * the Nth cell from every sibling `<tr>` that follows the header row.
 *
 * @param {Element} th   - The header cell element
 * @returns {Element[]}  - Body cells in that column
 */
function getTableColumnCells(th) {
  if (!th) return [];
  const row = th.closest('tr');
  if (!row) return [];
  const table = row.closest('table');
  if (!table) return [];

  // Determine the column index of th within its row
  const headerCells = Array.from(row.cells || row.querySelectorAll('td,th'));
  const colIdx = headerCells.indexOf(th);
  if (colIdx === -1) return [];

  // Collect all rows after the header row
  const allRows = Array.from(table.querySelectorAll('tr'));
  const headerRowIdx = allRows.indexOf(row);
  const bodyRows = allRows.slice(headerRowIdx + 1);

  return bodyRows.reduce((acc, tr) => {
    const cells = tr.cells || tr.querySelectorAll('td,th');
    const cell = cells[colIdx];
    if (cell) acc.push(cell);
    return acc;
  }, []);
}

/**
 * Join an array of accumulated href strings for multi-yank output.
 *
 * @param {string[]} hrefs
 * @returns {string}
 */
function joinYankedUrls(hrefs) {
  return hrefs.join('\n');
}

// ── Interactive element selectors ────────────────────────────────────────────

/** Selector for elements that should receive hint labels by default. */
const HINT_SELECTOR = [
  'a[href]',
  'button',
  'input:not([type=hidden])',
  'select',
  'textarea',
  'summary',
  '[role=button]',
  '[role=link]',
  '[role=menuitem]',
  '[role=option]',
  '[role=tab]',
  '[onclick]',
  '[tabindex]',
].join(',');

const IMAGE_SELECTOR = 'img[src]';

const INPUT_SELECTOR = 'input:not([type=hidden]), select, textarea';

/** Wave-2 selectors */
const LINKS_SELECTOR        = 'a[href]';
const MEDIA_SELECTOR        = 'img, button';
const PRE_SELECTOR          = 'pre';
const TABLE_HEAD_SELECTOR   = 'th, table tr:first-child td';
const INPUT_ALL_SELECTOR    = 'input, textarea, select, [contenteditable]';

/**
 * Collect elements whose visible text content looks like a URL.
 * Walks all text-bearing leaf elements and returns those containing url-like text.
 *
 * @param {Document|Element} [root=document]
 * @returns {Element[]}
 */
function collectDetectedLinks(root) {
  if (typeof document === 'undefined') return [];
  const searchRoot = root || document;
  // Collect all leaf-ish elements with text
  const candidates = Array.from(searchRoot.querySelectorAll('*')).filter(el => {
    // Only elements that directly hold text (no significant child elements)
    const childElements = Array.from(el.children);
    if (childElements.length > 2) return false; // skip containers
    const text = (el.textContent || '').trim();
    return text.length > 0 && isUrlLike(text);
  });
  return candidates;
}

/**
 * Collect interactive elements from `root`.
 *
 * Visibility filtering: in real browsers we skip elements with zero bounding
 * rect (hidden / off-screen).  Under jsdom getBoundingClientRect always returns
 * zeros, so we apply size-filtering only when at least ONE element in the
 * document returns a non-zero rect (i.e. a real browser layout engine is
 * present).  This keeps the jsdom tests working correctly.
 *
 * @param {Document|Element} [root=document]
 * @param {string} [selector]
 * @returns {Element[]}
 */
function collectTargets(root, selector) {
  if (typeof document === 'undefined') return [];
  const searchRoot = root || document;
  const sel = selector || HINT_SELECTOR;

  const candidates = Array.from(searchRoot.querySelectorAll(sel));

  // Determine whether we are in a real browser with layout (at least one
  // element returns a non-zero bounding box).
  let hasLayout = false;
  for (const el of candidates) {
    if (typeof el.getBoundingClientRect === 'function') {
      const r = el.getBoundingClientRect();
      if (r.width > 0 || r.height > 0) {
        hasLayout = true;
        break;
      }
    }
  }

  return candidates.filter(el => {
    // Exclude hidden inputs (belt-and-suspenders)
    if (el.tagName === 'INPUT' && el.type === 'hidden') return false;

    // Skip elements explicitly hidden via attribute
    if (el.hidden) return false;

    // Visibility filtering only when layout is available
    if (hasLayout) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return false;
    }

    return true;
  });
}

/**
 * Filter `hints` to those whose label starts with `typed` (case-insensitive).
 *
 * Returns:
 *   matches — all hints whose label starts with typed (uppercased)
 *   exact   — the single hint with label === typed, BUT only if no other match
 *             has typed as a strict prefix (i.e. matches.length === 1).
 *             If there are multiple matches (e.g. typed='A', labels A & AB),
 *             exact is null even though 'A' is literally in the set.
 *
 * @param {{ label: string, el: * }[]} hints
 * @param {string} typed
 * @returns {{ matches: typeof hints, exact: (typeof hints[0])|null }}
 */
/**
 * Compute the on-screen position for a hint label given a target's
 * getBoundingClientRect(). Labels are rendered `position: fixed`, so these are
 * VIEWPORT coordinates — scroll offset must NOT be added (doing so shifts every
 * label by the scroll amount on a scrolled page).
 *
 * @param {{left:number, top:number}} rect
 * @returns {{ left: string, top: string }}
 */
function hintPosition(rect) {
  return { left: `${Math.round(rect.left)}px`, top: `${Math.round(rect.top)}px` };
}

function filterTargets(hints, typed) {
  const upper = typed.toUpperCase();
  const matches = hints.filter(h => h.label.startsWith(upper));

  // Exact only when the typed string produces a single match (prefix-free fire)
  const exact = matches.length === 1 && matches[0].label === upper
    ? matches[0]
    : null;

  return { matches, exact };
}

// ── HintsController ──────────────────────────────────────────────────────────

/**
 * HintsController
 *
 * Ties the pure hints engine to:
 *   - ModeStack (enter/leave 'hints' mode)
 *   - ShadowHost (render Glass labels into the isolated shadow DOM)
 *   - Dispatcher (execute background commands for newtab/yank/download)
 *   - Config (charset from 'hintcharacters' setting)
 *
 * @param {{ host, modes, dispatcher, config }} deps
 */
class HintsController {
  constructor({ host, modes, dispatcher, config, omnibar } = {}) {
    this._host = host || null;
    this._modes = modes || null;
    this._dispatcher = dispatcher || null;
    this._config = config || null;
    this._omnibar = omnibar || null;

    this._hints = [];       // [{ label, el, node }]
    this._typed = '';
    this._action = null;
    this._layer = null;     // container element inside shadow root
    this._keyListener = null;

    // Wave-2: rapid/multi-yank accumulator
    this._accumulated = []; // accumulated hrefs for hint-rapid / hint-yank-multi

    // Wave-2: input-layer state
    this._inputLayerInputs = [];
    this._inputLayerTabListener = null;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Map an action name to the appropriate element collection.
   * Returns { elements, useCustomCollect } where elements is an Element[] and
   * useCustomCollect signals that we already have the array (skip collectTargets).
   *
   * @param {string} action
   * @returns {Element[]}
   */
  collectFor(action) {
    const root = typeof document !== 'undefined' ? document : null;
    switch (action) {
      case 'images':
      case 'hint-images-tab':
        return collectTargets(root, IMAGE_SELECTOR);
      case 'input':
      case 'hint-input':
      case 'hint-input-first':
      case 'hint-yank-input':
        return collectTargets(root, INPUT_SELECTOR);
      case 'hint-input-layer':
        return collectTargets(root, INPUT_ALL_SELECTOR);
      case 'hint-newtab-bg':
      case 'hint-newtab-fg':
      case 'hint-fill':
      case 'hint-rapid':
      case 'hint-yank-multi':
        return collectTargets(root, LINKS_SELECTOR);
      case 'hint-click-media':
        return collectTargets(root, MEDIA_SELECTOR);
      case 'hint-yank-pre':
        return collectTargets(root, PRE_SELECTOR);
      case 'hint-yank-column':
        return collectTargets(root, TABLE_HEAD_SELECTOR);
      case 'hint-detect-links':
        return collectDetectedLinks(root);
      case 'hint-regional':
        // hint large block elements — use a broad selector
        return collectTargets(root, 'section, article, div[class], main, aside, [data-region]');
      default:
        return collectTargets(root, HINT_SELECTOR);
    }
  }

  /**
   * Begin a hint session.
   * @param {string} action
   */
  start(action) {
    this.stop(); // clean up any previous session

    // hint-input-first: special case — no hint UI, just focus the first input
    if (action === 'hint-input-first') {
      const inputs = collectTargets(
        typeof document !== 'undefined' ? document : null,
        INPUT_ALL_SELECTOR
      );
      if (inputs.length > 0 && typeof inputs[0].focus === 'function') {
        inputs[0].focus();
      }
      return;
    }

    this._action = action;
    this._typed = '';
    this._accumulated = [];

    // Collect targets
    const elements = this.collectFor(action);
    if (elements.length === 0) return;

    // Generate labels
    const charset = this._getCharset();
    const labelList = generateHintLabels(elements.length, charset);

    // Build hint objects
    this._hints = elements.map((el, i) => ({
      label: labelList[i],
      el,
      node: null, // set after render
    }));

    // Render labels into shadow DOM
    this._renderLabels();

    // Enter hints mode
    if (this._modes) {
      this._modes.enter('hints');
    }

    // Install key listener
    this._installKeyListener();
  }

  /**
   * Stop the hint session, clean up labels and mode.
   */
  stop() {
    this._removeKeyListener();
    this._clearLabels();
    this._removeInputLayerTabListener();
    if (this._modes && this._modes.current() === 'hints') {
      this._modes.leave();
    }
    this._hints = [];
    this._typed = '';
    this._action = null;
    this._accumulated = [];
  }

  /**
   * Execute the configured action on the given element.
   * Thin and spy-able for testing.
   *
   * @param {string} action
   * @param {Element} el
   */
  executeAction(action, el) {
    const href = el.href || el.src || el.getAttribute('href') || el.getAttribute('src') || '';

    switch (action) {
      case 'follow':
        this._click(el);
        break;

      case 'newtab':
        // Only open hrefs with a safe scheme in a NEW navigation context.
        // A javascript:/data: href is fine to *click* in place (same as a user
        // click) but must not be promoted into tab-new / window.open.
        if (!isSafeNavUrl(href)) break;
        if (this._dispatcher) {
          this._dispatcher.run('tab-new', { args: [href] });
        } else {
          this._openInNewTab(href);
        }
        break;

      case 'yank':
        this._yank(href || el.textContent);
        break;

      case 'hover':
        this._dispatchMouseEvent(el, 'mouseover');
        break;

      case 'input':
        if (typeof el.focus === 'function') el.focus();
        break;

      case 'download':
        if (!isSafeNavUrl(href)) break;
        if (this._dispatcher) {
          this._dispatcher.run('download-url', { args: [href] });
        }
        break;

      case 'images':
        if (!isSafeNavUrl(href)) break;
        this._openInNewTab(href);
        break;

      case 'text':
        this._yank(el.textContent || el.innerText || '');
        break;

      case 'multi':
        // Like follow but don't stop — handled by caller
        this._click(el);
        return; // early return, no stop

      // ── Wave-2 actions ──────────────────────────────────────────────────────

      case 'hint-newtab-bg':
        // Open link in background tab (active: false)
        if (!isSafeNavUrl(href)) break;
        if (this._dispatcher) {
          this._dispatcher.run('tab-new-background', { args: [href] });
        } else {
          this._openInNewTab(href);
        }
        break;

      case 'hint-newtab-fg':
        // Open link in foreground (active) new tab — same as newtab
        if (!isSafeNavUrl(href)) break;
        if (this._dispatcher) {
          this._dispatcher.run('tab-new', { args: [href] });
        } else {
          this._openInNewTab(href);
        }
        break;

      case 'hint-rapid':
        // Rapid: open in background tab but stay in hint mode (accumulate)
        if (!isSafeNavUrl(href)) return; // early return, stay open
        if (this._dispatcher) {
          this._dispatcher.run('tab-new-background', { args: [href] });
        } else {
          this._openInNewTab(href);
        }
        return; // early return — keep hints open

      case 'hint-images-tab':
        // Open the image's src in a new tab
        if (!isSafeNavUrl(href)) break;
        if (this._dispatcher) {
          this._dispatcher.run('tab-new', { args: [href] });
        } else {
          this._openInNewTab(href);
        }
        break;

      case 'hint-fill':
        // Pre-fill omnibar with the hinted URL for editing
        if (this._omnibar && typeof this._omnibar.open === 'function') {
          this._omnibar.open(href);
        } else if (this._dispatcher) {
          this._dispatcher.run('omnibar-open', { args: [href] });
        }
        break;

      case 'hint-input':
      case 'hint-input-layer':
        // Focus the hinted input; install Tab-cycling if input-layer
        if (typeof el.focus === 'function') el.focus();
        if (action === 'hint-input-layer') {
          this._installInputLayerTabHandler();
        }
        break;

      case 'hint-yank-multi':
        // Accumulate hrefs; yank all when Esc pressed (handled in stop via _finaliseMultiYank)
        if (href) {
          this._accumulated.push(href);
          this._yank(joinYankedUrls(this._accumulated)); // yank running total
        }
        return; // early return — keep hints open

      case 'hint-yank-column': {
        // Yank all cells in the same column as the hinted header cell
        const cells = getTableColumnCells(el);
        const text = cells.map(c => (c.textContent || '').trim()).join('\n');
        this._yank(text);
        break;
      }

      case 'hint-yank-pre':
        this._yank(el.textContent || el.innerText || '');
        break;

      case 'hint-yank-input': {
        // Yank value of input / textarea / select / contenteditable
        const val = el.value !== undefined
          ? el.value
          : (el.textContent || el.innerText || '');
        this._yank(val);
        break;
      }

      case 'hint-click-media':
        this._click(el);
        break;

      case 'hint-mouseover':
        this._dispatchMouseEvent(el, 'mouseover');
        break;

      case 'hint-mouseout':
        this._dispatchMouseEvent(el, 'mouseout');
        break;

      case 'hint-regional':
        // Show sub-menu: t=copy text, h=copy html, d=delete element, Esc=cancel
        this._showRegionalMenu(el);
        return; // early return — sub-menu takes over

      case 'hint-detect-links': {
        // Navigate to the URL found in the element's text
        const urlText = (el.textContent || '').trim();
        if (isSafeNavUrl(urlText)) {
          if (typeof window !== 'undefined') {
            window.location.href = urlText;
          }
        }
        break;
      }

      default:
        this._click(el);
        break;
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  _getCharset() {
    if (this._config && typeof this._config.get === 'function') {
      const val = this._config.get('hintcharacters');
      if (val && typeof val === 'string' && val.trim().length > 0) {
        return val.toUpperCase();
      }
    }
    return 'ASDFGHJKL';
  }

  _renderLabels() {
    if (!this._host || typeof document === 'undefined') return;

    // Inject Glass CSS once (host.addStyle is idempotent-ish; minor duplication is fine)
    try {
      const { HINTS_CSS } = require('./ui/hints.css.js');
      this._host.addStyle(HINTS_CSS);
    } catch (_) {
      // CSS not critical
    }

    // Create a layer container
    this._layer = document.createElement('div');
    this._layer.className = 'qs-hint-layer';
    this._host.mount(this._layer);

    for (const hint of this._hints) {
      const node = this._createLabelNode(hint.label, hint.el);
      hint.node = node;
      this._layer.appendChild(node);
    }
  }

  _createLabelNode(label, el) {
    const node = document.createElement('span');
    node.className = 'qs-hint';
    node.textContent = label;
    node.dataset.hintLabel = label;

    // Position over the element. Labels are `position: fixed` (viewport-anchored),
    // so we use the raw getBoundingClientRect viewport coordinates WITHOUT adding
    // scroll — adding scroll would offset every label by the scroll amount on a
    // scrolled page (the bug this fixes).
    if (typeof el.getBoundingClientRect === 'function') {
      const pos = hintPosition(el.getBoundingClientRect());
      node.style.left = pos.left;
      node.style.top = pos.top;
    }

    return node;
  }

  _clearLabels() {
    if (this._layer && this._layer.parentNode) {
      this._layer.parentNode.removeChild(this._layer);
    }
    this._layer = null;
    // Clear node refs
    for (const h of this._hints) {
      h.node = null;
    }
  }

  _installKeyListener() {
    if (typeof document === 'undefined') return;

    this._keyListener = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.stop();
        return;
      }

      // Backspace: erase last typed char
      if (e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        this._typed = this._typed.slice(0, -1);
        this._update();
        return;
      }

      // Only handle printable single characters
      if (e.key.length !== 1) return;

      e.preventDefault();
      e.stopPropagation();

      this._typed += e.key.toUpperCase();
      this._update();
    };

    document.addEventListener('keydown', this._keyListener, true);
  }

  _removeKeyListener() {
    if (this._keyListener && typeof document !== 'undefined') {
      document.removeEventListener('keydown', this._keyListener, true);
      this._keyListener = null;
    }
  }

  _update() {
    const { matches, exact } = filterTargets(this._hints, this._typed);

    // Update visual state of each label
    for (const h of this._hints) {
      if (h.node) {
        const inMatch = matches.includes(h);
        h.node.classList.toggle('qs-hint--matched', inMatch);
        h.node.classList.toggle('qs-hint--dimmed', !inMatch);
      }
    }

    // Actions that keep hints open after each selection
    const PERSISTENT_ACTIONS = new Set(['multi', 'hint-rapid', 'hint-yank-multi']);

    if (exact) {
      this.executeAction(this._action, exact.el);
      if (!PERSISTENT_ACTIONS.has(this._action)) {
        this.stop();
      } else {
        // Reset typed so user can pick another hint
        this._typed = '';
        this._update();
      }
      return;
    }

    if (matches.length === 0) {
      this.stop();
    }
  }

  _click(el) {
    if (typeof el.click === 'function') {
      el.click();
    } else if (typeof document !== 'undefined') {
      const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
      el.dispatchEvent(evt);
    }
  }

  _dispatchMouseEvent(el, type) {
    if (typeof MouseEvent !== 'undefined') {
      const evt = new MouseEvent(type, { bubbles: true, cancelable: true });
      el.dispatchEvent(evt);
    }
  }

  _openInNewTab(url) {
    if (typeof window !== 'undefined' && url) {
      window.open(url, '_blank');
    }
  }

  _yank(text) {
    if (!text) return;
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      navigator.clipboard.writeText(text).catch(() => {});
    } else if (this._dispatcher) {
      this._dispatcher.run('yank', { args: [text] });
    }
  }

  // ── Wave-2 private helpers ─────────────────────────────────────────────────

  /**
   * Install a temporary Tab / Shift-Tab handler so the user can cycle through
   * the collected inputs after hint-input-layer focuses the first one.
   * Removed when stop() is called.
   */
  _installInputLayerTabHandler() {
    if (typeof document === 'undefined') return;
    this._inputLayerInputs = collectTargets(
      document, INPUT_ALL_SELECTOR
    );
    if (this._inputLayerInputs.length < 2) return;

    this._inputLayerTabListener = (e) => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      const focused = document.activeElement;
      const inputs = this._inputLayerInputs;
      const idx = inputs.indexOf(focused);
      if (idx === -1) {
        if (inputs[0] && typeof inputs[0].focus === 'function') inputs[0].focus();
        return;
      }
      const next = e.shiftKey
        ? (idx - 1 + inputs.length) % inputs.length
        : (idx + 1) % inputs.length;
      if (typeof inputs[next].focus === 'function') inputs[next].focus();
    };

    document.addEventListener('keydown', this._inputLayerTabListener, true);
  }

  _removeInputLayerTabListener() {
    if (this._inputLayerTabListener && typeof document !== 'undefined') {
      document.removeEventListener('keydown', this._inputLayerTabListener, true);
      this._inputLayerTabListener = null;
    }
    this._inputLayerInputs = [];
  }

  /**
   * Show a lightweight regional sub-menu overlay for hint-regional.
   * Keys: t=copy text, h=copy html, d=delete element, Esc=cancel.
   *
   * @param {Element} el - The hinted element
   */
  _showRegionalMenu(el) {
    if (typeof document === 'undefined') return;

    // Stop normal hints session first (clears labels, mode) without recursion
    this._removeKeyListener();
    this._clearLabels();
    if (this._modes && this._modes.current() === 'hints') {
      this._modes.leave();
    }
    this._hints = [];
    this._typed = '';
    this._action = null;

    // Create the sub-menu element
    const menu = document.createElement('div');
    menu.id = 'qs-regional-menu';
    menu.style.cssText = [
      'position:fixed',
      'z-index:2147483647',
      'background:#222',
      'color:#eee',
      'font:14px monospace',
      'padding:6px 10px',
      'border-radius:4px',
      'top:50%',
      'left:50%',
      'transform:translate(-50%,-50%)',
      'box-shadow:0 4px 12px rgba(0,0,0,.5)',
      'user-select:none',
    ].join(';');
    menu.textContent = '[t] copy text  [h] copy html  [d] delete  [Esc] cancel';

    const cleanup = () => {
      document.removeEventListener('keydown', handler, true);
      if (menu.parentNode) menu.parentNode.removeChild(menu);
    };

    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      switch (e.key) {
        case 't':
          this._yank(el.textContent || el.innerText || '');
          break;
        case 'h':
          this._yank(el.outerHTML || '');
          break;
        case 'd':
          if (el.parentNode) el.parentNode.removeChild(el);
          break;
        default:
          break;
      }
      cleanup();
    };

    document.body.appendChild(menu);
    document.addEventListener('keydown', handler, true);
  }
}

// ── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  generateHintLabels,
  collectTargets,
  filterTargets,
  isUrlLike,
  getTableColumnCells,
  joinYankedUrls,
  hintPosition,
  HintsController,
};
