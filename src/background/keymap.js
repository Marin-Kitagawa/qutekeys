'use strict';

const { Config } = require('../core/config');
const { getProfile } = require('../profiles/index');
const { api } = require('./chrome-api');

/**
 * Register the `keymap-get` background command.
 *
 * The help/cheatsheet page is a copied page script (not webpack-bundled), so it
 * cannot `require()` the profile modules. The profile keymaps live ONLY in
 * `src/profiles/*.js` — storage holds just the active-profile NAME and the user
 * overrides. So the page asks the background (which IS bundled and can read the
 * profiles) for the resolved bindings of the active profile + user overrides.
 *
 * @param {object} registry - CommandRegistry
 */
function registerKeymapCommands(registry) {
  registry.register({
    name: 'keymap-get',
    description: 'Return the active profile bindings and user overrides (for the help page)',
    args: [],
    context: 'background',
    modes: ['normal'],
    handler: async () => {
      const a = api();
      const storage = (a && a.storage && a.storage.local) || { get: async () => ({}), set: async () => {} };
      const cfg = new Config(storage);
      try { await cfg.load(); } catch (_) { /* fall back to defaults */ }

      const activeProfile = cfg.getActiveProfile();
      const profile = getProfile(activeProfile) || getProfile('hybrid');

      return {
        activeProfile,
        profileBindings: (profile && profile.bindings) || {},
        userBindings: {
          normal: cfg.getUserBindings('normal'),
          insert: cfg.getUserBindings('insert'),
          visual: cfg.getUserBindings('visual'),
        },
      };
    },
  });
}

module.exports = { registerKeymapCommands };
