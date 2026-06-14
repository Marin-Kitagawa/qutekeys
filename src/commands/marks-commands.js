'use strict';

/**
 * Marks & quickmarks commands.
 *
 * All DOM/global access (location, window, document) is confined inside handler
 * bodies — this file is safe to require in Jest/Node without a browser environment.
 *
 * One-key capture is implemented with a one-shot keydown listener attached inside
 * the handler at call time; it is automatically removed after the key is received.
 *
 * @param {import('../core/registry').CommandRegistry} registry
 * @param {{ marks?: import('../core/marks').Marks, dispatcher?: object, messaging?: object }} ctx
 */
function registerMarksCommands(registry, ctx = {}) {
  const { marks, messaging } = ctx;

  /**
   * Attach a one-shot keydown listener and resolve with the next key pressed.
   * Returns null immediately when DOM is not available (e.g. Node/Jest).
   * @returns {Promise<string|null>}
   */
  function captureNextKey() {
    if (typeof document === 'undefined') return Promise.resolve(null);
    return new Promise(resolve => {
      function onKey(e) {
        document.removeEventListener('keydown', onKey, true);
        e.preventDefault();
        e.stopImmediatePropagation();
        resolve(e.key);
      }
      document.addEventListener('keydown', onKey, true);
    });
  }

  // ── mark-set ────────────────────────────────────────────────────────────────
  registry.register({
    name: 'mark-set',
    description: 'Set a mark at the current scroll position (next key = mark char)',
    context: 'content',
    modes: ['normal'],
    async handler() {
      if (!marks) return;
      const key = await captureNextKey();
      if (!key) return;
      const url = typeof location !== 'undefined' ? location.href : '';
      const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
      await marks.setMark(key, { url, scrollY });
    },
  });

  // ── mark-jump ───────────────────────────────────────────────────────────────
  registry.register({
    name: 'mark-jump',
    description: 'Jump to a saved mark (next key = mark char)',
    context: 'content',
    modes: ['normal'],
    async handler() {
      if (!marks) return;
      const key = await captureNextKey();
      if (!key) return;
      const loc = marks.getMark(key);
      if (!loc) return;
      if (typeof location !== 'undefined') {
        if (location.href === loc.url) {
          // Same page — just scroll
          if (typeof window !== 'undefined') window.scrollTo(0, loc.scrollY);
        } else {
          location.href = loc.url;
          // scrollY restore would need to happen after page load — not handled here
        }
      }
    },
  });

  // ── quickmark-save ──────────────────────────────────────────────────────────
  registry.register({
    name: 'quickmark-save',
    description: 'Save a quickmark for the current URL (next key = quickmark name)',
    context: 'content',
    modes: ['normal'],
    async handler() {
      if (!marks) return;
      const key = await captureNextKey();
      if (!key) return;
      const url = typeof location !== 'undefined' ? location.href : '';
      await marks.setQuickmark(key, url);
    },
  });

  // ── quickmark-open ──────────────────────────────────────────────────────────
  registry.register({
    name: 'quickmark-open',
    description: 'Open a quickmark in the current tab (next key = quickmark name)',
    context: 'content',
    modes: ['normal'],
    async handler() {
      if (!marks) return;
      const key = await captureNextKey();
      if (!key) return;
      const url = marks.getQuickmark(key);
      if (!url) return;
      if (typeof location !== 'undefined') {
        location.href = url;
      }
    },
  });

  // ── quickmark-open-newtab ───────────────────────────────────────────────────
  registry.register({
    name: 'quickmark-open-newtab',
    description: 'Open a quickmark in a new tab (next key = quickmark name)',
    context: 'content',
    modes: ['normal'],
    async handler() {
      if (!marks) return;
      const key = await captureNextKey();
      if (!key) return;
      const url = marks.getQuickmark(key);
      if (!url) return;
      if (messaging && typeof messaging.sendMessage === 'function') {
        await messaging.sendMessage({ type: 'command', name: 'tab-new', args: [url] });
      }
    },
  });
}

module.exports = { registerMarksCommands };
