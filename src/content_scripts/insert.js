'use strict';

/**
 * Insert mode controller.
 *
 * In Insert mode, key events pass through to the page (typing works normally).
 * The controller provides:
 *  - Auto entry when the user focuses an editable element (SurfingKeys
 *    behavior) — only when the current mode is `normal`.
 *  - `<Escape>` to leave Insert mode.
 *  - Readline-style editing keys (SurfingKeys insert-mode defaults):
 *      <C-e>  cursor to end of line
 *      <C-a>  cursor to beginning of line
 *      <C-f>  cursor to beginning of line (Windows alias)
 *      <C-u>  delete all before cursor
 *      <A-b>  cursor back one word
 *      <A-f>  cursor forward one word
 *      <A-w>  delete one word backward
 *      <A-d>  delete one word forward
 *      <C-'>  toggle quotes around the selection / word
 *  - Optional user/profile insert-mode keymap bindings (e.g. `<Escape> →
 *    mode-normal`) dispatched through the command registry.
 *
 * Import-safe under Jest/Node: all document/window access is guarded.
 */

const { KeyMap } = require('../core/keymap');
const { keyEventToString } = require('./keyhandler');

/**
 * Is the given element editable (input / textarea / contenteditable)?
 * @param {Element|null} el
 * @returns {boolean}
 */
function isEditable(el) {
  if (!el || el.nodeType !== 1) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') {
    // Text-like input types only
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    const NON_TEXT = new Set([
      'button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio',
      'range', 'reset', 'submit',
    ]);
    return !NON_TEXT.has(type);
  }
  // contenteditable — check the attribute too: isContentEditable is false for
  // detached elements in some environments (e.g. jsdom).
  if (el.isContentEditable) return true;
  const ce = el.getAttribute('contenteditable');
  return ce === 'true' || ce === '';
}

/**
 * Find the first editable element on the page (used by `mode-insert` when
 * nothing editable is focused). Tries the viewport-first heuristic loosely by
 * document order.
 * @returns {Element|null}
 */
function firstEditable() {
  if (typeof document === 'undefined') return null;
  const candidates = document.querySelectorAll(
    'input:not([type=button]):not([type=checkbox]):not([type=color]):not([type=file]):not([type=hidden]):not([type=image]):not([type=radio]):not([type=range]):not([type=reset]):not([type=submit]), textarea, [contenteditable="true"], [contenteditable=""]'
  );
  let first = null;
  for (const el of candidates) {
    if (!first) first = el;
    // Prefer the first element that is actually laid out with a visible box
    const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    if (rect && (rect.width > 0 || rect.height > 0)) return el;
  }
  return first;
}

// ── Readline helpers (input/textarea first, Selection API fallback) ──────────

function _valueAndPos(el) {
  if (typeof el.selectionStart === 'number') {
    return { value: el.value || '', start: el.selectionStart, end: el.selectionEnd };
  }
  return null;
}

function _endOfLine(el) {
  const vp = _valueAndPos(el);
  if (vp) {
    el.setSelectionRange(vp.value.length, vp.value.length);
    return true;
  }
  const sel = typeof window !== 'undefined' && window.getSelection ? window.getSelection() : null;
  if (sel && typeof sel.modify === 'function') {
    sel.modify('move', 'forward', 'lineboundary');
    return true;
  }
  return false;
}

function _beginningOfLine(el) {
  const vp = _valueAndPos(el);
  if (vp) {
    el.setSelectionRange(0, 0);
    return true;
  }
  const sel = typeof window !== 'undefined' && window.getSelection ? window.getSelection() : null;
  if (sel && typeof sel.modify === 'function') {
    sel.modify('move', 'backward', 'lineboundary');
    return true;
  }
  return false;
}

function _wordBoundary(text, pos, dir) {
  if (dir === 'backward') {
    let i = pos;
    while (i > 0 && /\s/.test(text[i - 1])) i--;
    while (i > 0 && !/\s/.test(text[i - 1])) i--;
    return i;
  }
  const n = text.length;
  let i = pos;
  while (i < n && /\s/.test(text[i])) i++;
  while (i < n && !/\s/.test(text[i])) i++;
  return i;
}

function _wordMove(el, dir) {
  const vp = _valueAndPos(el);
  if (vp) {
    const pos = _wordBoundary(vp.value, vp.start, dir);
    el.setSelectionRange(pos, pos);
    return true;
  }
  const sel = typeof window !== 'undefined' && window.getSelection ? window.getSelection() : null;
  if (sel && typeof sel.modify === 'function') {
    sel.modify('move', dir === 'backward' ? 'backward' : 'forward', 'word');
    return true;
  }
  return false;
}

function _deleteWord(el, dir) {
  const vp = _valueAndPos(el);
  if (vp) {
    let anchor;
    let focus;
    if (dir === 'backward') {
      anchor = _wordBoundary(vp.value, vp.start, 'backward');
      // Consume the whitespace between the previous word and the caret
      let a = anchor;
      while (a < vp.start && /\s/.test(vp.value[a])) a++;
      anchor = a;
      focus = vp.start;
    } else {
      anchor = vp.start;
      focus = _wordBoundary(vp.value, vp.start, 'forward');
      // Consume trailing whitespace (unix M-d behaviour)
      const n = vp.value.length;
      while (focus < n && /\s/.test(vp.value[focus])) focus++;
    }
    el.setRangeText('', Math.min(anchor, focus), Math.max(anchor, focus), 'end');
    return true;
  }
  const sel = typeof window !== 'undefined' && window.getSelection ? window.getSelection() : null;
  if (sel && typeof sel.modify === 'function') {
    sel.modify('extend', dir === 'backward' ? 'backward' : 'forward', 'word');
    if (typeof document !== 'undefined' && document.execCommand) {
      document.execCommand('delete');
      return true;
    }
  }
  return false;
}

function _deleteBeforeCursor(el) {
  const vp = _valueAndPos(el);
  if (vp) {
    el.setRangeText('', 0, vp.start, 'end');
    return true;
  }
  // Selection API fallback: extend to line start then delete
  const sel = typeof window !== 'undefined' && window.getSelection ? window.getSelection() : null;
  if (sel && typeof sel.modify === 'function' && typeof document !== 'undefined' && document.execCommand) {
    sel.modify('extend', 'backward', 'lineboundary');
    document.execCommand('delete');
    return true;
  }
  return false;
}

/**
 * Toggle quotes around the current selection (or word at caret).
 * If the selection is already wrapped in " or ', unwrap; otherwise wrap in ".
 */
function _toggleQuotes(el) {
  const vp = _valueAndPos(el);
  if (!vp) return false;
  const { value, start, end } = vp;
  const selText = value.slice(start, end) || _wordAtPos(value, start);
  if (!selText) return false;
  const sStart = start - 1;
  const sEnd = start + selText.length;
  const before = sStart >= 0 ? value[sStart] : '';
  const after = sEnd < value.length ? value[sEnd] : '';
  if ((before === '"' && after === '"') || (before === "'" && after === "'")) {
    // unwrap
    el.setRangeText(selText, sStart, sEnd + 1, 'end');
    el.setSelectionRange(sStart, sStart + selText.length);
    return true;
  }
  // wrap in double quotes
  el.setRangeText(`"${selText}"`, start, start + selText.length, 'end');
  el.setSelectionRange(start + 1, start + 1 + selText.length);
  return true;
}

function _wordAtPos(text, pos) {
  if (!/\S/.test(text[pos] || '')) return '';
  let s = pos;
  while (s > 0 && /\S/.test(text[s - 1])) s--;
  let e = pos;
  while (e < text.length - 1 && /\S/.test(text[e + 1])) e++;
  return text.slice(s, e + 1);
}

/**
 * Insert controller.
 *
 * @param {{
 *   modes: import('../core/modes').ModeStack,
 *   insertKeymap?: import('../core/keymap').KeyMap,
 *   onCommand?: (command: string) => void,
 * }} opts
 */
function Insert(opts) {
  const modes = opts && opts.modes;
  const insertKeymap = (opts && opts.insertKeymap) || null;
  const onCommand = (opts && opts.onCommand) || null;

  let _keyListener = null;
  let _focusIn = null;
  let _focusOut = null;
  let _explicit = false; // entered via mode-insert command (not auto-focus)
  const _keymap = insertKeymap || new KeyMap();

  function _activeElement() {
    if (typeof document === 'undefined') return null;
    return document.activeElement;
  }

  function enter(explicit = true) {
    if (!modes) return;
    if (modes.current() !== 'insert') modes.enter('insert');
    _explicit = !!explicit || _explicit;
    _installKeyListener();
  }

  function exit() {
    if (_keyListener && typeof document !== 'undefined') {
      document.removeEventListener('keydown', _keyListener, true);
      _keyListener = null;
    }
    _explicit = false;
    if (modes && modes.current() === 'insert') modes.leave();
  }

  function _installKeyListener() {
    if (_keyListener || typeof document === 'undefined') return;
    _keyListener = function (e) {
      // Escape always leaves Insert mode
      if (e.key === 'Escape') {
        exit();
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const el = _activeElement();
      const editable = isEditable(el);

      // Custom insert-mode bindings (profile/user) take precedence.
      // Plain printable characters NEVER go through the keymap — typing must
      // reach the input untouched (and KeyMap would swallow digits as count).
      const keyStr = keyEventToString(e);
      const isPlainChar = keyStr.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey;
      if (!isPlainChar && _keymap && onCommand) {
        const result = _keymap.feed(keyStr);
        if (result.status === 'matched') {
          e.preventDefault();
          e.stopPropagation();
          onCommand(result.command);
          return;
        }
        if (result.status === 'pending') {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        // nomatch → fall through to readline/page
      } else if (isPlainChar && _keymap) {
        // A plain char arrived while a pending chord was accumulated —
        // abandon the chord so typing is not affected.
        _keymap.reset();
      }

      if (!editable || !el) return;

      // Readline editing keys — SurfingKeys insert-mode defaults
      let handled = false;
      if (e.ctrlKey && !e.altKey && !e.metaKey && e.key === 'e') handled = _endOfLine(el);
      else if (e.ctrlKey && !e.altKey && !e.metaKey && e.key === 'a') handled = _beginningOfLine(el);
      else if (e.ctrlKey && !e.altKey && !e.metaKey && e.key === 'f') handled = _beginningOfLine(el);
      else if (e.ctrlKey && !e.altKey && !e.metaKey && e.key === 'u') handled = _deleteBeforeCursor(el);
      else if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'b') handled = _wordMove(el, 'backward');
      else if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'f') handled = _wordMove(el, 'forward');
      else if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'w') handled = _deleteWord(el, 'backward');
      else if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'd') handled = _deleteWord(el, 'forward');
      else if (e.ctrlKey && !e.altKey && !e.metaKey && (e.key === "'" || e.code === 'Quote')) handled = _toggleQuotes(el);

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', _keyListener, true);
  }

  /**
   * Install focus listeners that auto-enter/leave Insert mode when an
   * editable element gains/loses focus (SurfingKeys behavior).
   */
  function installFocusTracking() {
    if (_focusIn || typeof document === 'undefined') return;
    _focusIn = function (e) {
      if (!modes || modes.current() !== 'normal') return;
      if (isEditable(e.target)) enter(false);
    };
    _focusOut = function (e) {
      if (!modes || modes.current() !== 'insert' || _explicit) return;
      // Leave only when focus really moves away from editable content
      const next = e.relatedTarget;
      if (!isEditable(next)) exit();
    };
    document.addEventListener('focusin', _focusIn, true);
    document.addEventListener('focusout', _focusOut, true);
  }

  /**
   * Explicit entry from `mode-insert`: focus an editable element if none is.
   */
  function enterExplicit() {
    const el = _activeElement();
    if (!isEditable(el)) {
      const first = firstEditable();
      if (first && typeof first.focus === 'function') first.focus();
    }
    enter(true);
  }

  /**
   * `mode-normal` semantics: leave Insert mode if active.
   */
  function leaveIfActive() {
    if (modes && modes.current() === 'insert') {
      exit();
      return true;
    }
    return false;
  }

  return {
    enter,
    exit,
    enterExplicit,
    leaveIfActive,
    installFocusTracking,
    isActive: () => modes ? modes.current() === 'insert' : false,
  };
}

module.exports = { Insert, isEditable, firstEditable };
