# QuteSurf Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-browser (Chrome + Firefox, Manifest V3) keyboard-navigation WebExtension that combines qutebrowser's and SurfingKeys' achievable features behind a single command registry, three switchable keymap profiles, a unified config system, and a Modern Glass UI.

**Architecture:** A single named-**Command Registry** is the spine. A **profile/keymap layer** (trie-based, count-aware) maps key sequences to commands per mode; three built-in profiles (`qute`, `surfingkeys`, `hybrid`) are hot-swappable. A **mode manager** runs a qutebrowser-style mode stack. Content scripts (ported/restyled from SurfingKeys) render UI through a Shadow-DOM host in **Modern Glass** style. A background service worker handles tabs/history/bookmarks/sessions/proxy/native-messaging. A unified `chrome.storage` config is mutated by `:set`/`:bind`, a JS settings editor, and a GUI options page.

**Tech Stack:** JavaScript (ES modules), Webpack (multi-target, adapted from SurfingKeys `config/webpack.config.js`), Jest + Puppeteer + jest-image-snapshot (from SurfingKeys), WebExtensions MV3, ACE editor, native-messaging host (Node) for Neovim.

**Source repos (siblings of this repo):** `../Surfingkeys` and `../qutebrowser`. "Port" means copy the named file(s) from `../Surfingkeys/...` into this repo and apply the listed transformations. "Translate" means read the named qutebrowser Python/YAML and re-express its data/semantics as JS.

**Spec:** `docs/superpowers/specs/2026-06-14-qutesurf-extension-design.md`

**Conventions for every task:** TDD (failing test first), run with `npm test -- <path>`, commit after green. Commit messages use Conventional Commits. Author identity is already configured (Marin Kitagawa). Do not add Co-Authored-By trailers.

---

## Phase 0 — Project scaffold & cross-browser build

**Files:**
- Create: `package.json`, `tsconfig.json`, `babel.config.json`, `jest.config.js`
- Create: `config/webpack.config.js`, `config/manifest.chrome.json`, `config/manifest.firefox.json`
- Create: `src/background/index.js`, `src/content_scripts/index.js`, `src/pages/popup.html`, `src/pages/popup.js`
- Create: `src/icons/16.png`, `src/icons/48.png`, `src/icons/128.png` (copy from `../Surfingkeys/src/icons/`)
- Test: `tests/smoke.test.js`

- [ ] **Step 1: Initialize package.json with scripts and deps**

```json
{
  "name": "qutesurf",
  "version": "0.1.0",
  "description": "Keyboard web navigation combining qutebrowser and SurfingKeys.",
  "scripts": {
    "clean": "rimraf dist",
    "build:chrome": "webpack --mode=production --env target=chrome --config ./config/webpack.config.js",
    "build:firefox": "webpack --mode=production --env target=firefox --config ./config/webpack.config.js",
    "build": "npm-run-all clean build:chrome build:firefox",
    "dev:chrome": "webpack --mode=development --env target=chrome --watch --config ./config/webpack.config.js",
    "test": "jest"
  },
  "license": "MIT"
}
```

Then install dev deps (mirror SurfingKeys `package.json` devDependencies plus `rimraf`):
`npm i -D webpack webpack-cli babel-loader @babel/core @babel/preset-env @babel/preset-typescript copy-webpack-plugin string-replace-loader style-loader css-loader file-loader jest @types/jest babel-jest puppeteer jest-image-snapshot npm-run-all rimraf`

- [ ] **Step 2: babel + jest config**

`babel.config.json`:
```json
{ "presets": [["@babel/preset-env", { "targets": { "node": "current" } }], "@babel/preset-typescript"] }
```
`jest.config.js`:
```js
module.exports = { testEnvironment: 'jsdom', moduleNameMapper: {}, setupFilesAfterEnv: [] };
```

- [ ] **Step 3: Write failing smoke test**

`tests/smoke.test.js`:
```js
const { version } = require('../package.json');
test('package has a version', () => { expect(version).toBe('0.1.0'); });
```

- [ ] **Step 4: Run it**

Run: `npm test -- tests/smoke.test.js`
Expected: PASS (confirms toolchain boots).

- [ ] **Step 5: Author MV3 manifests**

`config/manifest.chrome.json` — MV3, `service_worker` background, `action`, host perms `<all_urls>`, permissions from spec §5:
```json
{
  "manifest_version": 3,
  "name": "QuteSurf",
  "version": "0.1.0",
  "icons": { "16": "icons/16.png", "48": "icons/48.png", "128": "icons/128.png" },
  "action": { "default_popup": "pages/popup.html", "default_icon": { "16": "icons/16.png", "48": "icons/48.png" } },
  "background": { "service_worker": "background.js", "type": "module" },
  "permissions": ["tabs","bookmarks","history","storage","clipboardWrite","clipboardRead","downloads","sessions","proxy","nativeMessaging","scripting","topSites"],
  "host_permissions": ["<all_urls>"],
  "content_scripts": [{ "matches": ["<all_urls>"], "match_about_blank": true, "js": ["content.js"], "css": ["content.css"], "run_at": "document_start", "all_frames": true }],
  "web_accessible_resources": [{ "resources": ["pages/*","icons/*"], "matches": ["<all_urls>"] }]
}
```
`config/manifest.firefox.json` — same, plus:
```json
"browser_specific_settings": { "gecko": { "id": "qutesurf@local", "strict_min_version": "121.0" } },
"background": { "scripts": ["background.js"], "type": "module" }
```

- [ ] **Step 6: Webpack multi-target config**

Adapt `../Surfingkeys/config/webpack.config.js`. Entry points: `background` → `src/background/index.js`, `content` → `src/content_scripts/index.js`. Use `--env target` to pick the manifest via `copy-webpack-plugin` (copy `config/manifest.<target>.json` → `dist/<target>/manifest.json`, copy `src/icons` and `src/pages`). Output `dist/<target>/[name].js`.

- [ ] **Step 7: Minimal entry stubs + popup**

`src/background/index.js`: `console.log('QuteSurf background up');`
`src/content_scripts/index.js`: `console.log('QuteSurf content up');`
`src/pages/popup.html` + `popup.js`: a placeholder showing version and active profile (filled in Phase 23).

- [ ] **Step 8: Build both targets**

Run: `npm run build`
Expected: `dist/chrome/manifest.json` and `dist/firefox/manifest.json` exist with `background.js`, `content.js`. Manually load `dist/chrome` as an unpacked extension to confirm it installs without manifest errors.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "chore: scaffold cross-browser MV3 build with webpack and jest"
```

---

## Phase 1 — Command Registry (the spine)

**Files:**
- Create: `src/core/registry.js`
- Test: `tests/core/registry.test.js`

- [ ] **Step 1: Failing test for register + lookup**

```js
const { CommandRegistry } = require('../../src/core/registry');
test('registers and looks up a command by name and alias', () => {
  const r = new CommandRegistry();
  const handler = jest.fn();
  r.register({ name: 'tab-close', aliases: ['tabclose'], description: 'Close tab', args: [], context: 'background', modes: ['normal'], handler });
  expect(r.get('tab-close').description).toBe('Close tab');
  expect(r.get('tabclose').name).toBe('tab-close');
  expect(r.all().length).toBe(1);
});
test('rejects duplicate names', () => {
  const r = new CommandRegistry();
  r.register({ name: 'x', handler(){} });
  expect(() => r.register({ name: 'x', handler(){} })).toThrow(/already registered/);
});
test('search matches name and description substrings', () => {
  const r = new CommandRegistry();
  r.register({ name: 'tab-close', description: 'Close the current tab', handler(){} });
  r.register({ name: 'scroll-down', description: 'Scroll down', handler(){} });
  expect(r.search('tab').map(c => c.name)).toContain('tab-close');
  expect(r.search('current').map(c => c.name)).toContain('tab-close');
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- tests/core/registry.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement registry**

```js
class CommandRegistry {
  constructor() { this._byName = new Map(); }
  register(cmd) {
    if (!cmd || !cmd.name) throw new Error('command requires a name');
    if (this._byName.has(cmd.name)) throw new Error(`command "${cmd.name}" already registered`);
    const full = { aliases: [], description: '', args: [], context: 'content', modes: ['normal'], ...cmd };
    this._byName.set(cmd.name, full);
    for (const a of full.aliases) this._byName.set(a, full);
    return full;
  }
  get(nameOrAlias) { return this._byName.get(nameOrAlias) || null; }
  all() { return [...new Set(this._byName.values())]; }
  search(q) {
    const s = q.toLowerCase();
    return this.all().filter(c => c.name.toLowerCase().includes(s) || (c.description || '').toLowerCase().includes(s));
  }
}
module.exports = { CommandRegistry };
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- tests/core/registry.test.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(core): command registry with aliases and search"
```

---

## Phase 2 — Command-line parser

Parses `:` command lines into `{ name, args, flags }`, supporting qutebrowser-style flags (`-t`, `--rapid`) and `;;` command chaining.

**Files:**
- Create: `src/core/cmdline.js`
- Test: `tests/core/cmdline.test.js`

- [ ] **Step 1: Failing test**

```js
const { parseCommandLine, splitChain } = require('../../src/core/cmdline');
test('parses name, positional args, short and long flags', () => {
  const p = parseCommandLine('open -t --rapid example.com search terms');
  expect(p.name).toBe('open');
  expect(p.flags).toEqual({ t: true, rapid: true });
  expect(p.args).toEqual(['example.com', 'search', 'terms']);
});
test('respects quoted args', () => {
  expect(parseCommandLine('session-save "my session"').args).toEqual(['my session']);
});
test('splits ;; chains', () => {
  expect(splitChain('clear-keychain ;; search ;; fullscreen --leave'))
    .toEqual(['clear-keychain', 'search', 'fullscreen --leave']);
});
```

- [ ] **Step 2: Run, verify fail.** `npm test -- tests/core/cmdline.test.js`

- [ ] **Step 3: Implement**

```js
function splitChain(line) { return line.split(';;').map(s => s.trim()).filter(Boolean); }
function tokenize(line) {
  const out = []; const re = /"([^"]*)"|'([^']*)'|(\S+)/g; let m;
  while ((m = re.exec(line)) !== null) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}
function parseCommandLine(line) {
  const toks = tokenize(line.trim());
  const name = toks.shift() || '';
  const flags = {}; const args = [];
  for (const t of toks) {
    if (t.startsWith('--')) flags[t.slice(2)] = true;
    else if (t.startsWith('-') && t.length > 1 && isNaN(Number(t))) for (const ch of t.slice(1)) flags[ch] = true;
    else args.push(t);
  }
  return { name, flags, args };
}
module.exports = { parseCommandLine, splitChain, tokenize };
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit.** `git commit -am "feat(core): command-line parser with flags and ;; chaining"`

---

## Phase 3 — Trie keymap with counts

Resolves key sequences to commands per mode, supporting numeric counts (`3J`), ambiguous-prefix detection (for the which-key cascade), and a configurable timeout.

**Files:**
- Create: `src/core/trie.js` (adapt `../Surfingkeys/src/content_scripts/common/trie.js`)
- Create: `src/core/keymap.js`
- Test: `tests/core/keymap.test.js`

- [ ] **Step 1: Failing test**

```js
const { KeyMap } = require('../../src/core/keymap');
test('resolves a complete sequence to a command string', () => {
  const km = new KeyMap();
  km.bind('gg', 'scroll-to-perc 0');
  km.bind('G', 'scroll-to-perc');
  expect(km.feed('g')).toEqual({ status: 'pending', candidates: ['gg'] });
  expect(km.feed('g')).toEqual({ status: 'matched', command: 'scroll-to-perc 0', count: null });
});
test('captures a numeric count prefix', () => {
  const km = new KeyMap(); km.bind('J', 'tab-next');
  expect(km.feed('3')).toEqual({ status: 'pending', candidates: expect.any(Array) });
  expect(km.feed('J')).toEqual({ status: 'matched', command: 'tab-next', count: 3 });
});
test('reports no match for unbound key', () => {
  const km = new KeyMap();
  expect(km.feed('z')).toEqual({ status: 'nomatch' });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement KeyMap** (trie of single keys; accumulate leading digits as count; reset on match/nomatch; `candidates` = bound sequences sharing the current prefix). Full implementation in `src/core/keymap.js` using `src/core/trie.js` for prefix storage. Expose `bind(seq, cmd)`, `unbind(seq)`, `feed(key)`, `reset()`.

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit.** `git commit -am "feat(core): trie keymap with count prefixes and ambiguity detection"`

---

## Phase 4 — Profiles & built-in keymaps

Three profiles as plain data, loaded into per-mode `KeyMap`s.

**Files:**
- Create: `src/profiles/qute.js` — translate `../qutebrowser/qutebrowser/config/configdata.yml` `bindings.default` (lines ~3676+). Map qute command names to our registry names (e.g. `cmd-set-text -s :open` → `omnibar-open`, `tab-close` → `tab-close`, `hint` → `hint`, `scroll down` → `scroll-down`). Document every mapping in a header comment.
- Create: `src/profiles/surfingkeys.js` — translate SurfingKeys defaults from `../Surfingkeys/src/content_scripts/common/default.js`.
- Create: `src/profiles/hybrid.js` — curated merge per spec §2 (qute backbone + SurfingKeys hints/omnibar/clipboard).
- Create: `src/profiles/index.js` — `getProfile(name)`, `listProfiles()`.
- Test: `tests/profiles/profiles.test.js`

- [ ] **Step 1: Failing test**

```js
const { getProfile, listProfiles } = require('../../src/profiles');
test('three profiles exist', () => {
  expect(listProfiles().sort()).toEqual(['hybrid', 'qute', 'surfingkeys']);
});
test('qute profile binds J to tab-next and f to hint in normal mode', () => {
  const p = getProfile('qute');
  expect(p.bindings.normal['J']).toBe('tab-next');
  expect(p.bindings.normal['f']).toMatch(/^hint/);
});
test('surfingkeys profile binds E/R to tab cycling', () => {
  const p = getProfile('surfingkeys');
  expect(p.bindings.normal['E']).toMatch(/tab/);
  expect(p.bindings.normal['R']).toMatch(/tab/);
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement the three profile data modules + index.** Each profile: `{ name, bindings: { normal: {...}, insert: {...}, visual: {...} } }`. Translate the full qute `bindings.default.normal` block and SurfingKeys `default.js` mappings. Keep command strings referencing registry command names defined in later phases — that is intentional and acceptable (profiles are pure data).
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit.** `git commit -am "feat(profiles): qute, surfingkeys, and hybrid built-in keymaps"`

---

## Phase 5 — Mode manager (mode stack)

**Files:**
- Create: `src/core/modes.js`
- Test: `tests/core/modes.test.js`

- [ ] **Step 1: Failing test**

```js
const { ModeStack } = require('../../src/core/modes');
test('pushes and pops modes, Escape pops to previous', () => {
  const ms = new ModeStack('normal');
  expect(ms.current()).toBe('normal');
  ms.enter('hints'); expect(ms.current()).toBe('hints');
  ms.enter('insert'); expect(ms.current()).toBe('insert');
  ms.leave(); expect(ms.current()).toBe('hints');
  ms.leave(); expect(ms.current()).toBe('normal');
  ms.leave(); expect(ms.current()).toBe('normal'); // never pops base
});
test('notifies subscribers on change', () => {
  const ms = new ModeStack('normal'); const cb = jest.fn();
  ms.onChange(cb); ms.enter('visual');
  expect(cb).toHaveBeenCalledWith('visual', 'normal');
});
```

- [ ] **Step 2–5:** Implement `ModeStack` (array with a non-poppable base, `enter`/`leave`/`current`/`onChange`), run to green, commit `feat(core): mode stack manager`.

---

## Phase 6 — Unified config store + `:set`/`:bind`

**Files:**
- Create: `src/core/config.js` (storage abstraction; uses `chrome.storage.local`, injectable for tests)
- Create: `src/commands/config-commands.js` (`set`, `bind`, `unbind`, `profile`)
- Test: `tests/core/config.test.js`

- [ ] **Step 1: Failing test** (use an in-memory fake storage)

```js
const { Config } = require('../../src/core/config');
test('set/get round-trips and persists', async () => {
  const mem = {}; const fake = { get: async k => ({ [k]: mem[k] }), set: async o => Object.assign(mem, o) };
  const c = new Config(fake); await c.load();
  await c.set('hintcharacters', 'asdfgh');
  expect(c.get('hintcharacters')).toBe('asdfgh');
  const c2 = new Config(fake); await c2.load();
  expect(c2.get('hintcharacters')).toBe('asdfgh');
});
test('bind adds a user binding for active profile overlay', async () => {
  const mem = {}; const fake = { get: async k => ({ [k]: mem[k] }), set: async o => Object.assign(mem, o) };
  const c = new Config(fake); await c.load();
  await c.bind('normal', 'gh', 'open https://example.com');
  expect(c.getUserBindings('normal')['gh']).toBe('open https://example.com');
});
```

- [ ] **Step 2–5:** Implement `Config` (defaults + user overrides + per-mode user bindings; `load`, `set`, `get`, `bind`, `unbind`, `setProfile`, `getActiveProfile`, `getUserBindings`). Register `:set`/`:bind`/`:unbind`/`:profile` in `config-commands.js`. Run to green, commit `feat(core): unified config store with :set/:bind runtime commands`.

---

## Phase 7 — Background service worker (MV3)

Port `../Surfingkeys/src/background/{start,chrome,firefox}.js` into MV3 service-worker form. Replace persistent-background assumptions with `chrome.storage`-backed state and event-driven wake. Provide a message router that dispatches `context: 'background'` commands.

**Files:**
- Create: `src/background/index.js` (router + lifecycle), `src/background/tabs.js`, `src/background/history.js`, `src/background/bookmarks.js`, `src/background/downloads.js`
- Test: `tests/background/tabs.test.js`, `tests/background/router.test.js` (mock the `chrome` API with a fake)

- [ ] **Step 1: Failing test for the router**

```js
const { makeRouter } = require('../../src/background/index');
test('routes a background command message to its handler', async () => {
  const registry = { get: () => ({ name: 'tab-close', context: 'background', handler: jest.fn().mockResolvedValue('ok') }) };
  const route = makeRouter(registry);
  const res = await route({ type: 'command', name: 'tab-close', args: [], sender: { tab: { id: 5 } } });
  expect(res).toEqual({ ok: true, result: 'ok' });
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement `makeRouter`** + register tab/history/bookmark/download commands (`tab-close`, `tab-new`, `tab-clone`, `tab-next`, `tab-prev`, `tab-pin`, `tab-mute`, `tab-move`, `tab-undo`, `tab-only`, `tab-detach`, `history-search`, `bookmark-search`, `download-url`) using `chrome.tabs`/`chrome.history`/`chrome.bookmarks`/`chrome.downloads`. Wire `chrome.runtime.onMessage` → `route` in `index.js`. Mock `chrome` via a `tests/helpers/fake-chrome.js`.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit.** `git commit -am "feat(background): MV3 service worker router and tab/history/bookmark commands"`

---

## Phase 8 — Content bootstrap, message bus, Shadow-DOM host

Wires content-side pieces together: builds the registry, loads config + active profile into per-mode KeyMaps, instantiates the ModeStack, listens for keydown, resolves via KeyMap, and dispatches commands (content-context locally, background-context via `chrome.runtime.sendMessage`). Creates a Shadow-DOM host element for all Glass UI.

**Files:**
- Create: `src/content_scripts/index.js` (bootstrap), `src/content_scripts/dispatcher.js`, `src/content_scripts/keyhandler.js`, `src/content_scripts/ui/host.js`
- Reference: `../Surfingkeys/src/content_scripts/common/{runtime,normal,keyboardUtils,observer}.js`
- Test: `tests/content/dispatcher.test.js`, `tests/content/keyhandler.test.js`

- [ ] **Step 1: Failing test for dispatcher**

```js
const { Dispatcher } = require('../../src/content_scripts/dispatcher');
test('runs content command locally, sends background command over messaging', async () => {
  const sent = [];
  const registry = { get: n => ({ 'scroll-down': { name:'scroll-down', context:'content', handler: jest.fn() },
                                  'tab-close':  { name:'tab-close',  context:'background' } }[n]) };
  const d = new Dispatcher(registry, { sendMessage: m => { sent.push(m); return Promise.resolve({ ok:true }); } });
  await d.run('scroll-down', { count: 2 });
  expect(registry.get('scroll-down').handler).toHaveBeenCalled();
  await d.run('tab-close', {});
  expect(sent[0]).toMatchObject({ type:'command', name:'tab-close' });
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement Dispatcher + KeyHandler + bootstrap + Shadow host.** KeyHandler attaches a capturing `keydown` listener, converts events to qute-style key notation (port `keyboardUtils.js`), feeds the active-mode KeyMap, shows the which-key cascade on `pending`, runs the command on `matched`. Shadow host (`host.js`) creates a `<div>` with `attachShadow({mode:'closed'})` and injects the Glass stylesheet.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit.** `git commit -am "feat(content): bootstrap, key handler, dispatcher, shadow-dom host"`

---

## Phase 9 — Hints engine (port + Glass restyle)

**Files:**
- Create: `src/content_scripts/hints.js` (port `../Surfingkeys/src/content_scripts/common/hints.js`)
- Create: `src/content_scripts/ui/hints.css` (Modern Glass: violet gradient chips `#7c5cff`→`#a855f7`, soft glow, rounded)
- Register commands in `src/commands/hint-commands.js`
- Test: `tests/content/hints.test.js` (jsdom: synthesize a DOM with links, assert label generation + filtering)

- [ ] **Step 1: Failing test** — `generateHintLabels(n, 'asdfg')` returns `n` unique labels from the charset; `filterHintTargets(targets, 'F')` narrows by typed label.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Port hints.js**, expose `generateHintLabels`, `collectTargets(selector)`, `filterHintTargets`. Register commands: `hint` (follow), `hint-newtab`, `hint-yank`, `hint-hover`, `hint-input`, `hint-download`, `hint-images`, `hint-multi`, `hint-text`. Each enters `hints` mode via ModeStack and renders Glass labels in the Shadow host.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit.** `git commit -am "feat(content): hints engine with Modern Glass labels"`

---

## Phase 10 — Scroll & navigation commands

**Files:**
- Create: `src/commands/nav-commands.js`
- Reference: `../Surfingkeys/src/content_scripts/common/normal.js` (scroll helpers)
- Test: `tests/content/nav.test.js`

- [ ] **Step 1: Failing test** — `scrollBy` helper computes correct deltas for `down/up/left/right/halfpage/fullpage` given a fake scroller; `urlUp('https://a.com/x/y')` → `https://a.com/x`; `urlRoot('https://a.com/x/y')` → `https://a.com/`.
- [ ] **Step 2–5:** Implement and register: `scroll-down`,`scroll-up`,`scroll-left`,`scroll-right`,`scroll-halfpage-down`,`scroll-halfpage-up`,`scroll-page-down`,`scroll-page-up`,`scroll-to-top`,`scroll-to-bottom`,`scroll-to-perc`,`back`,`forward`,`reload`,`reload-hard`,`stop`,`url-up`,`url-root`,`home`. (`back`/`forward`/`reload` are content commands using `history`/`location`.) Run to green; commit `feat(commands): scrolling and navigation`.

---

## Phase 11 — Omnibar + sources (port + Glass restyle)

**Files:**
- Create: `src/content_scripts/ui/omnibar.js` (port `../Surfingkeys/src/content_scripts/ui/omnibar.js`)
- Create: `src/content_scripts/ui/omnibar.css` (Modern Glass per the approved mockup: centered floating panel, blur backdrop, violet accent, source badges, fuzzy-match highlight, two-line rows w/ favicon)
- Create: `src/content_scripts/ui/sources.js` (URL+search, bookmarks, history, tabs, aliases, commands, marks)
- Register commands in `src/commands/omnibar-commands.js`
- Test: `tests/content/sources.test.js` (fuzzy ranking, source badge assignment)

- [ ] **Step 1: Failing test** — `fuzzyRank('exmpl', ['example.com','other'])` ranks `example.com` first with match-index highlight ranges; `sourceFor(item)` returns the correct badge label.
- [ ] **Step 2–5:** Port omnibar, implement sources (background-context queries via messaging for history/bookmarks/tabs), restyle to Glass, register: `omnibar-open`, `omnibar-open-newtab`, `omnibar-bookmarks`, `omnibar-history`, `omnibar-tabs`, `omnibar-commands`, `omnibar-marks`, `cmdline` (`:`). Run to green; commit `feat(content): omnibar and sources in Modern Glass`.

---

## Phase 12 — Statusline + which-key cascade (Glass)

**Files:**
- Create: `src/content_scripts/ui/statusline.js`, `src/content_scripts/ui/statusline.css`
- Create: `src/content_scripts/ui/whichkey.js`, `src/content_scripts/ui/whichkey.css`
- Test: `tests/content/statusline.test.js`

- [ ] **Step 1: Failing test** — `renderStatus({mode:'normal', host:'example.com', percent:34})` produces a node whose text contains the mode badge, host, and `34%`; `whichkey.render(candidates)` lists each pending key + its command.
- [ ] **Step 2–5:** Implement Glass statusline (subscribes to `ModeStack.onChange` + scroll), which-key cascade (shown by KeyHandler on `pending`). Run to green; commit `feat(content): glass statusline and which-key cascade`.

---

## Phase 13 — Find mode

**Files:** Create `src/content_scripts/find.js`, `src/content_scripts/ui/findbar.css`; register in `src/commands/find-commands.js`; Test `tests/content/find.test.js`.

- [ ] **Steps:** Failing test for match collection + `next`/`prev` index wrap and case/regex options → implement (port find logic from SurfingKeys `normal.js`/`visual.js`) → register `find`, `find-next`, `find-prev` → Glass find bar → green → commit `feat(content): in-page find with glass find bar`.

---

## Phase 14 — Visual / caret mode (port)

**Files:** Create `src/content_scripts/visual.js` (port `../Surfingkeys/src/content_scripts/common/visual.js`); register in `src/commands/visual-commands.js`; Test `tests/content/visual.test.js`.

- [ ] **Steps:** Failing test for caret motion helpers (`moveCaret('w')`, selection toggle) → port + adapt → register `caret-mode`, `visual-mode`, motions, `selection-toggle`, `yank-selection` → green → commit `feat(content): visual and caret mode`.

---

## Phase 15 — Yank / clipboard (port)

**Files:** Create `src/content_scripts/clipboard.js` (port `../Surfingkeys/src/content_scripts/common/clipboard.js`); register in `src/commands/yank-commands.js`; Test `tests/content/clipboard.test.js`.

- [ ] **Steps:** Failing test for `markdownLink(title,url)` and `yankFormat` helpers → port → register `yank-url`, `yank-title`, `yank-mdlink`, `yank-selection`, `yank-anchor`, `paste-and-go`, `paste-and-go-newtab` → green → commit `feat(content): clipboard yank commands`.

---

## Phase 16 — Marks & quickmarks

**Files:** Create `src/commands/marks-commands.js`, `src/core/marks.js` (config-backed); Test `tests/core/marks.test.js`.

- [ ] **Steps:** Failing test for `setMark('a', {url,scroll})` / `getMark('a')` round-trip via Config → implement → register `mark-set`, `mark-jump`, `quickmark-save`, `quickmark-open`, `quickmark-open-newtab` → green → commit `feat: local/global marks and quickmarks`.

---

## Phase 17 — Sessions save/restore

**Files:** Create `src/background/sessions.js`; register in `src/commands/session-commands.js`; Test `tests/background/sessions.test.js` (fake chrome.tabs/windows).

- [ ] **Steps:** Failing test for `saveSession('work', tabs)` → stored; `loadSession('work')` → opens stored URLs → implement via `chrome.storage` + `chrome.tabs.create` → register `session-save`, `session-load`, `session-list`, `session-delete` → green → commit `feat(background): session save/restore`.

---

## Phase 18 — Search-engine aliases

**Files:** Create `src/core/search-engines.js`; integrate with omnibar `omnibar-open`; Test `tests/core/search-engines.test.js`.

- [ ] **Steps:** Failing test — `resolveQuery('g cats')` → `https://www.google.com/search?q=cats` using configured aliases; bare URL passes through; non-URL non-alias uses default engine. Implement, seed defaults (`g`,`d`,`b`,`w`,`gh`,`so`), make aliases config-editable via `:set searchengines`. Green → commit `feat: configurable search-engine aliases`.

---

## Phase 19 — Proxy / PAC

**Files:** Create `src/background/proxy.js` (reference `../Surfingkeys/firefox_pac.js`); register in `src/commands/proxy-commands.js`; Test `tests/background/proxy.test.js`.

- [ ] **Steps:** Failing test for `buildPac(rules)` producing a valid PAC string for host patterns → implement via `chrome.proxy` → register `proxy-set`, `proxy-clear`, `proxy-toggle-host` (matches the manifest `commands.proxyThis` analogue) → green → commit `feat(background): proxy and PAC management`.

---

## Phase 20 — Userscripts (per-domain injection)

**Files:** Create `src/content_scripts/userscripts.js`, `src/core/userscripts.js` (config-backed store); Test `tests/core/userscripts.test.js`.

- [ ] **Steps:** Failing test — `matchScripts('https://example.com/x', scripts)` returns scripts whose `@match` glob matches; `parseMeta(src)` extracts `@match`/`@name` → implement → inject matched scripts into page context at `document_idle` via a script element in the page world → register `userscript-add`, `userscript-list`, `userscript-remove` → green → commit `feat: per-domain userscripts`.

---

## Phase 21 — Embedded ACE Vim editor (port)

**Files:** Create `src/content_scripts/ui/editor.js` (port `../Surfingkeys/src/pages/markdown.*` ACE usage + the input-takeover logic from `insert.js`); register `edit-with-vim`; bundle ACE; Test `tests/content/editor.test.js`.

- [ ] **Steps:** Failing test for `extractInputValue(el)` / `writeBackValue(el, text)` round-trip on textarea + contenteditable → port ACE editor overlay with Vim keybindings in the Shadow host → register `edit-with-vim` (default `<C-i>` in insert mode per profiles) → green → commit `feat(content): embedded ACE vim editor for inputs`.

---

## Phase 22 — Neovim native integration (port)

**Files:** Create `src/nvim/` (port `../Surfingkeys/src/nvim/**`), `src/pages/neovim.{html,js}` (port), `native-host/` (Node native-messaging host + install scripts); register `edit-with-nvim`; Test `tests/nvim/transport.test.js`.

- [ ] **Steps:** Failing test for the msgpack transport framing (port SurfingKeys nvim transport tests) → port the nvim client/transport/server modules → wire native-messaging from background (`chrome.runtime.connectNative`) → graceful fallback to ACE editor when host absent (Phase 21) → register `edit-with-nvim` → green → commit `feat: real neovim integration via native messaging with ACE fallback`.

---

## Phase 23 — Options page + JS settings editor + profile switcher

**Files:** Create `src/pages/options.{html,js,css}` (Modern Glass), `src/pages/popup.{html,js}` (fill in), `src/core/js-settings.js` (sandboxed evaluator exposing the SurfingKeys API: `mapkey`,`map`,`unmap`,`aliases`,`Hints`,`Visual`,`settings`); Test `tests/core/js-settings.test.js`.

- [ ] **Steps:** Failing test — running a settings script calling `mapkey('gh','open example.com')` produces a user binding in Config; `unmap('gh')` removes it → implement evaluator + options GUI (profile dropdown `qute|surfingkeys|hybrid`, `:set` options table, JS editor textarea, save → Config) → popup shows active profile + quick toggle → green → commit `feat(pages): options page, JS settings API, profile switcher`.

---

## Phase 24 — Help / cheatsheet (generated)

**Files:** Create `src/pages/help.{html,js,css}`; register `help`; Test `tests/pages/help.test.js`.

- [ ] **Steps:** Failing test — `buildCheatsheet(registry, profile)` returns rows pairing each bound key sequence (active profile + user overrides) with its command name + description, grouped by category, and flags commands with no binding → implement searchable Glass help page → register `help` (bound to `?`) → green → commit `feat(pages): generated searchable help cheatsheet`.

---

## Phase 25 — Integration tests & cross-browser packaging

**Files:** Create `tests/e2e/{hints,omnibar,modes}.e2e.test.js` (Puppeteer, adapt `../Surfingkeys/tests` + `config/webpack.test.config.js`); Create `scripts/package.sh` (zips `dist/chrome` and `dist/firefox`).

- [ ] **Step 1:** Adapt SurfingKeys puppeteer harness to load `dist/chrome` unpacked.
- [ ] **Step 2:** E2E: open a fixture page, press `f`, type a hint label, assert navigation. Press `:`, type `tab-`, assert omnibar suggestions. Enter/leave modes, assert statusline text.
- [ ] **Step 3:** Run `npm run build` then the e2e suite → green.
- [ ] **Step 4:** `scripts/package.sh` produces `qutesurf-chrome.zip` and `qutesurf-firefox.zip`. Verify Firefox build loads via `about:debugging`.
- [ ] **Step 5: Commit.** `git commit -am "test(e2e): puppeteer integration suite and cross-browser packaging"`

---

## Self-review notes (coverage map)

- Spec §2 keymap profiles → Phase 4; config model → Phases 6, 23; optional features → embedded editor Phase 21, neovim Phase 22, proxy Phase 19, sessions Phase 17, userscripts Phase 20; Modern Glass → Phases 9, 11, 12, 13, 23, 24; MV3 both → Phases 0, 7, 25.
- Spec §3 architecture: registry Phase 1; profiles/keymap Phases 3–4; modes Phase 5; content scripts Phases 8–15, 20, 21; background Phase 7, 17, 19, 22; overlays Phases 9, 11, 12, 13; config Phases 6, 23.
- Spec §4 feature set: every listed command category has a registering phase (navigation 10, hints 9, tabs 7, omnibar 11, find 13, yank 15, visual 14, marks 16, sessions 17, search engines 18, proxy 19, userscripts 20, editor 21/22, help/settings 23/24).
- Spec §6 testing: unit tests in every phase; Puppeteer e2e in Phase 25.
- Spec §7 reuse map: each "port" task names the exact SurfingKeys source path; each qute "translate" task names the configdata source.
