# Feature Parity Audit — SurfingKeys + qutebrowser → QuteSurf

**Date:** 2026-09-29
**Supersedes:** `KEYBINDING-GAP-AUDIT.md` (2026-06-14; its waves 1–6 were implemented).
**Method:** full re-inventory of all three repos. SurfingKeys: `default.js`, `normal.js`,
`insert.js`, `visual.js`, `hints.js`, `omnibar.js`, `command.js`, `api.js`, `background/*`,
`pages/*`. qutebrowser: every `@cmdutils.register` site, `configdata.yml`, mode system.
QuteSurf: `src/core/registry.js`, all `src/commands/*.js`, `src/content_scripts/*`,
`src/background/*`, profiles.

## Current state

QuteSurf registers **~150 commands** (content + background) plus 3 profiles, omnibar with
9 sources, hints engine with 20+ variants, visual/caret, macros, marks, sessions, proxy,
userscripts, ACE editor, native-messaging Neovim, themes.

**Known defects found during this audit (fix first):**

1. `registerConfigCommands` (`src/commands/config-commands.js`) is **never called** —
   `:set`, `:bind`, `:unbind`, `:profile` do not work.
2. `mode-insert` / `mode-normal` are bound in all profiles and listed in
   `CANONICAL_COMMANDS` but have **no handler** — no Insert mode exists.
3. Omnibar `marks` source is broken: reads `config.get('marks')` as `key→url` but
   `core/marks.js` stores `key→{url, scrollY}`; navigation is blocked by URL safety.
4. `home` is a stub (no configurable homepage).
5. `reload-hard` uses deprecated `location.reload(true)` semantics (plain reload).
6. `visual-restore` only re-enters caret mode; selection is not persisted.

## A. Still missing from SurfingKeys (feasible in MV3)

### Insert mode (biggest gap)
- Real Insert mode with mode-stack integration (`i` via hints already focuses input; need
  auto-enter on focus, `<Esc>` leave, statusline indicator).
- Insert-mode readline keys: `<C-e>` end-of-line, `<C-a>`/`<C-f>` beginning, `<C-u>` delete
  before cursor, `<A-b>`/`<A-f>` word motions, `<A-w>`/`<A-d>` word deletes.
- `<C-'>` toggle quotes, emoji insertion picker (`:` in insert mode), `<C-i>` open vim editor.

### Visual mode completion
- `f`/`F` char-seek with `;`/`,` repeat; `o` other end of selection; `p` expand to parent
  element; `Enter`/`Shift-Enter` click node under cursor; `*` search selection (have
  search-word for word); selection persistence for `visual-restore`; `zt`/`zz`/`zb` verify.

### Find
- `*` find from selection (current `search-word` uses `window.find`, needs highlight
  integration with find.js); find history; `<C-d>` delete match via findbar.

### Yank / clipboard
- `yy` with count (URLs of next N tabs); `yQ` copy omnibar/query history; `;ph` paste
  histories; `;yh` yank history URLs; capture **full page** (`yG`) and **scrolling
  element** (`yS`) via scrolling stitch of `captureVisibleTab`.

### Omnibar key handling
- `<C-d>` delete focused item, `<C-D>` delete all listed, `<C-.>`/`<C-,>` result paging,
  `<C-c>` copy focused URL / all URLs, `<C-r>` re-sort history (visitCount/lastVisitTime),
  `<C-m>` create mark for focused item, `<C-'>` toggle quotes, Tab/Backspace expand/collapse
  search alias, `,` toggle folders-only in bookmarks source.

### Search-with-selected leader keys
- Auto-generated `og`/`s<alias>`-style bindings per search alias: search selection with
  engine, interactive prompt variant, site-restricted (`so<alias>`).

### Proxy completion
- Proxy *modes* (`always`/`byhost`/`direct`/`system`/`clear`), toggle-proxy-for-site (`cp`),
  copy/apply proxy config from clipboard (`;cp`/`;ap`).

### Browser-chrome URLs & misc
- Chrome URL shortcuts (bookmarks/downloads/history/extensions/…), inspect element.
- `ZZ` save-session+close window, `ZR` restore last session, `ZQ` close window.
- `feedkeys` as a `:` command; `;ql` show last action; `timeStamp`.
- Tab queue (queue URLs from omnibar, list/clear).
- TTS voices list/test (`listVoices`, `testVoices`).
- Tab groups picker UI (chrome.tabGroups) — `tab-group` currently a no-op.
- Open link in Firefox container (`;cl`, firefox only).

### Higher-effort SurfingKeys features (pluggable, no hard dependency)
- PDF viewer (bundle pdf.js; override `application/pdf` via `webRequest`/`declarativeNetRequest`).
- Markdown preview (`;pm`) of selection or clipboard.
- Inline query / dictionary bubble + `registerInlineQuery` API (`Q`, `v`+`q`, `cq`).
- LLM chat panel (`A`), LLM translate, grammar correction — pluggable user endpoint only.
- Emoji picker data + insert-mode integration.
- MV3 user-scripts world API parity (currently page-world injection only).

## B. Still missing from qutebrowser (feasible in MV3)

### Config system
- Register `:set` / `:bind` / `:unbind` / `:profile` (wiring bug above).
- `:config-cycle`, `:config-unset`, `:config-diff`, `:config-list-add/remove`,
  `:config-dict-add/remove`, `:config-clear`.
- Per-domain option patterns (`-u`), temp vs saved (`--temp`), `opt?` print semantics.

### Navigation / tabs
- `:navigate` unified (prev/next/up/increment/decrement with count) — pieces exist.
- `:tab-focus stack-prev/stack-next` (traversal stack), `:undo --window`,
  `:tab-take` from other window, `:tab-select` fuzzy by URL/title.
- `open -w`/`-p` (window/private) variants for `:open`, quickmark-load targets.

### Scrolling / zoom
- `:scroll-px`, `:scroll-to-anchor <name>`, horizontal `scroll-to-perc -x`,
  `scroll-page` top/bottom-navigate wrap-to-next-page.
- `:zoom <level>` absolute set.

### Caret mode
- Full `move-to-*` command surface (15 commands incl. word/char/block boundaries),
  `:selection-drop`, `:selection-reverse`, `:selection-follow [-t]`.

### Downloads manager
- Download list UI + `:download-cancel/delete/open/retry/clear/remove`, MHTML save
  (`:download --mhtml` via `pageCapture` API), open downloaded file / folder.

### Page / misc
- `:jseval` (via `chrome.scripting.executeScript`), `:fake-key` (synthetic key events),
  `:insert-text`, `:click-element` (id/css/position filters), `:screenshot --rect`.
- `:messages` + `message-info/warning/error` in-page notification log.
- `:repeat` / `:run-with-count` / `:later <ms> <cmd>`, `:repeat-command`.
- `:history` full page (qute://history equivalent), `:history-clear`.
- `:edit-url` with real editor prefill (current edit-url-open is omnibar-only).
- `:help <topic>` deep links (have generated cheatsheet; add per-command anchors).
- Adblock-lite via `declarativeNetRequest` (`:adblock-update` analog).
- `:devtools` open devtools for tab (`chrome.tabs` + `chrome.developerPrivate` is
  Chrome-only — approximate with `inspect` fallback or mark N/A on Firefox).

### Correctly N/A in a WebExtension (do not port)
Standalone-browser chrome (URL bar, statusbar-as-window, window management beyond
tabs API), Qt prompt/yesno modes (browser has native dialogs), `:spawn` (only via
optional native messaging host), `:config-source`/`config-edit` (no filesystem;
JS settings API in sandbox covers this), X11 primary selection, `quit`/`restart`
browser process, QtWebKit-specific debug commands.

## C. Implementation plan (waves)

1. **Wave 0 — defect fixes:** register config commands, Insert mode, marks source,
   home config, reload-hard, visual-restore persistence.
2. **Wave 1 — config system:** config-cycle/unset/diff/list/dict commands, `-u` patterns,
   temp semantics; omnibar readline/history keys.
3. **Wave 2 — visual/find completion:** char-seek, other-end, expand-parent, click-node,
   selection persistence, `*` from selection, findbar delete.
4. **Wave 3 — yank/capture:** counted yy, full-page/scroll-element capture, history
   yank/paste, query-history copy.
5. **Wave 4 — qutebrowser surface:** navigate unified, scroll-px/anchor/perc-x,
   zoom absolute, caret move-to-*, selection-drop/reverse/follow, jseval, fake-key,
   insert-text, click-element, messages, repeat/later, history page.
6. **Wave 5 — downloads manager:** list UI, cancel/retry/open/clear, MHTML.
7. **Wave 6 — SurfingKeys browser features:** proxy modes, chrome URLs, ZZ/ZR, feedkeys,
   tab queue, TTS voices, tab-group picker, containers (Firefox).
8. **Wave 7 — omnibar key handling + search-with-selected leaders.**
9. **Wave 8 — pluggable extras (opt-in):** PDF viewer, markdown preview, inline query,
   LLM chat (user-configured endpoint), emoji picker.

Waves 0–8 deliver full feasible parity. Items marked N/A are documented, not ported.

## D. Implementation status (updated 2026-09-29)

- **Wave 0 — DONE:** config commands registered; real Insert mode
  (`src/content_scripts/insert.js`: auto-entry on editable focus, Esc exit,
  readline keys `<C-e>/<C-a>/<C-f>/<C-u>/<A-b>/<A-f>/<A-w>/<A-d>/<C-'>`, insert-mode
  keymap); omnibar `marks` source fixed (handles `{url, scrollY}` entries);
  `homepage` option + working `home`; `reload-hard` via `chrome.tabs.reload`
  (bypassCache); `visual-restore` persists the last selection range.
- **Wave 1 — DONE:** `:config-cycle`, `:config-unset`, `:config-clear` + Config
  `cycle/unset/clearOptions`; custom search-engine aliases now survive config
  load (`getSearchEngines()`).
- **Wave 2 — DONE (mostly):** visual mode already had o/p/V/f/F/;/,/Enter/*/zt/zz/zb;
  added `selection-drop`, `selection-reverse`, `selection-follow [-t]`.
- **Wave 3 — DONE:** counted `yank-url` (next N tabs), `capture-full-page`
  (scrolling stitch → PNG download), `download-dataurl` background command.
- **Wave 4 — DONE:** `scroll-px`, `scroll-to-anchor`, `scroll-to-perc -x`,
  `zoom <perc>`, `run-with-count`, `later`, `insert-text`, `fake-key`,
  `message-info/warning/error` + `messages` banner, `jseval` (background,
  `scripting.executeScript`, MAIN/ISOLATED world).
- **Wave 5 — DONE:** download manager commands (`download-list/cancel/remove/
  clear/open/show`, `download-mhtml`) + `omnibar-downloads` source; omnibar
  `<C-c>` copy focused/all URLs, `<C-d>` delete focused history/bookmark entry.
- **Wave 6 — DONE:** `proxy-server` + `proxy-mode always|direct|system|pac`,
  `open-browser-url` whitelist (chrome:// / about: pages, SK ga/gb/gd/ge/gh),
  `ZZ` session-save-and-close, `ZR` session-restore-last, `feedkeys`,
  `bookmark-add [url] [title]` with toggle semantics, `history-delete-url`,
  `history-clear`, `search-selected` / `search-selected-site` (sg/so).
- **Deferred (Wave 8, opt-in):** bundled PDF viewer, markdown preview,
  inline-query dictionary bubble, LLM chat panel, emoji picker, tab queue,
  TTS voice management, Firefox containers. These need extra data bundles,
  user-configured external endpoints, or niche APIs — tracked as future work.

## D2. Wave 8 status — IMPLEMENTED (2026-09-29, no longer deferred)

All Wave 8 items are implemented:

- **PDF viewer:** `pdfjs-dist` bundled via webpack copy (`pages/pdfjs/`),
  `pages/pdf.html` + `pages/pdf.js` (lazy per-page rendering, J/K/gg/G/+/-/0
  keys). Toggle `;s` / `:pdf-viewer-toggle` flips a storage flag consulted by a
  `chrome.tabs.onUpdated` redirect in the service worker (`attachPdfRedirect`);
  `:pdf-viewer-open [url]` opens the viewer directly.
- **Markdown preview:** `src/core/markdown.js` (pure, escape-first renderer,
  dual CommonJS/browser-global export) + `pages/markdown(.html|.js)`;
  `:preview-markdown` (`;pm`) writes `qutesurf:preview` to storage and opens
  the page via the whitelisted `open-extension-page` background command.
- **Inline query:** `src/content_scripts/inlinequery.js` bubble + background
  `inline-query` command (fetch in SW, `inlinequery.url` template with %s,
  truncated to 4000 chars). Bound to `Q` (selection or word under caret).
- **LLM chat:** `src/content_scripts/llmchat.js` panel + background `llm-chat`
  command (OpenAI-compatible `/chat/completions`; settings `llm.endpoint`,
  `llm.model`, `llm.apikey`, `llm.system` via `:set`; args are URL-encoded JSON
  tokens). Bound to `A`, prefilled with the selection.
- **Emoji picker:** `src/content_scripts/emoji.js` (~230 emoji dataset),
  opened by `:` in insert mode (Insert `onHook` + `emoji: true` config) or
  `:emoji-picker`; inserts at caret or copies.
- **Tab queue:** background `queue-add/list/remove/clear/open-all`
  (`qutesurf:queue` storage) + `omnibar-queue` source whose open action
  consumes the entry; `cq` binds queue-add.
- **TTS voices:** `:tts-voices` (banner + console.table), `:tts-say`, and
  `read-aloud` now honor `tts.lang` / `tts.rate` options.
- **Firefox containers:** background `open-in-container` via
  `contextualIdentities` (exact then case-insensitive prefix match);
  content `container-open` + `;cl` binding (default container `Personal`).
  Chrome reports the limitation.

New permissions: `contextualIdentities` (Firefox manifest only).
New dependency: `pdfjs-dist` (assets copied, not bundled into content).

New permissions added to the manifests: `scripting`, `pageCapture`
(Chrome), `downloads.open`, `downloads.shelf` (Chrome).

