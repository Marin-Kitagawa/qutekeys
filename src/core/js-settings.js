'use strict';

/**
 * js-settings.js — JS Settings API for QuteSurf
 *
 * createSettingsApi(target) returns an API object whose methods delegate to
 * the provided target (which holds bindings/options/aliases).
 *
 * evaluateSettings(code, target) runs user-supplied JS with the API in scope.
 * Uses new Function(...keys, code) so it works in Node/Jest and in the browser.
 *
 * NOTE (CSP/sandbox): Running user JS via new Function in an extension page
 * requires that the extension's CSP allows 'unsafe-eval' (or that the
 * evaluation is done inside a sandboxed iframe/worker). In production the
 * settings evaluator should run in a sandboxed page or a Worker so that the
 * main extension page does not need 'unsafe-eval'. The evaluator itself is
 * correct and fully tested independently of that concern.
 */

/**
 * Build the settings API object whose methods write through to `target`.
 *
 * @param {{ bind, unbind, setOption, addAlias }} target
 * @returns {object} API suitable for spreading into a new Function call
 */
function createSettingsApi(target) {
  return {
    /**
     * mapkey(seq, annotation, cmd) — SurfingKeys 3-arg form.
     * mapkey(seq, cmd)             — 2-arg shorthand.
     * Binds in NORMAL mode.
     */
    mapkey(seq, annotationOrCmd, maybeCmd) {
      const cmd = (maybeCmd !== undefined) ? maybeCmd : annotationOrCmd;
      target.bind('normal', seq, cmd);
    },

    /** Insert-mode binding. */
    imapkey(seq, cmd) {
      target.bind('insert', seq, cmd);
    },

    /** Visual-mode binding. */
    vmapkey(seq, cmd) {
      target.bind('visual', seq, cmd);
    },

    /**
     * map(newKey, oldKey) — remap; kept as no-op-safe because resolving the
     * old command would require a fully populated keymap that isn't available
     * here. Real-world scripts that call map() won't crash.
     */
    map(/* newKey, oldKey */) {},

    /**
     * unmap(seq, mode='normal') — remove a binding.
     */
    unmap(seq, mode) {
      target.unbind(mode || 'normal', seq);
    },

    /** Remove an insert-mode binding. */
    iunmap(seq) {
      target.unbind('insert', seq);
    },

    /** Remove a visual-mode binding. */
    vunmap(seq) {
      target.unbind('visual', seq);
    },

    /**
     * unmapAllExcept(seqs, mode) — no-op-safe stub. Real scripts call this to
     * strip default bindings; we don't track defaults here, so ignore it.
     */
    unmapAllExcept(/* seqs, mode */) {},

    /**
     * settings(obj) — bulk option setter.
     * e.g. settings({ hintcharacters: 'qwerty', smoothscroll: false });
     */
    settings(obj) {
      if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(k => target.setOption(k, obj[k]));
      }
    },

    /**
     * aliases(alias, urlTemplate) — add a search engine alias.
     * e.g. aliases('gh', 'https://github.com/search?q=%s');
     */
    aliases(alias, urlTemplate) {
      target.addAlias(alias, urlTemplate);
    },

    /**
     * Hints — SurfingKeys-compatible stub. setCharacters delegates to
     * setOption so scripts that set hint chars this way still work.
     */
    Hints: {
      setCharacters(chars) { target.setOption('hintcharacters', chars); },
      style(/* css, type */) {},
      characters: '',
    },

    /**
     * Visual — SurfingKeys-compatible stub.
     */
    Visual: {
      style(/* element, css */) {},
    },
  };
}

/**
 * Run `code` with all API names in scope. Delegates to createSettingsApi(target).
 *
 * @param {string} code   User JS source code
 * @param {object} target Target object (see createSettingsApi)
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function evaluateSettings(code, target) {
  const api = createSettingsApi(target);
  const keys = Object.keys(api);
  const values = keys.map(k => api[k]);
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, code);
    fn(...values);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

module.exports = { createSettingsApi, evaluateSettings };
