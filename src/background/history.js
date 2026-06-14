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
