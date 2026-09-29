'use strict';

const { api } = require('./chrome-api');

/**
 * Misc background commands — browser-internal URLs, page JS evaluation and
 * raw visible-tab capture.
 */

/** Whitelist of browser-internal pages that may be opened. */
const BROWSER_URL_PREFIXES = [
  'chrome://about', 'chrome://bookmarks', 'chrome://downloads',
  'chrome://extensions', 'chrome://history', 'chrome://settings',
  'chrome://version', 'chrome://flags', 'chrome://apps',
  'about:about', 'about:bookmarks', 'about:downloads', 'about:addons',
  'about:preferences', 'about:config', 'about:support', 'about:performance',
  'about:debugging',
];

function isAllowedBrowserUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return BROWSER_URL_PREFIXES.some(prefix => url === prefix || url.startsWith(prefix + '/'));
}

function registerMiscCommands(registry) {
  // open-browser-url <url> — open a whitelisted browser-internal page
  registry.register({
    name: 'open-browser-url',
    description: 'Open a whitelisted browser-internal page (chrome://… / about:…)',
    args: ['url'],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, parsed) => {
      const url = parsed.args && parsed.args[0];
      if (!isAllowedBrowserUrl(url)) {
        throw new Error('open-browser-url: url not allowed: ' + url);
      }
      return api().tabs.create({ url });
    },
  });

  // jseval <code> — evaluate JavaScript in the page (MAIN world by default,
  // --isolated flag for the content-script world). Uses scripting.executeScript
  // with a function that eval()s the code inside the page, so the service
  // worker itself never evals (MV3 forbids eval in SW).
  registry.register({
    name: 'jseval',
    description: 'Evaluate JavaScript in the current page. Usage: jseval <code> [--isolated]',
    args: ['code'],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, parsed) => {
      const code = parsed.args && parsed.args[0];
      if (!code) throw new Error('jseval: no code given');
      const tabId = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      const chromeLike = api();
      if (!chromeLike.scripting || typeof chromeLike.scripting.executeScript !== 'function') {
        throw new Error('scripting API unavailable (Firefox requires browser.scripting support)');
      }
      const world = parsed.flags && parsed.flags.isolated ? 'ISOLATED' : 'MAIN';
      const results = await chromeLike.scripting.executeScript({
        target: { tabId },
        world,
        func: (userCode) => {
          try {
            // eslint-disable-next-line no-eval
            const result = eval(userCode);
            return Promise.resolve(result).then(
              (r) => ({ ok: true, value: String(r) }),
              (e) => ({ ok: false, value: String(e) })
            );
          } catch (e) {
            return { ok: false, value: String(e) };
          }
        },
        args: [code],
      });
      const first = results && results[0];
      return first ? first.result : { ok: false, value: 'no result' };
    },
  });

  // capture-raw — return the PNG data URL of the visible tab (used by
  // capture-full-page stitching in the content script).
  registry.register({
    name: 'capture-raw',
    description: 'Capture the visible area of the current tab and return the PNG data URL',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, _parsed) => {
      return api().tabs.captureVisibleTab();
    },
  });
}

module.exports = { registerMiscCommands, isAllowedBrowserUrl, BROWSER_URL_PREFIXES };
