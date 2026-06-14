'use strict';

const { api } = require('./chrome-api');

function registerBookmarkCommands(registry) {
  // ── bookmark-search ────────────────────────────────────────────────────────
  registry.register({
    name: 'bookmark-search',
    description: 'Search bookmarks',
    args: ['query'],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, parsed) => {
      const q = (parsed.args && parsed.args[0]) || '';
      return api().bookmarks.search(q);
    },
  });

  // ── bookmark-add ──────────────────────────────────────────────────────────
  registry.register({
    name: 'bookmark-add',
    description: 'Bookmark the current tab',
    context: 'background',
    modes: ['normal'],
    handler: async (ctx) => {
      const tab = ctx.sender && ctx.sender.tab;
      if (!tab) return null;
      return api().bookmarks.create({ title: tab.title || '', url: tab.url || '' });
    },
  });

  // ── bookmark-remove ──────────────────────────────────────────────────────
  registry.register({
    name: 'bookmark-remove',
    description: 'Remove bookmarks matching the current tab URL',
    context: 'background',
    modes: ['normal'],
    handler: async (ctx) => {
      const tab = ctx.sender && ctx.sender.tab;
      if (!tab) return null;
      const matches = await api().bookmarks.search({ url: tab.url });
      for (const bm of matches) {
        await api().bookmarks.remove(bm.id);
      }
      return matches.length;
    },
  });
}

module.exports = { registerBookmarkCommands };
