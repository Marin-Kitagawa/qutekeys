'use strict';

/**
 * Register find-mode commands into the given CommandRegistry.
 *
 * @param {import('../core/registry').CommandRegistry} registry
 * @param {import('../content_scripts/find').Find} finder
 */
function registerFindCommands(registry, finder) {
  registry.register({
    name: 'find',
    description: 'Open the find bar and search forward',
    context: 'content',
    modes: ['normal'],
    handler(_ctx, _parsed) {
      finder.start({ backwards: false });
    },
  });

  registry.register({
    name: 'find-next',
    description: 'Jump to the next search match',
    context: 'content',
    modes: ['normal'],
    handler(_ctx, _parsed) {
      finder.next();
    },
  });

  registry.register({
    name: 'find-prev',
    description: 'Jump to the previous search match',
    context: 'content',
    modes: ['normal'],
    handler(_ctx, _parsed) {
      finder.prev();
    },
  });
}

module.exports = { registerFindCommands };
