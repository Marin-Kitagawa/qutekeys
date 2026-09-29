'use strict';

const { api } = require('./chrome-api');

/**
 * PDF viewer (Wave 8).
 *
 * When enabled, tabs navigating to an http(s) URL ending in .pdf are
 * redirected to the bundled pdf.js viewer page (pages/pdf.html#file=…).
 * Toggle state lives in chrome.storage.local under 'qutesurf:pdfviewer'.
 */

const STORAGE_KEY = 'qutesurf:pdfviewer';

const PDF_URL_RE = /^https?:\/\/[^\s?#]+\.pdf([?#]|$)/i;

async function isEnabled() {
  const chrome = api();
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return !!(result && result[STORAGE_KEY]);
}

async function setEnabled(on) {
  const chrome = api();
  await chrome.storage.local.set({ [STORAGE_KEY]: !!on });
}

function viewerUrl(pdfUrl) {
  return api().runtime.getURL('pages/pdf.html') + '#file=' + encodeURIComponent(pdfUrl);
}

/**
 * Wire the tabs.onUpdated redirect. Only attaches in a real extension
 * context (chrome.runtime.onMessage exists) — safe under Jest.
 */
function attachPdfRedirect() {
  if (
    typeof chrome === 'undefined' ||
    !chrome.tabs ||
    !chrome.tabs.onUpdated ||
    !chrome.tabs.onUpdated.addListener
  ) return;

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only react to real navigation events with a URL
    const url = (changeInfo && changeInfo.url) || (changeInfo && changeInfo.status === 'complete' && tab && tab.url) || null;
    if (!url || !PDF_URL_RE.test(url)) return;
    isEnabled().then(enabled => {
      if (!enabled) return;
      // Re-check: the tab may have navigated away meanwhile
      chrome.tabs.get(tabId, t => {
        if (chrome.runtime.lastError) return;
        const current = t && (t.url || '');
        if (current && PDF_URL_RE.test(current)) {
          chrome.tabs.update(tabId, { url: viewerUrl(current) });
        }
      });
    });
  });
}

function registerPdfCommands(registry) {
  registry.register({
    name: 'pdf-viewer-toggle',
    description: 'Toggle redirecting .pdf navigations to the bundled PDF viewer',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, _parsed) => {
      const next = !(await isEnabled());
      await setEnabled(next);
      return next ? 'PDF viewer: on' : 'PDF viewer: off';
    },
  });

  registry.register({
    name: 'pdf-viewer-open',
    description: 'Open the current tab (or a URL) in the bundled PDF viewer. Usage: pdf-viewer-open [url]',
    args: ['url?'],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, parsed) => {
      let url = parsed.args && parsed.args[0];
      if (!url) url = ctx.sender && ctx.sender.tab && ctx.sender.tab.url;
      if (!url || !/^https?:\/\//i.test(url)) {
        throw new Error('pdf-viewer-open: no http(s) URL available');
      }
      return api().tabs.create({ url: viewerUrl(url) });
    },
  });
}

module.exports = { registerPdfCommands, attachPdfRedirect, PDF_URL_RE, viewerUrl, isEnabled, setEnabled };
