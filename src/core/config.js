'use strict';

const STORAGE_KEY = 'qutesurf:config';

const { DEFAULT_ENGINES } = require('./search-engines');

const DEFAULTS = {
  hintcharacters: 'asdfg',
  scrollstep: 70,
  smoothscroll: true,
  findcasesensitive: false,
  defaultsearchengine: 'g',
  theme: 'aurora',
  homepage: '',
  emoji: true,
  'tts.lang': '',
  'tts.rate': 1,
};

const EMPTY_STATE = () => ({
  options: {},
  userBindings: { normal: {}, insert: {}, visual: {} },
  activeProfile: 'hybrid',
  searchengines: {},
});

class Config {
  constructor(storage) {
    this._storage = storage;
    this._state = EMPTY_STATE();
  }

  async load() {
    const result = await this._storage.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY];
    if (stored && typeof stored === 'object') {
      this._state = {
        options: stored.options || {},
        userBindings: Object.assign(
          { normal: {}, insert: {}, visual: {} },
          stored.userBindings || {}
        ),
        activeProfile: stored.activeProfile || 'hybrid',
        searchengines: stored.searchengines || {},
      };
    } else {
      this._state = EMPTY_STATE();
    }
  }

  async _persist() {
    await this._storage.set({ [STORAGE_KEY]: this._state });
  }

  get(key) {
    if (Object.prototype.hasOwnProperty.call(this._state.options, key)) {
      return this._state.options[key];
    }
    return Object.prototype.hasOwnProperty.call(DEFAULTS, key) ? DEFAULTS[key] : undefined;
  }

  async set(key, value) {
    this._state.options[key] = value;
    await this._persist();
  }

  /**
   * Reset an option to its default (remove the user override).
   * @param {string} key
   */
  async unset(key) {
    delete this._state.options[key];
    await this._persist();
  }

  /**
   * Cycle an option through the given values. With no values given, a boolean
   * option toggles between true/false; other types toggle between current
   * value and the default (or '' when no default exists).
   * @param {string} key
   * @param {Array} [values]
   * @returns {*} the new value
   */
  async cycle(key, values) {
    const current = this.get(key);
    let next;
    if (Array.isArray(values) && values.length > 0) {
      const idx = values.indexOf(current);
      next = values[(idx + 1) % values.length];
      if (idx === -1) next = values[0];
    } else if (typeof current === 'boolean') {
      next = !current;
    } else {
      const dflt = Object.prototype.hasOwnProperty.call(DEFAULTS, key) ? DEFAULTS[key] : '';
      next = current === dflt ? (typeof dflt === 'boolean' ? !dflt : '') : dflt;
    }
    await this.set(key, next);
    return next;
  }

  /**
   * Reset ALL user options to defaults (bindings and profile are kept).
   */
  async clearOptions() {
    this._state.options = {};
    await this._persist();
  }

  getUserBindings(mode) {
    return this._state.userBindings[mode] || {};
  }

  async bind(mode, seq, command) {
    if (!this._state.userBindings[mode]) {
      this._state.userBindings[mode] = {};
    }
    this._state.userBindings[mode][seq] = command;
    await this._persist();
  }

  async unbind(mode, seq) {
    if (this._state.userBindings[mode]) {
      delete this._state.userBindings[mode][seq];
      await this._persist();
    }
  }

  /**
   * All search engines (built-in + user aliases). User aliases may be stored
   * as plain 'alias → url-template' strings (options page format); they are
   * normalized to the { name, url } shape used by search-engines.js.
   * @returns {Object} alias → { name, url }
   */
  getSearchEngines() {
    const merged = Object.assign({}, DEFAULT_ENGINES);
    const custom = this._state.searchengines || {};
    for (const [alias, val] of Object.entries(custom)) {
      merged[alias] = typeof val === 'string' ? { name: alias, url: val } : val;
    }
    return merged;
  }

  getActiveProfile() {
    return this._state.activeProfile;
  }

  async setProfile(name) {
    this._state.activeProfile = name;
    await this._persist();
  }
}

module.exports = { Config, DEFAULTS, STORAGE_KEY };
