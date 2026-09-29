'use strict';

const { resolveQuery, isUrlLike, DEFAULT_ENGINES } = require('../../core/search-engines');

/**
 * sourceBadge — returns a short display label for an item's source type.
 * @param {{ type: string }} item
 * @returns {string}
 */
function sourceBadge(item) {
  const MAP = {
    bookmark: 'BOOKMARK',
    history:  'HISTORY',
    tab:      'TAB',
    command:  'CMD',
    search:   'SEARCH',
    url:      'URL',
    mark:     'MARK',
    download: 'DL',
    queue: 'QUEUE',
  };
  return MAP[item.type] || '';
}

// ---------------------------------------------------------------------------
// Source resolvers — each returns Promise<NormalizedItem[]>
// NormalizedItem: { type, title, url, action, favicon? }
// ---------------------------------------------------------------------------

/**
 * URL-or-search source: returns one item that is either a direct URL or a
 * search using the configured (or default) engine.
 *
 * Accepts an optional config object with:
 *   searchengines  — alias map (defaults to DEFAULT_ENGINES)
 *   defaultEngine  — alias key for fallback searches (defaults to 'g')
 */
async function urlAndSearch(query, { searchengines, defaultEngine } = {}) {
  if (!query) return [];
  const engines = searchengines || DEFAULT_ENGINES;
  const engine  = defaultEngine || 'g';
  const url = resolveQuery(query, { engines, defaultEngine: engine });
  const type = isUrlLike(query) ? 'url' : 'search';
  return [{ type, title: query, url, action: { kind: 'open', url } }];
}

/**
 * Bookmarks source — queries background via messaging.
 */
async function bookmarks(query, messaging) {
  if (!messaging) return [];
  try {
    const items = await messaging.sendMessage({ type: 'command', name: 'bookmark-search', args: [query], flags: {}, count: null });
    if (!Array.isArray(items)) return [];
    return items.map(b => ({
      type: 'bookmark',
      title: b.title || b.url,
      url: b.url,
      action: { kind: 'open', url: b.url },
    }));
  } catch (_) {
    return [];
  }
}

/**
 * History source — queries background via messaging.
 */
async function history(query, messaging) {
  if (!messaging) return [];
  try {
    const items = await messaging.sendMessage({ type: 'command', name: 'history-search', args: [query], flags: {}, count: null });
    if (!Array.isArray(items)) return [];
    return items.map(h => ({
      type: 'history',
      title: h.title || h.url,
      url: h.url,
      // Retain metadata for <C-r> re-sorting
      visitCount: h.visitCount,
      lastVisitTime: h.lastVisitTime,
      action: { kind: 'open', url: h.url },
    }));
  } catch (_) {
    return [];
  }
}

/**
 * Tabs source — queries background via messaging for tab-list.
 */
async function tabs(query, messaging) {
  if (!messaging) return [];
  try {
    const tabList = await messaging.sendMessage({ type: 'command', name: 'tab-list', args: [], flags: {}, count: null });
    if (!Array.isArray(tabList)) return [];
    return tabList.map(t => ({
      type: 'tab',
      title: t.title || t.url,
      url: t.url,
      action: { kind: 'activate-tab', tabId: t.id },
    }));
  } catch (_) {
    return [];
  }
}

/**
 * Fetch the background command list (used to detect command+args input).
 */
async function backgroundCommands(messaging) {
  if (!messaging) return [];
  try {
    const result = await messaging.sendMessage({ type: 'command', name: 'registry-list', args: [], flags: {}, count: null });
    return Array.isArray(result)
      ? result
      : (result && Array.isArray(result.result) ? result.result : []);
  } catch (_) { return []; }
}

/**
 * Commands source — searches the content registry PLUS the background command
 * list (via messaging) so the palette can run background commands too.
 */
async function commands(query, registry, messaging) {
  if (!registry) return [];
  const q = query || '';
  const local = registry.search(q).map(c => ({
    type: 'command',
    title: c.name,
    url: '',
    description: c.description || '',
    action: { kind: 'run-command', name: c.name },
  }));
  let remote = [];
  if (messaging && typeof messaging.sendMessage === 'function') {
    try {
      const result = await messaging.sendMessage({ type: 'command', name: 'registry-list', args: [], flags: {}, count: null });
      const list = Array.isArray(result)
        ? result
        : (result && Array.isArray(result.result) ? result.result : []);
      remote = (list || [])
        .filter(c => c && c.name && !registry.get(c.name))
        .filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.description || '').toLowerCase().includes(q.toLowerCase()))
        .map(c => ({
          type: 'command',
          title: c.name,
          url: '',
          description: c.description || '',
          action: { kind: 'run-command', name: c.name },
        }));
    } catch (_) { remote = []; }
  }
  return [...local, ...remote];
}

/**
 * Marks source — reads marks from config (may be empty).
 *
 * Marks entries are stored by core/marks.js as key → { url, scrollY }.
 * Legacy plain string values (key → url) are also tolerated.
 */
async function marks(query, config) {
  if (!config) return [];
  const markMap = (config.get && config.get('marks')) || {};
  return Object.entries(markMap)
    .map(([key, val]) => {
      const url = typeof val === 'string' ? val : (val && val.url) || '';
      const scrollY = val && typeof val === 'object' ? val.scrollY : undefined;
      return { key, url, scrollY };
    })
    .filter(m => m.url && (!query || m.key.includes(query) || m.url.includes(query)))
    .map(m => ({
      type: 'mark',
      title: `${m.key}: ${m.url}`,
      url: m.url,
      action: { kind: 'open', url: m.url },
    }));
}

/**
 * Recently closed tabs source — queries background via messaging for sessions-recently-closed.
 */
async function recentlyClosed(query, messaging) {
  if (!messaging) return [];
  try {
    const items = await messaging.sendMessage({ type: 'command', name: 'sessions-recently-closed', args: [], flags: {}, count: null });
    if (!Array.isArray(items)) return [];
    return items.map(s => ({
      type: 'history',
      title: s.title || s.url || 'Closed tab',
      url: s.url || '',
      action: { kind: 'open', url: s.url || '' },
    }));
  } catch (_) { return []; }
}

/**
 * Close tabs source — queries background for tab-list, then closes chosen tab.
 */
async function closeTabs(query, messaging) {
  if (!messaging) return [];
  try {
    const tabList = await messaging.sendMessage({ type: 'command', name: 'tab-list', args: [], flags: {}, count: null });
    if (!Array.isArray(tabList)) return [];
    return tabList.map(t => ({
      type: 'tab',
      title: t.title || t.url,
      url: t.url,
      action: { kind: 'close-tab', tabId: t.id },
    }));
  } catch (_) { return []; }
}

/**
 * Windows source — queries background for windows-list, then moves tab to chosen window.
 */
async function windows(query, messaging) {
  if (!messaging) return [];
  try {
    const winList = await messaging.sendMessage({ type: 'command', name: 'windows-list', args: [], flags: {}, count: null });
    if (!Array.isArray(winList)) return [];
    return winList.map(w => ({
      type: 'tab',
      title: `Window ${w.id}` + (w.focused ? ' (current)' : ''),
      url: '',
      action: { kind: 'move-to-window', windowId: w.id },
    }));
  } catch (_) { return []; }
}

/**
 * Downloads source — queries background for recent downloads.
 */
async function downloads(query, messaging) {
  if (!messaging) return [];
  try {
    const result = await messaging.sendMessage({ type: 'command', name: 'download-list', args: [], flags: {}, count: null });
    const items = Array.isArray(result)
      ? result
      : (result && Array.isArray(result.result) ? result.result : []);
    return items
      .filter(d => !query
        || (d.filename || '').toLowerCase().includes(query.toLowerCase())
        || (d.url || '').toLowerCase().includes(query.toLowerCase()))
      .map(d => ({
        type: 'download',
        title: (d.filename || d.url || '').split('/').pop() || 'download',
        url: d.url || '',
        description: d.state || '',
        action: { kind: 'download-open', downloadId: d.id },
      }));
  } catch (_) { return []; }
}

/**
 * Tab queue source (Wave 8) — open removes the entry from the queue.
 */
async function queue(query, messaging) {
  if (!messaging) return [];
  try {
    const result = await messaging.sendMessage({ type: 'command', name: 'queue-list', args: [], flags: {}, count: null });
    const items = Array.isArray(result)
      ? result
      : (result && Array.isArray(result.result) ? result.result : []);
    return items
      .filter(item => item && item.url && (!query
        || (item.title || '').toLowerCase().includes(query.toLowerCase())
        || item.url.toLowerCase().includes(query.toLowerCase())))
      .map((item, idx) => ({
        type: 'queue',
        title: item.title || item.url,
        url: item.url,
        action: { kind: 'queue-open', index: idx, url: item.url },
      }));
  } catch (_) { return []; }
}

module.exports = {
  sourceBadge,
  urlAndSearch,
  bookmarks,
  history,
  tabs,
  commands,
  marks,
  recentlyClosed,
  closeTabs,
  windows,
  downloads,
  queue,
  backgroundCommands,
};
