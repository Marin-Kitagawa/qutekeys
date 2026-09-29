'use strict';

const { CommandRegistry } = require('../core/registry');
const { Config } = require('../core/config');
const { getProfile } = require('../profiles/index');
const { buildCheatsheet } = require('../pages/help-data');
const { api } = require('./chrome-api');

/**
 * Help cheatsheet (registry-driven, Wave "parity fix").
 *
 * The help page is a copied (non-bundled) script, so it cannot require the
 * command modules. The background IS bundled — build a *vocabulary* registry
 * that registers every content-side command definition (handlers never run
 * here; we only need names/descriptions/args) plus the real background
 * commands, and serve the generated cheatsheet to the page.
 */

// Content command modules — each registerXxx only registers closures, so
// minimal/dummy ctx objects are safe. Import-time side effects: none (all
// DOM access is inside handler bodies).
function buildVocabularyRegistry() {
  const registry = new CommandRegistry();

  const { registerNavCommands }           = require('../commands/nav-commands');
  const { registerHintCommands }          = require('../commands/hint-commands');
  const { registerOmnibarCommands }       = require('../commands/omnibar-commands');
  const { registerFindCommands }          = require('../commands/find-commands');
  const { registerVisualCommands }        = require('../commands/visual-commands');
  const { registerYankCommands }          = require('../commands/yank-commands');
  const { registerMarksCommands }         = require('../commands/marks-commands');
  const { registerUserscriptCommands }    = require('../commands/userscript-commands');
  const { registerEditorCommands }        = require('../commands/editor-commands');
  const { registerNvimCommands }          = require('../commands/nvim-commands');
  const { registerHelpCommands }          = require('../commands/help-commands');
  const { registerPageCommands }          = require('../commands/page-commands');
  const { registerWave6Commands }         = require('../commands/wave6-commands');
  const { registerConfigCommands }        = require('../commands/config-commands');
  const { registerUtilCommands }          = require('../commands/util-commands');
  const { registerWave8Commands }         = require('../commands/wave8-commands');

  registerNavCommands(registry, {});
  registerHintCommands(registry, {});
  registerOmnibarCommands(registry, {});
  registerFindCommands(registry, {});
  registerVisualCommands(registry, {});
  registerYankCommands(registry, {});
  registerMarksCommands(registry, {});
  registerUserscriptCommands(registry, {});
  registerEditorCommands(registry, {});
  registerNvimCommands(registry, {});
  registerHelpCommands(registry, {});
  registerPageCommands(registry, {});
  registerWave6Commands(registry, {});
  registerConfigCommands(registry, null);
  registerUtilCommands(registry, {});
  registerWave8Commands(registry, {});

  // feedkeys is registered in the bootstrap (needs the live KeyHandler);
  // include it in the vocabulary so the help page documents it.
  if (!registry.get('feedkeys')) {
    registry.register({
      name: 'feedkeys',
      description: 'Feed key presses into normal mode. Usage: feedkeys <keys>',
      args: ['keys'],
      context: 'content',
      modes: ['normal'],
      handler() {},
    });
  }

  // Merge the real background commands (skip names already present —
  // CommandRegistry throws on duplicates).
  const { registerTabCommands } = require('./tabs');
  const { registerHistoryCommands } = require('./history');
  const { registerBookmarkCommands } = require('./bookmarks');
  const { registerDownloadCommands } = require('./downloads');
  const { registerSessionCommands } = require('./sessions');
  const { registerProxyCommands } = require('./proxy');
  const { registerZoomCommands } = require('./zoom');
  const { registerCaptureCommands } = require('./capture');
  const { registerMiscCommands } = require('./misc');
  const { registerPdfCommands } = require('./pdfviewer');
  const { registerQueueCommands } = require('./queue');
  const { registerContainerCommands } = require('./containers');
  const { registerLlmCommands } = require('./llm');
  const { registerKeymapCommands } = require('./keymap');
  const bg = new CommandRegistry();
  registerTabCommands(bg);
  registerHistoryCommands(bg);
  registerBookmarkCommands(bg);
  registerDownloadCommands(bg);
  registerSessionCommands(bg);
  registerProxyCommands(bg);
  registerZoomCommands(bg);
  registerCaptureCommands(bg);
  registerMiscCommands(bg);
  registerPdfCommands(bg);
  registerQueueCommands(bg);
  registerContainerCommands(bg);
  registerLlmCommands(bg);
  registerKeymapCommands(bg);
  for (const cmd of bg.all()) {
    if (!registry.get(cmd.name)) {
      registry.register(cmd);
    }
  }

  return registry;
}

let _vocabRegistry = null;
function getVocabularyRegistry() {
  if (!_vocabRegistry) _vocabRegistry = buildVocabularyRegistry();
  return _vocabRegistry;
}

function registerHelpSheetCommands(registry) {
  registry.register({
    name: 'help-cheatsheet',
    description: 'Return the full generated cheatsheet (all commands + active profile bindings)',
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
      const userBindings = {
        normal: cfg.getUserBindings('normal'),
        insert: cfg.getUserBindings('insert'),
        visual: cfg.getUserBindings('visual'),
      };

      const sheet = buildCheatsheet(vocab, profile, userBindings);
      return {
        activeProfile,
        sheet,
        totalCommands: vocab.all().length,
      };
    },
  });
}

module.exports = { registerHelpSheetCommands, buildVocabularyRegistry };
