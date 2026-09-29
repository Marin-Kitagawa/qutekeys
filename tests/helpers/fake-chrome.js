function fakeChrome(initial = {}) {
  const tabs = initial.tabs || [{ id: 1, index: 0, active: true, url: 'https://a.com', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: false }];
  let nextId = Math.max(0, ...tabs.map(t => t.id)) + 1;

  const _windowsCreated = [];
  const _onActivatedListeners = [];
  const _zoomMap = {};                  // tabId → zoom factor
  const _zoomSetCalls = [];             // [{tabId, factor}] for assertions
  const _captureVisibleCalls = [];      // for assertions
  const _reloadCalls = [];              // [{tabId, opts}]
  const _downloadCalls = [];            // ['cancel'|'erase'|'open'|'show', …]
  const _removedWindows = [];           // windows.remove calls

  const _bookmarks = Array.isArray(initial._bookmarks) ? [...initial._bookmarks] : [];
  let nextBookmarkId = _bookmarks.length + 1;

  function makeStorage() {
    const d = {};
    return {
      get: async (k) => {
        if (k == null) return { ...d };
        if (typeof k === 'string') return { [k]: d[k] };
        if (Array.isArray(k)) { const o = {}; k.forEach(x => o[x] = d[x]); return o; }
        return { ...d };
      },
      set: async (o) => { Object.assign(d, o); },
      remove: async (k) => { delete d[k]; },
    };
  }

  return {
    tabs: {
      query: async (q) => tabs.filter(t =>
        (q.active === undefined || t.active === q.active) &&
        (q.currentWindow === undefined || true) &&
        (q.audible === undefined || t.audible === q.audible)
      ),
      create: async ({ url, active = true } = {}) => {
        const t = { id: nextId++, index: tabs.length, active, url: url || 'chrome://newtab/', windowId: 1, pinned: false, mutedInfo: { muted: false }, audible: false };
        tabs.push(t);
        return t;
      },
      remove: async (id) => { const i = tabs.findIndex(t => t.id === id); if (i >= 0) tabs.splice(i, 1); },
      update: async (id, props) => {
        const t = tabs.find(t => t.id === id);
        if (t) { Object.assign(t, props); if (props.muted !== undefined) t.mutedInfo = { muted: props.muted }; }
        return t;
      },
      move: async (id, props) => { const t = tabs.find(t => t.id === id); if (t && props.index !== undefined) t.index = props.index; return t; },
      duplicate: async (id) => { const o = tabs.find(t => t.id === id); if (!o) return null; const t = { ...o, id: nextId++ }; tabs.push(t); return t; },
      get: async (id) => tabs.find(t => t.id === id),
      group: async ({ tabIds, groupId } = {}) => groupId || 1,
      onActivated: { addListener: (fn) => _onActivatedListeners.push(fn) },
      _all: () => tabs,
      _fireActivated: (tabId, windowId = 1) => _onActivatedListeners.forEach(fn => fn({ tabId, windowId })),
      // Wave 5: zoom support
      getZoom: async (tabId) => _zoomMap[tabId] !== undefined ? _zoomMap[tabId] : 1,
      setZoom: async (tabId, factor) => { _zoomMap[tabId] = factor; _zoomSetCalls.push({ tabId, factor }); },
      _zoomMap,
      _zoomSetCalls,
      // Wave 5: capture support
      captureVisibleTab: async () => { _captureVisibleCalls.push(true); return 'data:image/png;base64,AAAA'; },
      _captureVisibleCalls,
      // Wave 7: hard reload support
      reload: async (tabId, opts) => { _reloadCalls.push({ tabId, opts }); },
    },
    _reloadCalls,
    history: (function () {
      const _deleteRangeCalls = [];
      const _deletedUrls = [];
      return {
        search: async ({ text }) => [{ url: 'https://hist.com', title: 'Hist ' + text, visitCount: 3 }],
        deleteRange: async (range) => { _deleteRangeCalls.push(range); },
        deleteUrl: async ({ url }) => { _deletedUrls.push(url); },
        deleteAll: async () => { _deletedUrls.push('*'); },
        _deleteRangeCalls,
        _deletedUrls,
      };
    })(),
    bookmarks: {
      _bookmarks,
      search: async (q) => {
        if (q && typeof q === 'object' && q.url !== undefined) {
          return _bookmarks.filter(b => b.url === q.url);
        }
        // backward compat: string query or { query: '...' }
        const query = (q && typeof q === 'object' ? q.query : q) || '';
        if (_bookmarks.length > 0) {
          return _bookmarks.filter(b =>
            b.title.includes(query) || b.url.includes(query)
          );
        }
        return [{ id: 'b1', url: 'https://bm.com', title: 'BM ' + query }];
      },
      create: async ({ title, url }) => {
        const node = { id: 'b' + nextBookmarkId++, title: title || '', url: url || '', dateAdded: Date.now() };
        _bookmarks.push(node);
        return node;
      },
      remove: async (id) => {
        const i = _bookmarks.findIndex(b => b.id === id);
        if (i >= 0) _bookmarks.splice(i, 1);
      },
    },
    downloads: {
      download: async ({ url }) => { return 42; },
      search: async (q) => [
        { id: 1, url: 'https://f.com/a.zip', finalUrl: 'https://f.com/a.zip', filename: 'C:/dl/a.zip', state: 'complete', mime: 'application/zip', fileSize: 10, paused: false, startTime: '2026-01-02' },
        { id: 2, url: 'https://f.com/b.zip', finalUrl: 'https://f.com/b.zip', filename: 'C:/dl/b.zip', state: 'in_progress', mime: 'application/zip', fileSize: 0, paused: false, startTime: '2026-01-03' },
      ].filter(d => !q || q.state === undefined || d.state === q.state),
      cancel: async (id) => { _downloadCalls.push(['cancel', id]); },
      erase: async (q) => { _downloadCalls.push(['erase', q]); return []; },
      open: async (id) => { _downloadCalls.push(['open', id]); },
      show: async (id) => { _downloadCalls.push(['show', id]); },
      _calls: _downloadCalls,
    },
    sessions: (function() {
      const _restored = [];
      return {
        getRecentlyClosed: async () => [{ tab: { sessionId: 's1', title: 'Closed', url: 'https://closed.com' } }],
        restore: async (id) => { _restored.push(id); return {}; },
        _restored,
      };
    })(),
    runtime: { lastError: null, onMessage: { addListener() {} }, sendMessage: async () => ({}) },
    windows: {
      create: async (props = {}) => {
        const w = { id: _windowsCreated.length + 99, tabs: props.tabId ? [tabs.find(t => t.id === props.tabId)].filter(Boolean) : [], ...props };
        _windowsCreated.push({ ...props });
        return w;
      },
      update: async () => ({}),
      remove: async (windowId) => { _removedWindows.push(windowId); },
      getAll: async () => [{ id: 1, focused: true, tabs: [{ title: 'A', active: true }] }],
      _created: _windowsCreated,
      _removed: _removedWindows,
    },
    storage: {
      local: makeStorage(),
      session: makeStorage(),
    },
    proxy: { settings: { set: async () => ({}), clear: async () => ({}), get: async () => ({ value: {} }) } },
  };
}

module.exports = { fakeChrome };
