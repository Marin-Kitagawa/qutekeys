'use strict';

/**
 * Register visual / caret mode commands into the given CommandRegistry.
 *
 * Motion handling (h/j/k/l/w/b/e/0/$,y/o/p/V/star/f/F/semicolon/comma/Enter/G/gg/zt/zz/zb
 * and sentence+paragraph motions) is done by an in-controller keydown listener
 * installed when entering caret or visual mode, so we do NOT register individual
 * motion command names here (that would pollute the canonical command vocabulary
 * with caret-move-* names that no other phase references).
 *
 * Normal-mode entry commands registered here:
 *   caret-mode          — enter caret mode
 *   visual-mode         — enter visual mode
 *   selection-toggle    — toggle move/extend behavior
 *   yank-selection      — copy selection + exit
 *   visual-select-element — enter caret mode and select the element under caret (SK zv)
 *   visual-restore      — restore last visual selection / enter caret mode (SK V)
 *   search-word         — search the word under the cursor (SK/qute *)
 *
 * @param {import('../core/registry').CommandRegistry} registry
 * @param {import('../content_scripts/visual').Visual} visual
 */
function registerVisualCommands(registry, visual) {
  registry.register({
    name: 'caret-mode',
    description: 'Enter caret mode — navigate with a collapsed text cursor',
    context: 'content',
    modes: ['normal'],
    handler() {
      visual.enterCaret();
    },
  });

  registry.register({
    name: 'visual-mode',
    description: 'Enter visual mode — extend text selection with vi motions',
    context: 'content',
    modes: ['normal', 'caret'],
    handler() {
      visual.enterVisual();
    },
  });

  registry.register({
    name: 'selection-toggle',
    description: 'Toggle between caret (move) and visual (extend) selection behavior',
    context: 'content',
    modes: ['caret', 'visual'],
    handler() {
      visual.toggleSelection();
    },
  });

  // Register yank-selection only if it has not already been registered.
  // Phase 15 (clipboard) may also register this command; the first registration
  // wins and subsequent phases must skip it to avoid a duplicate-registration crash.
  if (!registry.get('yank-selection')) {
    registry.register({
      name: 'yank-selection',
      description: 'Copy the current text selection to the clipboard and leave visual mode',
      context: 'content',
      modes: ['caret', 'visual'],
      handler() {
        visual.yankSelection();
      },
    });
  }

  registry.register({
    name: 'visual-select-element',
    description: 'Enter caret mode and select the element under the current caret/focus (SK zv)',
    context: 'content',
    modes: ['normal'],
    handler() {
      visual.selectElement();
    },
  });

  registry.register({
    name: 'visual-restore',
    description: 'Restore last visual selection or enter caret mode (SK V)',
    context: 'content',
    modes: ['normal'],
    handler() {
      visual.restoreVisual();
    },
  });

  registry.register({
    name: 'search-word',
    description: 'Search for the word under the cursor using window.find',
    context: 'content',
    modes: ['normal'],
    handler() {
      // Enter caret mode briefly to find word, then search
      if (typeof window !== 'undefined') {
        const sel = window.getSelection ? window.getSelection() : null;
        const { wordAt } = require('../content_scripts/visual');
        let word = '';
        if (sel && !sel.isCollapsed) {
          word = sel.toString().trim();
        } else if (sel && sel.focusNode && sel.focusNode.nodeType === 3) {
          word = wordAt(sel.focusNode.textContent || '', sel.focusOffset);
        }
        if (word && typeof window.find === 'function') {
          window.find(word, false, false, true, true, false, false);
        }
      }
    },
  });
}

module.exports = { registerVisualCommands };
