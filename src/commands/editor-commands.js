'use strict';

/**
 * editor-commands.js — Command registrations for the embedded ACE Vim editor.
 *
 * All DOM access is confined inside handler bodies — safe to require under
 * Jest/Node without any browser environment.
 *
 * @param {import('../core/registry').CommandRegistry} registry
 * @param {{ vimEditor: import('../content_scripts/ui/editor').VimEditor }} ctx
 */
function registerEditorCommands(registry, ctx) {
  registry.register({
    name: 'edit-with-vim',
    context: 'content',
    modes: ['insert', 'normal'],
    description: 'Open the focused input / textarea / contenteditable in an embedded Vim editor',
    async handler() {
      if (typeof document === 'undefined') return;
      const activeEl = document.activeElement;
      if (!activeEl) return;

      // Only open on editable targets
      const tag = activeEl.tagName ? activeEl.tagName.toLowerCase() : '';
      const isEditable =
        tag === 'textarea' ||
        tag === 'input' ||
        activeEl.isContentEditable ||
        activeEl.getAttribute('contenteditable') === 'true';

      if (!isEditable) return;

      if (ctx && ctx.vimEditor) {
        ctx.vimEditor.open(activeEl);
      }
    },
  });
}

module.exports = { registerEditorCommands };
