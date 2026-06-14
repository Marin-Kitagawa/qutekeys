'use strict';

/**
 * Pure navigation helpers — no DOM globals; fully testable in Node/Jest.
 */

/**
 * Compute a {x, y} scroll delta for the given direction.
 *
 * @param {'down'|'up'|'left'|'right'|'halfpage-down'|'halfpage-up'|'page-down'|'page-up'} dir
 * @param {{ width: number, height: number }} viewport
 * @param {number} step  — pixel step for cardinal directions
 * @returns {{ x: number, y: number }}
 */
function scrollDelta(dir, viewport, step) {
  switch (dir) {
    case 'down':          return { x: 0,    y: step };
    case 'up':            return { x: 0,    y: -step };
    case 'right':         return { x: step, y: 0 };
    case 'left':          return { x: -step, y: 0 };
    case 'halfpage-down': return { x: 0,    y: viewport.height / 2 };
    case 'halfpage-up':   return { x: 0,    y: -(viewport.height / 2) };
    case 'page-down':     return { x: 0,    y: viewport.height };
    case 'page-up':       return { x: 0,    y: -viewport.height };
    default:              return { x: 0,    y: 0 };
  }
}

/**
 * Remove the last non-empty path segment from a URL.
 * Trailing slashes are normalised first (treated as terminating the segment).
 *
 * Examples:
 *   https://a.com/x/y/z  → https://a.com/x/y
 *   https://a.com/x/     → https://a.com/x
 *   https://a.com/       → https://a.com/   (already at root)
 *
 * @param {string} urlStr
 * @returns {string}
 */
function urlUp(urlStr) {
  const u = new URL(urlStr);
  const path = u.pathname;

  // Already at bare root — nothing to strip
  if (path === '/') {
    return u.origin + '/';
  }

  // Trailing slash (non-root): e.g. /x/y/ → treat the trailing slash as the
  // "last segment" and simply remove it, yielding /x/y
  if (path.endsWith('/')) {
    return u.origin + path.slice(0, -1);
  }

  // No trailing slash: remove the last path segment, e.g. /x/y/z → /x/y
  const lastSlash = path.lastIndexOf('/');
  const parent = lastSlash <= 0 ? '/' : path.slice(0, lastSlash);
  return u.origin + parent;
}

/**
 * Return the origin root of a URL (scheme + host + '/').
 *
 * @param {string} urlStr
 * @returns {string}
 */
function urlRoot(urlStr) {
  const u = new URL(urlStr);
  return u.origin + '/';
}

/**
 * Strip the query string (and everything after) from a URL string.
 * Returns the URL unchanged if there is no '?'.
 *
 * @param {string} url
 * @returns {string}
 */
function stripQuery(url) {
  const idx = url.indexOf('?');
  return idx === -1 ? url : url.slice(0, idx);
}

/**
 * Strip the fragment (hash and everything after) from a URL string.
 * Returns the URL unchanged if there is no '#'.
 *
 * @param {string} url
 * @returns {string}
 */
function stripHash(url) {
  const idx = url.indexOf('#');
  return idx === -1 ? url : url.slice(0, idx);
}

/**
 * Increment (or decrement) the last integer found in a URL string by delta.
 * "Last number" means the right-most run of digits in the full URL string
 * (including path, query, and fragment).  Returns the URL unchanged if no
 * digit sequence is found.
 *
 * Rule: last-number-wins — e.g. incrementUrl('http://a.com/p3?x=9', 1)
 * increments 9 → 10 (the query param wins over the path segment).
 *
 * @param {string} url
 * @param {number} delta  — positive to increment, negative to decrement
 * @returns {string}
 */
function incrementUrl(url, delta) {
  // Find the last run of digits in the string
  const match = /(\d+)(?=\D*$)/.exec(url);
  if (!match) return url;
  const num = parseInt(match[0], 10);
  const newNum = Math.max(0, num + delta);
  // Replace only that specific occurrence (at the exact index)
  const idx = match.index;
  return url.slice(0, idx) + String(newNum) + url.slice(idx + match[0].length);
}

/**
 * Find the href for a rel=next or rel=prev link in a document, or fall back
 * to a heuristic text-matched anchor.
 *
 * @param {Document} doc  — a real or jsdom Document
 * @param {'next'|'prev'} rel
 * @returns {string|null}
 */
function findRelLink(doc, rel) {
  // 1. <link rel="next"> / <link rel="prev"> in <head>
  const linkEl = doc.querySelector(`link[rel="${rel}"]`);
  if (linkEl && linkEl.href) return linkEl.href;

  // 2. <a rel="next"> / <a rel="prev"> in the body
  const aRel = doc.querySelector(`a[rel="${rel}"]`);
  if (aRel && aRel.href) return aRel.href;

  // 3. Heuristic: find an <a> whose visible text matches next/prev patterns
  const NEXT_RE = /next|›|»|>/i;
  const PREV_RE = /prev|‹|«|</i;
  const pattern = rel === 'next' ? NEXT_RE : PREV_RE;

  const anchors = Array.from(doc.querySelectorAll('a[href]'));
  for (const a of anchors) {
    const text = (a.textContent || '').trim();
    if (pattern.test(text)) return a.href;
  }
  return null;
}

module.exports = { scrollDelta, urlUp, urlRoot, stripQuery, stripHash, incrementUrl, findRelLink };
