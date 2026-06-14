'use strict';

function registerWave6Commands(registry, ctx = {}) {
  const { modes, passThrough, macros, blocklist, scrollTarget, dispatcher, messaging, vimEditor, omnibar } = ctx;

  // Helper: captureNextKey (same pattern as marks-commands.js)
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

  // ── mode-passthrough ───────────────────────────────────────────────────────
  registry.register({
    name: 'mode-passthrough',
    description: 'Enter passthrough mode (all keys reach the page; Esc to return)',
    context: 'content',
    modes: ['normal'],
    handler() {
      if (passThrough) passThrough.enter();
    },
  });

  // ── mode-passthrough-ephemeral ─────────────────────────────────────────────
  registry.register({
    name: 'mode-passthrough-ephemeral',
    description: 'Enter passthrough mode for ~1.2 s then auto-exit',
    context: 'content',
    modes: ['normal'],
    handler() {
      if (passThrough) passThrough.enterEphemeral(1200);
    },
  });

  // ── macro-record ───────────────────────────────────────────────────────────
  registry.register({
    name: 'macro-record',
    description: 'Start/stop macro recording into a register (q + register key)',
    context: 'content',
    modes: ['normal'],
    async handler() {
      if (!macros) return;
      if (macros.isRecording()) {
        macros.stopRecord();
        return;
      }
      const key = await captureNextKey();
      if (!key || key.length !== 1) return;
      macros.startRecord(key);
    },
  });

  // ── macro-run ──────────────────────────────────────────────────────────────
  registry.register({
    name: 'macro-run',
    description: 'Run a macro from a register (@ + register key)',
    context: 'content',
    modes: ['normal'],
    async handler() {
      if (!macros) return;
      const key = await captureNextKey();
      if (!key || key.length !== 1) return;
      macros.run(key);
    },
  });

  // ── repeat-last ────────────────────────────────────────────────────────────
  registry.register({
    name: 'repeat-last',
    description: 'Repeat the last successfully dispatched command',
    context: 'content',
    modes: ['normal'],
    async handler() {
      if (!dispatcher || !dispatcher.lastCommand) return;
      await dispatcher.runString(dispatcher.lastCommand);
    },
  });

  // ── blocklist-toggle ───────────────────────────────────────────────────────
  registry.register({
    name: 'blocklist-toggle',
    description: 'Toggle QuteSurf on/off for the current site',
    context: 'content',
    modes: ['normal'],
    async handler() {
      if (!blocklist) return;
      const host = typeof location !== 'undefined' ? location.host : '';
      if (host) await blocklist.toggle(host);
    },
  });

  // ── scroll-target-next ─────────────────────────────────────────────────────
  registry.register({
    name: 'scroll-target-next',
    description: 'Cycle scroll target to next scrollable element on the page',
    context: 'content',
    modes: ['normal'],
    handler() {
      if (!scrollTarget) return;
      const root = typeof document !== 'undefined' ? document.body : null;
      scrollTarget.next(root);
    },
  });

  // ── scroll-target-reset ────────────────────────────────────────────────────
  registry.register({
    name: 'scroll-target-reset',
    description: 'Reset scroll target to document (window scrolling)',
    context: 'content',
    modes: ['normal'],
    handler() {
      if (!scrollTarget) return;
      scrollTarget.reset();
    },
  });

  // ── edit-url-open ──────────────────────────────────────────────────────────
  // Simplification: opens omnibar prefilled with current URL in open-newtab mode
  // (full VimEditor URL editing requires complex callback integration).
  registry.register({
    name: 'edit-url-open',
    description: 'Edit current URL then open in new tab (omnibar approach)',
    context: 'content',
    modes: ['normal'],
    handler() {
      if (omnibar) omnibar.open('open-newtab');
    },
  });

  // ── edit-url-reload ────────────────────────────────────────────────────────
  registry.register({
    name: 'edit-url-reload',
    description: 'Edit current URL then navigate current tab (omnibar approach)',
    context: 'content',
    modes: ['normal'],
    handler() {
      if (omnibar) omnibar.open('open');
    },
  });

  // ── omnibar-recently-closed ────────────────────────────────────────────────
  registry.register({
    name: 'omnibar-recently-closed',
    description: 'Open omnibar showing recently closed tabs',
    context: 'content',
    modes: ['normal'],
    handler() {
      if (omnibar) omnibar.open('recently-closed');
    },
  });

  // ── omnibar-close-tabs ─────────────────────────────────────────────────────
  registry.register({
    name: 'omnibar-close-tabs',
    description: 'Pick tabs to close via omnibar',
    context: 'content',
    modes: ['normal'],
    handler() {
      if (omnibar) omnibar.open('close-tabs');
    },
  });

  // ── omnibar-windows ────────────────────────────────────────────────────────
  registry.register({
    name: 'omnibar-windows',
    description: 'Move current tab to chosen window via omnibar',
    context: 'content',
    modes: ['normal'],
    handler() {
      if (omnibar) omnibar.open('windows');
    },
  });

  // ── mark-jump-newtab ───────────────────────────────────────────────────────
  registry.register({
    name: 'mark-jump-newtab',
    description: 'Jump to a saved mark, opening the URL in a new tab',
    context: 'content',
    modes: ['normal'],
    async handler() {
      // marks is not directly available in wave6 ctx; use messaging pattern
      // We re-use captureNextKey then send tab-new via messaging
      // Note: marks object must be passed in ctx if available
      const marks = ctx.marks;
      if (!marks) return;
      const key = await captureNextKey();
      if (!key) return;
      const loc = marks.getMark(key);
      if (!loc || !loc.url) return;
      if (messaging && typeof messaging.sendMessage === 'function') {
        await messaging.sendMessage({ type: 'command', name: 'tab-new', args: [loc.url], flags: {}, count: null });
      }
    },
  });

  // ── switch-frames ──────────────────────────────────────────────────────────
  registry.register({
    name: 'switch-frames',
    description: 'Focus the next iframe on the page (cycle)',
    context: 'content',
    modes: ['normal'],
    handler() {
      if (typeof document === 'undefined') return;
      const iframes = Array.from(document.querySelectorAll('iframe'));
      if (!iframes.length) return;
      const focused = document.activeElement;
      const idx = iframes.indexOf(focused);
      const next = iframes[(idx + 1) % iframes.length];
      if (next) next.focus();
    },
  });
}

module.exports = { registerWave6Commands };
