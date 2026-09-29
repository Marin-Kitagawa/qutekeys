'use strict';

const { api } = require('./chrome-api');
const { isSafeNavUrl } = require('../core/url-safety');

/**
 * Firefox containers (Wave 8).
 *
 * Opens URLs in a named Firefox container (contextual identity). Chrome has
 * no equivalent API — the command reports that gracefully.
 */

function registerContainerCommands(registry) {
  registry.register({
    name: 'open-in-container',
    description: 'Open a URL in a Firefox container. Usage: open-in-container <container> [url] (default: current tab URL)',
    args: ['container', 'url?'],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, parsed) => {
      const chromeLike = api();
      const name = parsed.args && parsed.args[0];
      if (!name) throw new Error('open-in-container: container name required');
      let url = parsed.args && parsed.args[1];
      if (!url) url = ctx.sender && ctx.sender.tab && ctx.sender.tab.url;
      if (!url) throw new Error('open-in-container: no URL available');
      if (!isSafeNavUrl(url)) throw new Error('refused unsafe url');

      if (!chromeLike.contextualIdentities || typeof chromeLike.contextualIdentities.query !== 'function') {
        throw new Error('containers are not supported in this browser (Firefox only)');
      }

      // Exact match first, then case-insensitive / prefix match
      let identities = await chromeLike.contextualIdentities.query({ name });
      if ((!identities || !identities.length)) {
        const all = await chromeLike.contextualIdentities.query({});
        identities = (all || []).filter(i => i.name.toLowerCase().startsWith(name.toLowerCase()));
      }
      if (!identities || !identities.length) {
        throw new Error('open-in-container: no container named "' + name + '"');
      }
      return chromeLike.tabs.create({ url, cookieStoreId: identities[0].cookieStoreId });
    },
  });
}

module.exports = { registerContainerCommands };
