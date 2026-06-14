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

function registerNavCommands(registry) {
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
    description: 'Scroll to a percentage of the page height (count = %; omit → bottom)',
    async handler(_ctx, parsed) {
      if (parsed.count != null) {
        const perc = Math.min(100, Math.max(0, parsed.count));
        window.scrollTo(0, (document.body.scrollHeight * perc) / 100);
      } else {
        window.scrollTo(0, document.body.scrollHeight);
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
    // NOTE: location.reload(true) is deprecated in modern browsers; a plain
    // reload() is used instead.  Hard reload (bypass cache) requires devtools
    // or service-worker fetch interception which is outside extension scope.
    description: 'Hard-reload the current page (cache bypass deprecated; behaves like reload)',
    async handler() {
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
    // NOTE: No homepage concept in an extension; navigates to origin root.
    // Future: read config 'homepage' when available.
    description: 'Navigate to the origin root of the current site (stub: no homepage config yet)',
    async handler() {
      // eslint-disable-next-line no-console
      console.info('[QuteSurf] home: navigating to origin root (no homepage config yet)');
      location.href = urlRoot(location.href);
    },
  });
}

module.exports = { registerNavCommands };
