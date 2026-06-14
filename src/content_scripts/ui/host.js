'use strict';

/**
 * ShadowHost — creates a host element with a closed shadow root that acts as
 * an isolated container for QuteSurf UI elements.
 *
 * Using a closed shadow root prevents the page's own CSS and JavaScript from
 * accidentally interfering with the extension UI.
 */
class ShadowHost {
  constructor() {
    // Guard against environments without a document (e.g. background workers)
    if (typeof document === 'undefined') {
      this.root = null;
      return;
    }

    this._host = document.createElement('div');
    this._host.id = 'qutesurf-host';

    // Attach before creating shadow so the element is in the document tree
    // (documentElement is always present in a browser context).
    if (document.documentElement) {
      document.documentElement.appendChild(this._host);
    }

    this.root = this._host.attachShadow({ mode: 'closed' });
  }

  /**
   * Inject a CSS string into the shadow root.
   * @param {string} cssText
   */
  addStyle(cssText) {
    if (!this.root) return;
    const style = document.createElement('style');
    style.textContent = cssText;
    this.root.appendChild(style);
  }

  /**
   * Append an element into the shadow root.
   * @param {Element} el
   */
  mount(el) {
    if (!this.root) return;
    this.root.appendChild(el);
  }
}

module.exports = { ShadowHost };
