'use strict';

/**
 * Register yank / clipboard commands into the given CommandRegistry.
 *
 * All DOM/global access (navigator.clipboard, location, document, window) is
 * confined inside handler bodies — this file is safe to require in Jest/Node
 * without a browser environment.
 *
 * @param {import('../core/registry').CommandRegistry} registry
 * @param {{ dispatcher?: object, messaging?: object, config?: object }} ctx
 */

const { formatYank, Clipboard } = require('../content_scripts/clipboard');
const { isSafeNavUrl } = require('../core/url-safety');
const { serializeFormsJson, serializeFormsPost, fillForms } = require('../content_scripts/formdata');
const { DEFAULTS } = require('../core/config');

/**
 * Resolve raw clipboard text to a URL or a Google search URL.
 *
 * A string is treated as a URL when it starts with a recognised scheme or
 * looks like a host + optional path (e.g. "example.com/foo").
 *
 * @param {string} text
 * @returns {string}
 */
function resolveUrl(text) {
  const trimmed = text.trim();
  // Defense-in-depth: pasted clipboard content carrying a dangerous scheme
  // (javascript:, data:, vbscript:, …) must never become a navigation. Treat
  // it as a plain search query instead of a URL.
  if (isSafeNavUrl(trimmed)) {
    if (/^https?:\/\//i.test(trimmed) || /^ftp:\/\//i.test(trimmed)) {
      return trimmed;
    }
    // Looks like a bare hostname / hostname+path (e.g. "example.com/page")
    if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
      return 'https://' + trimmed;
    }
  }
  // Fall back to a Google search (covers non-URL text and rejected schemes)
  return 'https://www.google.com/search?q=' + encodeURIComponent(trimmed);
}

function registerYankCommands(registry, ctx = {}) {
  // ── yank-url ──────────────────────────────────────────────────────────────
  registry.register({
    name: 'yank-url',
    description: 'Copy the current page URL to the clipboard',
    context: 'content',
    modes: ['normal'],
    async handler() {
      await Clipboard.write(formatYank('url', Clipboard.currentPage()));
    },
  });

  // ── yank-title ────────────────────────────────────────────────────────────
  registry.register({
    name: 'yank-title',
    description: 'Copy the current page title to the clipboard',
    context: 'content',
    modes: ['normal'],
    async handler() {
      await Clipboard.write(formatYank('title', Clipboard.currentPage()));
    },
  });

  // ── yank-mdlink ───────────────────────────────────────────────────────────
  registry.register({
    name: 'yank-mdlink',
    description: 'Copy a Markdown link ([title](url)) for the current page to the clipboard',
    context: 'content',
    modes: ['normal'],
    async handler() {
      await Clipboard.write(formatYank('mdlink', Clipboard.currentPage()));
    },
  });

  // ── yank-anchor ───────────────────────────────────────────────────────────
  registry.register({
    name: 'yank-anchor',
    description: 'Copy the href of the currently focused/hovered anchor to the clipboard',
    context: 'content',
    modes: ['normal'],
    async handler() {
      await Clipboard.write(formatYank('anchor', Clipboard.currentPage()));
    },
  });

  // ── yank-selection ────────────────────────────────────────────────────────
  // Register only if no earlier phase (e.g. Phase 14 visual-commands) has
  // already registered this command.  The first registration wins; skipping
  // here avoids a duplicate-registration crash from CommandRegistry.
  if (!registry.get('yank-selection')) {
    registry.register({
      name: 'yank-selection',
      description: 'Copy the current text selection to the clipboard',
      context: 'content',
      modes: ['normal'],
      async handler() {
        await Clipboard.write(formatYank('selection', Clipboard.currentPage()));
      },
    });
  }

  // ── paste-and-go ──────────────────────────────────────────────────────────
  registry.register({
    name: 'paste-and-go',
    description: 'Read clipboard and navigate to the URL (or search for the text)',
    context: 'content',
    modes: ['normal'],
    async handler() {
      const text = await Clipboard.read();
      if (!text) return;
      const url = resolveUrl(text);
      if (typeof location !== 'undefined') {
        location.href = url;
      }
    },
  });

  // ── paste-and-go-newtab ───────────────────────────────────────────────────
  registry.register({
    name: 'paste-and-go-newtab',
    description: 'Read clipboard and open the URL (or search) in a new tab',
    context: 'content',
    modes: ['normal'],
    async handler() {
      const text = await Clipboard.read();
      if (!text) return;
      const url = resolveUrl(text);

      // Send via messaging (preferred), fall back to dispatcher, then no-op.
      if (ctx.messaging && typeof ctx.messaging.sendMessage === 'function') {
        await ctx.messaging.sendMessage({ type: 'command', name: 'tab-new', args: [url] });
      } else if (ctx.dispatcher && typeof ctx.dispatcher.run === 'function') {
        await ctx.dispatcher.run('tab-new', { args: [url] });
      }
      // If neither is available: intentional no-op (background command).
    },
  });

  // ── yank-host ──────────────────────────────────────────────────────────────
  registry.register({
    name: 'yank-host',
    description: 'Copy the current page host (including port) to the clipboard',
    context: 'content',
    modes: ['normal'],
    async handler() {
      const host = (typeof location !== 'undefined') ? location.host : '';
      await Clipboard.write(host);
    },
  });

  // ── yank-domain ────────────────────────────────────────────────────────────
  registry.register({
    name: 'yank-domain',
    description: 'Copy the current page hostname (no port) to the clipboard',
    context: 'content',
    modes: ['normal'],
    async handler() {
      const hostname = (typeof location !== 'undefined') ? location.hostname : '';
      await Clipboard.write(hostname);
    },
  });

  // ── yank-pretty-url ────────────────────────────────────────────────────────
  registry.register({
    name: 'yank-pretty-url',
    description: 'Copy the percent-decoded URL to the clipboard',
    context: 'content',
    modes: ['normal'],
    async handler() {
      const href = (typeof location !== 'undefined') ? location.href : '';
      await Clipboard.write(decodeURI(href));
    },
  });

  // ── yank-source ────────────────────────────────────────────────────────────
  registry.register({
    name: 'yank-source',
    description: 'Copy the full page HTML source to the clipboard',
    context: 'content',
    modes: ['normal'],
    async handler() {
      const html = (typeof document !== 'undefined' && document.documentElement)
        ? document.documentElement.outerHTML
        : '';
      await Clipboard.write(html);
    },
  });

  // ── yank-form-json ─────────────────────────────────────────────────────────
  registry.register({
    name: 'yank-form-json',
    description: 'Serialize all page forms to JSON and copy to clipboard',
    context: 'content',
    modes: ['normal'],
    async handler() {
      const forms = (typeof document !== 'undefined')
        ? Array.from(document.forms)
        : [];
      await Clipboard.write(serializeFormsJson(forms));
    },
  });

  // ── yank-form-post ─────────────────────────────────────────────────────────
  registry.register({
    name: 'yank-form-post',
    description: 'Serialize all page forms as URL-encoded POST body and copy to clipboard',
    context: 'content',
    modes: ['normal'],
    async handler() {
      const forms = (typeof document !== 'undefined')
        ? Array.from(document.forms)
        : [];
      await Clipboard.write(serializeFormsPost(forms));
    },
  });

  // ── form-fill ──────────────────────────────────────────────────────────────
  registry.register({
    name: 'form-fill',
    description: 'Read JSON from clipboard and fill matching form fields',
    context: 'content',
    modes: ['normal'],
    async handler() {
      const text = await Clipboard.read();
      if (!text) return;
      let data;
      try { data = JSON.parse(text); } catch (_) { return; }
      if (!data || typeof data !== 'object' || Array.isArray(data)) return;
      const forms = (typeof document !== 'undefined')
        ? Array.from(document.forms)
        : [];
      fillForms(forms, data);
    },
  });

  // ── paste-html ─────────────────────────────────────────────────────────────
  registry.register({
    name: 'paste-html',
    description: 'Read clipboard text and set document.body.innerHTML to it',
    context: 'content',
    modes: ['normal'],
    async handler() {
      const text = await Clipboard.read();
      if (!text) return;
      if (typeof document !== 'undefined' && document.body) {
        document.body.innerHTML = text;
      }
    },
  });

  // ── settings-copy ──────────────────────────────────────────────────────────
  registry.register({
    name: 'settings-copy',
    description: 'Copy QuteSurf config as JSON to clipboard',
    context: 'content',
    modes: ['normal'],
    async handler() {
      const state = (ctx.config && ctx.config._state) ? ctx.config._state : {};
      await Clipboard.write(JSON.stringify(state));
    },
  });

  // ── settings-restore ──────────────────────────────────────────────────────
  registry.register({
    name: 'settings-restore',
    description: 'Read JSON from clipboard and merge into QuteSurf config',
    context: 'content',
    modes: ['normal'],
    async handler() {
      if (!ctx.config) return;
      const text = await Clipboard.read();
      if (!text) return;
      let parsed;
      try { parsed = JSON.parse(text); } catch (_) { return; }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
      // Apply known option keys
      if (parsed.options && typeof parsed.options === 'object') {
        for (const key of Object.keys(parsed.options)) {
          if (Object.prototype.hasOwnProperty.call(DEFAULTS, key)) {
            await ctx.config.set(key, parsed.options[key]);
          }
        }
      }
      // Apply user bindings
      if (parsed.userBindings && typeof parsed.userBindings === 'object') {
        for (const mode of Object.keys(parsed.userBindings)) {
          const modeBindings = parsed.userBindings[mode];
          if (modeBindings && typeof modeBindings === 'object') {
            for (const [seq, cmd] of Object.entries(modeBindings)) {
              await ctx.config.bind(mode, seq, cmd);
            }
          }
        }
      }
    },
  });

  // ── yank-all-tabs ──────────────────────────────────────────────────────────
  registry.register({
    name: 'yank-all-tabs',
    description: 'Copy URLs of all open tabs to clipboard (one per line)',
    context: 'content',
    modes: ['normal'],
    async handler() {
      if (!ctx.messaging || typeof ctx.messaging.sendMessage !== 'function') return;
      const result = await ctx.messaging.sendMessage({ type: 'command', name: 'tab-list' });
      const tabs = Array.isArray(result)
        ? result
        : (result && Array.isArray(result.result) ? result.result : []);
      const text = tabs.map(t => t.url).join('\n');
      await Clipboard.write(text);
    },
  });
}

module.exports = { registerYankCommands, resolveUrl };
