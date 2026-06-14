'use strict';

const qute        = require('./qute');
const surfingkeys  = require('./surfingkeys');
const hybrid      = require('./hybrid');

const PROFILES = { qute, surfingkeys, hybrid };

/**
 * CANONICAL_COMMANDS — the closed vocabulary of command names that profiles
 * are permitted to reference.  Later phases register handlers for these names;
 * having them declared here keeps the vocabulary single-source-of-truth and
 * lets the profile test validate every binding at load time.
 */
const CANONICAL_COMMANDS = [
  // Navigation
  'scroll-down', 'scroll-up', 'scroll-left', 'scroll-right',
  'scroll-halfpage-down', 'scroll-halfpage-up',
  'scroll-page-down', 'scroll-page-up',
  'scroll-to-top', 'scroll-to-bottom', 'scroll-to-perc',
  'back', 'forward', 'reload', 'reload-hard', 'stop',
  'url-up', 'url-root', 'home',

  // Hints (Wave 1)
  'hint', 'hint-newtab', 'hint-yank', 'hint-hover', 'hint-input',
  'hint-download', 'hint-images', 'hint-multi', 'hint-text',

  // Hints (Wave 2)
  'hint-newtab-bg', 'hint-newtab-fg', 'hint-rapid', 'hint-images-tab',
  'hint-fill', 'hint-input-first', 'hint-input-layer',
  'hint-yank-multi', 'hint-yank-column', 'hint-yank-pre', 'hint-yank-input',
  'hint-click-media', 'hint-mouseover', 'hint-mouseout',
  'hint-regional', 'hint-detect-links',

  // Tabs
  'tab-new', 'tab-close', 'tab-clone', 'tab-next', 'tab-prev',
  'tab-first', 'tab-last', 'tab-goto', 'tab-pin', 'tab-mute',
  'tab-move', 'tab-undo', 'tab-only', 'tab-detach',
  'tab-list', 'tab-activate',
  'tab-last-used', 'tab-history-back', 'tab-history-forward',
  'tab-first-activated', 'tab-last-activated',
  'tab-close-left', 'tab-close-right', 'tab-close-left-all', 'tab-close-right-all',
  'tab-close-audible', 'tab-group', 'tab-gather',
  'window-new', 'window-new-private', 'tab-new-background',

  // Omnibar
  'omnibar-open', 'omnibar-open-newtab', 'omnibar-bookmarks',
  'omnibar-history', 'omnibar-tabs', 'omnibar-commands',
  'omnibar-marks', 'cmdline',

  // Find
  'find', 'find-next', 'find-prev',

  // Yank / clipboard
  'yank-url', 'yank-title', 'yank-mdlink', 'yank-selection',
  'yank-anchor', 'paste-and-go', 'paste-and-go-newtab',
  'yank-host', 'yank-domain', 'yank-pretty-url', 'yank-source',
  'yank-form-json', 'yank-form-post', 'form-fill', 'paste-html',
  'settings-copy', 'settings-restore', 'yank-all-tabs',

  // Bookmarks
  'bookmark-search', 'bookmark-add', 'bookmark-remove',

  // Visual / caret
  'caret-mode', 'visual-mode', 'selection-toggle',
  'visual-select-element', 'visual-restore', 'search-word',

  // Marks
  'mark-set', 'mark-jump',
  'quickmark-save', 'quickmark-open', 'quickmark-open-newtab',

  // Sessions
  'session-save', 'session-load', 'session-list', 'session-delete',

  // Proxy
  'proxy-set', 'proxy-clear', 'proxy-toggle-host',

  // Userscripts
  'userscript-add', 'userscript-list', 'userscript-remove',

  // Editor
  'edit-with-vim', 'edit-with-nvim',

  // Modes / help
  'mode-insert', 'mode-normal', 'mode-passthrough', 'help',
];

/**
 * Return the profile object for the given name, or null if not found.
 * @param {string} name
 * @returns {{ name: string, bindings: object } | null}
 */
function getProfile(name) {
  return PROFILES[name] || null;
}

/**
 * Return an array of all registered profile names.
 * @returns {string[]}
 */
function listProfiles() {
  return Object.keys(PROFILES);
}

module.exports = { getProfile, listProfiles, CANONICAL_COMMANDS, PROFILES };
