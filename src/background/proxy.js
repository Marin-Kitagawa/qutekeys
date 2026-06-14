'use strict';

const { api } = require('./chrome-api');

const STORAGE_KEY = 'qutesurf:proxy';

/**
 * Build a PAC (Proxy Auto-Config) script string.
 *
 * @param {Array<{host: string, proxy: string}>} rules - ordered list of host-pattern → proxy mappings
 * @param {string} [fallback='DIRECT'] - what to return when no rule matches
 * @returns {string} PAC script
 */
function buildPac(rules, fallback = 'DIRECT') {
  // Escape a string for safe embedding inside a JS double-quoted string literal
  function escapeStr(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  const lines = ['function FindProxyForURL(url, host) {'];
  for (const rule of rules) {
    const pattern = escapeStr(rule.host);
    const proxy = escapeStr(rule.proxy);
    lines.push(`  if (shExpMatch(host, "${pattern}")) return "${proxy}";`);
  }
  lines.push(`  return "${escapeStr(fallback)}";`);
  lines.push('}');
  return lines.join('\n');
}

/**
 * Load persisted proxy state from storage.
 * @returns {Promise<{rules: Array, mode: string}>}
 */
async function loadState() {
  const chrome = api();
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || { rules: [], mode: 'direct' };
}

/**
 * Persist proxy state and apply PAC script (or clear) via chrome.proxy.settings.
 * @param {{rules: Array, mode: string}} state
 */
async function applyAndPersist(state) {
  const chrome = api();
  await chrome.storage.local.set({ [STORAGE_KEY]: state });

  if (state.mode === 'pac' && state.rules.length > 0) {
    const pac = buildPac(state.rules, 'DIRECT');
    await chrome.proxy.settings.set({
      value: { mode: 'pac_script', pacScript: { data: pac } },
      scope: 'regular',
    });
  } else {
    await chrome.proxy.settings.clear({ scope: 'regular' });
  }
}

/**
 * Register proxy-related commands into a CommandRegistry.
 * @param {import('../core/registry').CommandRegistry} registry
 */
function registerProxyCommands(registry) {
  // proxy-set <pattern> <proxyString>
  // e.g. proxy-set *.example.com "PROXY 127.0.0.1:8080"
  registry.register({
    name: 'proxy-set',
    context: 'background',
    description: 'Add or update a proxy rule for a host pattern',
    modes: ['normal'],
    async handler(_ctx, { args }) {
      const [pattern, proxyString] = args;
      if (!pattern || !proxyString) return 'Usage: proxy-set <pattern> <proxy>';
      const state = await loadState();
      const idx = state.rules.findIndex(r => r.host === pattern);
      if (idx >= 0) {
        state.rules[idx].proxy = proxyString;
      } else {
        state.rules.push({ host: pattern, proxy: proxyString });
      }
      state.mode = 'pac';
      await applyAndPersist(state);
      return `proxy-set: ${pattern} → ${proxyString}`;
    },
  });

  // proxy-clear — remove all rules and restore direct connection
  registry.register({
    name: 'proxy-clear',
    context: 'background',
    description: 'Clear all proxy rules and restore direct connection',
    modes: ['normal'],
    async handler(_ctx, _parsed) {
      const state = { rules: [], mode: 'direct' };
      await applyAndPersist(state);
      return 'proxy-clear: all rules removed';
    },
  });

  // proxy-toggle-host <host> — toggle whether a specific host is proxied
  registry.register({
    name: 'proxy-toggle-host',
    context: 'background',
    description: 'Toggle proxy for a specific host (uses stored default proxy)',
    modes: ['normal'],
    async handler(_ctx, { args }) {
      const [host] = args;
      if (!host) return 'Usage: proxy-toggle-host <host>';
      const state = await loadState();

      // Check if host already has an exact rule
      const idx = state.rules.findIndex(r => r.host === host);
      if (idx >= 0) {
        // Remove it (toggle off)
        state.rules.splice(idx, 1);
        if (state.rules.length === 0) state.mode = 'direct';
      } else {
        // Find a default proxy from existing rules (first rule's proxy string)
        const defaultProxy = state.rules.length > 0 ? state.rules[0].proxy : null;
        if (!defaultProxy) {
          // No default proxy configured — no-op gracefully
          return `proxy-toggle-host: no default proxy configured; use proxy-set first`;
        }
        state.rules.push({ host, proxy: defaultProxy });
        state.mode = 'pac';
      }
      await applyAndPersist(state);
      return `proxy-toggle-host: toggled ${host}`;
    },
  });
}

module.exports = { buildPac, registerProxyCommands };
