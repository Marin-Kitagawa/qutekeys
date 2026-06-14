'use strict';

/**
 * Pure data module for the QuteSurf help cheatsheet.
 * No DOM, no chrome API — fully testable under Jest/Node.
 *
 * Exports:
 *   categorize(commandName) → category string
 *   buildCheatsheet(registry, profile, userBindings) → [{category, rows:[{keys,command,description,mode}]}]
 */

// ── Category order ────────────────────────────────────────────────────────────
const CATEGORY_ORDER = [
  'Navigation',
  'Hints',
  'Tabs',
  'Omnibar',
  'Find',
  'Clipboard',
  'Visual',
  'Marks',
  'Sessions',
  'Proxy',
  'Userscripts',
  'Editor',
  'Settings',
  'Other',
];

/**
 * Map a command name to a category label based on its prefix/topic.
 * @param {string} name
 * @returns {string}
 */
function categorize(name) {
  if (/^tab-/.test(name))                                       return 'Tabs';
  if (/^session-/.test(name))                                   return 'Sessions';
  if (
    /^scroll/.test(name) ||
    /^back$/.test(name) ||
    /^forward$/.test(name) ||
    /^reload/.test(name) ||
    /^stop$/.test(name) ||
    /^url-/.test(name) ||
    /^home$/.test(name)
  )                                                              return 'Navigation';
  if (/^hint/.test(name))                                       return 'Hints';
  if (/^omnibar/.test(name) || /^cmdline$/.test(name))         return 'Omnibar';
  if (/^find/.test(name))                                       return 'Find';
  if (/^yank/.test(name) || /^paste/.test(name))               return 'Clipboard';
  if (
    /^caret/.test(name) ||
    /^visual/.test(name) ||
    /^selection/.test(name)
  )                                                              return 'Visual';
  if (/^mark/.test(name) || /^quickmark/.test(name))           return 'Marks';
  if (/^proxy/.test(name))                                      return 'Proxy';
  if (/^userscript/.test(name))                                 return 'Userscripts';
  if (/^edit-with/.test(name))                                  return 'Editor';
  if (
    /^set$/.test(name) ||
    /^bind$/.test(name) ||
    /^unbind$/.test(name) ||
    /^profile$/.test(name) ||
    /^help$/.test(name) ||
    /^mode-/.test(name)
  )                                                              return 'Settings';
  return 'Other';
}

/**
 * Build the cheatsheet data structure.
 *
 * @param {import('../core/registry').CommandRegistry} registry
 * @param {{ bindings: { normal: Object, insert: Object, visual: Object } }} profile
 * @param {{ normal?: Object, insert?: Object, visual?: Object }} userBindings
 * @returns {Array<{ category: string, rows: Array<{keys:string, command:string, description:string, mode:string}> }>}
 */
function buildCheatsheet(registry, profile, userBindings) {
  const MODES = ['normal', 'insert', 'visual'];

  // Build map: commandName → { keysSet: Set<string>, mode: string, description: string }
  // We track multiple keys per command; last assigned mode wins for display.
  const commandMap = new Map(); // commandName → { keys: Set<string>, mode: string, description: string }

  function ensureCommand(cmdName, description) {
    if (!commandMap.has(cmdName)) {
      commandMap.set(cmdName, { keys: new Set(), mode: 'normal', description: description || '' });
    } else if (description) {
      // fill description if we now know it
      if (!commandMap.get(cmdName).description) {
        commandMap.get(cmdName).description = description;
      }
    }
    return commandMap.get(cmdName);
  }

  // First, seed all registry commands (so unbound ones appear)
  for (const cmd of registry.all()) {
    ensureCommand(cmd.name, cmd.description || '');
  }

  // Process profile bindings then user bindings (user wins on same key)
  // We collect all bindings into a flat list ordered: profile first, user second.
  // For each mode, build merged binding map (user overrides profile for same seq).
  for (const mode of MODES) {
    const profileModeBindings = (profile && profile.bindings && profile.bindings[mode]) || {};
    const userModeBindings    = (userBindings && userBindings[mode]) || {};

    // Merged: profile base, user overrides
    // We process profile first, then user; if a seq already has a command
    // from profile, the user override replaces it.
    const merged = Object.assign({}, profileModeBindings, userModeBindings);

    for (const [seq, cmdString] of Object.entries(merged)) {
      // cmdString may be "tab-close" or "scroll-down 5" — first token is the command name
      const cmdName = cmdString.trim().split(/\s+/)[0];
      const entry = ensureCommand(cmdName, '');
      entry.keys.add(seq);
      entry.mode = mode; // record last-seen mode (informational)
    }
  }

  // Build rows grouped by category
  const groups = new Map(); // category → rows[]

  for (const [cmdName, entry] of commandMap.entries()) {
    const category = categorize(cmdName);
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category).push({
      keys: [...entry.keys].join(' '),
      command: cmdName,
      description: entry.description,
      mode: entry.mode,
    });
  }

  // Sort rows within each group by command name
  for (const rows of groups.values()) {
    rows.sort((a, b) => a.command.localeCompare(b.command));
  }

  // Return groups in CATEGORY_ORDER, then any remaining
  const result = [];
  for (const cat of CATEGORY_ORDER) {
    if (groups.has(cat)) {
      result.push({ category: cat, rows: groups.get(cat) });
    }
  }
  // Remaining categories not in the fixed order
  for (const [cat, rows] of groups.entries()) {
    if (!CATEGORY_ORDER.includes(cat)) {
      result.push({ category: cat, rows });
    }
  }

  return result;
}

module.exports = { categorize, buildCheatsheet };
