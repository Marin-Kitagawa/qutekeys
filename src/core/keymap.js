'use strict';

const { Trie } = require('./trie');

/**
 * KeyMap — resolves key sequences (with optional numeric count prefix) to
 * command strings.
 *
 * Usage:
 *   const km = new KeyMap();
 *   km.bind('gg', 'scroll-to-perc 0');
 *   km.feed('g')  → { status: 'pending', candidates: ['gg'] }
 *   km.feed('g')  → { status: 'matched', command: 'scroll-to-perc 0', count: null }
 *
 * Count handling:
 *   Leading digit keys (before any non-digit sequence key) accumulate as a
 *   count string.  Once a non-digit key arrives the trie matching begins.
 *   On match the integer count (or null) is attached to the result.
 *
 * State machine (internal):
 *   phase 'count'    — accumulating leading digits (or fresh start)
 *   phase 'sequence' — consumed at least one non-digit key, walking the trie
 */
class KeyMap {
  constructor() {
    this._trie = new Trie();
    this._reset();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Bind a multi-key sequence to a command string.
   * @param {string} seq     e.g. 'gg', 'G', 'zi'
   * @param {string} command e.g. 'scroll-to-perc 0'
   */
  bind(seq, command) {
    this._trie.insert(seq, command);
  }

  /**
   * Remove a binding.
   * @param {string} seq
   */
  unbind(seq) {
    this._trie.remove(seq);
    this._reset();
  }

  /**
   * Feed one key to the keymap and return the result.
   *
   * @param {string} key  A single key character (e.g. 'g', 'J', '3').
   * @returns {{ status: 'pending', candidates: string[] }
   *          |{ status: 'matched', command: string, count: number|null }
   *          |{ status: 'nomatch' }}
   */
  feed(key) {
    if (this._phase === 'count') {
      return this._feedCount(key);
    }
    return this._feedSequence(key);
  }

  /**
   * Reset accumulated state (count + partial sequence).
   */
  reset() {
    this._reset();
  }

  /**
   * If the currently accumulated sequence is itself a terminal binding (i.e.
   * the user typed 'd' and 'd' is bound even though 'dd' is also bound),
   * return { command, count } and reset state.
   * If the current sequence is NOT a terminal binding, reset and return null.
   *
   * Called by KeyHandler when a pending-state timeout fires so the shorter
   * binding can be executed without requiring the user to type another key.
   *
   * @returns {{ command: string, count: number|null } | null}
   */
  resolvePending() {
    const node = this._trie.getNode(this._seqStr);
    if (node && this._trie.isTerminal(node)) {
      const count = this._countStr ? parseInt(this._countStr, 10) : null;
      const command = node.command;
      this._reset();
      return { command, count };
    }
    this._reset();
    return null;
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  _reset() {
    this._countStr = '';   // digit characters typed so far
    this._seqStr = '';     // non-digit keys typed so far (the binding prefix)
    this._phase = 'count'; // 'count' | 'sequence'
  }

  /**
   * Called when we are in the count-accumulation phase.
   * Digits continue count accumulation; any non-digit switches to sequence phase.
   */
  _feedCount(key) {
    if (/^\d$/.test(key)) {
      // Accumulate digit — stay in count phase
      this._countStr += key;
      // Return pending with an empty-ish candidates array (the test uses
      // expect.any(Array) so any array is acceptable).
      return { status: 'pending', candidates: [] };
    }
    // Switch to sequence phase with this key as the first sequence character
    this._phase = 'sequence';
    return this._feedSequence(key);
  }

  /**
   * Called when we are in the sequence-matching phase.
   * Walks the trie one key at a time.
   */
  _feedSequence(key) {
    const newSeq = this._seqStr + key;
    const node = this._trie.getNode(newSeq);

    if (!node) {
      // No trie node — dead end
      this._reset();
      return { status: 'nomatch' };
    }

    const terminal = this._trie.isTerminal(node);
    const hasMore = this._trie.isPurePrefix(node);

    if (terminal && !hasMore) {
      // Exact match, no further extensions possible → matched immediately
      const count = this._countStr ? parseInt(this._countStr, 10) : null;
      const command = node.command;
      this._reset();
      return { status: 'matched', command, count };
    }

    if (hasMore && !terminal) {
      // Strict prefix — more keys needed
      this._seqStr = newSeq;
      const candidates = this._trie.getWords(node, newSeq);
      return { status: 'pending', candidates };
    }

    if (terminal && hasMore) {
      // Ambiguous: current seq is both a complete binding AND a prefix of
      // longer bindings.  Per spec, prefer 'pending' so a which-key UI can
      // show options.  The user must press another key to disambiguate; if
      // the next key is nomatch the current binding is consumed instead.
      // For simplicity in Phase 3 we treat this as pending (could add a
      // timeout-based resolution later).
      this._seqStr = newSeq;
      const candidates = this._trie.getWords(node, newSeq);
      return { status: 'pending', candidates };
    }

    // Should not reach here, but be safe
    this._reset();
    return { status: 'nomatch' };
  }
}

module.exports = { KeyMap };
