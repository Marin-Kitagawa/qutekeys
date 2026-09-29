const { api } = require('./chrome-api');

function registerHistoryCommands(registry) {
  registry.register({
    name: 'history-search',
    description: 'Search browser history',
    args: ['query'],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, parsed) => {
      const text = (parsed.args && parsed.args[0]) || '';
      return api().history.search({ text, maxResults: 50 });
    },
  });

  registry.register({
    name: 'history-delete-url',
    description: 'Delete all history entries for a URL (used by omnibar Ctrl-D)',
    args: ['url'],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, parsed) => {
      const url = parsed.args && parsed.args[0];
      if (!url) throw new Error('history-delete-url requires a url');
      return api().history.deleteUrl({ url });
    },
  });

  registry.register({
    name: 'history-clear',
    description: 'Clear the entire browser history',
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, _parsed) => {
      return api().history.deleteAll();
    },
  });

  registry.register({
    name: 'history-delete-old',
    description: 'Delete browser history older than 30 days',
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx) => {
      const endTime = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return api().history.deleteRange({ startTime: 0, endTime });
    },
  });
}

module.exports = { registerHistoryCommands };
