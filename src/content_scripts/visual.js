'use strict';

/**
 * Visual / caret mode controller.
 *
 * Uses the browser Selection API (window.getSelection / selection.modify) to
 * provide vi-style caret and visual (text-selection) modes.
 *
 * granularityFor(), wordAt(), and nextCharIndex() are exported as pure helpers
 * so they can be unit-tested without any DOM context.
 */

/**
 * Map a single-character vi motion key to the parameters used by
 * Selection.prototype.modify().
 *
 * @param {string} motion
 * @returns {{ dir: 'left'|'right', granularity: string } | null}
 */
function granularityFor(motion) {
  const MAP = {
    h: { dir: 'left',  granularity: 'character' },
    l: { dir: 'right', granularity: 'character' },
    // j = move down one line → encoded as dir:'right', granularity:'line'
    // k = move up one line   → encoded as dir:'left',  granularity:'line'
    // Inside move/extend we translate dir:'right' → 'forward', dir:'left' → 'backward'
    j: { dir: 'right', granularity: 'line' },
    k: { dir: 'left',  granularity: 'line' },
    w: { dir: 'right', granularity: 'word' },
    b: { dir: 'left',  granularity: 'word' },
    e: { dir: 'right', granularity: 'word' }, // forward to end of word (approx)
    0: { dir: 'left',  granularity: 'lineboundary' },
    $: { dir: 'right', granularity: 'lineboundary' },
    // Sentence motions
    ')': { dir: 'right', granularity: 'sentence' },
    '(': { dir: 'left',  granularity: 'sentence' },
    // Paragraph / block motions
    '}': { dir: 'right', granularity: 'paragraph' },
    '{': { dir: 'left',  granularity: 'paragraph' },
    // Document boundary (used for G and gg — caller must resolve these)
    G:  { dir: 'right', granularity: 'documentboundary' },
  };
  return MAP[motion] || null;
}

/**
 * Return the word substring that contains the character at `index` in `text`.
 * Words are maximal runs of non-whitespace characters.
 *
 * @param {string} text   Full text content
 * @param {number} index  Character offset into text
 * @returns {string}      The word at the index, or '' if index is whitespace
 */
function wordAt(text, index) {
  if (typeof text !== 'string' || index < 0 || index >= text.length) return '';
  // If the char at index is whitespace, return ''
  if (/\s/.test(text[index])) return '';
  // Walk left to find start of word
  let start = index;
  while (start > 0 && !/\s/.test(text[start - 1])) start--;
  // Walk right to find end of word
  let end = index;
  while (end < text.length - 1 && !/\s/.test(text[end + 1])) end++;
  return text.slice(start, end + 1);
}

/**
 * Find the index of the next (dir='forward') or previous (dir='backward')
 * occurrence of `char` in `text`, starting from `fromIndex` (exclusive).
 *
 * @param {string} text
 * @param {number} fromIndex  Start offset (exclusive — the search begins at fromIndex±1)
 * @param {string} char       Single character to seek
 * @param {'forward'|'backward'} dir
 * @returns {number}          Index of the found character, or -1 if not found
 */
function nextCharIndex(text, fromIndex, char, dir) {
  if (typeof text !== 'string' || typeof char !== 'string' || char.length !== 1) return -1;
  if (dir === 'forward') {
    for (let i = fromIndex + 1; i < text.length; i++) {
      if (text[i] === char) return i;
    }
  } else {
    for (let i = fromIndex - 1; i >= 0; i--) {
      if (text[i] === char) return i;
    }
  }
  return -1;
}

/**
 * Translate dir:'left'|'right' to the string expected by Selection.modify().
 *
 * @param {'left'|'right'} dir
 * @returns {'forward'|'backward'}
 */
function dirToForwardBackward(dir) {
  return dir === 'right' ? 'forward' : 'backward';
}

/**
 * Visual controller — manages caret and visual modes.
 *
 * @param {{ host: object, modes: import('../core/modes').ModeStack }} options
 */
function Visual({ host: _host, modes }) {
  // Track the current sub-mode so move() knows which Selection alter to use.
  let _subMode = null; // 'caret' | 'visual' | null

  // Keydown listener installed while in caret/visual mode.
  let _keyListener = null;

  // --- f/F seek state machine ---
  // pendingSeek: null | { type: 'f'|'F' }  (awaiting the target char)
  let _pendingSeek = null;
  // lastSeek: null | { char: string, dir: 'forward'|'backward' }  (for ; / ,)
  let _lastSeek = null;

  // pendingG: true when 'g' has been pressed and we're awaiting a second key
  let _pendingG = false;

  // pendingZ: true when 'z' has been pressed and we're awaiting a second key
  let _pendingZ = false;

  /**
   * Retrieve the live Selection object, or null if unavailable (e.g. jsdom).
   * @returns {Selection|null}
   */
  function _getSelection() {
    if (typeof window === 'undefined' || !window.getSelection) return null;
    return window.getSelection();
  }

  /**
   * Place a collapsed caret near where the user is looking.
   *
   * Priority:
   *   1. Keep an existing (mouse) selection — collapse to its start so motions
   *      extend from there.
   *   2. Anchor at the first text position in the viewport via
   *      caretRangeFromPoint (Chrome) / caretPositionFromPoint (Firefox), so the
   *      caret lands on visible content rather than the (possibly scrolled-away)
   *      top of <body>.
   *   3. Fall back to the start of <body>.
   */
  function _placeCaret() {
    const sel = _getSelection();
    if (!sel) return;

    if (sel.rangeCount > 0 && !sel.isCollapsed) {
      sel.collapseToStart();
      return;
    }
    if (typeof document === 'undefined' || !document.body) return;

    let range = null;
    const x = 24;
    const y = Math.round((typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : 600) * 0.2);
    if (typeof document.caretRangeFromPoint === 'function') {
      range = document.caretRangeFromPoint(x, y);
    } else if (typeof document.caretPositionFromPoint === 'function') {
      const pos = document.caretPositionFromPoint(x, y);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
      }
    }
    if (!range) {
      range = document.createRange();
      range.setStart(document.body, 0);
    }
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /**
   * Swap anchor and focus of the current selection (vi 'o' in visual mode).
   * Rebuilds the range so that the old focus becomes the new anchor and vice versa.
   */
  function _swapAnchorFocus() {
    const sel = _getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const anchorNode = sel.anchorNode;
    const anchorOffset = sel.anchorOffset;
    const focusNode = sel.focusNode;
    const focusOffset = sel.focusOffset;
    if (!anchorNode || !focusNode) return;
    // Build a new range from old-focus → old-anchor
    try {
      const range = document.createRange();
      range.setStart(focusNode, focusOffset);
      range.setEnd(anchorNode, anchorOffset);
      // setStart/setEnd require start ≤ end in document order;
      // if the range is inverted (focus was before anchor), we need to reverse.
      if (range.collapsed && (anchorNode !== focusNode || anchorOffset !== focusOffset)) {
        range.setStart(anchorNode, anchorOffset);
        range.setEnd(focusNode, focusOffset);
      }
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) {
      // DOM error — ignore silently
    }
  }

  /**
   * Expand the selection to wrap the parent element of the current focus node.
   */
  function _expandToParent() {
    const sel = _getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const focusNode = sel.focusNode;
    if (!focusNode) return;
    // Find the nearest element node
    let el = focusNode.nodeType === 1 ? focusNode : focusNode.parentElement;
    if (!el || typeof document === 'undefined') return;
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) {
      // ignore
    }
  }

  /**
   * Select the word under the caret (both directions from current position).
   */
  function _selectWord() {
    const sel = _getSelection();
    if (!sel || typeof sel.modify !== 'function') return;
    // Collapse to start, then extend forward by word
    if (sel.rangeCount > 0) sel.collapseToStart();
    sel.modify('extend', 'backward', 'word');
    sel.modify('extend', 'forward', 'word');
  }

  /**
   * Search for the word under the cursor using window.find.
   */
  function _searchWordUnderCursor() {
    const sel = _getSelection();
    if (!sel) return;
    let word = '';
    if (!sel.isCollapsed) {
      word = sel.toString().trim();
    } else {
      const focusNode = sel.focusNode;
      if (focusNode && focusNode.nodeType === 3 /* TEXT_NODE */) {
        word = wordAt(focusNode.textContent || '', sel.focusOffset);
      }
    }
    if (!word) return;
    if (typeof window !== 'undefined' && typeof window.find === 'function') {
      window.find(word, false, false, true, true, false, false);
    }
  }

  /**
   * Perform a char-seek in the current text node.
   *
   * @param {string} char   Character to seek
   * @param {'forward'|'backward'} dir
   */
  function _charSeek(char, dir) {
    const sel = _getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const focusNode = sel.focusNode;
    if (!focusNode || focusNode.nodeType !== 3 /* TEXT_NODE */) return;
    const text = focusNode.textContent || '';
    const fromIndex = sel.focusOffset;
    const idx = nextCharIndex(text, fromIndex, char, dir);
    if (idx === -1) return;
    _lastSeek = { char, dir };
    const alter = _subMode === 'visual' ? 'extend' : 'move';
    try {
      const range = document.createRange();
      range.setStart(focusNode, idx);
      range.collapse(true);
      if (alter === 'extend') {
        // Keep anchor, extend focus to the found position
        const anchorNode = sel.anchorNode;
        const anchorOffset = sel.anchorOffset;
        sel.removeAllRanges();
        const newRange = document.createRange();
        // Build range: anchor → found char
        if (anchorNode) {
          try {
            newRange.setStart(anchorNode, anchorOffset);
            newRange.setEnd(focusNode, idx + 1);
          } catch (_) {
            newRange.setStart(focusNode, idx);
            newRange.setEnd(focusNode, idx + 1);
          }
        }
        sel.addRange(newRange);
      } else {
        sel.removeAllRanges();
        range.setEnd(focusNode, idx + 1);
        sel.addRange(range);
      }
    } catch (_) {
      // ignore DOM errors
    }
  }

  /**
   * Click the element at the current selection focus position.
   *
   * @param {boolean} shift  Whether to simulate Shift+click
   */
  function _clickFocusNode(shift) {
    const sel = _getSelection();
    if (!sel) return;
    const focusNode = sel.focusNode;
    if (!focusNode) return;
    let el = focusNode.nodeType === 1 ? focusNode : focusNode.parentElement;
    if (!el || typeof document === 'undefined') return;
    try {
      el.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        shiftKey: !!shift,
      }));
    } catch (_) {
      // ignore
    }
  }

  /**
   * Scroll so the caret's focus element is at the given block position in viewport.
   *
   * @param {'start'|'center'|'end'} block
   */
  function _scrollCaretIntoView(block) {
    const sel = _getSelection();
    if (!sel) return;
    const focusNode = sel.focusNode;
    if (!focusNode) return;
    let el = focusNode.nodeType === 1 ? focusNode : focusNode.parentElement;
    if (!el || typeof el.scrollIntoView !== 'function') return;
    try {
      el.scrollIntoView({ block, behavior: 'smooth' });
    } catch (_) {
      // fallback without options
      el.scrollIntoView();
    }
  }

  /**
   * Install a keydown listener that intercepts vi motion keys and y for yank.
   */
  function _installKeyListener() {
    if (typeof document === 'undefined') return;

    _keyListener = function (e) {
      const key = e.key;

      // ── Escape: exit mode ───────────────────────────────────────────────
      if (key === 'Escape') {
        _pendingSeek = null;
        _pendingG = false;
        _pendingZ = false;
        stop();
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // ── Pending f/F: consume the next key as target character ───────────
      if (_pendingSeek !== null) {
        const seekDir = _pendingSeek.type === 'f' ? 'forward' : 'backward';
        _charSeek(key, seekDir);
        _pendingSeek = null;
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // ── Pending 'g' prefix (gg = document start) ────────────────────────
      if (_pendingG) {
        _pendingG = false;
        if (key === 'g') {
          // gg → move to document start
          const sel = _getSelection();
          if (sel && typeof sel.modify === 'function') {
            const alter = _subMode === 'visual' ? 'extend' : 'move';
            sel.modify(alter, 'backward', 'documentboundary');
          }
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        // 'g' + something else: fall through after resetting (don't re-handle)
        e.preventDefault(); // suppress the unknown 'g?' chord
        e.stopPropagation();
        return;
      }

      // ── Pending 'z' prefix (zt/zz/zb scroll placement) ─────────────────
      if (_pendingZ) {
        _pendingZ = false;
        if (key === 't') {
          _scrollCaretIntoView('start');
        } else if (key === 'z') {
          _scrollCaretIntoView('center');
        } else if (key === 'b') {
          _scrollCaretIntoView('end');
        }
        // any other key after z is ignored (consumed)
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // ── y: yank and exit ─────────────────────────────────────────────────
      if (key === 'y') {
        yankSelection();
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // ── v: toggle move/extend ────────────────────────────────────────────
      if (key === 'v') {
        toggleSelection();
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // ── g: start 'gg' two-key sequence ──────────────────────────────────
      if (key === 'g') {
        _pendingG = true;
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // ── z: start 'zt'/'zz'/'zb' two-key sequence ────────────────────────
      if (key === 'z') {
        _pendingZ = true;
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // ── G: document end ──────────────────────────────────────────────────
      if (key === 'G') {
        const sel = _getSelection();
        if (sel && typeof sel.modify === 'function') {
          const alter = _subMode === 'visual' ? 'extend' : 'move';
          sel.modify(alter, 'forward', 'documentboundary');
        }
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // ── o: swap anchor/focus (visual mode) ──────────────────────────────
      if (key === 'o') {
        _swapAnchorFocus();
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // ── p: expand to parent element ──────────────────────────────────────
      if (key === 'p') {
        _expandToParent();
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // ── V: select word under caret ───────────────────────────────────────
      if (key === 'V') {
        _selectWord();
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // ── *: search word under cursor ───────────────────────────────────────
      if (key === '*') {
        _searchWordUnderCursor();
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // ── f/F: initiate char-seek ───────────────────────────────────────────
      if (key === 'f' || key === 'F') {
        _pendingSeek = { type: key.toLowerCase() };
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // ── ;: repeat last seek (same direction) ─────────────────────────────
      if (key === ';') {
        if (_lastSeek) {
          _charSeek(_lastSeek.char, _lastSeek.dir);
        }
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // ── ,: repeat last seek (opposite direction) ──────────────────────────
      if (key === ',') {
        if (_lastSeek) {
          const oppDir = _lastSeek.dir === 'forward' ? 'backward' : 'forward';
          _charSeek(_lastSeek.char, oppDir);
        }
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // ── Enter: click node under caret ────────────────────────────────────
      if (key === 'Enter') {
        _clickFocusNode(e.shiftKey);
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // ── vi motion keys (h/l/j/k/w/b/e/0/$/(/)//{/}) ─────────────────────
      if (granularityFor(key) !== null) {
        move(key);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    document.addEventListener('keydown', _keyListener, true);
  }

  /**
   * Remove the keydown listener installed for caret/visual mode.
   */
  function _removeKeyListener() {
    if (_keyListener && typeof document !== 'undefined') {
      document.removeEventListener('keydown', _keyListener, true);
      _keyListener = null;
    }
  }

  /**
   * Enter caret mode: place a caret near the viewport and start listening for
   * motions. Defaults to 'visual' (extend) behaviour so motions visibly select
   * text — which is what users reach for `v` to do. Press `v` again to toggle
   * to plain caret movement.
   */
  function enterCaret() {
    _subMode = 'visual';
    modes.enter('caret');
    _placeCaret();
    _removeKeyListener();
    _pendingSeek = null;
    _pendingG = false;
    _pendingZ = false;
    _installKeyListener();
  }

  /**
   * Enter visual mode: extend selection on subsequent motions.
   */
  function enterVisual() {
    _subMode = 'visual';
    modes.enter('visual');
    _removeKeyListener();
    _pendingSeek = null;
    _pendingG = false;
    _pendingZ = false;
    _installKeyListener();
  }

  /**
   * Toggle between caret (move/collapse) and visual (extend) behavior.
   */
  function toggleSelection() {
    if (_subMode === 'visual') {
      // Switch back to caret mode without pushing another mode entry
      _subMode = 'caret';
      // Collapse the selection to the focus point
      const sel = _getSelection();
      if (sel && sel.rangeCount > 0) sel.collapseToEnd();
    } else {
      _subMode = 'visual';
    }
  }

  /**
   * Move (in caret mode) or extend (in visual mode) the selection according
   * to the given vi motion key.
   *
   * @param {string} motion  A single-character vi motion key.
   */
  function move(motion) {
    const mapping = granularityFor(motion);
    if (!mapping) return;

    const sel = _getSelection();
    if (!sel || typeof sel.modify !== 'function') return;

    const alter = _subMode === 'visual' ? 'extend' : 'move';
    const direction = dirToForwardBackward(mapping.dir);
    sel.modify(alter, direction, mapping.granularity);
  }

  /**
   * Enter visual mode and select the contents of the element that the
   * current caret/focus is inside. Useful as a normal-mode command.
   */
  function selectElement() {
    enterCaret();
    _expandToParent();
  }

  /**
   * Restore the last visual selection — a no-op stub (selection state is not
   * persisted between mode exits in this implementation). Enters caret mode.
   */
  function restoreVisual() {
    enterCaret();
  }

  /**
   * Copy the current selection text to the clipboard, then leave the mode.
   */
  function yankSelection() {
    const sel = _getSelection();
    const text = sel ? sel.toString() : '';

    if (text && typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        // Fallback: execCommand copy
        if (typeof document !== 'undefined') {
          document.execCommand('copy');
        }
      });
    } else if (text && typeof document !== 'undefined') {
      try {
        document.execCommand('copy');
      } catch (_) {
        // Clipboard not available — silent fail
      }
    }

    stop();
  }

  /**
   * Collapse the selection and leave whatever visual/caret mode is active.
   */
  function stop() {
    _removeKeyListener();
    _subMode = null;
    _pendingSeek = null;
    _pendingG = false;
    _pendingZ = false;

    // Collapse selection
    const sel = _getSelection();
    if (sel && sel.rangeCount > 0) {
      sel.collapseToEnd();
    }

    modes.leave();
  }

  return {
    enterCaret,
    enterVisual,
    toggleSelection,
    move,
    yankSelection,
    stop,
    selectElement,
    restoreVisual,
  };
}

module.exports = { Visual, granularityFor, wordAt, nextCharIndex };
