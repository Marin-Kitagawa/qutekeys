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
      // Reject javascript:/file: etc. before handing to the downloads API.
      if (!url || !isSafeNavUrl(url)) {
        throw new Error('refused unsafe download url');
      }
      return api().downloads.download({ url });
    },
  });

  registry.register({
    name: 'download-list',
    description: 'Return recent downloads (id, url, filename, state, mime)',
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, parsed) => {
      const items = await api().downloads.search({ limit: 50, orderBy: ['-startTime'] });
      return (items || []).map(d => ({
        id: d.id,
        url: d.url || d.finalUrl || '',
        filename: (d.filename || '').replace(/\\/g, '/'),
        state: d.state,
        mime: d.mime,
        bytes: d.fileSize,
        paused: d.paused,
      }));
    },
  });

  registry.register({
    name: 'download-cancel',
    description: 'Cancel a running download (id or most recent)',
    args: ['id?'],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, parsed) => {
      let id = parsed.args && parsed.args[0] ? Number(parsed.args[0]) : null;
      if (id == null || Number.isNaN(id)) {
        const items = await api().downloads.search({ state: 'in_progress', limit: 1, orderBy: ['-startTime'] });
        if (!items || !items.length) return 'no running download';
        id = items[0].id;
      }
      return api().downloads.cancel(id);
    },
  });

  registry.register({
    name: 'download-remove',
    description: 'Remove a finished download from the list (id or most recent)',
    args: ['id?'],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, parsed) => {
      let id = parsed.args && parsed.args[0] ? Number(parsed.args[0]) : null;
      if (id == null || Number.isNaN(id)) {
        const items = await api().downloads.search({ state: 'complete', limit: 1, orderBy: ['-startTime'] });
        if (!items || !items.length) return 'no finished download';
        id = items[0].id;
      }
      return api().downloads.erase({ id });
    },
  });

  registry.register({
    name: 'download-clear',
    description: 'Remove all finished downloads from the download list',
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, _parsed) => {
      return api().downloads.erase({ state: 'complete' });
    },
  });

  registry.register({
    name: 'download-open',
    description: 'Open a finished download with the default application (id or most recent)',
    args: ['id?'],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, parsed) => {
      let id = parsed.args && parsed.args[0] ? Number(parsed.args[0]) : null;
      if (id == null || Number.isNaN(id)) {
        const items = await api().downloads.search({ state: 'complete', limit: 1, orderBy: ['-startTime'] });
        if (!items || !items.length) return 'no finished download';
        id = items[0].id;
      }
      return api().downloads.open(id);
    },
  });

  registry.register({
    name: 'download-show',
    description: 'Show a finished download in its containing folder (id or most recent)',
    args: ['id?'],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, parsed) => {
      let id = parsed.args && parsed.args[0] ? Number(parsed.args[0]) : null;
      if (id == null || Number.isNaN(id)) {
        const items = await api().downloads.search({ state: 'complete', limit: 1, orderBy: ['-startTime'] });
        if (!items || !items.length) return 'no finished download';
        id = items[0].id;
      }
      return api().downloads.show(id);
    },
  });

  registry.register({
    name: 'download-dataurl',
    description: 'Download a data: URL (e.g. a captured screenshot). Usage: download-dataurl <dataUrl> [filename]',
    args: ['dataUrl', 'filename?'],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, parsed) => {
      const url = parsed.args && parsed.args[0];
      const filename = parsed.args && parsed.args[1];
      if (!url || !/^data:image\//i.test(url)) {
        throw new Error('download-dataurl: only data:image/* URLs are accepted');
      }
      const opts = { url };
      if (filename) opts.filename = String(filename).replace(/[/\\]/g, '-');
      return api().downloads.download(opts);
    },
  });

  registry.register({
    name: 'download-mhtml',
    description: 'Save the current page as a single MHTML file',
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, _parsed) => {
      const tabId = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      const chromeLike = api();
      if (!chromeLike.pageCapture || typeof chromeLike.pageCapture.saveMHTML !== 'function') {
        throw new Error('pageCapture API unavailable (Firefox)');
      }
      const blob = await new Promise((resolve, reject) => {
        chromeLike.pageCapture.saveMHTML({ tabId }, (mhtml) => {
          if (chromeLike.runtime.lastError) reject(new Error(chromeLike.runtime.lastError.message));
          else resolve(mhtml);
        });
      });
      // Convert the Blob to a base64 data URL. MV3 service workers have no
      // FileReader — use blob.arrayBuffer() + manual base64 encoding.
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
      }
      const dataUrl = 'data:message/rfc822;base64,' + btoa(binary);
      const name = `page-${Date.now()}.mhtml`;
      return chromeLike.downloads.download({ url: dataUrl, filename: name, saveAs: true });
    },
  });
}

module.exports = { registerDownloadCommands };
