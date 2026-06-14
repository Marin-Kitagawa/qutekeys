'use strict';
/**
 * findScrollableElements — pure predicate (testable in jsdom with mocked props).
 * Returns elements whose overflow is auto/scroll AND scrollHeight > clientHeight.
 */
function findScrollableElements(root) {
  if (!root) return [];
  const all = root.querySelectorAll ? root.querySelectorAll('*') : [];
  const result = [];
  for (const el of all) {
    if (!el.style && !getComputedStyle) continue;
    try {
      const style = (typeof getComputedStyle !== 'undefined') ? getComputedStyle(el) : el.style;
      const ov = style.overflowY || style.overflow || '';
      if ((ov === 'auto' || ov === 'scroll') && el.scrollHeight > el.clientHeight) {
        result.push(el);
      }
    } catch (_) { /* ignore */ }
  }
  return result;
}

class ScrollTarget {
  constructor() {
    this._current = null;
  }
  getCurrent() { return this._current; }
  next(root) {
    const els = findScrollableElements(root || (typeof document !== 'undefined' ? document.body : null));
    if (!els.length) { this._current = null; return; }
    const idx = this._current ? els.indexOf(this._current) : -1;
    this._current = els[(idx + 1) % els.length];
    return this._current;
  }
  reset() { this._current = null; }
}
module.exports = { findScrollableElements, ScrollTarget };
