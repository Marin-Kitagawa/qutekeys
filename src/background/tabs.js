const { api } = require('./chrome-api');
const { isSafeNavUrl } = require('../core/url-safety');

function registerTabCommands(registry) {
  registry.register({
    name: 'tab-new',
    description: 'Open a new tab, optionally with a URL',
    args: ['url?'],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, parsed) => {
      const url = parsed.args && parsed.args[0];
      // Authoritative trust boundary: a compromised content script could send
      // any URL here. Reject dangerous schemes (javascript:, data:, file:, …).
      if (url && !isSafeNavUrl(url)) {
        throw new Error('refused unsafe url scheme');
      }
      return url ? api().tabs.create({ url }) : api().tabs.create({});
    },
  });

  registry.register({
    name: 'tab-close',
    description: 'Close the current tab',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, _parsed) => {
      const id = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      return api().tabs.remove(id);
    },
  });

  registry.register({
    name: 'tab-clone',
    description: 'Duplicate the current tab',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, _parsed) => {
      const id = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      return api().tabs.duplicate(id);
    },
  });

  registry.register({
    name: 'tab-next',
    description: 'Switch to the next tab (wraps around)',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, _parsed) => {
      const allTabs = await api().tabs.query({ currentWindow: true });
      if (!allTabs.length) return;
      const sorted = allTabs.slice().sort((a, b) => a.index - b.index);
      const curId = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      const curPos = sorted.findIndex(t => t.id === curId);
      const next = sorted[(curPos + 1) % sorted.length];
      return api().tabs.update(next.id, { active: true });
    },
  });

  registry.register({
    name: 'tab-prev',
    description: 'Switch to the previous tab (wraps around)',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, _parsed) => {
      const allTabs = await api().tabs.query({ currentWindow: true });
      if (!allTabs.length) return;
      const sorted = allTabs.slice().sort((a, b) => a.index - b.index);
      const curId = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      const curPos = sorted.findIndex(t => t.id === curId);
      const prev = sorted[(curPos - 1 + sorted.length) % sorted.length];
      return api().tabs.update(prev.id, { active: true });
    },
  });

  registry.register({
    name: 'tab-first',
    description: 'Switch to the first tab',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, _parsed) => {
      const allTabs = await api().tabs.query({ currentWindow: true });
      if (!allTabs.length) return;
      const sorted = allTabs.slice().sort((a, b) => a.index - b.index);
      return api().tabs.update(sorted[0].id, { active: true });
    },
  });

  registry.register({
    name: 'tab-last',
    description: 'Switch to the last tab',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, _parsed) => {
      const allTabs = await api().tabs.query({ currentWindow: true });
      if (!allTabs.length) return;
      const sorted = allTabs.slice().sort((a, b) => a.index - b.index);
      return api().tabs.update(sorted[sorted.length - 1].id, { active: true });
    },
  });

  registry.register({
    name: 'tab-pin',
    description: 'Toggle pin state of the current tab',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, _parsed) => {
      const id = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      const tab = await api().tabs.get(id);
      return api().tabs.update(id, { pinned: !tab.pinned });
    },
  });

  registry.register({
    name: 'tab-mute',
    description: 'Toggle mute state of the current tab',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, _parsed) => {
      const id = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      const tab = await api().tabs.get(id);
      const muted = tab && tab.mutedInfo && tab.mutedInfo.muted;
      return api().tabs.update(id, { muted: !muted });
    },
  });

  registry.register({
    name: 'tab-move',
    description: 'Move the current tab; args[0] = absolute index or +/-N',
    args: ['position'],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, parsed) => {
      const id = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      const allTabs = await api().tabs.query({ currentWindow: true });
      const sorted = allTabs.slice().sort((a, b) => a.index - b.index);
      const tab = sorted.find(t => t.id === id);
      if (!tab) return;
      const arg = String(parsed.args && parsed.args[0] || '0');
      let newIndex;
      if (arg.startsWith('+') || arg.startsWith('-')) {
        newIndex = Math.max(0, Math.min(sorted.length - 1, tab.index + parseInt(arg, 10)));
      } else {
        newIndex = Math.max(0, Math.min(sorted.length - 1, parseInt(arg, 10)));
      }
      return api().tabs.move(id, { index: newIndex, windowId: tab.windowId });
    },
  });

  registry.register({
    name: 'tab-undo',
    description: 'Restore the most recently closed tab',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, _parsed) => {
      const sessions = await api().sessions.getRecentlyClosed();
      const entry = sessions && sessions[0];
      if (!entry) return;
      return api().sessions.restore(entry.tab ? entry.tab.sessionId : entry.window && entry.window.sessionId);
    },
  });

  registry.register({
    name: 'tab-only',
    description: 'Close all tabs in the window except the current one',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, _parsed) => {
      const id = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      const allTabs = await api().tabs.query({ currentWindow: true });
      const others = allTabs.filter(t => t.id !== id);
      for (const t of others) {
        await api().tabs.remove(t.id);
      }
    },
  });

  registry.register({
    name: 'tab-detach',
    description: 'Move the current tab to a new window',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, _parsed) => {
      const a = api();
      if (!a || !a.windows) return;
      const id = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      return a.windows.create({ tabId: id });
    },
  });

  registry.register({
    name: 'tab-list',
    description: 'Return all open tabs (used by omnibar tabs source)',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, _parsed) => {
      return api().tabs.query({});
    },
  });

  registry.register({
    name: 'tab-activate',
    description: 'Activate a tab by id, focusing its window',
    args: ['tabId'],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, parsed) => {
      const id = parseInt(parsed.args && parsed.args[0], 10);
      if (isNaN(id)) return;
      const tab = await api().tabs.get(id);
      if (!tab) return;
      await api().tabs.update(id, { active: true });
      if (api().windows && api().windows.update) return api().windows.update(tab.windowId, { focused: true });
    },
  });

  registry.register({
    name: 'tab-goto',
    description: 'Switch to tab by 1-based index',
    args: ['index'],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, parsed) => {
      const idx = parseInt(parsed.args && parsed.args[0], 10);
      if (isNaN(idx)) return;
      const allTabs = await api().tabs.query({ currentWindow: true });
      const sorted = allTabs.slice().sort((a, b) => a.index - b.index);
      const target = sorted[idx - 1];
      if (!target) return;
      return api().tabs.update(target.id, { active: true });
    },
  });
  // tab-last-used
  registry.register({
    name: 'tab-last-used',
    description: 'Switch to the most-recently-used other tab',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, _parsed) => {
      const { lastUsed } = require('./tab-mru');
      const curId = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      const targetId = lastUsed(curId);
      if (targetId == null) return;
      return api().tabs.update(targetId, { active: true });
    },
  });

  registry.register({
    name: 'tab-history-back',
    description: 'Go back in MRU activation history',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, _parsed) => {
      const { historyStep } = require('./tab-mru');
      const curId = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      const targetId = historyStep(curId, -1);
      if (targetId == null) return;
      return api().tabs.update(targetId, { active: true });
    },
  });

  registry.register({
    name: 'tab-history-forward',
    description: 'Go forward in MRU activation history',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, _parsed) => {
      const { historyStep } = require('./tab-mru');
      const curId = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      const targetId = historyStep(curId, +1);
      if (targetId == null) return;
      return api().tabs.update(targetId, { active: true });
    },
  });

  registry.register({
    name: 'tab-first-activated',
    description: 'Jump to oldest activated tab in MRU',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, _parsed) => {
      const { firstActivated } = require('./tab-mru');
      const targetId = firstActivated();
      if (targetId == null) return;
      return api().tabs.update(targetId, { active: true });
    },
  });

  registry.register({
    name: 'tab-last-activated',
    description: 'Jump to newest activated tab in MRU',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, _parsed) => {
      const { lastActivated } = require('./tab-mru');
      const targetId = lastActivated();
      if (targetId == null) return;
      return api().tabs.update(targetId, { active: true });
    },
  });

  registry.register({
    name: 'tab-close-left',
    description: 'Close the immediate left neighbor tab',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, _parsed) => {
      const curId = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      const allTabs = await api().tabs.query({ currentWindow: true });
      const sorted = allTabs.slice().sort((a, b) => a.index - b.index);
      const curPos = sorted.findIndex(t => t.id === curId);
      if (curPos <= 0) return;
      return api().tabs.remove(sorted[curPos - 1].id);
    },
  });

  registry.register({
    name: 'tab-close-right',
    description: 'Close the immediate right neighbor tab',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, _parsed) => {
      const curId = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      const allTabs = await api().tabs.query({ currentWindow: true });
      const sorted = allTabs.slice().sort((a, b) => a.index - b.index);
      const curPos = sorted.findIndex(t => t.id === curId);
      if (curPos === -1 || curPos >= sorted.length - 1) return;
      return api().tabs.remove(sorted[curPos + 1].id);
    },
  });

  registry.register({
    name: 'tab-close-left-all',
    description: 'Close all tabs to the left of the current tab',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, _parsed) => {
      const curId = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      const allTabs = await api().tabs.query({ currentWindow: true });
      const sorted = allTabs.slice().sort((a, b) => a.index - b.index);
      const curPos = sorted.findIndex(t => t.id === curId);
      for (let i = 0; i < curPos; i++) {
        await api().tabs.remove(sorted[i].id);
      }
    },
  });

  registry.register({
    name: 'tab-close-right-all',
    description: 'Close all tabs to the right of the current tab',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, _parsed) => {
      const curId = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      const allTabs = await api().tabs.query({ currentWindow: true });
      const sorted = allTabs.slice().sort((a, b) => a.index - b.index);
      const curPos = sorted.findIndex(t => t.id === curId);
      for (let i = sorted.length - 1; i > curPos; i--) {
        await api().tabs.remove(sorted[i].id);
      }
    },
  });

  registry.register({
    name: 'tab-close-audible',
    description: 'Close all audible/playing tabs',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, _parsed) => {
      const audible = await api().tabs.query({ audible: true });
      for (const t of audible) {
        await api().tabs.remove(t.id);
      }
    },
  });

  registry.register({
    name: 'tab-group',
    description: 'Group the current tab (no-op if chrome.tabs.group unavailable)',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, _parsed) => {
      const a = api();
      if (!a || !a.tabs || !a.tabs.group) return;
      const id = ctx.sender && ctx.sender.tab && ctx.sender.tab.id;
      if (!id) return;
      return a.tabs.group({ tabIds: [id] });
    },
  });

  registry.register({
    name: 'tab-gather',
    description: 'Move all tabs from other windows into the current window',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, _parsed) => {
      const curTab = ctx.sender && ctx.sender.tab;
      if (!curTab) return;
      const allTabs = await api().tabs.query({});
      const others = allTabs.filter(t => t.windowId !== curTab.windowId);
      for (const t of others) {
        await api().tabs.move(t.id, { index: -1, windowId: curTab.windowId });
      }
    },
  });

  registry.register({
    name: 'window-new',
    description: 'Open a new browser window',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, _parsed) => {
      const a = api();
      if (!a || !a.windows) return;
      return a.windows.create({});
    },
  });

  registry.register({
    name: 'window-new-private',
    description: 'Open a new incognito window',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, _parsed) => {
      const a = api();
      if (!a || !a.windows) return;
      return a.windows.create({ incognito: true });
    },
  });

  registry.register({
    name: 'tab-new-background',
    description: 'Open a URL in a new background tab',
    args: ['url?'],
    context: 'background',
    modes: ['normal'],
    handler: async (ctx, parsed) => {
      const url = parsed.args && parsed.args[0];
      if (url && !isSafeNavUrl(url)) {
        throw new Error('refused unsafe url scheme');
      }
      return url ? api().tabs.create({ url, active: false }) : api().tabs.create({ active: false });
    },
  });

  registry.register({
    name: 'view-source',
    description: 'Open the current tab\'s source in a new tab using view-source: scheme',
    context: 'background',
    modes: ['normal'],
    handler: async (ctx) => {
      // Intentionally bypasses isSafeNavUrl — view-source: is a browser-native
      // scheme that must NOT go through the http-only allowlist.
      const url = ctx.sender && ctx.sender.tab && ctx.sender.tab.url;
      if (!url) return;
      return api().tabs.create({ url: 'view-source:' + url });
    },
  });
}

module.exports = { registerTabCommands };
