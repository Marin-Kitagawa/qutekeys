'use strict';

/**
 * Userscript commands.
 *
 * Registers the following commands into `registry`:
 *
 *   userscript-list    — Print names of all stored userscripts to the console.
 *   userscript-remove  — Remove a userscript by name (args[0] = name).
 *   userscript-add     — Author a userscript in the embedded vim editor and
 *                        save it to the store (arg: optional name).
 *
 * DOM-safe: no document/window access at import or registration time.
 *
 * @param {import('../core/registry').CommandRegistry} registry
 * @param {import('../core/userscripts').UserscriptStore} store
 * @param {import('../content_scripts/ui/editor').VimEditor} [vimEditor]
 */
function registerUserscriptCommands(registry, store, vimEditor) {
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
  // Authors a script in the embedded vim editor (ACE overlay) starting from a
  // metadata-block template; on save the script is parsed and stored.
  registry.register({
    name: 'userscript-add',
    description: 'Author a userscript in the vim editor and save it. Usage: userscript-add [name]',
    context: 'content',
    modes: ['normal'],
    async handler(_ctx, parsed = {}) {
      if (!store || !vimEditor || typeof document === 'undefined') return;
      const defaultName = (parsed.args && parsed.args[0]) || 'my-script';
      const lines = [
        '// ==UserScript==',
        '// @name        ' + defaultName,
        '// @match       https://example.com/*',
        '// @run-at      document_idle',
        '// ==/UserScript==',
        '',
        '// Your code runs in the page world. Example:',
        '// console.log("hello from " + location.host);',
        '',
      ];

      // Synthetic editable element so VimEditor can target it; the editor
      // writes the edited text back into `ta.value`.
      const ta = document.createElement('textarea');
      ta.value = lines.join('\n');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);

      try {
        await vimEditor.open(ta);
      } finally {
        const code = ta.value || '';
        ta.remove();
        if (code.trim()) {
          await store.add(code);
          const saved = store.list().find(s => s.code === code);
          // eslint-disable-next-line no-console
          console.info('[QuteSurf] userscript saved:', saved ? saved.name : defaultName);
        }
      }
    },
  });
}

module.exports = { registerUserscriptCommands };
