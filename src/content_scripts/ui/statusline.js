'use strict';

const { STATUSLINE_CSS } = require('./statusline.css');

/**
 * Pure DOM builder — creates a statusline element from a state snapshot.
 * Safe to call in jsdom (document.createElement is used directly).
 *
 * @param {{ mode: string, host: string, percent: number }} state
 * @returns {HTMLElement}
 */
function renderStatus({ mode, host, percent }) {
  const bar = document.createElement('div');
  bar.id = 'qs-statusline';

  const badge = document.createElement('span');
  badge.id = 'qs-statusline-mode';
  badge.textContent = mode.toUpperCase();

  const hostEl = document.createElement('span');
  hostEl.id = 'qs-statusline-host';
  hostEl.textContent = host;

  const pctEl = document.createElement('span');
  pctEl.id = 'qs-statusline-percent';
  pctEl.textContent = `${percent}%`;

  bar.appendChild(badge);
  bar.appendChild(hostEl);
  bar.appendChild(pctEl);

  return bar;
}

/**
 * Statusline controller — mounts a live statusline into a ShadowHost and
 * keeps it updated as mode and scroll position change.
 *
 * @param {{ host: import('./host').ShadowHost, modes: import('../../core/modes').ModeStack }} opts
 */
class Statusline {
  constructor({ host, modes }) {
    this._host  = host;
    this._modes = modes;
    this._el    = null;

    // Guard: only wire DOM/scroll listeners in a real browser environment
    if (typeof document === 'undefined') return;

    host.addStyle(STATUSLINE_CSS);

    // Initial render
    this._el = this._buildEl();
    host.mount(this._el);

    // Re-render on mode change
    this._modes.onChange(() => this.update());

    // Throttled scroll listener
    this._scrollTimer = null;
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', () => {
        if (this._scrollTimer !== null) return;
        this._scrollTimer = setTimeout(() => {
          this._scrollTimer = null;
          this.update();
        }, 80);
      }, { passive: true });
    }
  }

  /** Re-render the statusline element in place. */
  update() {
    if (!this._el) return;
    const next = this._buildEl();
    if (this._el.parentNode) {
      this._el.parentNode.replaceChild(next, this._el);
    }
    this._el = next;
  }

  /** Build a fresh DOM element from current state. */
  _buildEl() {
    const mode = this._modes ? this._modes.current() : 'normal';

    let host = '';
    try {
      if (typeof document !== 'undefined' && document.location) {
        host = document.location.host || '';
      }
    } catch (_) { /* cross-origin guard */ }

    let percent = 0;
    try {
      if (typeof window !== 'undefined') {
        const scrollable = (document.documentElement.scrollHeight || 0) -
                           (window.innerHeight || 0);
        percent = scrollable > 0
          ? Math.round(Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)))
          : 0;
      }
    } catch (_) { /* guard */ }

    return renderStatus({ mode, host, percent });
  }
}

module.exports = { renderStatus, Statusline };
