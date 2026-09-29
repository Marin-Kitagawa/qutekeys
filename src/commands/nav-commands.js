'use strict';

/**
 * Register scroll and navigation content commands.
 *
 * All DOM/global access (window, document, history, location) is confined
 * INSIDE handler bodies — never at module import time, so this file is
 * safe to require in Jest/Node without any browser environment.
 *
 * @param {import('../core/registry').CommandRegistry} registry
 */

const { scrollDelta, urlUp, urlRoot } = require('./nav-helpers');

const SCROLL_STEP = 70; // px default for cardinal scrolls

function registerNavCommands(registry, ctx = {}) {
  const config = ctx.config || null;
  const messaging = ctx.messaging || null;
  // ── Scroll — cardinal ─────────────────────────────────────────────────────
  for (const dir of ['down', 'up', 'left', 'right']) {
    const d = dir; // close over
    registry.register({
      name: `scroll-${d}`,
      context: 'content',
      modes: ['normal'],
      description: `Scroll ${d}`,
      async handler(_ctx, parsed) {
        const count = parsed.count || 1;
        const vp = { width: window.innerWidth, height: window.innerHeight };
        const delta = scrollDelta(d, vp, SCROLL_STEP);
        window.scrollBy(delta.x * count, delta.y * count);
      },
    });
  }

  // ── Scroll — halfpage ─────────────────────────────────────────────────────
  for (const dir of ['halfpage-down', 'halfpage-up']) {
    const d = dir;
    registry.register({
      name: `scroll-${d}`,
      context: 'content',
      modes: ['normal'],
      description: `Scroll ${d.replace('-', ' ')}`,
      async handler(_ctx, parsed) {
        const count = parsed.count || 1;
        const vp = { width: window.innerWidth, height: window.innerHeight };
        const delta = scrollDelta(d, vp, SCROLL_STEP);
        window.scrollBy(delta.x * count, delta.y * count);
      },
    });
  }

  // ── Scroll — full page ────────────────────────────────────────────────────
  for (const dir of ['page-down', 'page-up']) {
    const d = dir;
    registry.register({
      name: `scroll-${d}`,
      context: 'content',
      modes: ['normal'],
      description: `Scroll one full page ${d === 'page-down' ? 'down' : 'up'}`,
      async handler(_ctx, parsed) {
        const count = parsed.count || 1;
        const vp = { width: window.innerWidth, height: window.innerHeight };
        const delta = scrollDelta(d, vp, SCROLL_STEP);
        window.scrollBy(delta.x * count, delta.y * count);
      },
    });
  }

  // ── Scroll — extremes ─────────────────────────────────────────────────────
  registry.register({
    name: 'scroll-to-top',
    context: 'content',
    modes: ['normal'],
    description: 'Scroll to the top of the page',
    async handler() {
      window.scrollTo(0, 0);
    },
  });

  registry.register({
    name: 'scroll-to-bottom',
    context: 'content',
    modes: ['normal'],
    description: 'Scroll to the bottom of the page',
    async handler() {
      window.scrollTo(0, document.body.scrollHeight);
    },
  });

  registry.register({
    name: 'scroll-to-perc',
    context: 'content',
    modes: ['normal'],
    description: 'Scroll to a percentage of the page (count = %; -x flag = horizontal; omit → bottom)',
    async handler(_ctx, parsed) {
      if (parsed.flags && parsed.flags.x) {
        const percX = Math.min(100, Math.max(0, parsed.count != null ? parsed.count : 100));
        const maxLeft = (document.documentElement.scrollWidth || 0) - window.innerWidth;
        window.scrollTo((maxLeft * percX) / 100, window.scrollY);
        return;
      }
      if (parsed.count != null) {
        const perc = Math.min(100, Math.max(0, parsed.count));
        window.scrollTo(0, (document.body.scrollHeight * perc) / 100);
      } else {
        window.scrollTo(0, document.body.scrollHeight);
      }
    },
  });

  registry.register({
    name: 'scroll-px',
    context: 'content',
    modes: ['normal'],
    description: 'Scroll by pixels. Usage: scroll-px <dx> <dy> (count multiplies)',
    args: ['dx', 'dy'],
    async handler(_ctx, parsed) {
      const dx = Number(parsed.args[0]) || 0;
      const dy = Number(parsed.args[1]) || 0;
      const count = parsed.count || 1;
      window.scrollBy(dx * count, dy * count);
    },
  });

  registry.register({
    name: 'scroll-to-anchor',
    context: 'content',
    modes: ['normal'],
    description: 'Scroll to a named HTML anchor (name/id attribute)',
    args: ['name'],
    async handler(_ctx, parsed) {
      if (typeof document === 'undefined') return;
      const name = parsed.args[0];
      if (!name) return;
      const el =
        document.getElementById(name) ||
        document.querySelector(`[name="${CSS.escape ? CSS.escape(name) : name}"]`);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView();
      }
    },
  });

  // ── History ───────────────────────────────────────────────────────────────
  registry.register({
    name: 'back',
    context: 'content',
    modes: ['normal'],
    description: 'Go back in browser history',
    async handler() {
      history.back();
    },
  });

  registry.register({
    name: 'forward',
    context: 'content',
    modes: ['normal'],
    description: 'Go forward in browser history',
    async handler() {
      history.forward();
    },
  });

  // ── Reload / stop ─────────────────────────────────────────────────────────
  registry.register({
    name: 'reload',
    context: 'content',
    modes: ['normal'],
    description: 'Reload the current page',
    async handler() {
      location.reload();
    },
  });

  registry.register({
    name: 'reload-hard',
    context: 'content',
    modes: ['normal'],
    description: 'Hard-reload the current page (bypass cache)',
    async handler() {
      // True cache bypass is only available via chrome.tabs.reload — go
      // through the background. Fall back to a plain reload on failure.
      if (messaging && typeof messaging.sendMessage === 'function') {
        try {
          const res = await messaging.sendMessage({ type: 'command', name: 'tab-reload-hard', args: [], flags: {}, count: null });
          if (res && res.ok) return;
        } catch (_) {
          // fall through to plain reload
        }
      }
      location.reload();
    },
  });

  registry.register({
    name: 'stop',
    context: 'content',
    modes: ['normal'],
    description: 'Stop loading the current page',
    async handler() {
      window.stop();
    },
  });

  // ── URL navigation ────────────────────────────────────────────────────────
  registry.register({
    name: 'url-up',
    context: 'content',
    modes: ['normal'],
    description: 'Navigate up one path segment in the current URL',
    async handler() {
      location.href = urlUp(location.href);
    },
  });

  registry.register({
    name: 'url-root',
    context: 'content',
    modes: ['normal'],
    description: 'Navigate to the root (origin) of the current URL',
    async handler() {
      location.href = urlRoot(location.href);
    },
  });

  registry.register({
    name: 'home',
    context: 'content',
    modes: ['normal'],
    description: 'Navigate to the configured homepage (or site origin when unset)',
    async handler() {
      const hp = config && typeof config.get === 'function' ? config.get('homepage') : '';
      if (hp && typeof hp === 'string') {
        location.href = hp;
      } else {
        location.href = urlRoot(location.href);
      }
    },
  });
}

module.exports = { registerNavCommands };
