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

module.exports = { scrollDelta, urlUp, urlRoot };
