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
    handler: async (ctx, parsed) => {
      const tab = ctx.sender && ctx.sender.tab;
      if (!tab) return null;
      // Optional explicit url/title args (qutebrowser :bookmark-add [url] [title])
      const url = parsed.args && parsed.args[0] ? parsed.args[0] : tab.url || '';
      const title = parsed.args && parsed.args[1] ? parsed.args[1] : (tab.title || '');
      if (!url) return null;
      // Toggle semantics when the URL is already bookmarked
      const existing = await api().bookmarks.search({ url });
      if (existing && existing.length > 0) {
        for (const bm of existing) {
          await api().bookmarks.remove(bm.id);
        }
        return { removed: existing.length };
      }
      return api().bookmarks.create({ title, url });
    },
  });

  registry.register({
    name: 'bookmark-remove-url',
    description: 'Remove bookmarks matching a specific URL (used by omnibar Ctrl-D)',
    args: ['url'],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, parsed) => {
      const url = parsed.args && parsed.args[0];
      if (!url) return null;
      const matches = await api().bookmarks.search({ url });
      for (const bm of matches) {
        await api().bookmarks.remove(bm.id);
      }
      return matches.length;
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
