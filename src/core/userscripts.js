'use strict';

/**
 * Userscripts — pure parsing, matching, and config-backed store.
 *
 * All functions are pure / Node-safe; no DOM access here.
 */

// ── parseMeta ────────────────────────────────────────────────────────────────

/**
 * Parse the ==UserScript== metadata block from a userscript source string.
 *
 * Recognised directives:
 *   @name    (single value  → string)
 *   @match   (multi-value  → string[])
 *   @include (multi-value  → string[])
 *   @exclude (multi-value  → string[])
 *   @run-at  (single value → string)
 *
 * @param {string} src  Full userscript source.
 * @returns {{ name: string, match: string[], include: string[], exclude: string[], runAt: string|undefined }}
 */
function parseMeta(src) {
  const meta = { name: '', match: [], include: [], exclude: [], runAt: undefined };

  // Extract the metadata block between ==UserScript== and ==/UserScript==
  const blockMatch = src.match(/\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/);
  if (!blockMatch) return meta;

  const block = blockMatch[1];
  const lineRe = /\/\/\s*@(\S+)\s+(.*)/g;
  let m;
  while ((m = lineRe.exec(block)) !== null) {
    const key = m[1].trim();
    const val = m[2].trim();
    switch (key) {
      case 'name':    meta.name   = val; break;
      case 'match':   meta.match.push(val); break;
      case 'include': meta.include.push(val); break;
      case 'exclude': meta.exclude.push(val); break;
      case 'run-at':  meta.runAt  = val; break;
      default: break;
    }
  }

  return meta;
}

// ── globToRegExp ─────────────────────────────────────────────────────────────

/**
 * Convert a Greasemonkey/Chrome @match-style glob pattern to a RegExp.
 *
 * Rules:
 *  - The pattern is anchored (^ … $).
 *  - All regex metacharacters in the pattern are escaped EXCEPT `*`.
 *  - `*` is converted to `.*` (matches any characters including `/`).
 *
 * The subdomain-required behaviour for `*.example.com` works automatically:
 *  `*.example.com` escapes the `.` around `example` → `.*\.example\.com`,
 *  which requires at least one character before `.example.com`, so bare
 *  `example.com` does not match.
 *
 * @param {string} glob
 * @returns {RegExp}
 */
function globToRegExp(glob) {
  // Escape all regex special chars except `*`
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  // Replace `*` with `.*`
  const pattern = escaped.replace(/\*/g, '.*');
  return new RegExp('^' + pattern + '$');
}

// ── matchScripts ─────────────────────────────────────────────────────────────

/**
 * Return the subset of `scripts` whose @match patterns include `url`,
 * minus any that have an @exclude pattern that also matches `url`.
 *
 * @param {string} url
 * @param {Array<{ match: string[], exclude?: string[], enabled?: boolean }>} scripts
 * @returns {typeof scripts}
 */
function matchScripts(url, scripts) {
  return scripts.filter(script => {
    const matchPatterns  = script.match  || [];
    const excludePatterns = script.exclude || [];

    const included = matchPatterns.some(p => globToRegExp(p).test(url));
    if (!included) return false;

    const excluded = excludePatterns.some(p => globToRegExp(p).test(url));
    return !excluded;
  });
}

// ── UserscriptStore ───────────────────────────────────────────────────────────

const CONFIG_KEY = 'userscripts';

/**
 * Config-backed store for userscripts.
 *
 * Stored value under config key `'userscripts'`:
 *   Array<{ name: string, match: string[], exclude: string[], body: string, enabled: boolean }>
 *
 * @param {import('./config').Config} config
 */
class UserscriptStore {
  constructor(config) {
    this._config = config;
  }

  /** @returns {Array} All stored scripts */
  list() {
    return this._config.get(CONFIG_KEY) || [];
  }

  /**
   * Add (or replace) a script.
   * @param {{ name: string, match: string[], body: string, enabled?: boolean, exclude?: string[] }} script
   */
  async add(script) {
    const current = this.list();
    const idx = current.findIndex(s => s.name === script.name);
    const entry = {
      name: script.name,
      match: script.match || [],
      exclude: script.exclude || [],
      body: script.body || '',
      enabled: script.enabled !== false,
    };
    if (idx >= 0) {
      current[idx] = entry;
    } else {
      current.push(entry);
    }
    await this._config.set(CONFIG_KEY, current);
  }

  /**
   * Remove a script by name.
   * @param {string} name
   */
  async remove(name) {
    const updated = this.list().filter(s => s.name !== name);
    await this._config.set(CONFIG_KEY, updated);
  }

  /**
   * Return scripts matching `url` (enabled scripts only).
   * @param {string} url
   * @returns {Array}
   */
  getMatching(url) {
    const enabled = this.list().filter(s => s.enabled !== false);
    return matchScripts(url, enabled);
  }
}

module.exports = { parseMeta, globToRegExp, matchScripts, UserscriptStore };
