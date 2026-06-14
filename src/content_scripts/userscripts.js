'use strict';

/**
 * Content-script userscript injection.
 *
 * `injectMatching` — DOM-guarded; runs each matching script in the PAGE world
 * by appending a <script> element to document.documentElement, then removing it.
 *
 * `UserscriptController` — thin wrapper that holds the store reference and
 * calls injectMatching for the current location.
 *
 * Safe to require under Jest/Node — all document access is guarded.
 */

const { UserscriptStore } = require('../core/userscripts');

/**
 * Inject all scripts in `store` that match `url` into the page world.
 *
 * Each script body is executed by appending a <script> element to
 * `document.documentElement` (which runs synchronously in the page world)
 * and is immediately removed afterwards to keep the DOM clean.
 *
 * @param {string} url
 * @param {UserscriptStore} store
 */
function injectMatching(url, store) {
  if (typeof document === 'undefined') return;

  const scripts = store.getMatching(url);
  for (const script of scripts) {
    try {
      const el = document.createElement('script');
      el.textContent = script.body;
      document.documentElement.appendChild(el);
      document.documentElement.removeChild(el);
    } catch (err) {
      // Non-fatal — log and continue
      // eslint-disable-next-line no-console
      console.warn('[QuteSurf] userscript injection failed for', script.name, err);
    }
  }
}

/**
 * Controller wrapping the userscript store and injection for the current page.
 *
 * @param {{ store: UserscriptStore }} options
 */
class UserscriptController {
  constructor({ store }) {
    this._store = store;
  }

  /**
   * Inject matching scripts for the current page URL.
   * Best-effort: DOM and location guards applied.
   */
  injectForCurrentPage() {
    if (typeof location === 'undefined') return;
    injectMatching(location.href, this._store);
  }
}

module.exports = { injectMatching, UserscriptController };
