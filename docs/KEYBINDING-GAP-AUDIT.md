# Keybinding / Feature Gap Audit

**Date:** 2026-06-14
**Question:** Are ALL keybindings of qutebrowser and SurfingKeys implemented?
**Answer:** No. v1 implemented a **curated core** (84 commands). Diffing against the
complete upstream default keymaps shows a large set of *WebExtension-feasible*
commands that are still missing. This document is the authoritative worklist.

## Method
- qutebrowser: every binding in `config/configdata.yml` `bindings.default` (all 9 modes), 107 distinct commands.
- SurfingKeys: every `mapkey/imapkey/vmapkey/map/cmap` + Hints variants in `default.js`/`normal.js`/`visual.js`, ~145 capabilities.
- Implemented: 84 commands (`CANONICAL_COMMANDS`), bindings in `src/profiles/{qute,surfingkeys,hybrid}.js`.
- Each missing item is classified FEASIBLE (doable in MV3) or N/A (cannot be done in a WebExtension).

## Summary
| | qutebrowser | SurfingKeys |
|---|---|---|
| Distinct commands/capabilities | ~107 | ~145 |
| Correctly N/A in a WebExtension | ~15 | ~10 |
| **Feasible & implemented** | ~45 | ~50 |
| **Feasible & MISSING** | **~45** | **~70** |

Roughly **half** of the feasible bindings are not yet implemented. The user's
intuition is correct.

---

## A. Implemented today (84 commands)
Navigation (scroll family, back/forward/reload/reload-hard/stop/url-up/url-root/home),
hints (hint/newtab/yank/hover/input/download/images/multi/text), tabs
(new/close/clone/next/prev/first/last/goto/pin/mute/move/undo/only/detach/activate/list),
omnibar (open/open-newtab/bookmarks/history/tabs/commands/marks/cmdline),
find/find-next/find-prev, yank (url/title/mdlink/selection/anchor), paste-and-go(+newtab),
caret/visual/selection-toggle (basic motions h/l/j/k/w/b/0/$), marks + quickmarks,
sessions (save/load/list/delete), search aliases, proxy (set/clear/toggle-host),
userscripts (add/list/remove), edit-with-vim, edit-with-nvim, :set/:bind/:unbind/:profile, help.

---

## B. FEASIBLE but MISSING — qutebrowser

### Tabs / windows
- `open -b` / `open -w` / `open -p` — open in background tab / new window / private window (`xo`,`wo`,`Ctrl-N`,`Ctrl-Shift-N`)
- `tab-close -o` — close all tabs *except*/opposite side (`D`)
- `tab-move +`/`tab-move -` — move tab relative (`gJ`/`gK`)
- `tab-focus last` / last-used tab (`Ctrl-Tab`, `Ctrl-^`)
- `tab-give` — move tab to another window (`gD`)
- `undo -w` — restore closed window (`U`)

### Hints (qute variants)
- `hint all window` — hint into new window (`wf`)
- `hint all tab-bg` / `tab-fg` — explicit background/foreground (`;b`/`;f`)
- `hint images tab` — image link into new tab (`;I`)
- `hint links fill :open …` — fill URL into command line (`;o`/`;O`)
- `hint --rapid …` — rapid (stay-open) hint mode (`;r`/`;R`)
- `hint inputs --first` — focus first input (`gi`)

### Navigation / page
- `fullscreen` (`F11`) — Fullscreen API
- `navigate prev` / `navigate next` — follow rel=prev/next or prev/next link (`[[`/`]]`)
- `navigate increment` / `navigate decrement` — ±1 the number in the URL (`Ctrl-A`/`Ctrl-X`)
- `view-source` (`gf`/`gs`) — open `view-source:`
- `print` (`Ctrl-Alt-p`) — `window.print()`
- `zoom-in` / `zoom-out` / `zoom` reset (`+`/`-`/`=`) — `chrome.tabs.setZoom`

### Yank / clipboard
- `yank domain` (`yd`), `yank pretty-url` (`yp`) — extra URL formats
- `bookmark-add` (`M`) — add a real browser bookmark (currently only quickmarks)

### Caret-mode motions (currently only h/l/j/k/w/b/0/$)
- `move-to-end-of-word` (`e`), sentence/paragraph, `move-to-start/end-of-next/prev-block` (`]`,`[`,`}`,`{`),
  `move-to-start/end-of-document` in caret, `selection-reverse` (`o`), `selection-drop`,
  `selection-follow` / `selection-follow -t` (`Return`)

### Misc
- `macro-record` / `macro-run` (`q`/`@`) — record & replay key macros
- `cmd-repeat-last` (`.`) — repeat last command with count
- `mode-enter passthrough` (`Ctrl-V`) — pass-through mode (command exists in vocab, no controller/binding)
- Command-line line-editing (readline `rl-*`) inside the omnibar/command input (`Ctrl-A/E/W/U/K`, word motions)
- `tab-focus N` direct (`Alt-1..9`) — direct numbered tab jump (have `tab-goto` but not bound to Alt-N)

### Correctly N/A (Qt/native only — leave out)
`spawn`, `devtools`/`devtools-focus`, `config-cycle`/`set`/`bind`/`save` (Qt config),
`quit`/`close` (close the browser app), `edit-text` external editor IPC,
`fake-key`, `insert-text` (deprecated), `prompt-*`/`yesno` (Qt prompt UI),
`download-cancel/clear` (partial — possible via chrome.downloads but low value), `tab-give` cross-instance.

---

## C. FEASIBLE but MISSING — SurfingKeys

### Tabs (rich set)
- last-used tab (`Ctrl-6`), tab history back/forward per-tab (`B`/`F`),
  first/last *activated* tab (`gT`/`gt`), go to playing/audible tab (`gp`),
  close tab left/right (`gxt`/`gxT`), close all left/right (`gx0`/`gx$`),
  close playing tab (`gxp`), close-all-except (`gxx` — have `tab-only`),
  move tab left/right (`<<`/`>>` — have `tab-move`), group tab (`;G`, chrome.tabGroups),
  gather tabs into window (`;gt`/`;gw`), open incognito window (`oi`),
  duplicate tab active/bg (`yt`/`yT` — have `tab-clone`)

### Hints (rich set)
- yank **multiple** link URLs (`yma`), yank table column (`yc`/`ymc`),
  yank `<pre>` text (`yq`), yank input value (`yi`),
  click image/button (`q`), mouse-over / mouse-out hints (`Ctrl-h`/`Ctrl-j`),
  input layer with Tab nav (`gi`), regional hints menu (`L` → copy text/html, delete, LLM),
  open detected text links (`O`)

### Yank / page data
- copy all tab URLs (`yY`), copy host (`yh`), copy page source (`ys`),
  copy form data JSON/POST (`yf`/`yp`), fill form from clipboard (`;pf`),
  copy settings (`yj`) / restore settings (`;pj`), paste HTML onto page (`;pp`)

### Visual mode (rich)
- f/F char-seek + `;`/`,` repeat, sentence/paragraph motions, select-unit (`V` word/line/sentence/para),
  expand-to-parent (`p`), click node under cursor (`Enter`/`Shift-Enter`),
  search word under cursor (`*`), other-end (`o`), cursor-to-top/center/bottom (`zt`/`zz`/`zb`),
  visual translate (`t`), visual read-aloud (`gr`)

### Omnibar sources
- recently-closed (`ox`), add-bookmark (`ab`), close-tabs-by-URL (`;x`),
  windows (`W`), LLM chat (`A`), OmniQuery/word-translate (`Q`), TabURLs (`H`)

### URL / page
- reload without query string (`g?`), reload without hash (`g#`),
  jump-to-mark-in-new-tab (`Ctrl-'`), switch/rotate frames (`w`)

### Browser features
- zoom in/out/reset (`zi`/`zo`/`zr`), translate page/selection (`;t`),
  read aloud TTS (`gr`, Web Speech API), capture visible tab (`yg`),
  capture full page (`yG`), capture scroll element (`yS`), download image (`;di`),
  delete history >30d (`;dh`), yank/put history (`;yh`/`;ph`), remove bookmark (`;db`),
  edit URL in vim then open/reload (`;u`/`;U`), markdown preview (`;pm`),
  PDF viewer toggle (`;s`), proxy copy/apply config (`;cp`/`;ap`), set proxy mode (`;pa`..`;pc`)

### Modes / misc
- PassThrough mode (`Alt-i`) + ephemeral (`p`), blocklist toggle per-site (`Alt-s`),
  repeat last action (`.`), show last action (`;ql`), emoji insertion in inputs,
  toggle quotes in input (`Ctrl-'`), change/reset scroll target (`cs`/`cS`),
  session save+quit / restore (`ZZ`/`ZR` — commands exist, bindings/quit semantics differ)

### Correctly N/A or low-value
Open `chrome://` internal pages from a content script (must go via background; partial),
"close downloads shelf" (no direct API), LLM chat / OmniQuery (need user-configured endpoints — feasible UI but external dep).

---

## D. Recommended remediation plan (waves)
Implement in dependency order; each wave is a coherent, testable chunk.

1. **Tab power-set:** last-used + activation history, close-left/right/others, relative move,
   group/gather, incognito, open-bg/window variants. (background commands + activation tracking)
2. **Hint variants:** rapid mode, window/bg/fg, images-tab, fill-URL, first-input, input-layer,
   yank-multiple/column/pre/input, click image/button, mouseover/out, regional menu.
3. **Yank/page-data:** all-tab-URLs, host, source, form-data copy/fill, paste-HTML, settings copy/restore, bookmark-add/remove.
4. **Visual mode completion:** full motion set, f/F seek, select-unit, expand-parent, click-node, `*`, other-end, cursor placement, translate/read.
5. **Page/browser features:** fullscreen, zoom, view-source, print, navigate prev/next + increment/decrement, reload-without-query/hash, translate, TTS, screenshots, download-image, history mgmt.
6. **Modes & macros:** passthrough mode + controller, macro record/run, repeat-last (`.`), command-line readline editing, blocklist toggle, scroll-target cycling, edit-URL-in-vim, omnibar sources (recently-closed, add-bookmark, close-tabs, windows).

Each wave: add commands to the registry (content or background), wire into the
three profiles using the upstream keys, add unit tests, and verify in a live
browser. Estimated additional commands: ~110, bringing total to ~190+.
