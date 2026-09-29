'use strict';

/**
 * Utility content commands — qutebrowser parity helpers:
 *   run-with-count, later, insert-text, fake-key, message-info/warning/error,
 *   messages, capture-full-page, search-selected, search-selected-interactive,
 *   open-browser-url helpers (chrome:// shortcuts), jseval passthrough.
 *
 * All DOM/global access is inside handler bodies — import-safe under Jest.
 *
 * @param {import('../core/registry').CommandRegistry} registry
 * @param {{ messaging?: object, host?: object, config?: object, dispatcher?: object }} ctx
 */

const { isSafeNavUrl } = require('../core/url-safety');

// ── Message banner ───────────────────────────────────────────────────────────

const BANNER_CSS = `
  .qs-banner {
    position: fixed;
    left: 50%;
    bottom: 48px;
    transform: translateX(-50%);
    z-index: 2147483647;
    max-width: 70vw;
    padding: 10px 18px;
    border-radius: 12px;
    font: 13px/1.45 'Hanken Grotesk', system-ui, sans-serif;
    color: #fff;
    background: rgba(30, 30, 40, 0.92);
    border: 1px solid rgba(124, 92, 255, 0.4);
    box-shadow: 0 8px 30px rgba(0,0,0,0.35);
    white-space: pre-wrap;
    pointer-events: none;
  }
  .qs-banner-warning { border-color: rgba(245, 180, 60, 0.6); }
  .qs-banner-error   { border-color: rgba(235, 80, 80, 0.65);  }
`;

const _messageLog = [];

/**
 * Show a transient banner message in the QuteSurf shadow host.
 * @param {object|null} host  ShadowHost (may be null in tests)
 * @param {string} text
 * @param {'info'|'warning'|'error'} level
 * @param {number} ms
 */
function showBanner(host, text, level = 'info', ms = 3500) {
  if (!host || !host.root || typeof document === 'undefined') return;
  host.replaceStyle('banner', BANNER_CSS);
  const el = document.createElement('div');
  el.className = `qs-banner qs-banner-${level}`;
  // textContent only — banner content is never rendered as HTML (XSS-safe).
  el.textContent = text;
  host.mount(el);
  setTimeout(() => { el.remove(); }, ms);
}

// ── fake-key ─────────────────────────────────────────────────────────────────

const _SPECIAL_KEYS = {
  Escape: 'Escape', Enter: 'Enter', Tab: 'Tab', Backspace: 'Backspace',
  Delete: 'Delete', Insert: 'Insert', Home: 'Home', End: 'End',
  PageUp: 'PageUp', PageDown: 'PageDown', Space: ' ',
  Up: 'ArrowUp', Down: 'ArrowDown', Left: 'ArrowLeft', Right: 'ArrowRight',
};

/**
 * Parse a key-notation string ("j <C-a> <Escape>") into KeyboardEvent init
 * objects.
 * @param {string} seq
 * @returns {Array<{key:string, ctrlKey:boolean, altKey:boolean, metaKey:boolean, shiftKey:boolean}>}
 */
function parseKeySequence(seq) {
  // Whitespace separates keys; a chord/char is one token. So "j <C-a>" is
  // ['j', '<C-a>'] — separate spaces between keys are not key presses.
  const parts = String(seq || '').split(/\s+/).filter(Boolean);
  const tokens = [];
  for (const part of parts) {
    const ms = part.match(/<[^<>]+>|[^<>\s]/g) || [];
    tokens.push(...ms);
  }
  return tokens.map(tok => {
    const init = { key: tok, ctrlKey: false, altKey: false, metaKey: false, shiftKey: false };
    const m = tok.match(/^<([CAMs]-)*([A-Za-z0-9]+)>$/);
    if (m) {
      const mods = m[1] || '';
      init.ctrlKey = mods.includes('C-');
      init.altKey = mods.includes('A-');
      init.metaKey = mods.includes('M-');
      init.shiftKey = mods.includes('s-') || mods.includes('S-');
      const name = m[2];
      init.key = Object.prototype.hasOwnProperty.call(_SPECIAL_KEYS, name)
        ? _SPECIAL_KEYS[name]
        : name;
    }
    return init;
  });
}

// ── capture-full-page helpers ────────────────────────────────────────────────

function _loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('failed to load captured frame'));
    img.src = dataUrl;
  });
}

function _extractResult(res) {
  if (res === null || res === undefined) return null;
  if (typeof res === 'object' && 'ok' in res) {
    return res.ok ? res.result : null;
  }
  return res;
}

/**
 * Register the utility commands.
 */
function registerUtilCommands(registry, ctx = {}) {
  const { messaging, host, config, dispatcher } = ctx;

  // ── run-with-count <count> <command…> ─────────────────────────────────────
  registry.register({
    name: 'run-with-count',
    description: 'Run a command N times. Usage: run-with-count <count> <command…>',
    args: ['count', 'command'],
    context: 'content',
    modes: ['normal'],
    async handler(_ctx, parsed) {
      let n;
      let cmdParts;
      if (parsed.count != null) {
        // Count came from the keymap prefix (e.g. 3run-with-count scroll-down)
        n = parsed.count;
        cmdParts = parsed.args;
      } else {
        // Inline form: run-with-count <count> <command…>
        n = Number(parsed.args[0]) || 1;
        cmdParts = parsed.args.slice(1);
      }
      const cmdString = cmdParts.join(' ');
      if (!cmdString || !dispatcher) return;
      for (let i = 0; i < Math.max(1, n); i++) {
        await dispatcher.runString(cmdString);
      }
    },
  });

  // ── later <ms> <command…> ──────────────────────────────────────────────────
  registry.register({
    name: 'later',
    description: 'Run a command after a delay. Usage: later <ms> <command…>',
    args: ['ms', 'command'],
    context: 'content',
    modes: ['normal'],
    handler(_ctx, parsed) {
      const [msArg, ...cmdParts] = parsed.args;
      const ms = Number(msArg) || 0;
      const cmdString = cmdParts.join(' ');
      if (!cmdString || !dispatcher) return;
      setTimeout(() => {
        dispatcher.runString(cmdString).catch(() => {});
      }, ms);
    },
  });

  // ── insert-text <text…> ────────────────────────────────────────────────────
  registry.register({
    name: 'insert-text',
    description: 'Insert text into the focused input element. Usage: insert-text <text…>',
    args: ['text'],
    context: 'content',
    modes: ['normal'],
    handler(_ctx, parsed) {
      const text = parsed.args.join(' ');
      if (!text || typeof document === 'undefined') return;
      const el = document.activeElement;
      if (!el) return;
      if (typeof el.selectionStart === 'number') {
        const s = el.selectionStart;
        el.setRangeText(text, s, el.selectionEnd, 'end');
        el.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (document.execCommand) {
        document.execCommand('insertText', false, text);
      }
    },
  });

  // ── fake-key <keys> ────────────────────────────────────────────────────────
  registry.register({
    name: 'fake-key',
    description: 'Send synthetic key presses to the page. Usage: fake-key <keystring>',
    args: ['keys'],
    context: 'content',
    modes: ['normal'],
    handler(_ctx, parsed) {
      if (typeof document === 'undefined') return;
      const seq = parsed.args.join(' ');
      const target = document.activeElement || document.body;
      for (const init of parseKeySequence(seq)) {
        target.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ bubbles: true, cancelable: true }, init)));
        target.dispatchEvent(new KeyboardEvent('keyup', Object.assign({ bubbles: true, cancelable: true }, init)));
      }
    },
  });

  // ── message-info / message-warning / message-error / messages ──────────────
  function messageCommand(level) {
    return async (_ctx, parsed) => {
      const text = parsed.args.join(' ') || level;
      _messageLog.push({ level, text, at: Date.now() });
      if (_messageLog.length > 20) _messageLog.shift();
      showBanner(host, text, level);
    };
  }
  registry.register({ name: 'message-info', description: 'Show an info banner. Usage: message-info <text…>', args: ['text'], context: 'content', modes: ['normal'], handler: messageCommand('info') });
  registry.register({ name: 'message-warning', description: 'Show a warning banner. Usage: message-warning <text…>', args: ['text'], context: 'content', modes: ['normal'], handler: messageCommand('warning') });
  registry.register({ name: 'message-error', description: 'Show an error banner. Usage: message-error <text…>', args: ['text'], context: 'content', modes: ['normal'], handler: messageCommand('error') });
  registry.register({
    name: 'messages',
    description: 'Show the recent in-page message log',
    context: 'content',
    modes: ['normal'],
    handler() {
      if (!_messageLog.length) {
        showBanner(host, 'No messages', 'info');
        return;
      }
      const text = _messageLog
        .slice(-10)
        .map(m => `[${m.level}] ${m.text}`)
        .join('\n');
      showBanner(host, text, 'info', 8000);
    },
  });

  // ── capture-full-page ──────────────────────────────────────────────────────
  registry.register({
    name: 'capture-full-page',
    description: 'Capture the full page (scrolling stitch) and save it as a PNG download',
    context: 'content',
    modes: ['normal'],
    async handler() {
      if (!messaging || typeof messaging.sendMessage !== 'function' || typeof document === 'undefined') return;
      const doc = document.documentElement;
      const origX = window.scrollX;
      const origY = window.scrollY;
      const vh = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      // Canvas height is capped at 32767 px in Chromium.
      const totalH = Math.min(doc.scrollHeight, 32767);
      if (totalH <= 0 || vh <= 0) return;

      const frames = [];
      try {
        for (let y = 0; y < totalH; y += vh) {
          window.scrollTo(0, y);
          // Allow the compositor to settle after the scroll
          await new Promise(r => setTimeout(r, 140));
          const res = _extractResult(await messaging.sendMessage({ type: 'command', name: 'capture-raw', args: [], flags: {}, count: null }));
          if (!res) throw new Error('capture failed');
          frames.push({ y: Math.min(y, totalH - vh), dataUrl: res });
        }
      } finally {
        window.scrollTo(origX, origY);
      }

      const width = doc.clientWidth;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(totalH * dpr);
      const c2d = canvas.getContext('2d');
      for (const f of frames) {
        const img = await _loadImage(f.dataUrl);
        c2d.drawImage(img, 0, Math.round(f.y * dpr));
      }
      const out = canvas.toDataURL('image/png');
      await messaging.sendMessage({
        type: 'command', name: 'download-dataurl',
        args: [out, `page-${Date.now()}.png`], flags: {}, count: null,
      });
    },
  });

  // ── yank-downloading (SurfingKeys yd) ──────────────────────────────────
  registry.register({
    name: 'yank-downloading',
    description: 'Copy the URLs of the currently active downloads to the clipboard (SurfingKeys yd)',
    context: 'content',
    modes: ['normal'],
    async handler() {
      if (!messaging || typeof messaging.sendMessage !== 'function') return;
      const result = await messaging.sendMessage({ type: 'command', name: 'download-list', args: [], flags: {}, count: null });
      const items = Array.isArray(result)
        ? result
        : (result && Array.isArray(result.result) ? result.result : []);
      const urls = (items || [])
        .filter(d => d && d.state === 'in_progress' && d.url)
        .map(d => d.url);
      if (!urls.length) return;
      const { Clipboard } = require('../content_scripts/clipboard');
      await Clipboard.write(urls.join('\n'));
    },
  });

  // ── reader-view (qutebrowser :readability approximation) ───────────────
  registry.register({
    name: 'reader-view',
    description: 'Extract the main article text and show it in a distraction-free preview tab (readability heuristic)',
    context: 'content',
    modes: ['normal'],
    async handler() {
      if (typeof document === 'undefined' || typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
      // Heuristic: prefer <article> / <main>, else the element with the most
      // paragraph text; fall back to body text.
      let root = document.querySelector('article') || document.querySelector('main');
      if (!root) {
        let best = null;
        let bestScore = 0;
        for (const el of document.querySelectorAll('div, section')) {
          const ps = el.querySelectorAll('p');
          let score = 0;
          for (const p of ps) score += (p.textContent || '').trim().length;
          if (score > bestScore) { bestScore = score; best = el; }
        }
        root = best;
      }
      const source = root || document.body;
      if (!source) return;
      // Build markdown-ish text: headings + paragraphs + list items
      const parts = [];
      const walker = source.querySelectorAll('h1,h2,h3,h4,p,li,blockquote,pre');
      for (const el of walker) {
        const tag = el.tagName.toLowerCase();
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) continue;
        if (/^h[1-4]$/.test(tag)) parts.push('#'.repeat(Number(tag[1])) + ' ' + text);
        else if (tag === 'li') parts.push('- ' + text);
        else if (tag === 'blockquote') parts.push('> ' + text);
        else parts.push(text);
      }
      const md = (parts.length ? parts.join('\n\n') : (source.innerText || ''));
      if (!md.trim()) return;
      await new Promise(resolve => chrome.storage.local.set({ 'qutesurf:preview': md }, resolve));
      // Open the markdown preview page, which renders the stored text
      if (messaging && typeof messaging.sendMessage === 'function') {
        await messaging.sendMessage({ type: 'command', name: 'open-extension-page', args: ['markdown.html'], flags: {}, count: null });
      }
    },
  });

  // ── proxy config copy/apply (SurfingKeys ;cp / ;ap) ─────────────────
  registry.register({
    name: 'proxy-copy-config',
    description: 'Copy the current proxy configuration (rules + server) as JSON to the clipboard',
    context: 'content',
    modes: ['normal'],
    async handler() {
      if (!messaging || typeof messaging.sendMessage !== 'function') return;
      const res = await messaging.sendMessage({ type: 'command', name: 'proxy-get-config', args: [], flags: {}, count: null });
      const value = res && typeof res === 'object' && 'ok' in res ? res.result : res;
      if (!value) return;
      const { Clipboard } = require('../content_scripts/clipboard');
      await Clipboard.write(JSON.stringify(value));
    },
  });

  registry.register({
    name: 'proxy-apply-config',
    description: 'Read a proxy configuration JSON from the clipboard and apply it',
    context: 'content',
    modes: ['normal'],
    async handler() {
      if (!messaging || typeof messaging.sendMessage !== 'function' || typeof navigator === 'undefined' || !navigator.clipboard) return;
      const text = await navigator.clipboard.readText().catch(() => '');
      if (!text.trim()) return;
      let parsed;
      try { parsed = JSON.parse(text); } catch (_) { return; }
      if (!parsed || typeof parsed !== 'object') return;
      const rules = Array.isArray(parsed.rules) ? parsed.rules : [];
      for (const rule of rules) {
        if (rule && rule.host && rule.proxy) {
          await messaging.sendMessage({ type: 'command', name: 'proxy-set', args: [rule.host, rule.proxy], flags: {}, count: null });
        }
      }
      if (parsed.server) {
        await messaging.sendMessage({ type: 'command', name: 'proxy-server', args: [parsed.server], flags: {}, count: null });
      }
    },
  });

  // ── search-selected / search-selected-interactive ──────────────────────────
  registry.register({
    name: 'search-selected',
    description: 'Search the current selection with a search engine alias (default engine when omitted)',
    args: ['alias?'],
    context: 'content',
    modes: ['normal'],
    async handler(_ctx, parsed) {
      const sel = (window.getSelection ? String(window.getSelection()) : '').trim();
      if (!sel) return;
      const engines = config && typeof config.getSearchEngines === 'function'
        ? config.getSearchEngines()
        : null;
      const defaultEngine = (config && config.get && config.get('defaultsearchengine')) || 'g';
      const alias = parsed.args[0] || defaultEngine;
      const { resolveQuery, DEFAULT_ENGINES } = require('../core/search-engines');
      const url = resolveQuery(sel, { engines: engines || DEFAULT_ENGINES, defaultEngine: alias });
      if (!isSafeNavUrl(url)) return;
      if (messaging && typeof messaging.sendMessage === 'function') {
        await messaging.sendMessage({ type: 'command', name: 'tab-new', args: [url], flags: {}, count: null });
      }
    },
  });

  registry.register({
    name: 'search-selected-site',
    description: 'Search the current selection restricted to the current site',
    args: ['alias?'],
    context: 'content',
    modes: ['normal'],
    async handler(_ctx, parsed) {
      const sel = (window.getSelection ? String(window.getSelection()) : '').trim();
      if (!sel || typeof location === 'undefined') return;
      const defaultEngine = (config && config.get && config.get('defaultsearchengine')) || 'g';
      const alias = parsed.args[0] || defaultEngine;
      const { resolveQuery, DEFAULT_ENGINES } = require('../core/search-engines');
      const engines = config && typeof config.getSearchEngines === 'function'
        ? config.getSearchEngines()
        : DEFAULT_ENGINES;
      const query = `${sel} site:${location.host}`;
      const url = resolveQuery(query, { engines, defaultEngine: alias });
      if (!isSafeNavUrl(url)) return;
      if (messaging && typeof messaging.sendMessage === 'function') {
        await messaging.sendMessage({ type: 'command', name: 'tab-new', args: [url], flags: {}, count: null });
      }
    },
  });
}

module.exports = { registerUtilCommands, showBanner, parseKeySequence };
