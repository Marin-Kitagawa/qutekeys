# Switchable Glass Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a switchable 5-theme frosted-glass system (aurora/obsidian/amber/frost/classic) to QuteSurf so every UI component restyles live when the user picks a theme from the options page.

**Architecture:** A new `src/content_scripts/ui/themes.js` module owns all theme data and exports `themeVarsCss(key)` which returns a `:host { --qs-... }` CSS string. All five component CSS files (`omnibar`, `hints`, `statusline`, `whichkey`, `findbar`) are refactored to use `var(--qs-*)` tokens with violet fallbacks. `index.js` injects the theme vars block first (before component styles) and re-injects on `chrome.storage.onChanged`. The options page renders 5 clickable swatch cards that read-modify-write the `qutesurf:config` storage object so the content-script listener fires live.

**Tech Stack:** CommonJS, Jest 30/jsdom, webpack 5, Chrome Extension MV3

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/content_scripts/ui/themes.js` | Theme registry, `THEMES`, `DEFAULT_THEME`, `listThemes()`, `themeVarsCss()` |
| Modify | `src/core/config.js` | Add `theme: 'aurora'` to `DEFAULTS` |
| Modify | `src/content_scripts/index.js` | Inject theme vars on init; `applyTheme()`; `storage.onChanged` live swap |
| Modify | `src/content_scripts/ui/host.js` | Add `replaceStyle(marker, css)` for efficient theme re-injection |
| Modify | `src/content_scripts/ui/omnibar.css.js` | Replace hardcoded violet with `var(--qs-*)` |
| Modify | `src/content_scripts/ui/hints.css.js` | Replace hardcoded violet with `var(--qs-*)` |
| Modify | `src/content_scripts/ui/statusline.css.js` | Replace hardcoded violet with `var(--qs-*)` |
| Modify | `src/content_scripts/ui/whichkey.css.js` | Replace hardcoded violet with `var(--qs-*)` |
| Modify | `src/content_scripts/ui/findbar.css.js` | Replace hardcoded violet with `var(--qs-*)` |
| Modify | `src/pages/options.html` | Add `<section id="section-theme">` above profile |
| Modify | `src/pages/options.js` | Render 5 swatch cards; persist theme via read-modify-write |
| Modify | `src/pages/options.css` | Theme picker card styles |
| Create | `tests/content/themes.test.js` | Unit tests for `themes.js` |

---

## Task 1: Create `src/content_scripts/ui/themes.js`

**Files:**
- Create: `src/content_scripts/ui/themes.js`

- [ ] **Step 1: Write the failing test first**

Create `tests/content/themes.test.js`:

```js
'use strict';
const { THEMES, DEFAULT_THEME, listThemes, themeVarsCss } = require('../../src/content_scripts/ui/themes');

test('DEFAULT_THEME is aurora', () => {
  expect(DEFAULT_THEME).toBe('aurora');
});

test('listThemes returns 5 entries with key and label', () => {
  const list = listThemes();
  expect(list).toHaveLength(5);
  const keys = list.map(t => t.key);
  expect(keys).toContain('aurora');
  expect(keys).toContain('obsidian');
  expect(keys).toContain('amber');
  expect(keys).toContain('frost');
  expect(keys).toContain('classic');
  list.forEach(t => {
    expect(typeof t.key).toBe('string');
    expect(typeof t.label).toBe('string');
    expect(t.label.length).toBeGreaterThan(0);
  });
});

test('themeVarsCss(aurora) contains :host and aurora accent', () => {
  const css = themeVarsCss('aurora');
  expect(typeof css).toBe('string');
  expect(css).toContain(':host');
  expect(css).toContain('#5ee7c2');
});

test('themeVarsCss(amber) contains Spectral font', () => {
  const css = themeVarsCss('amber');
  expect(css).toContain('Spectral');
});

test('themeVarsCss(frost) contains light panel bg', () => {
  const css = themeVarsCss('frost');
  expect(css).toContain('rgba(255,255,255');
});

test('themeVarsCss(unknown) falls back to aurora accent', () => {
  const css = themeVarsCss('nonexistent-theme-xyz');
  expect(css).toContain('#5ee7c2');
});

test('every theme defines all required tokens', () => {
  const REQUIRED = [
    '--qs-panel-bg', '--qs-blur', '--qs-panel-border', '--qs-panel-shadow',
    '--qs-radius', '--qs-text', '--qs-text-muted', '--qs-name', '--qs-accent',
    '--qs-accent-fg', '--qs-row-sel-bg', '--qs-row-sel-name', '--qs-divider',
    '--qs-hint-bg', '--qs-hint-fg', '--qs-hint-border', '--qs-sl-bg',
    '--qs-sl-text', '--qs-mono', '--qs-prose',
  ];
  Object.keys(THEMES).forEach(key => {
    REQUIRED.forEach(token => {
      expect(THEMES[key].vars).toHaveProperty(token);
    });
  });
});

test('themeVarsCss output is a valid :host { ... } block', () => {
  const css = themeVarsCss('aurora');
  expect(css.trim()).toMatch(/^:host\s*\{[\s\S]+\}$/);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```
npx jest tests/content/themes.test.js --no-coverage
```

Expected: FAIL — `Cannot find module '../../src/content_scripts/ui/themes'`

- [ ] **Step 3: Create `src/content_scripts/ui/themes.js`**

```js
'use strict';

const MONO = "'FiraCode Nerd Font','FiraCode Nerd Font Mono','Fira Code',ui-monospace,monospace";
const PROSE_SANS = "system-ui,-apple-system,'Segoe UI',sans-serif";
const PROSE_SERIF = "'Spectral',Georgia,'Times New Roman',serif";
const RADIUS = '14px';

const THEMES = {
  aurora: {
    label: 'Liquid Glass · Aurora',
    vars: {
      '--qs-panel-bg':      'rgba(20,32,40,.55)',
      '--qs-blur':          'blur(26px) saturate(1.5)',
      '--qs-panel-border':  'rgba(180,255,238,.16)',
      '--qs-panel-shadow':  '0 26px 60px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.18)',
      '--qs-radius':        RADIUS,
      '--qs-text':          '#eafff8',
      '--qs-text-muted':    '#8fb3a8',
      '--qs-name':          '#7fd8c1',
      '--qs-accent':        '#5ee7c2',
      '--qs-accent-fg':     '#06241c',
      '--qs-row-sel-bg':    'linear-gradient(90deg,rgba(94,231,194,.16),rgba(94,231,194,.02))',
      '--qs-row-sel-name':  '#adf5dd',
      '--qs-divider':       'rgba(255,255,255,.09)',
      '--qs-hint-bg':       'rgba(60,200,168,.22)',
      '--qs-hint-fg':       '#d7fff3',
      '--qs-hint-border':   'rgba(150,255,225,.55)',
      '--qs-sl-bg':         'rgba(16,26,33,.6)',
      '--qs-sl-text':       '#8fb3a8',
      '--qs-mono':          MONO,
      '--qs-prose':         PROSE_SANS,
    },
  },

  obsidian: {
    label: 'Obsidian Glass',
    vars: {
      '--qs-panel-bg':      'rgba(14,14,16,.62)',
      '--qs-blur':          'blur(30px) saturate(1.2)',
      '--qs-panel-border':  'rgba(255,255,255,.1)',
      '--qs-panel-shadow':  '0 26px 64px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.1)',
      '--qs-radius':        RADIUS,
      '--qs-text':          '#f3f1ee',
      '--qs-text-muted':    '#7c7a76',
      '--qs-name':          '#9a9893',
      '--qs-accent':        '#ff5a3c',
      '--qs-accent-fg':     '#160b08',
      '--qs-row-sel-bg':    'rgba(255,90,60,.14)',
      '--qs-row-sel-name':  '#ff8a6a',
      '--qs-divider':       'rgba(255,255,255,.07)',
      '--qs-hint-bg':       'rgba(20,20,22,.6)',
      '--qs-hint-fg':       '#ff7a5c',
      '--qs-hint-border':   'rgba(255,122,92,.6)',
      '--qs-sl-bg':         'rgba(12,12,14,.66)',
      '--qs-sl-text':       '#7c7a76',
      '--qs-mono':          MONO,
      '--qs-prose':         PROSE_SANS,
    },
  },

  amber: {
    label: 'Smoked Amber',
    vars: {
      '--qs-panel-bg':      'rgba(46,30,16,.5)',
      '--qs-blur':          'blur(26px) saturate(1.6)',
      '--qs-panel-border':  'rgba(255,210,150,.2)',
      '--qs-panel-shadow':  '0 26px 60px rgba(20,8,0,.55), inset 0 1px 0 rgba(255,225,180,.22)',
      '--qs-radius':        RADIUS,
      '--qs-text':          '#ffeccf',
      '--qs-text-muted':    '#b08a5a',
      '--qs-name':          '#d29a55',
      '--qs-accent':        '#e0a04a',
      '--qs-accent-fg':     '#2a1808',
      '--qs-row-sel-bg':    'linear-gradient(90deg,rgba(240,168,74,.2),rgba(240,168,74,.03))',
      '--qs-row-sel-name':  '#ffce86',
      '--qs-divider':       'rgba(255,210,150,.14)',
      '--qs-hint-bg':       'rgba(60,36,16,.55)',
      '--qs-hint-fg':       '#ffd89a',
      '--qs-hint-border':   'rgba(240,180,100,.55)',
      '--qs-sl-bg':         'rgba(40,26,14,.6)',
      '--qs-sl-text':       '#b08a5a',
      '--qs-mono':          MONO,
      '--qs-prose':         PROSE_SERIF,
    },
  },

  frost: {
    label: 'Frost · Milk Glass',
    vars: {
      '--qs-panel-bg':      'rgba(255,255,255,.55)',
      '--qs-blur':          'blur(28px) saturate(1.4)',
      '--qs-panel-border':  'rgba(255,255,255,.7)',
      '--qs-panel-shadow':  '0 22px 54px rgba(50,60,100,.22), inset 0 1px 0 rgba(255,255,255,.9)',
      '--qs-radius':        RADIUS,
      '--qs-text':          '#1f2740',
      '--qs-text-muted':    '#6a7286',
      '--qs-name':          '#5566a8',
      '--qs-accent':        '#4150c0',
      '--qs-accent-fg':     '#ffffff',
      '--qs-row-sel-bg':    'rgba(80,100,210,.12)',
      '--qs-row-sel-name':  '#3340c0',
      '--qs-divider':       'rgba(60,70,120,.12)',
      '--qs-hint-bg':       'rgba(255,255,255,.65)',
      '--qs-hint-fg':       '#3340a0',
      '--qs-hint-border':   'rgba(80,100,200,.4)',
      '--qs-sl-bg':         'rgba(255,255,255,.6)',
      '--qs-sl-text':       '#6a7286',
      '--qs-mono':          MONO,
      '--qs-prose':         PROSE_SANS,
    },
  },

  classic: {
    label: 'Classic Violet',
    vars: {
      '--qs-panel-bg':      'rgba(28,33,48,.82)',
      '--qs-blur':          'blur(20px)',
      '--qs-panel-border':  'rgba(255,255,255,.09)',
      '--qs-panel-shadow':  '0 24px 80px rgba(0,0,0,.6), 0 8px 24px rgba(0,0,0,.4), inset 0 0 0 1px rgba(255,255,255,.04)',
      '--qs-radius':        RADIUS,
      '--qs-text':          '#e8eaf0',
      '--qs-text-muted':    '#9aa0ad',
      '--qs-name':          '#a78bfa',
      '--qs-accent':        '#7c5cff',
      '--qs-accent-fg':     '#ffffff',
      '--qs-row-sel-bg':    'linear-gradient(90deg,rgba(139,92,246,.22),rgba(139,92,246,.08))',
      '--qs-row-sel-name':  '#c4b5fd',
      '--qs-divider':       'rgba(255,255,255,.07)',
      '--qs-hint-bg':       'rgba(124,92,255,.9)',
      '--qs-hint-fg':       '#ffffff',
      '--qs-hint-border':   'rgba(255,255,255,.25)',
      '--qs-sl-bg':         'rgba(28,33,48,.85)',
      '--qs-sl-text':       'rgba(255,255,255,.75)',
      '--qs-mono':          MONO,
      '--qs-prose':         PROSE_SANS,
    },
  },
};

const DEFAULT_THEME = 'aurora';

/**
 * Returns [{key, label}] for all themes in insertion order.
 */
function listThemes() {
  return Object.keys(THEMES).map(key => ({ key, label: THEMES[key].label }));
}

/**
 * Returns a CSS string `:host { <vars> }` for the given theme key.
 * Falls back to DEFAULT_THEME if the key is unknown.
 * @param {string} key
 * @returns {string}
 */
function themeVarsCss(key) {
  const theme = THEMES[key] || THEMES[DEFAULT_THEME];
  const lines = Object.entries(theme.vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
  return `:host {\n${lines}\n}`;
}

module.exports = { THEMES, DEFAULT_THEME, listThemes, themeVarsCss };
```

- [ ] **Step 4: Run tests — all must pass**

```
npx jest tests/content/themes.test.js --no-coverage
```

Expected: PASS (8 tests)

- [ ] **Step 5: Run full suite — all 244+ must still pass**

```
npx jest --no-coverage 2>&1 | tail -20
```

Expected: All previously passing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add tests/content/themes.test.js src/content_scripts/ui/themes.js
git commit -m "feat(ui): add themes.js with 5 frosted-glass theme definitions"
```

---

## Task 2: Add `theme` to config DEFAULTS

**Files:**
- Modify: `src/core/config.js` (line 6–11, DEFAULTS object)

- [ ] **Step 1: Write a failing test**

Add to `tests/core/config.test.js`. First read the file to find a good insertion point:

Open `tests/core/config.test.js` and append after the last `test(...)` block:

```js
test('config.get("theme") returns aurora by default', () => {
  const storage = { get: async () => ({}), set: async () => {} };
  const c = new Config(storage);
  expect(c.get('theme')).toBe('aurora');
});
```

- [ ] **Step 2: Run to confirm it fails**

```
npx jest tests/core/config.test.js --no-coverage
```

Expected: FAIL — `Expected: "aurora", Received: undefined`

- [ ] **Step 3: Add `theme: 'aurora'` to DEFAULTS in `src/core/config.js`**

In `src/core/config.js` change the `DEFAULTS` block from:

```js
const DEFAULTS = {
  hintcharacters: 'asdfg',
  scrollstep: 70,
  smoothscroll: true,
  findcasesensitive: false,
  defaultsearchengine: 'g',
};
```

to:

```js
const DEFAULTS = {
  hintcharacters: 'asdfg',
  scrollstep: 70,
  smoothscroll: true,
  findcasesensitive: false,
  defaultsearchengine: 'g',
  theme: 'aurora',
};
```

- [ ] **Step 4: Run tests — must pass**

```
npx jest tests/core/config.test.js --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/config.js tests/core/config.test.js
git commit -m "feat(config): add theme:aurora default"
```

---

## Task 3: Add `replaceStyle()` to `ShadowHost`

The theme vars <style> must be replaceable on live theme switch without stacking duplicate `<style>` elements.

**Files:**
- Modify: `src/content_scripts/ui/host.js`
- Modify: `tests/content/host.test.js`

- [ ] **Step 1: Write failing tests**

Append to `tests/content/host.test.js`:

```js
test('replaceStyle replaces a previously injected style by marker', () => {
  const h = new ShadowHost();
  h.replaceStyle('theme', ':host { --qs-accent: red; }');
  h.replaceStyle('theme', ':host { --qs-accent: blue; }');
  // Only one theme <style> should exist
  const styles = Array.from(h.root.querySelectorAll('style[data-qs-marker]'));
  expect(styles).toHaveLength(1);
  expect(styles[0].textContent).toContain('blue');
});

test('replaceStyle with new marker creates a new style element', () => {
  const h = new ShadowHost();
  h.replaceStyle('a', ':host { --a: 1; }');
  h.replaceStyle('b', ':host { --b: 2; }');
  const styles = Array.from(h.root.querySelectorAll('style[data-qs-marker]'));
  expect(styles).toHaveLength(2);
});
```

- [ ] **Step 2: Run to confirm they fail**

```
npx jest tests/content/host.test.js --no-coverage
```

Expected: FAIL — `h.replaceStyle is not a function`

- [ ] **Step 3: Add `replaceStyle()` to `ShadowHost`**

In `src/content_scripts/ui/host.js`, after the `addStyle()` method (line 38) and before `mount()`, add:

```js
  /**
   * Inject or replace a named CSS block identified by `marker`.
   * Only one <style data-qs-marker="marker"> exists at a time.
   * @param {string} marker  Unique identifier (e.g. 'theme')
   * @param {string} cssText
   */
  replaceStyle(marker, cssText) {
    if (!this.root) return;
    const existing = this.root.querySelector(`style[data-qs-marker="${marker}"]`);
    if (existing) {
      existing.textContent = cssText;
      return;
    }
    const style = document.createElement('style');
    style.setAttribute('data-qs-marker', marker);
    style.textContent = cssText;
    this.root.appendChild(style);
  }
```

- [ ] **Step 4: Run tests — must pass**

```
npx jest tests/content/host.test.js --no-coverage
```

Expected: PASS

- [ ] **Step 5: Run full suite**

```
npx jest --no-coverage 2>&1 | tail -10
```

Expected: All previously passing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/content_scripts/ui/host.js tests/content/host.test.js
git commit -m "feat(host): add replaceStyle(marker, css) for live theme swapping"
```

---

## Task 4: Refactor `omnibar.css.js` to use CSS custom properties

**Files:**
- Modify: `src/content_scripts/ui/omnibar.css.js`

No omnibar CSS tests assert on CSS text, so no new tests needed — just keep all existing tests green.

- [ ] **Step 1: Verify existing omnibar tests pass before the edit**

```
npx jest tests/content --no-coverage 2>&1 | grep -E "PASS|FAIL|omnibar"
```

- [ ] **Step 2: Replace `src/content_scripts/ui/omnibar.css.js` entirely**

```js
'use strict';

const OMNIBAR_CSS = `
/* ── QuteSurf Omnibar — Themeable Glass ─────────────────────────── */
#qs-omnibar-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
}

#qs-omnibar-panel {
  width: 640px;
  max-width: calc(100vw - 32px);
  max-height: 480px;
  display: flex;
  flex-direction: column;
  background: var(--qs-panel-bg, rgba(28, 33, 48, 0.82));
  backdrop-filter: var(--qs-blur, blur(20px));
  -webkit-backdrop-filter: var(--qs-blur, blur(20px));
  border: 1px solid var(--qs-panel-border, rgba(255, 255, 255, 0.09));
  border-radius: var(--qs-radius, 14px);
  box-shadow: var(--qs-panel-shadow, 0 24px 80px rgba(0,0,0,.6), 0 8px 24px rgba(0,0,0,.4), inset 0 0 0 1px rgba(255,255,255,.04));
  overflow: hidden;
  font-family: var(--qs-prose, system-ui, -apple-system, 'Segoe UI', sans-serif);
  font-size: 14px;
  color: var(--qs-text, rgba(255, 255, 255, 0.9));
}

/* ── Input row ─────────────────────────────────────────────────── */
#qs-omnibar-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--qs-divider, rgba(255, 255, 255, 0.07));
}

#qs-omnibar-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--qs-accent, #7c5cff);
  flex-shrink: 0;
  box-shadow: 0 0 6px var(--qs-accent, #7c5cff);
}

#qs-omnibar-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--qs-text, rgba(255, 255, 255, 0.95));
  font-size: 15px;
  font-family: inherit;
  caret-color: var(--qs-accent, #7c5cff);
}

#qs-omnibar-input::placeholder {
  color: var(--qs-text-muted, rgba(255, 255, 255, 0.3));
}

/* ── Results list ──────────────────────────────────────────────── */
#qs-omnibar-results {
  overflow-y: auto;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: var(--qs-accent, rgba(139, 92, 246, 0.4)) transparent;
}

#qs-omnibar-results::-webkit-scrollbar {
  width: 4px;
}
#qs-omnibar-results::-webkit-scrollbar-thumb {
  background: var(--qs-accent, rgba(139, 92, 246, 0.4));
  border-radius: 2px;
  opacity: 0.4;
}

/* ── Result row ────────────────────────────────────────────────── */
.qs-omni-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 80ms;
  min-height: 48px;
}

.qs-omni-row:hover {
  background: var(--qs-row-sel-bg, rgba(139, 92, 246, 0.12));
}

.qs-omni-row.selected {
  background: var(--qs-row-sel-bg, linear-gradient(90deg, rgba(139,92,246,.22) 0%, rgba(139,92,246,.08) 100%));
  border-left: 2px solid var(--qs-accent, #7c5cff);
  padding-left: 14px;
}

/* ── Favicon ───────────────────────────────────────────────────── */
.qs-omni-favicon {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  object-fit: contain;
  flex-shrink: 0;
  opacity: 0.85;
}

.qs-omni-favicon-placeholder {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  background: var(--qs-divider, rgba(255, 255, 255, 0.1));
  flex-shrink: 0;
}

/* ── Text block ────────────────────────────────────────────────── */
.qs-omni-text {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.qs-omni-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--qs-text, rgba(255, 255, 255, 0.9));
  font-size: 13px;
  line-height: 1.4;
}

.qs-omni-url {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--qs-text-muted, rgba(255, 255, 255, 0.4));
  font-size: 11px;
  line-height: 1.4;
  margin-top: 1px;
  font-family: var(--qs-prose, inherit);
}

/* ── Fuzzy highlight ───────────────────────────────────────────── */
.qs-omni-hl {
  color: var(--qs-name, #a78bfa);
  font-weight: 600;
}

/* ── Source badge ──────────────────────────────────────────────── */
.qs-omni-badge {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--qs-divider, rgba(255, 255, 255, 0.12));
  color: var(--qs-text-muted, rgba(255, 255, 255, 0.45));
  background: var(--qs-divider, rgba(255, 255, 255, 0.06));
  text-transform: uppercase;
  font-family: var(--qs-mono, 'Fira Code', monospace);
}

.qs-omni-badge.badge-bookmark { border-color: rgba(251, 191, 36, 0.4); color: #fbbf24; background: rgba(251, 191, 36, 0.08); }
.qs-omni-badge.badge-history  { border-color: rgba(99, 179, 237, 0.4); color: #63b3ed; background: rgba(99, 179, 237, 0.08); }
.qs-omni-badge.badge-tab      { border-color: rgba(52, 211, 153, 0.4); color: #34d399; background: rgba(52, 211, 153, 0.08); }
.qs-omni-badge.badge-cmd      { border-color: rgba(248, 113, 113, 0.4); color: #f87171; background: rgba(248, 113, 113, 0.08); }
.qs-omni-badge.badge-search   { border-color: var(--qs-accent, rgba(139, 92, 246, 0.4)); color: var(--qs-name, #a78bfa); background: var(--qs-hint-bg, rgba(139, 92, 246, 0.08)); }
.qs-omni-badge.badge-url      { border-color: var(--qs-accent, rgba(139, 92, 246, 0.4)); color: var(--qs-name, #a78bfa); background: var(--qs-hint-bg, rgba(139, 92, 246, 0.08)); }
.qs-omni-badge.badge-mark     { border-color: rgba(251, 146, 60, 0.4); color: #fb923c; background: rgba(251, 146, 60, 0.08); }

/* ── Empty state ───────────────────────────────────────────────── */
#qs-omnibar-empty {
  padding: 24px 16px;
  text-align: center;
  color: var(--qs-text-muted, rgba(255, 255, 255, 0.3));
  font-size: 13px;
}
`;

module.exports = { OMNIBAR_CSS };
```

- [ ] **Step 3: Run full test suite to confirm no regressions**

```
npx jest --no-coverage 2>&1 | tail -10
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/content_scripts/ui/omnibar.css.js
git commit -m "refactor(ui): tokenize omnibar.css.js to use --qs-* CSS custom properties"
```

---

## Task 5: Refactor `hints.css.js`

**Files:**
- Modify: `src/content_scripts/ui/hints.css.js`

IMPORTANT: Do NOT change the `.qs-hint-layer` positioning CSS (position: absolute, top:0, left:0, width:0, height:0) — this is the phase fix for document-coordinate hints.

- [ ] **Step 1: Replace `src/content_scripts/ui/hints.css.js`**

```js
'use strict';

/**
 * Themeable Glass label styles for hint overlays.
 * Uses --qs-* custom properties with violet fallbacks.
 * IMPORTANT: .qs-hint-layer positioning MUST remain absolute + document-anchored.
 */
const HINTS_CSS = `
.qs-hint {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 5px;
  min-width: 16px;
  height: 18px;
  font-family: var(--qs-mono, 'FiraCode Nerd Font', 'FiraCode Nerd Font Mono', 'Fira Code', monospace);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: var(--qs-hint-fg, #fff);
  background: var(--qs-hint-bg, rgba(124, 92, 255, 0.9));
  border: 1px solid var(--qs-hint-border, rgba(255, 255, 255, 0.25));
  border-radius: 6px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35),
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  letter-spacing: 0.5px;
  z-index: 2147483647;
  pointer-events: none;
  user-select: none;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  transform: translateY(-50%);
  white-space: nowrap;
  cursor: default;
}

.qs-hint.qs-hint--matched {
  opacity: 1;
}

.qs-hint.qs-hint--dimmed {
  opacity: 0.35;
}

.qs-hint-layer {
  /* Absolute (NOT fixed) and anchored at the document origin, so the absolutely
     positioned labels inside use document coordinates and scroll WITH the page,
     staying glued to their target elements. */
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  overflow: visible;
  pointer-events: none;
  z-index: 2147483646;
}
`;

module.exports = { HINTS_CSS };
```

- [ ] **Step 2: Run all tests — must pass**

```
npx jest --no-coverage 2>&1 | tail -10
```

Expected: All tests pass (hint tests check hintPosition coords and labels, not CSS text).

- [ ] **Step 3: Commit**

```bash
git add src/content_scripts/ui/hints.css.js
git commit -m "refactor(ui): tokenize hints.css.js to use --qs-* CSS custom properties"
```

---

## Task 6: Refactor `statusline.css.js`, `whichkey.css.js`, `findbar.css.js`

**Files:**
- Modify: `src/content_scripts/ui/statusline.css.js`
- Modify: `src/content_scripts/ui/whichkey.css.js`
- Modify: `src/content_scripts/ui/findbar.css.js`

- [ ] **Step 1: Replace `src/content_scripts/ui/statusline.css.js`**

```js
'use strict';

const STATUSLINE_CSS = `
/* ── QuteSurf Statusline — Themeable Glass ─────────────────────── */
#qs-statusline {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2147483646;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 14px;
  height: 28px;
  background: var(--qs-sl-bg, rgba(28, 33, 48, 0.85));
  backdrop-filter: var(--qs-blur, blur(16px));
  -webkit-backdrop-filter: var(--qs-blur, blur(16px));
  border-top: 1px solid var(--qs-panel-border, rgba(255, 255, 255, 0.07));
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);
  font-family: var(--qs-mono, -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace);
  font-size: 12px;
  color: var(--qs-sl-text, rgba(255, 255, 255, 0.75));
  box-sizing: border-box;
}

#qs-statusline-mode {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--qs-accent, #7c5cff);
  color: var(--qs-accent-fg, #fff);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.35);
  flex-shrink: 0;
  line-height: 18px;
  min-width: 52px;
  justify-content: center;
}

#qs-statusline-host {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--qs-text-muted, rgba(255, 255, 255, 0.6));
  font-size: 11px;
}

#qs-statusline-percent {
  flex-shrink: 0;
  color: var(--qs-text-muted, rgba(255, 255, 255, 0.45));
  font-size: 11px;
  min-width: 36px;
  text-align: right;
}
`;

module.exports = { STATUSLINE_CSS };
```

- [ ] **Step 2: Replace `src/content_scripts/ui/whichkey.css.js`**

```js
'use strict';

const WHICHKEY_CSS = `
/* ── QuteSurf WhichKey — Themeable Glass ───────────────────────── */
#qs-whichkey {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2147483647;
  min-width: 280px;
  max-width: calc(100vw - 48px);
  max-height: 320px;
  overflow-y: auto;
  background: var(--qs-panel-bg, rgba(28, 33, 48, 0.9));
  backdrop-filter: var(--qs-blur, blur(24px));
  -webkit-backdrop-filter: var(--qs-blur, blur(24px));
  border: 1px solid var(--qs-panel-border, rgba(255, 255, 255, 0.09));
  border-radius: var(--qs-radius, 14px);
  box-shadow: var(--qs-panel-shadow, 0 16px 56px rgba(0,0,0,.55), 0 4px 16px rgba(0,0,0,.35));
  padding: 8px 0;
  font-family: var(--qs-mono, -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace);
  font-size: 13px;
  color: var(--qs-text, rgba(255, 255, 255, 0.85));
  scrollbar-width: thin;
  scrollbar-color: var(--qs-accent, rgba(124, 92, 255, 0.4)) transparent;
}

#qs-whichkey::-webkit-scrollbar {
  width: 4px;
}
#qs-whichkey::-webkit-scrollbar-thumb {
  background: var(--qs-accent, rgba(124, 92, 255, 0.4));
  border-radius: 2px;
  opacity: 0.4;
}

.qs-wk-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 5px 16px;
  transition: background 60ms;
}

.qs-wk-row:hover {
  background: var(--qs-row-sel-bg, rgba(124, 92, 255, 0.1));
}

.qs-wk-seq {
  flex-shrink: 0;
  min-width: 44px;
  font-weight: 700;
  color: var(--qs-name, #7c5cff);
  letter-spacing: 0.04em;
  font-size: 12px;
}

.qs-wk-cmd {
  flex: 1;
  color: var(--qs-text-muted, rgba(255, 255, 255, 0.55));
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
`;

module.exports = { WHICHKEY_CSS };
```

- [ ] **Step 3: Replace `src/content_scripts/ui/findbar.css.js`**

```js
'use strict';

/**
 * Themeable glass find bar CSS.
 * Uses --qs-* custom properties with violet fallbacks.
 */
const FINDBAR_CSS = `
  .qs-findbar {
    position: fixed;
    bottom: 14px;
    left: 14px;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 6px;

    background: var(--qs-panel-bg, rgba(20, 14, 36, 0.72));
    backdrop-filter: var(--qs-blur, blur(14px) saturate(160%));
    -webkit-backdrop-filter: var(--qs-blur, blur(14px) saturate(160%));
    border: 1px solid var(--qs-panel-border, rgba(167, 139, 250, 0.30));
    border-radius: 8px;
    padding: 5px 10px;
    box-shadow: var(--qs-panel-shadow, 0 4px 24px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06));

    font-family: var(--qs-mono, ui-monospace, 'Cascadia Code', 'Fira Code', monospace);
    font-size: 13px;
    line-height: 1;
    color: var(--qs-text, rgba(233, 221, 255, 0.92));
    min-width: 220px;
    max-width: 380px;
  }

  .qs-findbar__input {
    background: transparent;
    border: none;
    outline: none;
    color: inherit;
    font: inherit;
    flex: 1 1 auto;
    min-width: 0;
    padding: 2px 0;
    caret-color: var(--qs-accent, #a78bfa);
  }

  .qs-findbar__input::placeholder {
    color: var(--qs-text-muted, rgba(167, 139, 250, 0.45));
  }

  .qs-findbar__input::selection {
    background: var(--qs-row-sel-bg, rgba(139, 92, 246, 0.45));
  }

  .qs-findbar__count {
    flex: 0 0 auto;
    font-size: 11px;
    color: var(--qs-name, rgba(167, 139, 250, 0.80));
    white-space: nowrap;
    min-width: 32px;
    text-align: right;
  }

  /* Current match highlight injected into the page */
  .qs-find-highlight {
    background: var(--qs-row-sel-bg, rgba(139, 92, 246, 0.35));
    color: inherit;
    border-radius: 2px;
    outline: 1.5px solid var(--qs-accent, rgba(167, 139, 250, 0.65));
    outline-offset: 0;
  }
`;

module.exports = { FINDBAR_CSS };
```

- [ ] **Step 4: Run all tests — must pass**

```
npx jest --no-coverage 2>&1 | tail -10
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/content_scripts/ui/statusline.css.js src/content_scripts/ui/whichkey.css.js src/content_scripts/ui/findbar.css.js
git commit -m "refactor(ui): tokenize statusline, whichkey, findbar CSS to use --qs-* properties"
```

---

## Task 7: Wire theme injection into `src/content_scripts/index.js`

**Files:**
- Modify: `src/content_scripts/index.js`

The theme vars `<style>` must be injected BEFORE component CSS styles are added (so vars exist when components inherit them). Use `replaceStyle('theme', css)` so that a live theme switch just calls `replaceStyle` again.

- [ ] **Step 1: Add theme imports and `applyTheme` function, and wire `init()`**

In `src/content_scripts/index.js`:

After all the existing `require(...)` lines at the top (after line 40), add:

```js
const { themeVarsCss } = require('./ui/themes');
```

Then, in the `init()` function, immediately after `const host = new ShadowHost();` (currently line 87), insert:

```js
  // ── Theme vars — inject BEFORE component styles so vars are available ──────
  function applyTheme(key) {
    host.replaceStyle('theme', themeVarsCss(key));
  }
  applyTheme(config ? config.get('theme') : 'aurora');

  // ── Live theme switch via storage.onChanged ────────────────────────────────
  if (
    typeof chrome !== 'undefined' &&
    chrome.storage &&
    chrome.storage.onChanged
  ) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      const configChange = changes['qutesurf:config'];
      if (!configChange || !configChange.newValue) return;
      const newTheme = configChange.newValue.options && configChange.newValue.options.theme;
      if (newTheme) {
        applyTheme(newTheme);
        if (config) config._state.options.theme = newTheme;
      }
    });
  }
```

The full `init()` block around the shadow host now looks like:

```js
  // ── Shadow DOM host ───────────────────────────────────────────────────────
  const host = new ShadowHost();

  // ── Theme vars — inject BEFORE component styles so vars are available ──────
  function applyTheme(key) {
    host.replaceStyle('theme', themeVarsCss(key));
  }
  applyTheme(config ? config.get('theme') : 'aurora');

  // ── Live theme switch via storage.onChanged ────────────────────────────────
  if (
    typeof chrome !== 'undefined' &&
    chrome.storage &&
    chrome.storage.onChanged
  ) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      const configChange = changes['qutesurf:config'];
      if (!configChange || !configChange.newValue) return;
      const newTheme = configChange.newValue.options && configChange.newValue.options.theme;
      if (newTheme) {
        applyTheme(newTheme);
        if (config) config._state.options.theme = newTheme;
      }
    });
  }

  // ── Statusline + WhichKey UI ──────────────────────────────────────────────
  const statusline = new Statusline({ host, modes });
```

- [ ] **Step 2: Run all tests — must pass**

```
npx jest --no-coverage 2>&1 | tail -10
```

Expected: All tests pass (the chrome.storage.onChanged guard prevents crashes under jsdom).

- [ ] **Step 3: Commit**

```bash
git add src/content_scripts/index.js
git commit -m "feat(content): inject theme vars on init + live-apply on storage.onChanged"
```

---

## Task 8: Options page theme picker

The options page (`src/pages/options.js` + `options.html` + `options.css`) is NOT webpack-bundled — it is copied as-is to `dist/<target>/pages/`. Therefore `themes.js` cannot be `require()`-d here. Instead, inline the 5 theme definitions as a small data array in `options.js`.

**Files:**
- Modify: `src/pages/options.html`
- Modify: `src/pages/options.js`
- Modify: `src/pages/options.css`

- [ ] **Step 1: Add theme section to `src/pages/options.html`**

In `options.html`, insert the following block BEFORE the `<!-- Profile -->` section (before line 17):

```html
  <!-- Theme Picker -->
  <section class="card" id="section-theme">
    <h2>Theme</h2>
    <div id="theme-swatches" class="theme-swatches"></div>
    <div class="msg" id="theme-msg"></div>
  </section>
```

- [ ] **Step 2: Add swatch styles to `src/pages/options.css`**

Append to the end of `src/pages/options.css`:

```css
/* ── Theme Swatches ── */
.theme-swatches {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.theme-swatch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  border-radius: 10px;
  padding: 6px;
  border: 2px solid transparent;
  transition: border-color 0.15s, transform 0.1s;
  user-select: none;
}

.theme-swatch:hover {
  transform: translateY(-2px);
}

.theme-swatch.active {
  border-color: var(--accent);
}

.theme-swatch__chip {
  width: 72px;
  height: 48px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  overflow: hidden;
  position: relative;
}

.theme-swatch__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.theme-swatch__label {
  font-size: 0.7rem;
  color: var(--subtext);
  text-align: center;
  max-width: 72px;
  line-height: 1.2;
}
```

- [ ] **Step 3: Add theme picker logic to `src/pages/options.js`**

In `src/pages/options.js`, add the following IIFE block BEFORE the final `})();` closing paren (before line 235), but inside the existing IIFE. Place it after the `// ── Profile section ─────────────────────────────────────────────` block ends and before `// ── Options table ─────────────────────────────────────────────────` starts (after line 73).

```js
  // ── Theme picker ──────────────────────────────────────────────────────────

  // Inline theme data — mirrors themes.js (options.js is not webpack-bundled)
  const THEME_SWATCHES = [
    { key: 'aurora',   label: 'Aurora',         panelBg: 'rgba(20,32,40,.85)',    accent: '#5ee7c2', fg: '#06241c' },
    { key: 'obsidian', label: 'Obsidian',        panelBg: 'rgba(14,14,16,.92)',    accent: '#ff5a3c', fg: '#ffffff' },
    { key: 'amber',    label: 'Amber',           panelBg: 'rgba(46,30,16,.85)',    accent: '#e0a04a', fg: '#2a1808' },
    { key: 'frost',    label: 'Frost',           panelBg: 'rgba(220,228,248,.85)', accent: '#4150c0', fg: '#ffffff' },
    { key: 'classic',  label: 'Classic Violet',  panelBg: 'rgba(28,33,48,.92)',    accent: '#7c5cff', fg: '#ffffff' },
  ];

  const swatchesEl = document.getElementById('theme-swatches');
  const themeMsg   = document.getElementById('theme-msg');

  function renderThemeSwatches(activeKey) {
    swatchesEl.innerHTML = '';
    THEME_SWATCHES.forEach(({ key, label, panelBg, accent, fg }) => {
      const card = document.createElement('div');
      card.className = 'theme-swatch' + (key === activeKey ? ' active' : '');
      card.title = label;

      const chip = document.createElement('div');
      chip.className = 'theme-swatch__chip';
      chip.style.background = panelBg;

      const dot = document.createElement('div');
      dot.className = 'theme-swatch__dot';
      dot.style.background = accent;
      chip.appendChild(dot);

      const lbl = document.createElement('div');
      lbl.className = 'theme-swatch__label';
      lbl.textContent = label;

      card.appendChild(chip);
      card.appendChild(lbl);

      card.addEventListener('click', () => {
        // Read-modify-write so we don't clobber other settings
        loadState().then(state => {
          const options = Object.assign({}, state.options || {}, { theme: key });
          const next = Object.assign({}, state, { options });
          return chrome.storage.local.set({ [STORAGE_KEY]: next });
        }).then(() => {
          renderThemeSwatches(key);
          showMsg(themeMsg, 'Theme saved. Open tabs update live.', 'ok');
        }).catch(err => {
          showMsg(themeMsg, 'Error: ' + err.message, 'err');
        });
      });

      swatchesEl.appendChild(card);
    });
  }

  // Load the current active theme and render
  loadState().then(state => {
    const currentTheme = (state.options && state.options.theme) || 'aurora';
    renderThemeSwatches(currentTheme);
  });
```

- [ ] **Step 4: Verify options.html has the section added correctly (visual check of the HTML)**

Read the first 30 lines of `src/pages/options.html` to confirm the `section-theme` block appears before `section-profile`.

- [ ] **Step 5: Run all tests — must pass**

```
npx jest --no-coverage 2>&1 | tail -10
```

Expected: All tests pass (options.js is not tested by Jest).

- [ ] **Step 6: Commit**

```bash
git add src/pages/options.html src/pages/options.js src/pages/options.css
git commit -m "feat(options): add frosted-glass theme picker with 5 swatch cards"
```

---

## Task 9: Build and full verification

- [ ] **Step 1: Run the full test suite and capture the count**

```
npx jest --no-coverage 2>&1 | grep -E "Tests:|Test Suites:"
```

Expected: at least 244 tests pass, 0 fail.

- [ ] **Step 2: Build both targets**

```
npm run build 2>&1 | tail -30
```

Expected: webpack exits 0 for both chrome and firefox targets; no errors.

- [ ] **Step 3: Verify dist output contains pages and content.js**

```bash
ls dist/chrome/pages/options.html dist/chrome/pages/options.js dist/chrome/content.js
```

Expected: all three files exist.

- [ ] **Step 4: Verify themes.js is bundled into content.js**

```bash
grep -c "aurora" dist/chrome/content.js
```

Expected: non-zero count (the theme data was bundled in).

- [ ] **Step 5: Confirm no stray untracked files**

```bash
git status
```

Expected: working tree clean.

- [ ] **Step 6: Final commit if anything was missed, then push**

```bash
git push origin main
```

---

## Task 10: (Optional) Live smoke-test in Chromium

This task requires a Chromium/Puppeteer environment. If running headless is not practical, skip the screenshot steps but do the build verification.

- [ ] **Step 1: Load the aurora omnibar screenshot**

Using the existing `scripts/repro.mjs` pattern (if present), load `dist/chrome`, navigate to a page, trigger the omnibar with `:`, screenshot and confirm:
- The panel renders with the aurora teal panel-bg
- No console errors about undefined CSS variables

- [ ] **Step 2: Load options page**

Navigate to `chrome-extension://<id>/pages/options.html`, screenshot and confirm:
- The "Theme" card appears above "Active Profile"
- 5 swatch chips are visible with distinct colors
- Aurora swatch has the active border highlight

- [ ] **Step 3: Simulate theme switch**

In the options page, click the "Amber" swatch. Confirm the active border moves and the toast message shows.

---

## Self-Review Checklist

- [ ] `themes.js` exports `THEMES`, `DEFAULT_THEME`, `listThemes()`, `themeVarsCss()` — all 5 themes defined
- [ ] All 5 CSS files use `var(--qs-*)` with violet/existing fallbacks — no structural/positioning changes
- [ ] `.qs-hint-layer` remains `position: absolute` (NOT fixed) in `hints.css.js`
- [ ] `themeVarsCss` injects on `:host`; default is `aurora`
- [ ] `host.replaceStyle('theme', ...)` is called in `init()` before any `Statusline/WhichKey/Omnibar` constructors (which call `host.addStyle()`)
- [ ] `chrome.storage.onChanged` listener is guarded with `typeof chrome !== 'undefined'`
- [ ] Options page persists to the SAME `qutesurf:config` key via read-modify-write
- [ ] `options.js` is NOT webpack-bundled — theme data is inlined (not required from themes.js)
- [ ] All tests pass; build passes; no stray files
