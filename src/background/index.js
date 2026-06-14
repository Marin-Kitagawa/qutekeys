const { CommandRegistry } = require('../core/registry');
const { registerTabCommands } = require('./tabs');
const { recordActivation, getMru, _setMru } = require('./tab-mru');
const { registerHistoryCommands } = require('./history');
const { registerBookmarkCommands } = require('./bookmarks');
const { registerDownloadCommands } = require('./downloads');
const { registerSessionCommands } = require('./sessions');
const { registerProxyCommands } = require('./proxy');
const { registerKeymapCommands } = require('./keymap');
const { registerZoomCommands } = require('./zoom');
const { registerCaptureCommands } = require('./capture');

/**
 * Create a message router for background commands.
 * @param {object} registry - object with a .get(name) method
 * @returns {function(msg): Promise<{ok:boolean, result?, error?}>}
 */
function makeRouter(registry) {
  return async function route(msg) {
    if (!msg || msg.type !== 'command') {
      return { ok: false, error: 'not a command' };
    }
    const name = msg.name;
    const cmd = registry.get(name);
    if (!cmd) {
      return { ok: false, error: 'unknown command: ' + name };
    }
    // Trust boundary: the background page must only execute commands that are
    // explicitly declared as running in the background context. A content
    // script (or a page that managed to post a message) must not be able to
    // invoke content-only or unknown-context handlers via the router.
    if (cmd.context !== 'background') {
      return { ok: false, error: 'command not allowed in background: ' + name };
    }
    const ctx = { sender: msg.sender || null };
    const parsed = { args: msg.args || [], flags: msg.flags || {} };
    try {
      const result = await cmd.handler(ctx, parsed);
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  };
}

/**
 * Build a CommandRegistry with all background commands registered.
 * @returns {CommandRegistry}
 */
function buildBackgroundRegistry() {
  const registry = new CommandRegistry();
  registerTabCommands(registry);
  registerHistoryCommands(registry);
  registerBookmarkCommands(registry);
  registerDownloadCommands(registry);
  registerSessionCommands(registry);
  registerProxyCommands(registry);
  registerZoomCommands(registry);
  registerCaptureCommands(registry);
  registerKeymapCommands(registry);
  return registry;
}

module.exports = { makeRouter, buildBackgroundRegistry };

// Wire the service worker message listener only when running as a real MV3 SW
// (not under Jest, which has no chrome.runtime.onMessage).
if (
  typeof chrome !== 'undefined' &&
  chrome.runtime &&
  chrome.runtime.onMessage &&
  typeof chrome.runtime.onMessage.addListener === 'function'
) {
  const _registry = buildBackgroundRegistry();
  const _router = makeRouter(_registry);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    _router({ ...message, sender })
      .then(sendResponse)
      .catch(err => sendResponse({ ok: false, error: String(err && err.message ? err.message : err) }));
    // Return true to keep the message channel open for async sendResponse
    return true;
  });

  // Hydrate MRU from storage on SW start
  if (chrome.storage && chrome.storage.session) {
    chrome.storage.session.get('qutesurf:tab-mru').then(result => {
      const stored = result && result['qutesurf:tab-mru'];
      if (Array.isArray(stored)) _setMru(stored);
    }).catch(() => {});
  }

  // Track tab activation for MRU
  if (chrome.tabs && chrome.tabs.onActivated) {
    chrome.tabs.onActivated.addListener(({ tabId }) => {
      recordActivation(tabId);
      if (chrome.storage && chrome.storage.session) {
        chrome.storage.session.set({ 'qutesurf:tab-mru': getMru() }).catch(() => {});
      }
    });
  }
}
