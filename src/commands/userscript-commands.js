'use strict';

/**
 * Userscript commands.
 *
 * Registers the following commands into `registry`:
 *
 *   userscript-list    — Print names of all stored userscripts to the console.
 *   userscript-remove  — Remove a userscript by name (args[0] = name).
 *   userscript-add     — Placeholder: authoring is handled by the options page
 *                        (Phase 23). Logs guidance to the console.
 *
 * DOM-safe: no document/window access at import or registration time.
 *
 * @param {import('../core/registry').CommandRegistry} registry
 * @param {import('../core/userscripts').UserscriptStore} store
 */
function registerUserscriptCommands(registry, store) {
  // ── userscript-list ─────────────────────────────────────────────────────────
  registry.register({
    name: 'userscript-list',
    description: 'List names of all installed userscripts',
    context: 'content',
    modes: ['normal'],
    handler() {
      const scripts = store ? store.list() : [];
      const names = scripts.map(s => s.name);
      // eslint-disable-next-line no-console
      console.info('[QuteSurf] userscripts:', names.length ? names.join(', ') : '(none)');
      return names;
    },
  });

  // ── userscript-remove ───────────────────────────────────────────────────────
  registry.register({
    name: 'userscript-remove',
    description: 'Remove a userscript by name (arg: script name)',
    context: 'content',
    modes: ['normal'],
    async handler({ args = [] } = {}) {
      if (!store) return;
      const name = args[0];
      if (!name) {
        // eslint-disable-next-line no-console
        console.warn('[QuteSurf] userscript-remove: no name provided');
        return;
      }
      await store.remove(name);
      // eslint-disable-next-line no-console
      console.info('[QuteSurf] userscript removed:', name);
    },
  });

  // ── userscript-add ──────────────────────────────────────────────────────────
  // NOTE: Full script authoring UI is deferred to Phase 23 (options page).
  // This placeholder logs guidance so the command is discoverable via omnibar.
  registry.register({
    name: 'userscript-add',
    description: 'Add a userscript (open the options page to author scripts)',
    context: 'content',
    modes: ['normal'],
    handler() {
      // eslint-disable-next-line no-console
      console.info(
        '[QuteSurf] userscript-add: Use the QuteSurf options page to add userscripts. ' +
        'Full authoring UI will be available in the Phase 23 options page.'
      );
    },
  });
}

module.exports = { registerUserscriptCommands };
