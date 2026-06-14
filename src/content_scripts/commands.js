'use strict';

/**
 * Content-command aggregator.
 *
 * Single integration point that registers ALL content commands into a
 * CommandRegistry.  Future phases add their own registerXxxCommands() call
 * here — nothing else in the codebase needs to change.
 *
 * Safe to require under Jest/Node: no DOM globals are accessed at import time.
 *
 * @param {import('../core/registry').CommandRegistry} registry
 * @param {{ hintsController?: object, dispatcher?: object, config?: object, modes?: object, omnibar?: object }} ctx
 */

const { registerNavCommands }         = require('../commands/nav-commands');
const { registerHintCommands }        = require('../commands/hint-commands');
const { registerOmnibarCommands }     = require('../commands/omnibar-commands');
const { registerFindCommands }        = require('../commands/find-commands');
const { registerVisualCommands }      = require('../commands/visual-commands');
const { registerYankCommands }        = require('../commands/yank-commands');
const { registerMarksCommands }       = require('../commands/marks-commands');
const { registerUserscriptCommands }  = require('../commands/userscript-commands');
const { registerEditorCommands }      = require('../commands/editor-commands');
const { registerNvimCommands }        = require('../commands/nvim-commands');
const { registerHelpCommands }        = require('../commands/help-commands');
const { registerPageCommands }        = require('../commands/page-commands');

function registerAllContentCommands(registry, ctx = {}) {
  // Phase 20: per-domain userscripts (store is optional)
  if (ctx.userscriptStore) {
    registerUserscriptCommands(registry, ctx.userscriptStore);
  }
  registerNavCommands(registry);

  if (ctx.hintsController) {
    registerHintCommands(registry, ctx.hintsController);
  }

  if (ctx.omnibar) {
    registerOmnibarCommands(registry, ctx.omnibar);
  }

  if (ctx.finder) {
    registerFindCommands(registry, ctx.finder);
  }

  if (ctx.visual) {
    registerVisualCommands(registry, ctx.visual);
  }

  // Phase 15: clipboard yank and paste-and-go commands.
  // Always registered — Clipboard helper guards all DOM access internally.
  registerYankCommands(registry, { dispatcher: ctx.dispatcher, messaging: ctx.messaging });

  // Phase 16: marks and quickmarks (config-backed).
  if (ctx.marks) {
    registerMarksCommands(registry, { marks: ctx.marks, dispatcher: ctx.dispatcher, messaging: ctx.messaging });
  }

  // Phase 21: embedded ACE Vim editor for input fields.
  if (ctx.vimEditor) {
    registerEditorCommands(registry, { vimEditor: ctx.vimEditor });
  }

  // Phase 22: Neovim native messaging integration with ACE fallback.
  if (ctx.nvimEditor) {
    registerNvimCommands(registry, { nvimEditor: ctx.nvimEditor });
  }

  // Phase 24: Help cheatsheet command (always registered; guard inside).
  if (!registry.get('help')) {
    registerHelpCommands(registry, { messaging: ctx.messaging });
  }

  // Wave 5: Page/browser feature commands (fullscreen, print, navigate, zoom,
  // reload variants, translate, TTS, download-image).
  registerPageCommands(registry, ctx);
}

module.exports = { registerAllContentCommands };
