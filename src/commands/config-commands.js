'use strict';

/**
 * Coerce a string value to boolean or number when unambiguous.
 * Plain strings (like 'qwerty') are returned as-is.
 */
function coerce(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  const n = Number(value);
  if (!Number.isNaN(n) && value.trim() !== '') return n;
  return value;
}

/**
 * Register :set, :bind, :unbind, :profile commands into the given registry.
 * @param {import('../core/registry').CommandRegistry} registry
 * @param {import('../core/config').Config} cfg
 */
function registerConfigCommands(registry, cfg) {
  registry.register({
    name: 'set',
    description: 'Set a configuration option. Usage: set <key> <value>',
    args: ['key', 'value'],
    context: 'content',
    modes: ['normal'],
    async handler(ctx, parsed) {
      const config = (ctx && ctx.cfg) || cfg;
      const [key, value] = parsed.args;
      await config.set(key, coerce(value));
    },
  });

  registry.register({
    name: 'bind',
    description: 'Add a key binding for a mode. Usage: bind <mode> <seq> <command...>',
    args: ['mode', 'seq', 'command'],
    context: 'content',
    modes: ['normal'],
    async handler(ctx, parsed) {
      const config = (ctx && ctx.cfg) || cfg;
      const [mode, seq, ...commandParts] = parsed.args;
      await config.bind(mode, seq, commandParts.join(' '));
    },
  });

  registry.register({
    name: 'unbind',
    description: 'Remove a key binding for a mode. Usage: unbind <mode> <seq>',
    args: ['mode', 'seq'],
    context: 'content',
    modes: ['normal'],
    async handler(ctx, parsed) {
      const config = (ctx && ctx.cfg) || cfg;
      const [mode, seq] = parsed.args;
      await config.unbind(mode, seq);
    },
  });

  registry.register({
    name: 'profile',
    description: 'Switch the active key-binding profile. Usage: profile <name>',
    args: ['name'],
    context: 'content',
    modes: ['normal'],
    async handler(ctx, parsed) {
      const config = (ctx && ctx.cfg) || cfg;
      const [name] = parsed.args;
      await config.setProfile(name);
    },
  });
}

module.exports = { registerConfigCommands };
