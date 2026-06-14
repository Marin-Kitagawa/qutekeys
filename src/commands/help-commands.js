'use strict';

/**
 * Register the `help` command.
 *
 * Opens the QuteSurf help/cheatsheet page in a new tab.
 * Context: content. Mode: normal. Default binding: ?
 *
 * @param {import('../core/registry').CommandRegistry} registry
 * @param {{ messaging?: object }} ctx
 */
function registerHelpCommands(registry, ctx) {
  const messaging = (ctx && ctx.messaging) || null;

  registry.register({
    name: 'help',
    description: 'Show the keybinding cheatsheet',
    context: 'content',
    modes: ['normal'],
    handler() {
      // Determine the help page URL
      let url = null;
      if (
        typeof chrome !== 'undefined' &&
        chrome.runtime &&
        typeof chrome.runtime.getURL === 'function'
      ) {
        url = chrome.runtime.getURL('pages/help.html');
      }

      if (!url) return; // guard: not in extension context

      // Open via tab-new message if messaging is available
      if (messaging && typeof messaging.sendMessage === 'function') {
        messaging.sendMessage({ type: 'command', name: 'tab-new', args: [url], flags: {} })
          .catch(() => {
            // Fallback: open directly
            if (typeof window !== 'undefined') window.open(url, '_blank');
          });
      } else if (typeof window !== 'undefined') {
        window.open(url, '_blank');
      }
    },
  });
}

module.exports = { registerHelpCommands };
