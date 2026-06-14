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
 * Commands source — searches the registry.
 */
async function commands(query, registry) {
  if (!registry) return [];
  const cmds = registry.search(query || '');
  return cmds.map(c => ({
    type: 'command',
    title: c.name,
    url: '',
    description: c.description || '',
    action: { kind: 'run-command', name: c.name },
  }));
}

/**
 * Marks source — reads marks from config (may be empty).
 */
async function marks(query, config) {
  if (!config) return [];
  const markMap = (config.get && config.get('marks')) || {};
  return Object.entries(markMap)
    .filter(([key, url]) => !query || key.includes(query) || (url || '').includes(query))
    .map(([key, url]) => ({
      type: 'mark',
      title: `${key}: ${url}`,
      url: url || '',
      action: { kind: 'open', url: url || '' },
    }));
}

module.exports = {
  sourceBadge,
  urlAndSearch,
  bookmarks,
  history,
  tabs,
  commands,
  marks,
};
