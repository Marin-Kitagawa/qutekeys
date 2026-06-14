# QuteSurf — Design Spec

**Date:** 2026-06-14
**Status:** Approved (design), pending implementation plan
**Working name:** QuteSurf (rename freely)

## 1. Goal

A single cross-browser WebExtension (Chrome + Firefox) for advanced keyboard-based
web navigation, combining the features of **qutebrowser** and **SurfingKeys** that
are achievable inside a WebExtension sandbox: the keybinding philosophy, the `:`
command palette, the mode model, and the full navigation/hinting/clipboard/omnibar
feature set of both.

Out of scope (cannot be done in an extension): owning the browser chrome itself,
replacing the native URL bar, native tab rendering, qutebrowser's Qt/Python config
files run as code. These are approximated with extension-level equivalents.

## 2. Key decisions (from brainstorming)

- **Keymap model:** Ship **both complete keymaps as switchable profiles** —
  `qute`, `surfingkeys`, and a curated `hybrid`. Hot-swappable at runtime; fully
  remappable. No conflict resolution needed because only one profile is active.
- **Config model:** **Unified.** A single `chrome.storage`-backed store is mutated by
  (a) qutebrowser-style `:set` / `:bind` runtime commands, (b) a SurfingKeys-style JS
  settings editor (`mapkey`/`unmap`/`map`/`aliases`/`Hints`/`Visual` API), and (c) a GUI
  options page. All three read/write the same store.
- **Optional features — ALL in scope for v1:** embedded Vim editor, real Neovim native
  integration, proxy/PAC management, sessions + userscripts.
- **Visual language:** **Modern Glass** — translucent blurred panels, centered floating
  command palette, violet accent (`#7c5cff`), soft shadows, rounded corners. Applies to
  the omnibar, hint labels, statusline, find bar, and which-key cascade. Dark theme
  default; themeable.
- **Manifest:** **Manifest V3 for both** Chrome and Firefox.

## 3. Architecture

Layered, single codebase compiled to two browser targets.

```
┌─ UI Overlays (Modern Glass, Shadow-DOM isolated) ─────────────┐
│  command palette/omnibar · hint labels · statusline ·          │
│  find bar · which-key cascade · visual feedback                │
├─ Content Scripts ─────────────────────────────────────────────┤
│  hints · scroll · visual/caret · find · marks · yank ·         │
│  embedded Vim editor · DOM glue                                 │
├─ Mode Manager (mode stack)                                     │
├─ Keymap + Profile layer  (qute | surfingkeys | hybrid)        │
├─ Command Registry  (single source of truth: named commands)   │
├─ Background Service Worker ────────────────────────────────────┤
│  tabs/windows · history+bookmark queries · sessions · proxy/   │
│  PAC · downloads · native-messaging (nvim) · settings store    │
└─ Config system (unified store; :set/:bind + JS API + options)  │
```

### 3.1 Command Registry (the spine)

Every action — from qutebrowser and SurfingKeys alike — is a single **named command**
with metadata:

```
{
  name: "tab-close",
  aliases: ["tabclose"],
  description: "Close the current tab",
  args: [{ name: "count", type: "int", optional: true }],
  context: "background" | "content",   // where the handler runs
  modes: ["normal"],                    // valid invocation modes
  handler: (ctx, args) => {...}
}
```

Commands are the unit that `:command`, key bindings, the omnibar command source,
and `:help` all reference. This makes "two keymaps" cheap: a profile is just a
`keySequence -> commandInvocation` map per mode.

### 3.2 Profile / Keymap layer

- A **profile** = `{ name, bindings: { mode: { keySeq: "command args" } } }`.
- Three built-in profiles (`qute`, `surfingkeys`, `hybrid`); the active one is in config.
- User overrides merge on top (via `:bind`/`:unbind` and `mapkey`/`unmap`).
- Resolution is trie-based key-sequence matching with timeout, supporting counts
  (e.g. `3J`) and the which-key cascade overlay for ambiguous prefixes.

### 3.3 Mode Manager

Mode **stack** (qutebrowser semantics): `Normal`, `Insert`, `Visual`/`Caret`,
`Hints`, `Command` (omnibar/palette open), `PassThrough`/`Ignore`, `Find`.
Entering a mode pushes; `<Esc>` pops. The statusline reflects the top of the stack.

### 3.4 Content scripts

Ported and restyled from SurfingKeys' `content_scripts/`: hints engine, scrolling,
visual/caret mode, find, marks, yank/clipboard, embedded ACE Vim editor, and the
DOM glue. All UI rendered through a Shadow-DOM host to isolate Glass styles from
the page.

### 3.5 Background service worker

Tab/window operations, `history`/`bookmarks` queries feeding the omnibar, session
save/restore, proxy/PAC switching, downloads, native-messaging bridge to Neovim,
the settings store, and cross-tab/cross-frame message routing.

### 3.6 UI Overlays (Modern Glass)

Rebuilt from SurfingKeys' `front` iframe UI, restyled:
- **Command palette / omnibar** — centered floating panel, blur backdrop, violet
  accent, fuzzy-match highlighting, source badges (URL/bookmark/history/tab/command/
  mark), two-line rows with favicon. Triggered by `:` (command), `t`/`o` (open),
  `b` (bookmarks), etc. per profile.
- **Hint labels** — violet gradient chips with soft glow, near each target.
- **Statusline** — translucent rounded bar; mode badge + URL/host + scroll %.
- **Find bar** and **which-key cascade** in the same language.
- Themeable via CSS variables; dark default.

### 3.7 Config system (unified store)

One store in `chrome.storage.local` (with `sync` opt-in). Schema covers: active
profile, user bindings, `:set`-able options (qutebrowser settings catalog translated
to extension-relevant keys), search engines/aliases, quickmarks, sessions, proxy
rules, userscripts, theme. Mutated by `:set`/`:bind`, the JS settings editor (run in
a sandboxed context), and the GUI options page.

## 4. Feature set (all as commands)

- **Navigation:** scroll (`j/k/d/u/gg/G/h/l`, half/full page), back/forward, reload
  (+hard), stop, URL nav up/root (`gu`/`gU`), open/edit URL, home.
- **Hints:** follow, open-new-tab, yank link, hover, focus input, download, images,
  multi-select, text-filtered, copy text.
- **Tabs:** open/close/clone/pin/mute/move/undo-close/next/prev/first/last/goto-by-
  number/detach/only.
- **Omnibar sources:** URL+search, bookmarks, history, open tabs, search-engine
  aliases, commands, marks/quickmarks.
- **Find:** in-page search, `n`/`N`, case/regex options.
- **Yank/clipboard:** url, title, markdown link, selection, anchor; paste-and-go.
- **Visual / caret mode:** vim-like text selection and motions.
- **Marks:** local + global marks, quickmarks.
- **Sessions:** named save/restore (`:session-save`/`:session-load`).
- **Search engines:** configurable aliases (`:open g query`).
- **Proxy / PAC:** switch proxy, PAC rules (requires `proxy` permission).
- **Userscripts:** per-domain JS injection (Greasemonkey-lite), run in page context.
- **Editor:** embedded ACE Vim editor for any input/textarea; optional **real Neovim**
  via a native-messaging host (port SurfingKeys `src/nvim`).
- **Help/settings:** `:set`, `:bind`, options page, profile switcher, `?`/`:help`
  searchable cheatsheet generated from the command registry + active profile.

## 5. Cross-browser build

- Manifest V3 for both; `browser_specific_settings` for Firefox (gecko id, min
  version) and an event-page fallback for Firefox background differences.
- Reuse SurfingKeys' webpack multi-target config → `dist/chrome/` and `dist/firefox/`.
- Permissions: `tabs`, `bookmarks`, `history`, `storage`, `clipboardWrite`,
  `clipboardRead`, `downloads`, `sessions`, `proxy`, `nativeMessaging`, `scripting`,
  `<all_urls>` host permissions.

## 6. Testing

- **Jest** unit tests: command registry, trie-based keymap resolution (incl. counts &
  profiles), command-line parser, config store, search-engine alias parsing.
- **Puppeteer** integration: hints flow, omnibar fuzzy search, mode transitions —
  reusing SurfingKeys' existing puppeteer + jest-image-snapshot setup.

## 7. Source reuse map

| Capability | Source | Action |
|---|---|---|
| Hints, omnibar, visual, clipboard, normal dispatcher, `front` UI | SurfingKeys | Port + restyle to Glass |
| Neovim bridge (`src/nvim`) | SurfingKeys | Port |
| ACE Vim editor | SurfingKeys | Port |
| Webpack multi-target build, jest/puppeteer | SurfingKeys | Reuse |
| Command names/semantics, default keymap, settings catalog, mode model, statusline format, search-engine config | qutebrowser | Translate Python → JS command registry + profile data |

## 8. Risks / notes

- Real Neovim integration requires a separately-installed native-messaging host;
  the extension degrades gracefully to the embedded ACE editor when absent.
- MV3 service-worker lifecycle (termination) must be handled for long-lived state
  (sessions, nvim connections) — keep authoritative state in `chrome.storage` and
  reconnect on wake.
- Some qutebrowser commands have no WebExtension equivalent and are intentionally
  dropped or remapped to the nearest extension capability; the help page notes these.
```
