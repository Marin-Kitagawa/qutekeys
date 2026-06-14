'use strict';

/**
 * registerOmnibarCommands — registers omnibar trigger commands into the
 * content CommandRegistry.
 *
 * @param {import('../core/registry').CommandRegistry} registry
 * @param {import('../content_scripts/ui/omnibar').Omnibar} omnibar
 */
function registerOmnibarCommands(registry, omnibar) {
  const entries = [
    { name: 'omnibar-open',         source: 'open',        description: 'Open omnibar (URL / history / bookmarks)' },
    { name: 'omnibar-open-newtab',  source: 'open-newtab', description: 'Open omnibar — open result in new tab' },
    { name: 'omnibar-bookmarks',    source: 'bookmarks',   description: 'Search bookmarks in omnibar' },
    { name: 'omnibar-history',      source: 'history',     description: 'Search history in omnibar' },
    { name: 'omnibar-tabs',         source: 'tabs',        description: 'Switch tabs via omnibar' },
    { name: 'omnibar-commands',     source: 'commands',    description: 'Run a command via omnibar' },
    { name: 'omnibar-marks',        source: 'marks',       description: 'Jump to a mark via omnibar' },
    { name: 'cmdline',              source: 'commands',    description: 'Open command palette (:)' },
  ];

  for (const { name, source, description } of entries) {
    registry.register({
      name,
      description,
      args: [],
      context: 'content',
      modes: ['normal'],
      handler: (_ctx, _parsed) => {
        omnibar.open(source);
      },
    });
  }
}

module.exports = { registerOmnibarCommands };
