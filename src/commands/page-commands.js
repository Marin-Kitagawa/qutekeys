'use strict';

/**
 * Page/browser feature commands — Wave 5.
 *
 * All DOM/global access is confined INSIDE handler bodies so this file is
 * safe to require in Jest/Node without a browser environment.
 *
 * @param {import('../core/registry').CommandRegistry} registry
 * @param {{ messaging?: object, dispatcher?: object }} ctx
 */

const { stripQuery, stripHash, incrementUrl, findRelLink } = require('./nav-helpers');

function registerPageCommands(registry, ctx = {}) {
  // ── Fullscreen ──────────────────────────────────────────────────────────────
  registry.register({
    name: 'fullscreen',
    context: 'content',
    modes: ['normal'],
    description: 'Toggle fullscreen (Fullscreen API)',
    async handler() {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    },
  });

  // ── Print ───────────────────────────────────────────────────────────────────
  registry.register({
    name: 'print',
    context: 'content',
    modes: ['normal'],
    description: 'Open the print dialog for the current page',
    async handler() {
      window.print();
    },
  });

  // ── Navigate next / prev (rel link or heuristic text) ──────────────────────
  registry.register({
    name: 'navigate-next',
    context: 'content',
    modes: ['normal'],
    description: 'Follow the rel=next link or a heuristic "next" link',
    async handler() {
      const href = findRelLink(document, 'next');
      if (href) location.href = href;
    },
  });

  registry.register({
    name: 'navigate-prev',
    context: 'content',
    modes: ['normal'],
    description: 'Follow the rel=prev link or a heuristic "prev" link',
    async handler() {
      const href = findRelLink(document, 'prev');
      if (href) location.href = href;
    },
  });

  // ── URL increment / decrement ───────────────────────────────────────────────
  registry.register({
    name: 'url-increment',
    context: 'content',
    modes: ['normal'],
    description: 'Increment the last number in the current URL by 1',
    async handler(_ctx, parsed) {
      const count = parsed.count || 1;
      location.href = incrementUrl(location.href, count);
    },
  });

  registry.register({
    name: 'url-decrement',
    context: 'content',
    modes: ['normal'],
    description: 'Decrement the last number in the current URL by 1',
    async handler(_ctx, parsed) {
      const count = parsed.count || 1;
      location.href = incrementUrl(location.href, -count);
    },
  });

  // ── Reload without query / hash ─────────────────────────────────────────────
  registry.register({
    name: 'reload-no-query',
    context: 'content',
    modes: ['normal'],
    description: 'Reload the page with the query string stripped (SK g?)',
    async handler() {
      location.href = stripQuery(location.href);
    },
  });

  registry.register({
    name: 'reload-no-hash',
    context: 'content',
    modes: ['normal'],
    description: 'Reload the page with the fragment/hash stripped (SK g#)',
    async handler() {
      location.href = stripHash(location.href);
    },
  });

  // ── Translate page ──────────────────────────────────────────────────────────
  registry.register({
    name: 'translate-page',
    context: 'content',
    modes: ['normal'],
    description: 'Open the current page in Google Translate (SK ;t)',
    async handler() {
      const url = location.href;
      const translateUrl =
        'https://translate.google.com/translate?sl=auto&tl=en&u=' +
        encodeURIComponent(url);
      // Dispatch via messaging so the background can open a new tab.
      // Falls back to window.open if no messaging is wired.
      if (ctx.messaging && typeof ctx.messaging.send === 'function') {
        ctx.messaging.send({ type: 'command', name: 'tab-new', args: [translateUrl] });
      } else {
        window.open(translateUrl, '_blank');
      }
    },
  });

  // ── Read aloud / stop ───────────────────────────────────────────────────────
  registry.register({
    name: 'read-aloud',
    context: 'content',
    modes: ['normal'],
    description: 'Read the current text selection (or full page) aloud via Web Speech API (SK gr)',
    async handler() {
      if (!window.speechSynthesis) return;
      const text =
        (window.getSelection && window.getSelection().toString().trim()) ||
        (document.body && document.body.innerText) ||
        '';
      if (!text) return;
      const utt = new window.SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utt);
    },
  });

  registry.register({
    name: 'read-stop',
    context: 'content',
    modes: ['normal'],
    description: 'Stop the current text-to-speech playback',
    async handler() {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    },
  });

  // ── Download image via hints ────────────────────────────────────────────────
  // Uses the hints controller (if available) to let the user pick an image;
  // the 'download-image' action sends a download-url message for the selected
  // img.src.  Guard: only register if hintsController is provided.
  if (ctx.hintsController) {
    registry.register({
      name: 'download-image',
      context: 'content',
      modes: ['normal'],
      description: 'Hint images on the page and download the selected one (SK ;di)',
      handler(_ctx, _parsed) {
        ctx.hintsController.start('download-image');
      },
    });
  }
}

module.exports = { registerPageCommands };
