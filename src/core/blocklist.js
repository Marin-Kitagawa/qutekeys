'use strict';
/**
 * Blocklist — per-site disable list backed by Config.
 * Purely testable with a fake config.
 */
class Blocklist {
  constructor(config) {
    this._config = config;
  }
  _get() { return (this._config && this._config.get('blocklist')) || []; }
  async _set(arr) { if (this._config) await this._config.set('blocklist', arr); }
  isBlocked(host) { return this._get().includes(host); }
  async toggle(host) {
    const list = this._get();
    const idx = list.indexOf(host);
    if (idx >= 0) {
      await this._set(list.filter(h => h !== host));
    } else {
      await this._set([...list, host]);
    }
  }
}
module.exports = { Blocklist };
