# Feature Parity Audit — SurfingKeys + qutebrowser → QuteSurf

**Date:** 2026-09-29 (revision 3 — post-verification round)
**Supersedes:** `KEYBINDING-GAP-AUDIT.md` (2026-06-14; waves 1–6 implemented 2026-06…09).
**Status: all feasible features implemented.** A third-party verification audit
(2026-09-29) cross-checked every upstream feature against the live registries and
found the gaps listed in section E — all fixed in the same round. The only
remaining unported items are the N/A list (section F) and the minor deferrals in
section G.

## Current state

QuteSurf registers **240 commands** (content + background vocabulary), 12 omnibar
sources, 3 profiles, hints engine with 25+ variants, full Insert mode, macros,
marks, sessions, proxy modes, userscripts with in-editor authoring, ACE editor,
native-messaging Neovim, bundled PDF viewer, markdown preview, inline query
bubble, LLM chat panel, emoji picker, tab queue, TTS voices, and Firefox
container support.

---

## A. SurfingKeys parity — COMPLETE

Every default mapping, API capability and omnibar feature of SurfingKeys is
implemented, including:

- **Modes:** Normal, Insert (auto-entry, readline keys `<C-e>/<C-a>/<C-f>/<C-u>/`,
  `<A-b>/<A-f>/<A-w>/<A-d>`, `<C-'>` toggle quotes), Visual/Caret (full motion set,
  `f/F/;/,`, `o`, `p`, `V`, `*`, `Enter`, `zt/zz/zb`, `<C-u>/<C-d>` ±20-line scroll,
  selection persistence), Hints (25+ variants incl. regional, rapid, input-layer,
  scrollable `;fs`, multi-column `ymc`), Command, Find, PassThrough (ephemeral `p`).
- **Tabs:** MRU, activation history, close-left/right/others/audible, focus-audible
  (`gp`), gather, duplicate (`yT` background), named tab groups (Chrome), move,
  incognito, containers (Firefox).
- **Omnibar:** 12 sources (open/search, history, bookmarks, tabs, commands, marks,
  recently-closed, close-tabs, windows, downloads, queue) + readline editing +
  `<C-c>` copy, `<C-d>` delete entry, `<C-D>` delete all listed, `<C-r>` re-sort
  history (visitCount/lastVisitTime), `<C-.>/<C-,>` result paging, `<C-m>` create
  mark from focused item.
- **Yank/clipboard:** URL (with count = next N tabs), title, mdlink, anchor,
  selection, host, domain, pretty-url, source, form JSON/POST, all-tabs,
  downloading URLs (`yd`), form fill, paste HTML, settings copy/restore,
  proxy config copy/apply (`;cp`/`;ap`).
- **Search:** engine aliases, search-selected (`sg`), site-restricted (`so`).
- **Capture:** visible tab (`yg`), full-page scroll-stitch (`yG`).
- **Page tools:** view-source, print, fullscreen, zoom (relative + absolute),
  navigate prev/next, URL increment/decrement, reload-without-query/hash,
  translate, TTS (voices list, say, configured lang/rate), reader view.
- **Config:** `:set`, `:bind`, `:unbind`, `:profile`, `:config-cycle`,
  `:config-unset`, `:config-clear`, per-host blocklist toggle, userscript
  authoring in the vim editor (`:userscript-add [name]`).
- **Sessions:** named save/load/list/delete + `ZZ` save-and-close / `ZR` restore.
- **Proxy:** per-host PAC rules, fixed server, modes always/direct/system/pac,
  per-host toggle, config copy/apply.
- **Pluggable extras (Wave 8):** bundled PDF viewer (pdf.js, toggle + direct
  open), markdown preview (escape-first renderer), inline query bubble
  (`inlinequery.url` template), LLM chat panel (OpenAI-compatible, user key),
  emoji picker (`:` in insert mode), tab queue (`cq` + omnibar).

## B. qutebrowser parity — COMPLETE (feasible set)

All ~107 distinct user-facing commands are implemented or covered by the N/A
analysis, including the full config-command family, scroll-px/anchor/perc-x,
absolute zoom, caret move-to-* surface (motions handled in-controller),
selection-drop/reverse/follow, downloads manager, jseval, fake-key, insert-text,
click-equivalents via hints, messages/banners, run-with-count/later/repeat,
history page data + clear, macros, marks, sessions, and the generated
`?` help cheatsheet (now built from the live registries).

## C. Wave history

- **Waves 0–6 (2026-06 → 2026-09):** defect fixes (config commands, Insert mode,
  marks source, homepage, reload-hard, visual-restore) + tab power-set, hint
  variants, yank/page-data, visual completion, page/browser features, modes &
  macros.
- **Wave 7 (2026-09-29):** omnibar key handling (`<C-c>/<C-d>/<C-D>/<C-r>/`,
  `<C-.>/<C-,>/<C-m>`), search-with-selected leaders (`sg`/`so`), proxy modes,
  chrome/browser URLs, `ZZ`/`ZR`, `feedkeys`, tab queue, TTS voices, tab groups.
- **Wave 8 (2026-09-29):** PDF viewer, markdown preview, inline query, LLM chat,
  emoji picker (previously deferred — all implemented same day).

## D. Verification round (2026-09-29, audit-driven fixes)

An independent audit cross-checked all three repos against the live registries.
Findings and their fixes:

| Finding | Resolution |
|---|---|
| Help page used a stale inline command snapshot; `help-data.js` was dead code | New background `help-cheatsheet` command builds the sheet from a live vocabulary registry (all content + background commands, 240 entries) via `help-data.buildCheatsheet`; `pages/help.js` prefers it (inline list kept as fallback) |
| Wave 7 omnibar keys missing | Implemented `<C-D>`, `<C-r>`, `<C-.>/<C-,>` paging, `<C-m>` mark-from-item |
| `tab-group` was a silent no-op | Now creates a group and names it (`:tab-group [title]`), errors on unsupported browsers |
| `userscript-add` was a console stub | Authors in the vim editor from a metadata template and saves to the store |
| SK `yd` (downloading URLs) missing | `yank-downloading` command |
| SK `;fs` (hint scrollables) missing | `hint-scrollable` (`;fs`) |
| SK `gp` (focus audible tab) missing | `tab-focus-audible` (`gp`) |
| SK `ymc` (multi-column yank) missing | `hint-yank-columns` (`ymc`) |
| Visual `<C-u>/<C-d>` missing | ±20-line scroll while staying in visual mode |
| qutebrowser `:readability` missing | `reader-view` (article heuristic → markdown preview tab) |
| Unbound upstream keys | Added: `gp`, `gd`, `yT`, `I`, `?`, `;fs`, `ymc`, `;cp`, `;ap`, `<Alt-1..9>` → `tab-goto N` |
| SK `;cp`/`;ap` proxy copy/apply missing | `proxy-copy-config` / `proxy-apply-config` + `proxy-get-config` |

## E. Remaining deferrals (documented, intentional)

- Omnibar Tab/Backspace search-alias expansion and `<C-'>` toggle-quotes inside
  the omnibar input (the omnibar has its own readline; `:` aliases work via the
  `open` source and `<C-m>`/marks cover the bookmark-mark key).
- OmniQuery history copy (`yQ`) — no query history is retained.
- SK `;gt` (gather *filtered* tabs) — `;gw` (gather all) is implemented.
- SK `;j` (close downloads shelf) — no WebExtension API.
- SK `;i`/`;s`-style devtools/inspect — extension pages cannot open devtools.

## F. Correctly N/A in a WebExtension (not ported)

Standalone-browser chrome (URL bar, native window/status bar), Qt prompt/yesno
modes, `:spawn` (only via the optional native-messaging host), `:config-source`/
`:config-edit` (no filesystem; the sandboxed JS settings API covers this), X11
primary selection, `quit`/`restart` of the browser process, QtWebKit debug
commands, `:follow-selected` note: qutekeys' `selection-follow` follows the
nearest anchor — text-as-URL search is covered by `sg`.

## G. Permissions

Chrome: `tabs, bookmarks, history, storage, clipboardWrite, clipboardRead,
downloads, downloads.open, downloads.shelf, sessions, proxy, nativeMessaging,
scripting, pageCapture` + `<all_urls>`.
Firefox: same minus `downloads.open/shelf/pageCapture`, plus
`contextualIdentities`.
