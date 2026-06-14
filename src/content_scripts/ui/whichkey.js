'use strict';

const { WHICHKEY_CSS } = require('./whichkey.css');

/**
 * Pure DOM builder — creates a which-key panel listing candidate key sequences
 * and their associated command names.
 *
 * @param {string[]} candidates   — pending key sequences, e.g. ['gg', 'gi', 'gt']
 * @param {(seq: string) => string|undefined} lookup — returns command name for seq
 * @returns {HTMLElement}
 */
function renderWhichKey(candidates, lookup) {
  const panel = document.createElement('div');
  panel.id = 'qs-whichkey';

  for (const seq of candidates) {
    const row = document.createElement('div');
    row.className = 'qs-wk-row';

    const seqEl = document.createElement('span');
    seqEl.className = 'qs-wk-seq';
    seqEl.textContent = seq;

    const cmdEl = document.createElement('span');
    cmdEl.className = 'qs-wk-cmd';
    const cmd = lookup ? lookup(seq) : undefined;
    cmdEl.textContent = cmd != null ? cmd : '';

    row.appendChild(seqEl);
    row.appendChild(cmdEl);
    panel.appendChild(row);
  }

  return panel;
}

/**
 * WhichKey controller — shows/hides a floating which-key panel inside a ShadowHost.
 *
 * @param {{ host: import('./host').ShadowHost }} opts
 */
class WhichKey {
  constructor({ host }) {
    this._host = host;
    this._el   = null;

    if (typeof document === 'undefined') return;

    host.addStyle(WHICHKEY_CSS);
  }

  /**
   * Render (or replace) the which-key panel with new candidates.
   *
   * @param {string[]} candidates
   * @param {(seq: string) => string|undefined} lookup
   */
  show(candidates, lookup) {
    if (!this._host) return;
    this.hide();
    this._el = renderWhichKey(candidates, lookup);
    this._host.mount(this._el);
  }

  /** Remove the which-key panel from the shadow root. */
  hide() {
    if (this._el && this._el.parentNode) {
      this._el.parentNode.removeChild(this._el);
    }
    this._el = null;
  }
}

module.exports = { renderWhichKey, WhichKey };
