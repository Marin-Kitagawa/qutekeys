'use strict';

const { parseCommandLine } = require('../core/cmdline');

/**
 * Dispatcher — routes commands to either the content-script handler or the
 * background service worker via messaging.
 *
 * @param {object} registry  - CommandRegistry-compatible object with .get(name)
 * @param {object} messaging - { sendMessage(msg): Promise } — injected so tests
 *                             can stub it without chrome APIs.
 */
class Dispatcher {
  constructor(registry, messaging) {
    this._registry = registry;
    this._messaging = messaging;
  }

  /**
   * Run a named command with pre-parsed arguments.
   *
   * @param {string} name
   * @param {{ count?: number|null, args?: string[], flags?: object }} parsed
   */
  async run(name, parsed) {
    const args  = parsed.args  || [];
    const flags = parsed.flags || {};
    const count = parsed.count != null ? parsed.count : null;

    const cmd = this._registry.get(name);

    // A command registered on the content side with a handler runs locally.
    if (cmd && cmd.context === 'content' && typeof cmd.handler === 'function') {
      const ctx = { count };
      await cmd.handler(ctx, { args, flags, count });
      return;
    }

    // Otherwise it is a background command. Background commands (tab-*, history-*,
    // session-*, proxy-*, …) live ONLY in the background registry, so the content
    // registry returns null for them — forward to the service worker, which
    // validates and rejects genuinely unknown names.
    if (!this._messaging) {
      // eslint-disable-next-line no-console
      console.warn(`[Dispatcher] no messaging channel to dispatch: ${name}`);
      return;
    }
    const res = await this._messaging.sendMessage({ type: 'command', name, args, flags, count });
    if (res && res.ok === false) {
      // eslint-disable-next-line no-console
      console.warn(`[Dispatcher] background command failed: ${name}: ${res.error}`);
    }
  }

  /**
   * Parse a raw command string (e.g. 'omnibar-open https://example.com') and
   * dispatch it.
   *
   * @param {string} cmdString
   */
  async runString(cmdString) {
    const parsed = parseCommandLine(cmdString);
    await this.run(parsed.name, { args: parsed.args, flags: parsed.flags });
  }
}

module.exports = { Dispatcher };
