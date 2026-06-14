'use strict';

const STORAGE_KEY = 'qutesurf:config';

const DEFAULTS = {
  hintcharacters: 'asdfg',
  scrollstep: 70,
  smoothscroll: true,
  findcasesensitive: false,
  defaultsearchengine: 'g',
};

const EMPTY_STATE = () => ({
  options: {},
  userBindings: { normal: {}, insert: {}, visual: {} },
  activeProfile: 'hybrid',
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

  getActiveProfile() {
    return this._state.activeProfile;
  }

  async setProfile(name) {
    this._state.activeProfile = name;
    await this._persist();
  }
}

module.exports = { Config, DEFAULTS, STORAGE_KEY };
