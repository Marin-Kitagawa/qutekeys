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
}

module.exports = { registerHistoryCommands };
