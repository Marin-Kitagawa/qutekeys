'use strict';

/**
 * url-safety.js — central navigation-scheme allowlist.
 *
 * Untrusted strings (clipboard contents, page titles/URLs, bookmark/history
 * URLs, hint hrefs, omnibar input) flow into navigation sinks such as
 * `location.href = …`, `chrome.tabs.create({ url })` and
 * `chrome.downloads.download({ url })`.  If such a string carries a dangerous
 * scheme (`javascript:`, `data:`, `vbscript:`, `blob:`, `file:`) it can lead
 * to script execution in a privileged or cross-origin context, local file
 * disclosure, or download-based attacks.
 *
 * `isSafeNavUrl` returns true only for an explicit allowlist of schemes that
 * are safe to navigate to, plus scheme-relative inputs that will be resolved
 * to http(s) by the caller.  Pure / Node-safe — no globals.
 */

// Schemes that are safe to hand to a navigation / tab / download sink.
const SAFE_SCHEMES = new Set(['http:', 'https:', 'ftp:', 'mailto:', 'about:']);

// Schemes that must NEVER be navigated to from untrusted input.
const DANGEROUS_SCHEME_RE = /^\s*(javascript|data|vbscript|blob|file|filesystem):/i;

/**
 * Return true if `url` is safe to navigate to / open / download.
 *
 * A bare string with no scheme (e.g. "example.com/foo" or "search terms")
 * is considered safe here because callers prepend http(s) before navigating;
 * only strings that explicitly declare a dangerous scheme are rejected.
 *
 * @param {string} url
 * @returns {boolean}
 */
function isSafeNavUrl(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Explicit dangerous scheme — reject outright.
  if (DANGEROUS_SCHEME_RE.test(trimmed)) return false;

  // If it parses as an absolute URL, the scheme must be on the allowlist.
  // Match scheme as: letters, then any of letters/digits/+/-/., then ':'
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed);
  if (schemeMatch) {
    return SAFE_SCHEMES.has(schemeMatch[1].toLowerCase() + ':');
  }

  // No scheme — a host/path or search phrase that the caller will resolve to
  // http(s). Safe.
  return true;
}

module.exports = { isSafeNavUrl, SAFE_SCHEMES };
