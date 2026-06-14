/* QuteSurf settings sandbox — runs user JS in an isolated, chrome-less frame.

   This file is copied as-is into dist/pages/. It is NOT bundled (no require()).
   The evaluation logic mirrors src/core/js-settings.js (createSettingsApi /
   evaluateSettings); it is kept self-contained on purpose so the sandbox frame
   has no dependency on the extension bundle.

   Threat model: the user-authored settings script runs HERE, where:
     - the origin is opaque/null (manifest "sandbox" key),
     - there is no access to chrome.*, storage, cookies, or the options DOM,
     - 'unsafe-eval' is scoped to this frame only (sandbox CSP).
   The privileged options page receives only a structured list of mutations.
*/

(function () {
  'use strict';

  // Build the settings API whose methods record mutations into `target`.
  function createSettingsApi(target) {
    return {
      mapkey: function (seq, annotationOrCmd, maybeCmd) {
        var cmd = (maybeCmd !== undefined) ? maybeCmd : annotationOrCmd;
        target.bind('normal', seq, cmd);
      },
      imapkey: function (seq, cmd) { target.bind('insert', seq, cmd); },
      vmapkey: function (seq, cmd) { target.bind('visual', seq, cmd); },
      map: function () {},
      unmap: function (seq, mode) { target.unbind(mode || 'normal', seq); },
      iunmap: function (seq) { target.unbind('insert', seq); },
      vunmap: function (seq) { target.unbind('visual', seq); },
      unmapAllExcept: function () {},
      settings: function (obj) {
        if (obj && typeof obj === 'object') {
          Object.keys(obj).forEach(function (k) { target.setOption(k, obj[k]); });
        }
      },
      aliases: function (alias, urlTemplate) { target.addAlias(alias, urlTemplate); },
      Hints: {
        setCharacters: function (chars) { target.setOption('hintcharacters', chars); },
        style: function () {},
        characters: '',
      },
      Visual: { style: function () {} },
    };
  }

  function evaluateSettings(code) {
    var mutations = { bindings: [], options: [], aliases: [] };
    var target = {
      bind: function (mode, seq, cmd) { mutations.bindings.push({ op: 'bind', mode: mode, seq: seq, cmd: cmd }); },
      unbind: function (mode, seq) { mutations.bindings.push({ op: 'unbind', mode: mode, seq: seq }); },
      setOption: function (k, v) { mutations.options.push({ k: k, v: v }); },
      addAlias: function (a, u) { mutations.aliases.push({ a: a, u: u }); },
    };
    var api = createSettingsApi(target);
    var keys = Object.keys(api);
    var values = keys.map(function (k) { return api[k]; });
    try {
      // new Function(...paramNames, body). 'unsafe-eval' for this is granted
      // only by the sandbox CSP, scoped to this opaque-origin frame.
      // eslint-disable-next-line no-new-func
      var fn = Function.apply(null, keys.concat([code]));
      fn.apply(null, values);
      return { ok: true, mutations: mutations };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.type !== 'qutesurf:eval') return;
    var result = evaluateSettings(String(data.code || ''));
    // Reply to the parent (options page). Use '*' because a sandboxed frame has
    // an opaque origin; the payload contains no secrets, only mutations.
    var reply = { type: 'qutesurf:eval-result', id: data.id, result: result };
    if (event.source && event.source.postMessage) {
      event.source.postMessage(reply, '*');
    } else if (window.parent) {
      window.parent.postMessage(reply, '*');
    }
  });

  // Signal readiness to the parent.
  if (window.parent) {
    window.parent.postMessage({ type: 'qutesurf:sandbox-ready' }, '*');
  }
})();
