'use strict';

/**
 * Markdown preview page (Wave 8). Reads the markdown text from
 * chrome.storage.local under 'qutesurf:preview' (written by the
 * :preview-markdown command) and renders it with the escape-first renderer.
 */

(function () {
  const contentEl = document.getElementById('content');
  const emptyEl = document.getElementById('empty');

  function render(md) {
    // load via script tag (same directory) — pdf-style module not needed
    emptyEl.hidden = !!md;
    if (md) {
      contentEl.innerHTML = window.__qutesurfRenderMarkdown(md);
    }
  }

  function init() {
    const withHash = location.hash.startsWith('#md=');
    if (withHash) {
      // Small payloads may arrive via the hash: #md=<uri-encoded markdown>
      try {
        render(decodeURIComponent(location.hash.slice(4)));
        return;
      } catch (_) {
        // fall through to storage
      }
    }
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('qutesurf:preview', (result) => {
        const md = result && result['qutesurf:preview'];
        render(typeof md === 'string' ? md : '');
      });
    } else {
      render('');
    }
  }

  // Load the shared renderer (plain script exposing window.__qutesurfRenderMarkdown)
  const script = document.createElement('script');
  script.src = 'markdown-renderer.js';
  script.onload = init;
  document.head.appendChild(script);
})();
