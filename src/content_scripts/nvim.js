'use strict';

/**
 * nvim.js — NvimEditor controller.
 *
 * Tries to open the focused element in Neovim via Chrome native messaging
 * (com.qutesurf.nvim).  Falls back to the embedded ACE Vim editor (VimEditor)
 * on ANY failure — host not installed, connection error, disconnect, etc.
 *
 * Import-safe under Jest/Node: no `chrome` or `document` access at top level.
 */

const { extractInputValue, writeBackValue } = require('./ui/editor');

class NvimEditor {
  /**
   * @param {{ vimEditor: import('./ui/editor').VimEditor, messaging?: object }} opts
   */
  constructor({ vimEditor, messaging } = {}) {
    this._vimEditor = vimEditor || null;
    this._messaging = messaging || null;
  }

  /**
   * Open targetEl for editing.
   *
   * 1. Try chrome.runtime.connectNative('com.qutesurf.nvim').
   * 2. If the port connects, send the field text and wait for the edited response.
   * 3. On any error / disconnect, fall back to vimEditor.open(targetEl).
   *
   * @param {Element} targetEl
   * @returns {Promise<void>}
   */
  async open(targetEl) {
    // Guard: must have a target element.
    if (!targetEl) return;

    // Guard: if chrome.runtime.connectNative is unavailable, go straight to ACE.
    if (
      typeof chrome === 'undefined' ||
      !chrome.runtime ||
      typeof chrome.runtime.connectNative !== 'function'
    ) {
      return this._fallback(targetEl);
    }

    let port;
    try {
      port = chrome.runtime.connectNative('com.qutesurf.nvim');
    } catch (err) {
      // connectNative threw synchronously (host not registered, etc.)
      return this._fallback(targetEl);
    }

    // Race: did the port disconnect immediately (host binary not found)?
    await new Promise((resolve) => {
      let connected = false;

      port.onDisconnect.addListener(() => {
        if (!connected) {
          // Disconnected before we even got a response — fall back.
          resolve('disconnect');
        }
      });

      port.onMessage.addListener((msg) => {
        connected = true;
        if (msg && msg.type === 'edited' && typeof msg.text === 'string') {
          // Write the edited text back and close the port.
          try {
            writeBackValue(targetEl, msg.text);
          } catch (_) { /* non-fatal */ }
        }
        try { port.disconnect(); } catch (_) { /* ignore */ }
        resolve('done');
      });

      // Send the current field content to the host.
      try {
        const text = extractInputValue(targetEl);
        port.postMessage({ type: 'edit', text });
      } catch (err) {
        // postMessage failed — host probably not connected.
        try { port.disconnect(); } catch (_) { /* ignore */ }
        resolve('error');
      }
    }).then((outcome) => {
      if (outcome === 'disconnect' || outcome === 'error') {
        this._fallback(targetEl);
      }
    });
  }

  /**
   * Fall back to the ACE Vim editor.
   * @param {Element} targetEl
   */
  _fallback(targetEl) {
    if (this._vimEditor && typeof this._vimEditor.open === 'function') {
      return this._vimEditor.open(targetEl);
    }
  }
}

module.exports = { NvimEditor };
