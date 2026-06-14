'use strict';

/**
 * Built-in search engine aliases.
 * Each entry: { url: string (with %s placeholder), name: string }
 */
const DEFAULT_ENGINES = {
  g:  { name: 'Google',       url: 'https://www.google.com/search?q=%s' },
  d:  { name: 'DuckDuckGo',   url: 'https://duckduckgo.com/?q=%s' },
  b:  { name: 'Bing',         url: 'https://www.bing.com/search?q=%s' },
  w:  { name: 'Wikipedia',    url: 'https://en.wikipedia.org/wiki/Special:Search?search=%s' },
  gh: { name: 'GitHub',       url: 'https://github.com/search?q=%s' },
  so: { name: 'StackOverflow',url: 'https://stackoverflow.com/search?q=%s' },
  yt: { name: 'YouTube',      url: 'https://www.youtube.com/results?search_query=%s' },
};

/**
 * Returns true if the string looks like a URL or domain, false for plain
 * phrases or single words without a dot.
 *
 * Rules:
 * - Strings with spaces are never URL-like.
 * - Strings that parse as http(s) URLs → true.
 * - 'localhost' optionally followed by ':port' → true.
 * - IPv4 addresses → true.
 * - token.tld where tld is 2+ chars and there are no spaces → true.
 * - Everything else (single words, hyphenated words without dots) → false.
 */
function isUrlLike(s) {
  if (typeof s !== 'string' || s.includes(' ')) return false;

  // Explicit scheme — try URL parse
  if (/^https?:\/\//i.test(s)) {
    try { new URL(s); return true; } catch (_) { return false; }
  }

  // localhost(:port)?
  if (/^localhost(:\d+)?(\/.*)?$/i.test(s)) return true;

  // IPv4
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/.test(s)) return true;

  // something.tld — must have a dot, no spaces, and the part after the last
  // dot must be 2+ alpha chars (a real TLD).
  if (/^[^\s.]+\.[a-zA-Z]{2,}(\/.*)?$/.test(s)) return true;

  return false;
}

/**
 * Resolve a raw omnibar input string to a final URL.
 *
 * Algorithm:
 *  1. Trim. Empty → ''.
 *  2. Split on first whitespace into [first, rest].
 *     If `first` is an alias key in `engines` AND `rest` is non-empty,
 *     expand the alias: replace %s with encodeURIComponent(rest).
 *  3. Else if the whole input isUrlLike:
 *     - Already has http(s) scheme → return as-is.
 *     - Otherwise prepend 'http://'.
 *  4. Else: search with the defaultEngine.
 *
 * @param {string} input
 * @param {{ engines: object, defaultEngine: string }} options
 * @returns {string}
 */
function resolveQuery(input, { engines = DEFAULT_ENGINES, defaultEngine = 'g' } = {}) {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';

  // Split on first whitespace
  const spaceIdx = trimmed.search(/\s/);
  const first = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
  const rest  = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim();

  // Step 2: alias expansion (only when there IS a query term after the alias)
  if (rest && Object.prototype.hasOwnProperty.call(engines, first)) {
    return engines[first].url.replace('%s', encodeURIComponent(rest));
  }

  // Step 3: whole input is URL-like
  if (isUrlLike(trimmed)) {
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return 'http://' + trimmed;
  }

  // Step 4: default engine search
  return engines[defaultEngine].url.replace('%s', encodeURIComponent(trimmed));
}

module.exports = { DEFAULT_ENGINES, resolveQuery, isUrlLike };
