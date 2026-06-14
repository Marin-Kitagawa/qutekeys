'use strict';

/**
 * Marks — config-backed in-page marks and quickmarks.
 *
 * - Marks:     key (single char) → { url, scrollY }   stored under config key 'marks'
 * - Quickmarks: name (string)    → url                stored under config key 'quickmarks'
 *
 * Undefined handling: if config returns undefined for 'marks' or 'quickmarks',
 * we treat that as {} without touching DEFAULTS — no existing config tests affected.
 */

class Marks {
  /**
   * @param {import('./config').Config} config
   */
  constructor(config) {
    this._config = config;
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  _getMarks() {
    return this._config.get('marks') || {};
  }

  _getQuickmarks() {
    return this._config.get('quickmarks') || {};
  }

  // ── Marks ───────────────────────────────────────────────────────────────────

  /**
   * Save a location under the given mark key.
   * @param {string} key  Single-char mark identifier.
   * @param {{ url: string, scrollY: number }} loc
   */
  async setMark(key, loc) {
    const current = this._getMarks();
    const updated = Object.assign({}, current, { [key]: loc });
    await this._config.set('marks', updated);
  }

  /**
   * Retrieve a saved mark or null.
   * @param {string} key
   * @returns {{ url: string, scrollY: number } | null}
   */
  getMark(key) {
    return this._getMarks()[key] || null;
  }

  /**
   * Delete a mark by key.
   * @param {string} key
   */
  async deleteMark(key) {
    const current = this._getMarks();
    const updated = Object.assign({}, current);
    delete updated[key];
    await this._config.set('marks', updated);
  }

  /**
   * Return all marks as { [key]: { url, scrollY } }.
   * @returns {Object}
   */
  listMarks() {
    return this._getMarks();
  }

  // ── Quickmarks ──────────────────────────────────────────────────────────────

  /**
   * Save a quickmark (name → url).
   * @param {string} name
   * @param {string} url
   */
  async setQuickmark(name, url) {
    const current = this._getQuickmarks();
    const updated = Object.assign({}, current, { [name]: url });
    await this._config.set('quickmarks', updated);
  }

  /**
   * Retrieve a quickmark URL or null.
   * @param {string} name
   * @returns {string | null}
   */
  getQuickmark(name) {
    return this._getQuickmarks()[name] || null;
  }

  /**
   * Delete a quickmark by name.
   * @param {string} name
   */
  async deleteQuickmark(name) {
    const current = this._getQuickmarks();
    const updated = Object.assign({}, current);
    delete updated[name];
    await this._config.set('quickmarks', updated);
  }

  /**
   * Return all quickmarks as { [name]: url }.
   * @returns {Object}
   */
  listQuickmarks() {
    return this._getQuickmarks();
  }
}

module.exports = { Marks };
