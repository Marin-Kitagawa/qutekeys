'use strict';

const MAX_MRU = 50;

// In-memory MRU list (most recent first)
let _mru = [];

/** Replace the internal list (used for hydration from storage). */
function _setMru(list) {
  _mru = Array.isArray(list) ? list.slice(0, MAX_MRU) : [];
}

/** Record a tab activation. Pushes tabId to front, deduplicates, caps at MAX_MRU. */
function recordActivation(tabId) {
  _mru = [tabId, ..._mru.filter(id => id !== tabId)].slice(0, MAX_MRU);
}

/** Return a copy of the current MRU list. */
function getMru() {
  return _mru.slice();
}

/**
 * Return the most-recently-used OTHER tab id (not currentId).
 * Returns null if none.
 */
function lastUsed(currentId) {
  const other = _mru.find(id => id !== currentId);
  return other !== undefined ? other : null;
}

/**
 * Step through the MRU history stack.
 * dir = -1 → go back (return item AFTER currentId in _mru, i.e. less recent)
 * dir = +1 → go forward (return item BEFORE currentId, i.e. more recent)
 * Returns null if at boundary.
 */
function historyStep(currentId, dir) {
  const idx = _mru.indexOf(currentId);
  if (idx === -1) return null;
  const next = idx - dir; // dir=+1 means more recent = lower index
  if (next < 0 || next >= _mru.length) return null;
  return _mru[next];
}

/** Return the oldest activated tab id (last in MRU list). */
function firstActivated() {
  return _mru.length > 0 ? _mru[_mru.length - 1] : null;
}

/** Return the most recently activated tab id (first in MRU list). */
function lastActivated() {
  return _mru.length > 0 ? _mru[0] : null;
}

module.exports = { recordActivation, getMru, lastUsed, historyStep, firstActivated, lastActivated, _setMru };
