/* QuteSurf Options page script — runs on DOMContentLoaded in the browser only */
/* global chrome */

(function () {
  'use strict';

  // Guard: this script only runs in a browser extension context.
  if (typeof chrome === 'undefined' || !chrome.storage) return;

  const STORAGE_KEY = 'qutesurf:config';

  // Known defaults (mirrors config.js DEFAULTS)
  const DEFAULTS = {
    hintcharacters: 'asdfg',
    scrollstep: 70,
    smoothscroll: true,
    findcasesensitive: false,
    defaultsearchengine: 'g',
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  function showMsg(el, text, type) {
    el.textContent = text;
    el.className = 'msg show ' + type;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.className = 'msg'; }, 4000);
  }

  function loadState() {
    return chrome.storage.local.get(STORAGE_KEY).then(result => {
      const stored = result[STORAGE_KEY];
      if (stored && typeof stored === 'object') return stored;
      return { options: {}, userBindings: { normal: {}, insert: {}, visual: {} }, activeProfile: 'hybrid' };
    });
  }

  function saveState(patch) {
    return loadState().then(state => {
      const next = Object.assign({}, state, patch);
      return chrome.storage.local.set({ [STORAGE_KEY]: next });
    });
  }

  // ── Version ───────────────────────────────────────────────────────────────

  try {
    const manifest = chrome.runtime.getManifest();
    const vEl = document.getElementById('version');
    if (vEl) vEl.textContent = 'v' + manifest.version;
  } catch (_) {}

  // ── Profile section ───────────────────────────────────────────────────────

  const profileSelect = document.getElementById('profile-select');

  // List of known profiles (matches src/profiles/index.js)
  const PROFILES = ['qute', 'surfingkeys', 'hybrid'];

  PROFILES.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    profileSelect.appendChild(opt);
  });

  loadState().then(state => {
    profileSelect.value = state.activeProfile || 'hybrid';
  });

  profileSelect.addEventListener('change', () => {
    saveState({ activeProfile: profileSelect.value });
  });

  // ── Options table ─────────────────────────────────────────────────────────

  const tbody = document.getElementById('options-tbody');
  const optionsMsg = document.getElementById('options-msg');

  function renderOptionsTable(storedOptions) {
    tbody.innerHTML = '';
    Object.keys(DEFAULTS).forEach(key => {
      const current = Object.prototype.hasOwnProperty.call(storedOptions, key)
        ? storedOptions[key]
        : DEFAULTS[key];
      const tr = document.createElement('tr');
      const tdKey = document.createElement('td');
      tdKey.textContent = key;
      const tdVal = document.createElement('td');
      const input = document.createElement('input');
      input.type = typeof current === 'number' ? 'number' : 'text';
      input.value = String(current);
      input.dataset.key = key;
      input.dataset.type = typeof DEFAULTS[key];
      tdVal.appendChild(input);
      tr.appendChild(tdKey);
      tr.appendChild(tdVal);
      tbody.appendChild(tr);
    });
  }

  loadState().then(state => renderOptionsTable(state.options || {}));

  document.getElementById('save-options-btn').addEventListener('click', () => {
    const inputs = tbody.querySelectorAll('input');
    const newOptions = {};
    inputs.forEach(input => {
      const key = input.dataset.key;
      const type = input.dataset.type;
      let val = input.value;
      if (type === 'number') val = Number(val);
      else if (type === 'boolean') val = val === 'true';
      newOptions[key] = val;
    });
    loadState().then(state => {
      const next = Object.assign({}, state, { options: newOptions });
      return chrome.storage.local.set({ [STORAGE_KEY]: next });
    }).then(() => {
      showMsg(optionsMsg, 'Options saved.', 'ok');
    }).catch(err => {
      showMsg(optionsMsg, 'Error: ' + err.message, 'err');
    });
  });

  // ── JS Settings editor ────────────────────────────────────────────────────

  const jsEditor = document.getElementById('js-editor');
  const jsMsg = document.getElementById('js-msg');
  const JS_SCRIPT_KEY = 'qutesurf:js-settings';

  // Load saved script
  chrome.storage.local.get(JS_SCRIPT_KEY).then(result => {
    if (result[JS_SCRIPT_KEY]) jsEditor.value = result[JS_SCRIPT_KEY];
  });

  // ── Sandboxed evaluator ────────────────────────────────────────────────────
  // User JS is NEVER evaluated in this privileged page (which has access to
  // chrome.* and storage). Instead it runs inside pages/sandbox.html — a frame
  // declared under the manifest "sandbox" key with an opaque origin and no
  // chrome.* access. 'unsafe-eval' lives only in the sandbox CSP, so the
  // extension's main CSP can stay strict. Communication is via postMessage and
  // only structured mutation lists cross the boundary.

  const sandboxFrame = document.createElement('iframe');
  // allow-scripts gives the frame an opaque (null) origin with no access to
  // this page's chrome.* APIs, storage, or DOM. (Notably we do NOT add
  // allow-same-origin.) On Chrome the manifest "sandbox" key additionally
  // grants the sandbox CSP that permits eval inside this frame only.
  sandboxFrame.setAttribute('sandbox', 'allow-scripts');
  sandboxFrame.src = 'sandbox.html';
  sandboxFrame.style.display = 'none';
  sandboxFrame.setAttribute('aria-hidden', 'true');
  document.body.appendChild(sandboxFrame);

  let _evalSeq = 0;
  const _pendingEvals = new Map(); // id → { resolve }

  window.addEventListener('message', (event) => {
    // Only accept messages originating from our sandbox frame.
    if (event.source !== sandboxFrame.contentWindow) return;
    const data = event.data;
    if (!data || data.type !== 'qutesurf:eval-result') return;
    const pending = _pendingEvals.get(data.id);
    if (pending) {
      _pendingEvals.delete(data.id);
      pending.resolve(data.result || { ok: false, error: 'no result' });
    }
  });

  function evaluateInSandbox(code) {
    return new Promise((resolve) => {
      const id = ++_evalSeq;
      _pendingEvals.set(id, { resolve });
      // Timeout guard so a broken sandbox never hangs the UI.
      setTimeout(() => {
        if (_pendingEvals.has(id)) {
          _pendingEvals.delete(id);
          resolve({ ok: false, error: 'sandbox timeout' });
        }
      }, 5000);
      sandboxFrame.contentWindow.postMessage({ type: 'qutesurf:eval', id, code }, '*');
    });
  }

  document.getElementById('run-js-btn').addEventListener('click', () => {
    const code = jsEditor.value;

    evaluateInSandbox(code).then(evalResult => {
      if (!evalResult.ok) {
        showMsg(jsMsg, 'Script error: ' + evalResult.error, 'err');
        return;
      }

      const mutations = evalResult.mutations || { bindings: [], options: [], aliases: [] };

      // Persist the script source
      chrome.storage.local.set({ [JS_SCRIPT_KEY]: code });

      // Apply mutations to stored state
      return loadState().then(state => {
        const bindings = JSON.parse(JSON.stringify(
          state.userBindings || { normal: {}, insert: {}, visual: {} }
        ));
        const options = Object.assign({}, state.options || {});
        const searchengines = Object.assign({}, state.searchengines || {});

        mutations.bindings.forEach(({ op, mode, seq, cmd }) => {
          if (!bindings[mode]) bindings[mode] = {};
          if (op === 'bind') bindings[mode][seq] = cmd;
          else delete bindings[mode][seq];
        });
        mutations.options.forEach(({ k, v }) => { options[k] = v; });
        mutations.aliases.forEach(({ a, u }) => { searchengines[a] = u; });

        const next = Object.assign({}, state, {
          userBindings: bindings,
          options,
          searchengines,
        });
        return chrome.storage.local.set({ [STORAGE_KEY]: next });
      }).then(() => {
        showMsg(jsMsg, 'Script ran and settings saved.', 'ok');
      });
    }).catch(err => {
      showMsg(jsMsg, 'Save error: ' + (err && err.message ? err.message : err), 'err');
    });
  });

  document.getElementById('clear-js-btn').addEventListener('click', () => {
    jsEditor.value = '';
    chrome.storage.local.remove(JS_SCRIPT_KEY);
    showMsg(jsMsg, 'Script cleared.', 'ok');
  });

})();
