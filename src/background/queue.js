'use strict';

const { api } = require('./chrome-api');
const { isSafeNavUrl } = require('../core/url-safety');

/**
 * Tab queue (Wave 8, SurfingKeys parity).
 *
 * Queued URLs are stored in chrome.storage.local under 'qutesurf:queue' as an
 * ordered array of { url, title, queuedAt }. Omnibar source "queue" consumes
 * entries (open removes the entry).
 */

const STORAGE_KEY = 'qutesurf:queue';

async function readQueue() {
  const chrome = api();
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (result && Array.isArray(result[STORAGE_KEY])) ? result[STORAGE_KEY] : [];
}

async function writeQueue(queue) {
  await api().storage.local.set({ [STORAGE_KEY]: queue });
}

function registerQueueCommands(registry) {
  registry.register({
    name: 'queue-add',
    description: 'Queue the current tab (or an explicit URL) for later opening',
    args: ['url?'],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, parsed) => {
      let url = parsed.args && parsed.args[0];
      let title = '';
      if (!url) {
        const tab = ctx.sender && ctx.sender.tab;
        if (!tab || !tab.url) throw new Error('queue-add: no tab URL available');
        url = tab.url;
        title = tab.title || '';
      }
      if (!isSafeNavUrl(url)) throw new Error('refused unsafe url');
      const queue = await readQueue();
      queue.push({ url, title, queuedAt: Date.now() });
      await writeQueue(queue);
      return `queued (${queue.length} total)`;
    },
  });

  registry.register({
    name: 'queue-list',
    description: 'Return the queued URLs (used by the omnibar queue source)',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, _parsed) => readQueue(),
  });

  registry.register({
    name: 'queue-remove',
    description: 'Remove a queued URL by 0-based index (used by the omnibar queue source)',
    args: ['index'],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, parsed) => {
      const idx = parseInt(parsed.args && parsed.args[0], 10);
      if (Number.isNaN(idx)) throw new Error('queue-remove: index required');
      const queue = await readQueue();
      queue.splice(idx, 1);
      await writeQueue(queue);
    },
  });

  registry.register({
    name: 'queue-clear',
    description: 'Remove all queued URLs',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, _parsed) => {
      await writeQueue([]);
      return 'queue cleared';
    },
  });

  registry.register({
    name: 'queue-open-all',
    description: 'Open every queued URL in background tabs and clear the queue',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, _parsed) => {
      const queue = await readQueue();
      for (const item of queue) {
        if (isSafeNavUrl(item.url)) {
          await api().tabs.create({ url: item.url, active: false });
        }
      }
      await writeQueue([]);
      return `opened ${queue.length} tab(s)`;
    },
  });
}

module.exports = { registerQueueCommands, readQueue, writeQueue, STORAGE_KEY };
