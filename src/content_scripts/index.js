'use strict';

// Must run before any dynamic import() so webpack fetches chunks from the extension origin.
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
  // eslint-disable-next-line no-undef, camelcase
  __webpack_public_path__ = chrome.runtime.getURL('/');
}

/**
 * QuteSurf content-script bootstrap.
 *
 * Import-safe under Jest / Node — all chrome/document/window access is guarded.
 * `init()` is only auto-invoked when a real extension context is detected.
 */

const { CommandRegistry } = require('../core/registry');
const { ModeStack }       = require('../core/modes');
const { KeyMap }          = require('../core/keymap');
const { Config }          = require('../core/config');
const { getProfile }      = require('../profiles/index');
const { ShadowHost }      = require('./ui/host');
const { Dispatcher }      = require('./dispatcher');
const { KeyHandler, keyEventToString, makeContentKeydownHandler } = require('./keyhandler');
const { parseCommandLine } = require('../core/cmdline');
const { HintsController }  = require('./hints');
const { Find }             = require('./find');
const { Visual }           = require('./visual');
const { registerAllContentCommands } = require('./commands');
const { Marks }              = require('../core/marks');
const { Statusline }         = require('./ui/statusline');
const { WhichKey }           = require('./ui/whichkey');
const { UserscriptStore }    = require('../core/userscripts');
const { injectMatching }     = require('./userscripts');
const { VimEditor }          = require('./ui/editor');
const { NvimEditor }         = require('./nvim');
const { Omnibar }            = require('./ui/omnibar');
const { PassThrough }        = require('./passthrough');
const { Macros }             = require('./macros');
const { Blocklist }          = require('../core/blocklist');
const { ScrollTarget }       = require('./scroll-target');

/**
 * Bootstrap the content-script.  Safe to call multiple times (subsequent calls
 * are no-ops after the first successful init).
 */
async function init() {
  // ── Registry (commands registered by later phases) ───────────────────────
  const registry = new CommandRegistry();

  // ── Config (load from storage if available) ───────────────────────────────
  let config = null;
  if (
    typeof chrome !== 'undefined' &&
    chrome.storage &&
    chrome.storage.local
  ) {
    config = new Config(chrome.storage.local);
    try {
      await config.load();
    } catch (_) {
      // Non-fatal — fall back to defaults
    }
  }

  // ── Mode stack ────────────────────────────────────────────────────────────
  const modes = new ModeStack('normal');

  // ── KeyMaps (one per mode, populated from profile + user overrides) ───────
  const profileName = config ? config.getActiveProfile() : 'hybrid';
  const profile = getProfile(profileName) || getProfile('hybrid');
  const userBindings = config ? config.getUserBindings('normal') : {};

  const normalKeymap = new KeyMap();

  // Apply profile bindings for normal mode
  const profileBindings = (profile && profile.bindings && profile.bindings.normal) || {};
  for (const [seq, cmd] of Object.entries(profileBindings)) {
    normalKeymap.bind(seq, cmd);
  }

  // Apply user overrides (user bindings win)
  for (const [seq, cmd] of Object.entries(userBindings)) {
    normalKeymap.bind(seq, cmd);
  }

  // ── Shadow DOM host ───────────────────────────────────────────────────────
  const host = new ShadowHost();

  // ── Statusline + WhichKey UI ──────────────────────────────────────────────
  const statusline = new Statusline({ host, modes });
  const whichKey   = new WhichKey({ host });

  // ── Messaging wrapper ─────────────────────────────────────────────────────
  const messaging = {
    sendMessage(msg) {
      return new Promise((resolve, reject) => {
        if (
          typeof chrome !== 'undefined' &&
          chrome.runtime &&
          chrome.runtime.sendMessage
        ) {
          chrome.runtime.sendMessage(msg, response => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          });
        } else {
          resolve(null);
        }
      });
    },
  };

  // ── Dispatcher ────────────────────────────────────────────────────────────
  const dispatcher = new Dispatcher(registry, messaging);

  // ── HintsController ───────────────────────────────────────────────────────
  const hintsController = new HintsController({ host, modes, dispatcher, config });

  // ── Find controller ───────────────────────────────────────────────────────
  const finder = new Find({ host, modes, config });

  // ── Visual / caret controller ─────────────────────────────────────────────
  const visual = new Visual({ host, modes });

  // ── Vim editor overlay (Phase 21) ─────────────────────────────────────────
  const vimEditor = new VimEditor({ host, modes });

  // ── Neovim native editor (Phase 22) — wraps vimEditor as ACE fallback ─────
  const nvimEditor = new NvimEditor({ vimEditor, messaging });

  const omnibar = new Omnibar({ host, modes, dispatcher, registry, config, messaging });

  // ── Marks (config-backed; only constructed when config is available) ───────
  const marks = config ? new Marks(config) : null;

  // ── Wave 6: Blocklist guard ───────────────────────────────────────────────
  const blocklist = config ? new Blocklist(config) : null;
  if (blocklist && typeof location !== 'undefined' && location.host) {
    if (blocklist.isBlocked(location.host)) {
      // Site is blocked — QuteSurf is disabled for this host; skip init.
      return;
    }
  }

  // ── Wave 6: PassThrough, Macros, ScrollTarget ─────────────────────────────
  const passThrough = new PassThrough({ modes });
  const scrollTarget = new ScrollTarget();
  // macros.onReplayKey is wired to keyHandler.handleKey after keyHandler is constructed.
  const macros = new Macros({ onReplayKey: (keyStr) => {
    if (typeof _keyHandlerRef !== 'undefined' && _keyHandlerRef) {
      _keyHandlerRef.handleKey(keyStr);
    }
  } });
  // _keyHandlerRef is set below after KeyHandler construction (forward reference via closure).
  let _keyHandlerRef = null;

  // ── Userscript store (config-backed) + inject matching scripts for current URL ──
  const userscriptStore = config ? new UserscriptStore(config) : null;
  if (userscriptStore && typeof location !== 'undefined') {
    try {
      injectMatching(location.href, userscriptStore);
    } catch (_) {
      // Non-fatal — injection failure must not break the extension
    }
  }

  // ── Register all content commands (nav, hints, …) ─────────────────────────
  registerAllContentCommands(registry, { hintsController, dispatcher, messaging, config, modes, finder, visual, marks, userscriptStore, vimEditor, nvimEditor, omnibar, passThrough, macros, blocklist, scrollTarget });

  // ── Key handler ───────────────────────────────────────────────────────────
  // eslint-disable-next-line prefer-const
  let keyHandler;
  keyHandler = new KeyHandler(normalKeymap, {
    onMatched(command, count) {
      const parsed = parseCommandLine(command);
      dispatcher.run(parsed.name, { args: parsed.args, flags: parsed.flags, count }).catch(err => {
        // eslint-disable-next-line no-console
        console.warn('[QuteSurf] command error:', err);
      });
    },
    onPending(candidates) {
      whichKey.show(candidates, seq => profileBindings[seq] || userBindings[seq]);
    },
    onCleared() {
      whichKey.hide();
      statusline.update();
    },
  });

  // Wire macros replay key reference now that keyHandler is constructed
  _keyHandlerRef = keyHandler;

  // ── Keydown listener ─────────────────────────────────────────────────────
  // Mode-aware: only drives the normal keymap in normal mode; other modes are
  // owned by their controllers' own listeners (see makeContentKeydownHandler).
  // Also feeds keys to macros recorder when recording is active.
  if (typeof document !== 'undefined') {
    const baseHandler = makeContentKeydownHandler({ modes, keyHandler });
    document.addEventListener(
      'keydown',
      (e) => {
        // Record the key to the active macro register if recording
        if (macros && macros.isRecording()) {
          const { keyEventToString: kets } = require('./keyhandler');
          const MODIFIERS = ['Control', 'Alt', 'Meta', 'Shift'];
          if (!MODIFIERS.includes(e.key)) {
            macros.recordKey(kets(e));
          }
        }
        baseHandler(e);
      },
      true /* capturing */,
    );
  }
}

// ── Auto-init when running as a real extension content script ────────────────
if (
  typeof chrome !== 'undefined' &&
  chrome.runtime &&
  chrome.runtime.id &&
  typeof document !== 'undefined'
) {
  init().catch(err => {
    // eslint-disable-next-line no-console
    console.error('[QuteSurf] init failed:', err);
  });
}

module.exports = { init };
