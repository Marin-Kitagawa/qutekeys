'use strict';

/**
 * Map of special KeyboardEvent.key values to vim/qute notation strings.
 */
const SPECIAL_KEYS = {
  'Escape':    '<Escape>',
  'Enter':     '<Enter>',
  'Tab':       '<Tab>',
  'Backspace': '<Backspace>',
  ' ':         '<Space>',
  'ArrowUp':   '<Up>',
  'ArrowDown': '<Down>',
  'ArrowLeft': '<Left>',
  'ArrowRight':'<Right>',
  'F1':  '<F1>',  'F2':  '<F2>',  'F3':  '<F3>',  'F4':  '<F4>',
  'F5':  '<F5>',  'F6':  '<F6>',  'F7':  '<F7>',  'F8':  '<F8>',
  'F9':  '<F9>',  'F10': '<F10>', 'F11': '<F11>', 'F12': '<F12>',
  'Delete':    '<Delete>',
  'Insert':    '<Insert>',
  'Home':      '<Home>',
  'End':       '<End>',
  'PageUp':    '<PageUp>',
  'PageDown':  '<PageDown>',
};

/**
 * Convert a KeyboardEvent-like object to a qute/vim key notation string.
 *
 * Rules:
 *  - Plain printable single character  → that character (shift is already
 *    reflected in .key for letters, e.g. key='J' when shift+j).
 *  - Special keys                      → '<Name>'  (from SPECIAL_KEYS map)
 *  - Modifiers (Ctrl/Alt/Meta) wrap    → '<C-x>', '<A-x>', '<M-x>'
 *    Modifier order: C, A, M; key name stripped of brackets for special keys.
 *
 * @param {{ key: string, ctrlKey?: boolean, altKey?: boolean, metaKey?: boolean, shiftKey?: boolean }} e
 * @returns {string}
 */
function keyEventToString(e) {
  const { key, ctrlKey = false, altKey = false, metaKey = false } = e;

  const hasModifier = ctrlKey || altKey || metaKey;

  // Determine base notation for the key itself
  let base;
  if (Object.prototype.hasOwnProperty.call(SPECIAL_KEYS, key)) {
    // Special key — strip the angle brackets for use inside a modifier combo,
    // use the mapped name (e.g. 'Up', 'Escape', 'Enter') not the raw event key
    if (hasModifier) {
      base = SPECIAL_KEYS[key].slice(1, -1); // '<Up>' → 'Up', '<Enter>' → 'Enter'
    } else {
      return SPECIAL_KEYS[key]; // No modifiers → return directly
    }
  } else if (key.length === 1) {
    // Printable single character (letters, digits, punctuation)
    base = key;
  } else {
    // Multi-char non-special key (e.g. 'Dead', 'Unidentified') — best effort
    base = key;
  }

  // No modifiers and single char → return as-is
  if (!hasModifier) {
    return base;
  }

  // Build modifier prefix: C, A, M order
  let prefix = '';
  if (ctrlKey)  prefix += 'C-';
  if (altKey)   prefix += 'A-';
  if (metaKey)  prefix += 'M-';

  return `<${prefix}${base}>`;
}

/**
 * KeyHandler — feeds key strings into a KeyMap and dispatches matched commands.
 *
 * @param {import('../core/keymap').KeyMap} keymap
 * @param {{
 *   onMatched:  (command: string, count: number|null) => void,
 *   onPending:  (candidates: string[]) => void,
 *   onCleared:  () => void,
 *   timeoutMs?: number,
 *   setTimeout?:    Function,
 *   clearTimeout?:  Function,
 * }} opts
 */
class KeyHandler {
  constructor(keymap, opts = {}) {
    this._keymap      = keymap;
    this._onMatched   = opts.onMatched   || (() => {});
    this._onPending   = opts.onPending   || (() => {});
    this._onCleared   = opts.onCleared   || (() => {});
    this._timeoutMs   = opts.timeoutMs   != null ? opts.timeoutMs : 500;
    this._setTimeout  = opts.setTimeout  || globalThis.setTimeout.bind(globalThis);
    this._clearTimeout = opts.clearTimeout || globalThis.clearTimeout.bind(globalThis);
    this._timer       = null;
  }

  /**
   * Feed one key string (e.g. 'j', '<Escape>', '<C-i>') to the keymap and
   * react based on the result.
   *
   * @param {string} keyString
   */
  handleKey(keyString) {
    this._clearPendingTimer();

    const result = this._keymap.feed(keyString);

    if (result.status === 'matched') {
      this._onMatched(result.command, result.count);
    } else if (result.status === 'pending') {
      this._onPending(result.candidates);
      this._timer = this._setTimeout(() => {
        this._timer = null;
        const resolved = this._keymap.resolvePending();
        if (resolved) {
          this._onMatched(resolved.command, resolved.count);
        } else {
          this._onCleared();
        }
      }, this._timeoutMs);
    } else {
      // 'nomatch'
      this._onCleared();
    }
  }

  _clearPendingTimer() {
    if (this._timer !== null) {
      this._clearTimeout(this._timer);
      this._timer = null;
    }
  }
}

/**
 * Build the document-level keydown handler used by the content bootstrap.
 *
 * CRITICAL: only the `normal` mode is driven by the global keymap. Every other
 * mode (hints, caret, visual, command, find, insert) is owned by its own
 * controller, which installs its own capturing keydown listener. If the global
 * handler also fed the normal keymap in those modes, normal-mode commands
 * (scroll, tab-close, …) would fire underneath caret motions, hint-label typing,
 * and omnibar input — which is exactly the bug this gate prevents.
 *
 * @param {object}   opts
 * @param {{current: () => string}} opts.modes        the active ModeStack
 * @param {{handleKey: (k: string) => void}} opts.keyHandler
 * @param {(e: object) => string} [opts.toKeyString]  defaults to keyEventToString
 * @returns {(e: object) => void}
 */
function makeContentKeydownHandler({ modes, keyHandler, toKeyString = keyEventToString }) {
  const MODIFIERS = ['Control', 'Alt', 'Meta', 'Shift'];
  return function (e) {
    if (MODIFIERS.includes(e.key)) return;
    if (modes && typeof modes.current === 'function' && modes.current() !== 'normal') return;
    keyHandler.handleKey(toKeyString(e));
  };
}

module.exports = { keyEventToString, KeyHandler, makeContentKeydownHandler };
