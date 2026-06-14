'use strict';

/**
 * editor.js — Embedded ACE Vim editor for input fields.
 *
 * Pure value extract/writeback helpers are fully unit-testable in jsdom.
 * ACE is imported LAZILY (inside VimEditor methods) so this module is
 * import-safe under Jest/Node.
 */

// ── Pure helpers (unit-tested) ────────────────────────────────────────────────

/**
 * Read the current text value from any editable element.
 * @param {Element} el
 * @returns {string}
 */
function extractInputValue(el) {
  if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
    return el.textContent;
  }
  return el.value;
}

/**
 * Write a text value back to any editable element and notify frameworks
 * (React/Vue/Angular) via synthetic input + change events.
 * @param {Element} el
 * @param {string} text
 */
function writeBackValue(el, text) {
  if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
    el.textContent = text;
  } else {
    // For React-controlled inputs the native value setter must be used so that
    // React's internal fiber updates correctly.
    const nativeInputValueSetter =
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') ||
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
    if (nativeInputValueSetter && nativeInputValueSetter.set) {
      try {
        nativeInputValueSetter.set.call(el, text);
      } catch (_) {
        el.value = text;
      }
    } else {
      el.value = text;
    }
  }

  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

// ── VimEditor controller ──────────────────────────────────────────────────────

const OVERLAY_CSS = `
  #qutesurf-vim-editor-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 2147483647;
    background: rgba(0,0,0,0.75);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #qutesurf-vim-editor-wrap {
    width: 80vw;
    height: 60vh;
    min-width: 300px;
    min-height: 200px;
    border: 2px solid #444;
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  #qutesurf-vim-editor-toolbar {
    background: #1e1e1e;
    color: #ccc;
    font-family: monospace;
    font-size: 12px;
    padding: 4px 8px;
    flex-shrink: 0;
    display: flex;
    gap: 12px;
    align-items: center;
  }
  #qutesurf-vim-editor-toolbar kbd {
    background: #333;
    border-radius: 3px;
    padding: 1px 4px;
    font-size: 11px;
  }
  #qutesurf-vim-editor-inner {
    flex: 1;
    position: relative;
  }
`;

class VimEditor {
  /**
   * @param {{ host: import('./host').ShadowHost, modes: import('../../core/modes').ModeStack }} opts
   */
  constructor({ host, modes } = {}) {
    this._host = host || null;
    this._modes = modes || null;
    this._targetEl = null;
    this._aceEditor = null;
    this._overlay = null;
  }

  /**
   * Open the Vim editor overlay pointing at a target editable element.
   * ACE is loaded lazily here — safe to call only in a real browser.
   * @param {Element} targetEl
   * @returns {Promise<void>}
   */
  async open(targetEl) {
    // Guard: must have a DOM
    if (typeof document === 'undefined') return;
    if (this._overlay) this.close();

    this._targetEl = targetEl;
    const initialValue = extractInputValue(targetEl);

    // ── Build overlay DOM ──────────────────────────────────────────────────
    this._overlay = document.createElement('div');
    this._overlay.id = 'qutesurf-vim-editor-overlay';

    const wrap = document.createElement('div');
    wrap.id = 'qutesurf-vim-editor-wrap';

    const toolbar = document.createElement('div');
    toolbar.id = 'qutesurf-vim-editor-toolbar';
    toolbar.innerHTML =
      '<span>QuteSurf Vim Editor</span>' +
      '<span><kbd>:wq</kbd> / <kbd>Ctrl-Enter</kbd> save &amp; close &nbsp;|&nbsp; ' +
      '<kbd>:q!</kbd> discard</span>';

    const inner = document.createElement('div');
    inner.id = 'qutesurf-vim-editor-inner';

    wrap.appendChild(toolbar);
    wrap.appendChild(inner);
    this._overlay.appendChild(wrap);

    // Mount style + overlay into shadow host (or directly into body as fallback)
    if (this._host && this._host.root) {
      this._host.addStyle(OVERLAY_CSS);
      this._host.mount(this._overlay);
    } else if (document.body) {
      const style = document.createElement('style');
      style.textContent = OVERLAY_CSS;
      document.head.appendChild(style);
      document.body.appendChild(this._overlay);
    }

    // ── Lazily load ACE + Vim keybinding as a separate webpack chunk ──────
    let ace;
    try {
      ace = await import(/* webpackChunkName: "ace" */ 'ace-builds');
      // Disable web workers — they reference separate bundle files by URL
      // which cannot be resolved inside a content-script environment.
      ace.config.set('useWorker', false);
      // Import the Vim keybinding module (registers itself into ace)
      await import(/* webpackChunkName: "ace" */ 'ace-builds/src-noconflict/keybinding-vim');
    } catch (err) {
      // ACE failed to load (unlikely in production; possible in certain
      // bundling environments).  Fall back to a plain textarea overlay.
      // eslint-disable-next-line no-console
      console.warn('[QuteSurf] ACE failed to load; falling back to plain textarea:', err);
      this._openFallback(inner, initialValue);
      return;
    }

    this._aceEditor = ace.edit(inner);
    this._aceEditor.setValue(initialValue, -1 /* move cursor to start */);
    this._aceEditor.setKeyboardHandler('ace/keyboard/vim');
    this._aceEditor.setOptions({
      fontSize: '14px',
      theme: 'ace/theme/monokai',
      showPrintMargin: false,
    });
    this._aceEditor.focus();

    // ── Wire Vim :write / :quit commands ──────────────────────────────────
    const VimApi = ace.require ? ace.require('ace/keyboard/vim') : null;
    if (VimApi && VimApi.CodeMirror && VimApi.CodeMirror.Vim) {
      const Vim = VimApi.CodeMirror.Vim;
      const self = this;
      Vim.defineEx('write', 'w', function () { self._save(); });
      Vim.defineEx('quit', 'q', function () { self.close(); });
      Vim.defineEx('wq', 'wq', function () { self._save(); self.close(); });
    }

    // ── Ctrl-Enter shortcut ────────────────────────────────────────────────
    const self = this;
    this._aceEditor.commands.addCommand({
      name: 'saveAndClose',
      bindKey: { win: 'Ctrl-Return', mac: 'Ctrl-Return' },
      exec() { self._save(); self.close(); },
    });

    // Notify mode system that we have entered an editor pseudo-mode
    if (this._modes) {
      this._modes.enter('editor');
    }
  }

  /** Save editor content back to the target element without closing. */
  _save() {
    if (!this._targetEl || !this._aceEditor) return;
    writeBackValue(this._targetEl, this._aceEditor.getValue());
  }

  /**
   * Close (and optionally save) the editor overlay.
   * @param {boolean} [save=false]
   */
  close(save = false) {
    if (save) this._save();

    if (this._aceEditor) {
      try { this._aceEditor.destroy(); } catch (_) { /* ignore */ }
      this._aceEditor = null;
    }

    if (this._overlay) {
      try { this._overlay.remove(); } catch (_) { /* ignore */ }
      this._overlay = null;
    }

    if (this._modes && this._modes.current() === 'editor') {
      this._modes.leave();
    }

    this._targetEl = null;
  }

  // ── Plain-textarea fallback (no ACE) ──────────────────────────────────────

  _openFallback(container, initialValue) {
    const ta = document.createElement('textarea');
    ta.style.cssText = 'width:100%;height:100%;font-family:monospace;font-size:14px;border:none;outline:none;resize:none;padding:8px;background:#272822;color:#f8f8f2;';
    ta.value = initialValue;
    container.appendChild(ta);
    ta.focus();

    const self = this;
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.ctrlKey) {
        writeBackValue(self._targetEl, ta.value);
        self.close();
        e.preventDefault();
      } else if (e.key === 'Escape') {
        self.close();
        e.preventDefault();
      }
    });

    // Store a minimal "editor" shim so close() doesn't break
    this._aceEditor = {
      getValue() { return ta.value; },
      destroy() {},
    };
  }
}

module.exports = { extractInputValue, writeBackValue, VimEditor };
