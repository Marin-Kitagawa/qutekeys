const { api } = require('./chrome-api');
const { isSafeNavUrl } = require('../core/url-safety');

function registerDownloadCommands(registry) {
  registry.register({
    name: 'download-url',
    description: 'Download a URL via the browser downloads API',
    args: ['url'],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, parsed) => {
      const url = parsed.args && parsed.args[0];
      // Reject javascript:/data:/file: etc. before handing to the downloads API.
      if (!url || !isSafeNavUrl(url)) {
        throw new Error('refused unsafe download url');
      }
      return api().downloads.download({ url });
    },
  });
}

module.exports = { registerDownloadCommands };
