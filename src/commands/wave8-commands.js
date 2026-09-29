'use strict';

/**
 * Wave 8 content commands — markdown preview, inline query, LLM chat,
 * emoji picker, TTS voice management, Firefox containers.
 *
 * All DOM/global access is inside handler bodies — import-safe under Jest.
 *
 * @param {import('../core/registry').CommandRegistry} registry
 * @param {{ messaging?: object, host?: object, config?: object,
 *           inlineQuery?: object, llmChat?: object, emojiPicker?: object }} ctx
 */

const { showBanner } = require('./util-commands');

function registerWave8Commands(registry, ctx = {}) {
  const { messaging, host, config, inlineQuery, llmChat, emojiPicker } = ctx;

  // ── preview-markdown (:pm) ────────────────────────────────────────────────
  registry.register({
    name: 'preview-markdown',
    description: 'Render the selection (or clipboard) as Markdown in a preview tab',
    context: 'content',
    modes: ['normal'],
    async handler() {
      let md = '';
      if (typeof window !== 'undefined' && window.getSelection) {
        md = window.getSelection().toString().trim();
      }
      if (!md && typeof navigator !== 'undefined' && navigator.clipboard) {
        md = (await navigator.clipboard.readText().catch(() => '')).trim();
      }
      if (!md || typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
      await new Promise(resolve => chrome.storage.local.set({ 'qutesurf:preview': md }, resolve));
      if (messaging && typeof messaging.sendMessage === 'function') {
        await messaging.sendMessage({ type: 'command', name: 'open-extension-page', args: ['markdown.html'], flags: {}, count: null });
      }
    },
  });

  // ── inline query (Q / word under caret) ───────────────────────────────────
  registry.register({
    name: 'inline-query',
    description: 'Query the configured inline endpoint (dictionary/translate) for the selection or word under the caret',
    args: ['text?'],
    context: 'content',
    modes: ['normal'],
    async handler(_ctx, parsed) {
      const explicit = parsed.args.join(' ').trim();
      if (explicit) return inlineQuery && inlineQuery.query(explicit);
      return inlineQuery && inlineQuery.queryWord();
    },
  });

  // ── LLM chat (A) ──────────────────────────────────────────────────────────
  registry.register({
    name: 'llm-chat-open',
    description: 'Open the LLM chat panel (prefilled with the current selection if any)',
    args: ['prompt?'],
    context: 'content',
    modes: ['normal'],
    handler(_ctx, parsed) {
      const prefill = parsed.args.length ? parsed.args.join(' ') : undefined;
      llmChat && llmChat.open(prefill);
    },
  });

  // ── emoji picker ──────────────────────────────────────────────────────────
  registry.register({
    name: 'emoji-picker',
    description: 'Open the emoji picker (also: `:` while in insert mode)',
    context: 'content',
    modes: ['normal'],
    handler() {
      emojiPicker && emojiPicker.open();
    },
  });

  // ── TTS voices (SurfingKeys listVoices / testVoices parity) ───────────────
  registry.register({
    name: 'tts-voices',
    description: 'List available text-to-speech voices (banner + console)',
    context: 'content',
    modes: ['normal'],
    handler() {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) {
        showBanner(host, 'No TTS voices available', 'warning');
        return;
      }
      // eslint-disable-next-line no-console
      console.table(voices.map(v => ({ name: v.name, lang: v.lang, default: v.default })));
      const lines = voices.slice(0, 12).map(v => `${v.name} (${v.lang})`);
      showBanner(host, `Voices (${voices.length}):\n` + lines.join('\n') +
        (voices.length > 12 ? `\n… full list in console` : ''), 'info', 6000);
    },
  });

  registry.register({
    name: 'tts-say',
    description: 'Speak the given text with the configured voice (tts.lang / tts.rate options)',
    args: ['text'],
    context: 'content',
    modes: ['normal'],
    handler(_ctx, parsed) {
      const text = parsed.args.join(' ');
      if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;
      const utt = new window.SpeechSynthesisUtterance(text);
      const lang = config && config.get && config.get('tts.lang');
      if (lang) {
        utt.lang = lang;
        const voice = window.speechSynthesis.getVoices().find(v => v.lang === lang);
        if (voice) utt.voice = voice;
      }
      const rate = config && config.get && config.get('tts.rate');
      if (rate) utt.rate = Number(rate) || 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utt);
    },
  });

  // ── Firefox containers ────────────────────────────────────────────────────
  registry.register({
    name: 'container-open',
    description: 'Open the current tab URL (or explicit URL) in a Firefox container. Usage: container-open <name> [url]',
    args: ['container', 'url?'],
    context: 'content',
    modes: ['normal'],
    async handler(_ctx, parsed) {
      const container = parsed.args[0];
      if (!container) return;
      let url = parsed.args[1];
      if (!url && typeof location !== 'undefined') url = location.href;
      if (!url || !messaging) return;
      await messaging.sendMessage({
        type: 'command', name: 'open-in-container',
        args: [container, url], flags: {}, count: null,
      });
    },
  });
}

module.exports = { registerWave8Commands };
