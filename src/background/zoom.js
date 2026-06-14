'use strict';

const { api } = require('./chrome-api');

/**
 * Zoom commands — background context.
 * Uses chrome.tabs.getZoom / setZoom on the sender's tab.
 */
function registerZoomCommands(registry) {
  registry.register({
    name: 'zoom-in',
    description: 'Zoom in by 10% on the current tab',
    context: 'background',
    modes: ['normal'],
    handler: async (ctx) => {
      const tabId = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      const factor = await api().tabs.getZoom(tabId);
      return api().tabs.setZoom(tabId, Math.round((factor + 0.1) * 100) / 100);
    },
  });

  registry.register({
    name: 'zoom-out',
    description: 'Zoom out by 10% on the current tab',
    context: 'background',
    modes: ['normal'],
    handler: async (ctx) => {
      const tabId = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      const factor = await api().tabs.getZoom(tabId);
      return api().tabs.setZoom(tabId, Math.round((factor - 0.1) * 100) / 100);
    },
  });

  registry.register({
    name: 'zoom-reset',
    description: 'Reset zoom to 100% on the current tab',
    context: 'background',
    modes: ['normal'],
    handler: async (ctx) => {
      const tabId = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      return api().tabs.setZoom(tabId, 0);
    },
  });
}

module.exports = { registerZoomCommands };
