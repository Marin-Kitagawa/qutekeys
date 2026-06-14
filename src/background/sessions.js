const { api } = require('./chrome-api');

const STORAGE_KEY = 'qutesurf:sessions';

async function readSessions() {
  const result = await api().storage.local.get(STORAGE_KEY);
  return (result && result[STORAGE_KEY]) || {};
}

async function writeSessions(sessions) {
  await api().storage.local.set({ [STORAGE_KEY]: sessions });
}

function registerSessionCommands(registry) {
  registry.register({
    name: 'session-save',
    description: 'Save current window tabs as a named session',
    args: ['name'],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, parsed) => {
      const name = parsed.args && parsed.args[0];
      if (!name) throw new Error('session-save requires a name');
      const tabs = await api().tabs.query({ currentWindow: true });
      const saved = tabs.map(t => ({ url: t.url, pinned: t.pinned }));
      const sessions = await readSessions();
      sessions[name] = { tabs: saved, savedAt: Date.now() };
      await writeSessions(sessions);
    },
  });

  registry.register({
    name: 'session-load',
    description: 'Open all tabs from a named session',
    args: ['name'],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, parsed) => {
      const name = parsed.args && parsed.args[0];
      if (!name) throw new Error('session-load requires a name');
      const sessions = await readSessions();
      const session = sessions[name];
      if (!session) throw new Error('session not found: ' + name);
      for (const tab of session.tabs) {
        await api().tabs.create({ url: tab.url, pinned: tab.pinned });
      }
    },
  });

  registry.register({
    name: 'session-list',
    description: 'Return the names of all saved sessions',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, _parsed) => {
      const sessions = await readSessions();
      return Object.keys(sessions);
    },
  });

  registry.register({
    name: 'session-delete',
    description: 'Delete a named session',
    args: ['name'],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, parsed) => {
      const name = parsed.args && parsed.args[0];
      if (!name) throw new Error('session-delete requires a name');
      const sessions = await readSessions();
      delete sessions[name];
      await writeSessions(sessions);
    },
  });

  registry.register({
    name: 'sessions-recently-closed',
    description: 'Return recently closed tabs (used by omnibar recently-closed source)',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, _parsed) => {
      const entries = await api().sessions.getRecentlyClosed({ maxResults: 25 });
      if (!Array.isArray(entries)) return [];
      return entries
        .filter(e => e.tab)
        .map(e => ({
          title: e.tab.title || e.tab.url || 'Closed tab',
          url: e.tab.url || '',
          sessionId: e.tab.sessionId,
        }));
    },
  });
}

module.exports = { registerSessionCommands };
