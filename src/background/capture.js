'use strict';

const { api } = require('./chrome-api');

/**
 * Capture commands — background context.
 */
function registerCaptureCommands(registry) {
  registry.register({
    name: 'capture-visible',
    description: 'Capture the visible tab as a PNG and open it in a new tab',
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx) => {
      const dataUrl = await api().tabs.captureVisibleTab();
      return api().tabs.create({ url: dataUrl });
    },
  });
}

module.exports = { registerCaptureCommands };
