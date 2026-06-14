/* QuteSurf Options page script — runs on DOMContentLoaded in the browser only */
/* global chrome */

(function () {
  'use strict';

  // Guard: this script only runs in a browser extension context.
  if (typeof chrome === 'undefined' || !chrome.storage) return;

  const STORAGE_KEY = 'qutesurf:config';

  // Known defaults (mirrors config.js DEFAULTS — theme included)
  const DEFAULTS = {
    hintcharacters: 'asdfg',
    scrollstep: 70,
    smoothscroll: true,
    findcasesensitive: false,
    defaultsearchengine: 'g',
    theme: 'aurora',
  };

  // Human descriptions for each :set option
  const OPTION_DESCS = {
    hintcharacters:      'Characters used when generating hint labels',
    scrollstep:          'Pixels scrolled per arrow-key or scroll step',
    smoothscroll:        'Animate scroll movements',
    findcasesensitive:   'Make in-page find case-sensitive',
    defaultsearchengine: 'Default search engine shorthand (e.g. "g" for Google)',
    theme:               'Visual theme (also set via Appearance above)',
  };

  // Inline theme data — mirrors themes.js (options.js is not webpack-bundled)
  // Full token set used to render true mini-previews in theme cards.
  const THEMES = [
    {
      key:     'aurora',
      label:   'Aurora',
      panelBg: 'rgba(20,32,40,.80)',
      blur:    'blur(18px) saturate(1.5)',
      border:  'rgba(180,255,238,.16)',
      text:    '#eafff8',
      textMuted: '#8fb3a8',
      accent:  '#5ee7c2',
      accentFg:'#06241c',
      rowSelBg:'rgba(94,231,194,.18)',
      hintBg:  'rgba(60,200,168,.22)',
      hintFg:  '#d7fff3',
      hintBdr: 'rgba(150,255,225,.55)',
    },
    {
      key:     'obsidian',
      label:   'Obsidian',
      panelBg: 'rgba(14,14,16,.88)',
      blur:    'blur(24px) saturate(1.2)',
      border:  'rgba(255,255,255,.10)',
      text:    '#f3f1ee',
      textMuted: '#7c7a76',
      accent:  '#ff5a3c',
      accentFg:'#160b08',
      rowSelBg:'rgba(255,90,60,.14)',
      hintBg:  'rgba(20,20,22,.6)',
      hintFg:  '#ff7a5c',
      hintBdr: 'rgba(255,122,92,.6)',
    },
    {
      key:     'amber',
      label:   'Amber',
      panelBg: 'rgba(46,30,16,.80)',
      blur:    'blur(20px) saturate(1.6)',
      border:  'rgba(255,210,150,.2)',
      text:    '#ffeccf',
      textMuted: '#b08a5a',
      accent:  '#e0a04a',
      accentFg:'#2a1808',
      rowSelBg:'rgba(240,168,74,.2)',
      hintBg:  'rgba(60,36,16,.55)',
      hintFg:  '#ffd89a',
      hintBdr: 'rgba(240,180,100,.55)',
    },
    {
      key:     'frost',
      label:   'Frost',
      panelBg: 'rgba(255,255,255,.65)',
      blur:    'blur(22px) saturate(1.4)',
      border:  'rgba(255,255,255,.70)',
      text:    '#1f2740',
      textMuted: '#6a7286',
      accent:  '#4150c0',
      accentFg:'#ffffff',
      rowSelBg:'rgba(80,100,210,.12)',
      hintBg:  'rgba(255,255,255,.65)',
      hintFg:  '#3340a0',
      hintBdr: 'rgba(80,100,200,.4)',
    },
    {
      key:     'classic',
      label:   'Classic Violet',
      panelBg: 'rgba(28,33,48,.88)',
      blur:    'blur(18px)',
      border:  'rgba(255,255,255,.09)',
      text:    '#e8eaf0',
      textMuted: '#9aa0ad',
      accent:  '#7c5cff',
      accentFg:'#ffffff',
      rowSelBg:'rgba(139,92,246,.22)',
      hintBg:  'rgba(124,92,255,.9)',
      hintFg:  '#ffffff',
      hintBdr: 'rgba(255,255,255,.25)',
    },
  ];

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
    const ver = 'v' + manifest.version;
    const vEl  = document.getElementById('version');
    const vEl2 = document.getElementById('version-footer');
    if (vEl)  vEl.textContent  = ver;
    if (vEl2) vEl2.textContent = ver;
  } catch (_) {}

  // ── Status pills ───────────────────────────────────────────────────────────

  function updateStatusPills(profile, theme) {
    const sp = document.getElementById('status-profile');
    const st = document.getElementById('status-theme');
    if (sp) sp.textContent = profile || 'hybrid';
    if (st) st.textContent = theme   || 'aurora';
  }

  // ── Nav scroll-spy ────────────────────────────────────────────────────────

  (function initScrollSpy() {
    const navItems = Array.from(document.querySelectorAll('.nav-rail__item'));
    const sections = navItems.map(a => {
      const id = a.getAttribute('href').slice(1);
      return document.getElementById(id);
    }).filter(Boolean);

    function onScroll() {
      const main = document.getElementById('main-scroll');
      if (!main) return;
      const scrollTop = main.scrollTop;
      let active = sections[0];
      sections.forEach(sec => {
        if (sec.offsetTop - 80 <= scrollTop) active = sec;
      });
      navItems.forEach(a => {
        const id = a.getAttribute('href').slice(1);
        a.classList.toggle('is-active', active && active.id === id);
      });
    }

    const main = document.getElementById('main-scroll');
    if (main) main.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();

  // ── Theme preview cards ────────────────────────────────────────────────────

  const themeCardsEl = document.getElementById('theme-cards');
  const themeMsg     = document.getElementById('theme-msg');

  function buildThemeCardHTML(t, isActive) {
    // Glass preview rendered inside card, using real theme tokens
    const glass = [
      'backdrop-filter:' + t.blur + ';',
      '-webkit-backdrop-filter:' + t.blur + ';',
      'background:' + t.panelBg + ';',
      'border:1px solid ' + t.border + ';',
    ].join('');

    const card = document.createElement('div');
    card.className = 'theme-card' + (isActive ? ' is-active' : '');
    card.setAttribute('role', 'radio');
    card.setAttribute('aria-checked', isActive ? 'true' : 'false');
    card.setAttribute('tabindex', isActive ? '0' : '-1');
    card.dataset.themeKey = t.key;
    card.title = t.label;

    // Preview pane (glassmorphic mini omnibar)
    const preview = document.createElement('div');
    preview.className = 'theme-card__preview';
    preview.setAttribute('style', glass + 'position:relative;');

    // Input row
    const inputRow = document.createElement('div');
    inputRow.className = 'theme-card__input-row';
    inputRow.setAttribute('style',
      'background:' + t.rowSelBg + ';' +
      'color:' + t.text + ';'
    );
    const caret = document.createElement('span');
    caret.className = 'theme-card__input-caret';
    caret.setAttribute('style', 'background:' + t.accent + ';');
    const inputTxt = document.createElement('span');
    inputTxt.className = 'theme-card__input-text';
    inputTxt.textContent = 'github.com/';
    const badge = document.createElement('span');
    badge.className = 'theme-card__mode-badge';
    badge.setAttribute('style',
      'background:' + t.accent + ';color:' + t.accentFg + ';'
    );
    badge.textContent = 'NORMAL';
    inputRow.appendChild(caret);
    inputRow.appendChild(inputTxt);
    inputRow.appendChild(badge);

    // Result rows
    const rows = [
      { text: 'github.com — Build software...', sel: true },
      { text: 'news.ycombinator.com — Hacker News', sel: false },
    ];

    rows.forEach(r => {
      const row = document.createElement('div');
      row.className = 'theme-card__result-row' + (r.sel ? ' is-sel' : '');
      row.setAttribute('style',
        'background:' + (r.sel ? t.rowSelBg : 'transparent') + ';' +
        'color:' + t.text + ';'
      );
      const hint = document.createElement('span');
      hint.className = 'theme-card__hint';
      hint.setAttribute('style',
        'background:' + t.hintBg + ';' +
        'color:' + t.hintFg + ';' +
        'border:1px solid ' + t.hintBdr + ';'
      );
      hint.textContent = r.sel ? 'f' : 'j';
      const txt = document.createElement('span');
      txt.className = 'theme-card__result-text';
      txt.textContent = r.text;
      row.appendChild(hint);
      row.appendChild(txt);
      preview.appendChild(row);
    });

    preview.insertBefore(inputRow, preview.firstChild);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'theme-card__footer';

    const name = document.createElement('span');
    name.className = 'theme-card__name';
    name.textContent = t.label;

    const check = document.createElement('span');
    check.className = 'theme-card__check';
    check.innerHTML =
      '<svg class="theme-card__check-icon" viewBox="0 0 10 10" fill="none" aria-hidden="true">' +
      '<path d="M2 5l2.5 2.5L8 3" stroke="#06241c" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';

    footer.appendChild(name);
    footer.appendChild(check);
    card.appendChild(preview);
    card.appendChild(footer);

    return card;
  }

  function renderThemeCards(activeKey) {
    themeCardsEl.innerHTML = '';
    THEMES.forEach(t => {
      const card = buildThemeCardHTML(t, t.key === activeKey);
      card.addEventListener('click', () => applyTheme(t.key));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyTheme(t.key); }
      });
      themeCardsEl.appendChild(card);
    });
  }

  function applyTheme(key) {
    loadState().then(state => {
      const options = Object.assign({}, state.options || {}, { theme: key });
      const next = Object.assign({}, state, { options });
      return chrome.storage.local.set({ [STORAGE_KEY]: next });
    }).then(() => {
      renderThemeCards(key);
      updateStatusPills(null, key);
      showMsg(themeMsg, 'Theme saved. Open tabs update live.', 'ok');
    }).catch(err => {
      showMsg(themeMsg, 'Error: ' + err.message, 'err');
    });
  }

  loadState().then(state => {
    const currentTheme = (state.options && state.options.theme) || 'aurora';
    renderThemeCards(currentTheme);
    updateStatusPills(state.activeProfile || 'hybrid', currentTheme);
  });

  // ── Profile segmented control ─────────────────────────────────────────────

  const segBtns = Array.from(document.querySelectorAll('.seg-btn'));

  function setActiveProfile(name) {
    segBtns.forEach(btn => {
      const isMatch = btn.dataset.profile === name;
      btn.setAttribute('aria-checked', isMatch ? 'true' : 'false');
    });
    updateStatusPills(name, null);
    saveState({ activeProfile: name });
  }

  loadState().then(state => {
    const profile = state.activeProfile || 'hybrid';
    segBtns.forEach(btn => {
      btn.setAttribute('aria-checked', btn.dataset.profile === profile ? 'true' : 'false');
    });
  });

  segBtns.forEach(btn => {
    btn.addEventListener('click', () => setActiveProfile(btn.dataset.profile));
  });

  // ── Options list (:set) ───────────────────────────────────────────────────

  const optionsList = document.getElementById('options-list');
  const optionsMsg  = document.getElementById('options-msg');

  function renderOptionsList(storedOptions) {
    optionsList.innerHTML = '';

    Object.keys(DEFAULTS).forEach(key => {
      const defaultVal = DEFAULTS[key];
      const current = Object.prototype.hasOwnProperty.call(storedOptions, key)
        ? storedOptions[key]
        : defaultVal;
      const type = typeof defaultVal;

      const row = document.createElement('div');
      row.className = 'option-row';
      row.setAttribute('role', 'listitem');

      // Key column
      const keyEl = document.createElement('span');
      keyEl.className = 'option-row__key';
      keyEl.textContent = key;

      // Description column
      const descEl = document.createElement('span');
      descEl.className = 'option-row__desc';
      descEl.textContent = OPTION_DESCS[key] || '';

      // Control column
      const ctrlEl = document.createElement('div');
      ctrlEl.className = 'option-row__control';

      if (type === 'boolean') {
        // Toggle switch
        const label = document.createElement('label');
        label.className = 'toggle';
        label.setAttribute('aria-label', key);

        const inp = document.createElement('input');
        inp.type = 'checkbox';
        inp.className = 'toggle__input';
        inp.checked = Boolean(current);
        inp.dataset.key  = key;
        inp.dataset.type = type;

        const track = document.createElement('span');
        track.className = 'toggle__track';
        const thumb = document.createElement('span');
        thumb.className = 'toggle__thumb';

        label.appendChild(inp);
        label.appendChild(track);
        label.appendChild(thumb);
        ctrlEl.appendChild(label);

        // Persist on change immediately
        inp.addEventListener('change', () => persistSingleOption(key, inp.checked));
      } else {
        // Text / number input
        const inp = document.createElement('input');
        inp.type = type === 'number' ? 'number' : 'text';
        inp.className = 'opt-input';
        inp.value = String(current);
        inp.dataset.key  = key;
        inp.dataset.type = type;
        if (type === 'number') { inp.min = '0'; inp.step = '1'; }
        ctrlEl.appendChild(inp);

        // Persist on blur
        inp.addEventListener('change', () => {
          let val = inp.value;
          if (type === 'number') val = Number(val);
          persistSingleOption(key, val);
        });
      }

      row.appendChild(keyEl);
      row.appendChild(descEl);
      row.appendChild(ctrlEl);
      optionsList.appendChild(row);
    });
  }

  function persistSingleOption(key, value) {
    loadState().then(state => {
      const options = Object.assign({}, state.options || {}, { [key]: value });
      const next = Object.assign({}, state, { options });
      return chrome.storage.local.set({ [STORAGE_KEY]: next });
    }).then(() => {
      showMsg(optionsMsg, key + ' saved.', 'ok');
    }).catch(err => {
      showMsg(optionsMsg, 'Error: ' + err.message, 'err');
    });
  }

  loadState().then(state => renderOptionsList(state.options || {}));

  // ── Editor gutter ─────────────────────────────────────────────────────────

  const jsEditor   = document.getElementById('js-editor');
  const gutterEl   = document.getElementById('editor-gutter');

  function updateGutter() {
    if (!gutterEl || !jsEditor) return;
    const lines = jsEditor.value.split('\n').length;
    const nums = [];
    for (let i = 1; i <= Math.max(lines, 8); i++) nums.push(i);
    gutterEl.textContent = nums.join('\n');
  }

  if (jsEditor) {
    jsEditor.addEventListener('input', updateGutter);
    updateGutter();
  }

  // ── JS Settings editor ────────────────────────────────────────────────────

  const jsMsg = document.getElementById('js-msg');
  const JS_SCRIPT_KEY = 'qutesurf:js-settings';

  // Load saved script
  chrome.storage.local.get(JS_SCRIPT_KEY).then(result => {
    if (result[JS_SCRIPT_KEY]) {
      jsEditor.value = result[JS_SCRIPT_KEY];
      updateGutter();
    }
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
    updateGutter();
    chrome.storage.local.remove(JS_SCRIPT_KEY);
    showMsg(jsMsg, 'Script cleared.', 'ok');
  });

})();
