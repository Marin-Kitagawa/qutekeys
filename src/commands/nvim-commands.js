'use strict';

/**
 * nvim-commands.js — Command registration for Neovim native editing.
 *
 * Registers the `edit-with-nvim` command which attempts to open the active
 * editable element in Neovim via native messaging, falling back to ACE.
 *
 * All DOM access is confined inside the handler body — safe to require under
 * Jest/Node without any browser environment.
 *
 * @param {import('../core/registry').CommandRegistry} registry
 * @param {{ nvimEditor: import('../content_scripts/nvim').NvimEditor }} ctx
 */
function registerNvimCommands(registry, ctx) {
  registry.register({
    name: 'edit-with-nvim',
    context: 'content',
    modes: ['insert', 'normal'],
    description: 'Open the focused input / textarea / contenteditable in Neovim (falls back to ACE)',
    async handler() {
      if (typeof document === 'undefined') return;
      const activeEl = document.activeElement;
      if (!activeEl) return;

      const tag = activeEl.tagName ? activeEl.tagName.toLowerCase() : '';
      const isEditable =
        tag === 'textarea' ||
        tag === 'input' ||
        activeEl.isContentEditable ||
        activeEl.getAttribute('contenteditable') === 'true';

      if (!isEditable) return;

      if (ctx && ctx.nvimEditor) {
        await ctx.nvimEditor.open(activeEl);
      }
    },
  });
}

module.exports = { registerNvimCommands };
