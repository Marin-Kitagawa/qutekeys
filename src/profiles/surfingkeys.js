/**
 * surfingkeys.js — Built-in profile translating SurfingKeys default bindings
 * to QuteSurf canonical command names.
 *
 * Sources:
 *   Surfingkeys/src/content_scripts/common/default.js   (mapkey / map calls)
 *   Surfingkeys/src/content_scripts/common/normal.js    (mappings.add calls)
 *
 * Mapping decisions
 * -----------------
 * SK  E (previousTab)         → tab-prev
 * SK  R (nextTab)             → tab-next
 * SK  x (closeTab)            → tab-close
 * SK  X (openLast)            → tab-undo
 * SK  yt (duplicateTab)       → tab-clone
 * SK  S (history.go(-1))      → back
 * SK  D (history.go(1))       → forward
 * SK  r (reloadTab)           → reload
 * SK  t (openOmnibar URLs)    → omnibar-open
 * SK  T (chooseTab)           → omnibar-tabs
 * SK  b (openOmnibar Bookmarks) → omnibar-bookmarks
 * SK  oh (openOmnibar History)  → omnibar-history
 * SK  : (openOmnibar Commands)  → cmdline
 * SK  f (hints click)         → hint
 * SK  af (hints tabbed active)→ hint-newtab
 * SK  i (hints editable)      → hint-input
 * SK  ya (yank link href)     → hint-yank
 * SK  e (scroll half page up) → scroll-halfpage-up
 * SK  d (scroll half page down) → scroll-halfpage-down
 * SK  U (scroll full page up) → scroll-page-up
 * SK  P (scroll full page down) → scroll-page-down
 * SK  j/k/h/l                 → scroll-down/up/left/right
 * SK  gg / G                  → scroll-to-top / scroll-to-bottom
 * SK  yy (copy URL)           → yank-url
 * SK  yl (copy title)         → yank-title
 * SK  / (openFinder)          → find
 * SK  n / N (visual.next)     → find-next / find-prev
 * SK  v (visual.toggle)       → caret-mode
 * SK  m (addVIMark)           → mark-set
 * SK  ' (jumpVIMark)          → mark-jump
 * SK  on (open newtab)        → tab-new
 * SK  om (openOmnibar VIMarks) → omnibar-marks
 * SK  H (openOmnibar TabURLs) → omnibar-history  (tab URL history)
 * SK  gi (hints input first)  → hint-input        (already covered by i)
 * SK  << / >> move tab        → tab-move
 * SK  cp (toggle proxy host)  → proxy-toggle-host
 * Keys bound to browser-internal chrome:// pages (ga, gb, gc, gd, ge, gh…)
 * and SK-specific helpers (gr readText, ;e edit settings, etc.) are omitted
 * because no canonical command covers them.
 */

'use strict';

module.exports = {
  name: 'surfingkeys',
  bindings: {
    normal: {
      // ── Tabs ──────────────────────────────────────────────────────────────
      'E':   'tab-prev',
      'R':   'tab-next',
      'x':   'tab-close',
      'X':   'tab-undo',
      'yt':  'tab-clone',
      'on':  'tab-new',
      'T':   'omnibar-tabs',

      // ── Navigation ────────────────────────────────────────────────────────
      'S':   'back',
      'D':   'forward',
      'r':   'reload',
      'gu':  'url-up',
      'gU':  'url-root',

      // ── Omnibar / open ────────────────────────────────────────────────────
      't':   'omnibar-open',
      'b':   'omnibar-bookmarks',
      'oh':  'omnibar-history',
      'om':  'omnibar-marks',
      ':':   'cmdline',

      // ── Scrolling ─────────────────────────────────────────────────────────
      'j':   'scroll-down',
      'k':   'scroll-up',
      'h':   'scroll-left',
      'l':   'scroll-right',
      'e':   'scroll-halfpage-up',
      'd':   'scroll-halfpage-down',
      'U':   'scroll-page-up',
      'P':   'scroll-page-down',
      'gg':  'scroll-to-top',
      'G':   'scroll-to-bottom',

      // ── Hints ─────────────────────────────────────────────────────────────
      'f':   'hint',
      'af':  'hint-newtab-fg',  // SK af = open link in foreground tab (Wave-2; was hint-newtab)
      'gf':  'hint-newtab-bg',  // SK gf = open link in background tab
      'cf':  'hint-rapid',      // SK cf = open multiple links in new tabs
      'i':   'hint-input',
      'ya':  'hint-yank',

      // Wave-2 yank hints
      // yma → hint-yank-multi  (SK: yank multiple link hrefs)
      // yc  → hint-yank-column (SK: yank table column)
      // yq  → hint-yank-pre    (SK: yank <pre> block)
      // yi  → hint-yank-input  (SK: yank input value)
      'yma': 'hint-yank-multi',
      'yc':  'hint-yank-column',
      'yq':  'hint-yank-pre',
      'yi':  'hint-yank-input',

      // Wave-2 media/mouse/ui hints
      // q   → hint-click-media  (SK: click image or button)
      // gi  → hint-input-layer  (SK: hint all inputs, Tab to cycle)
      // L   → hint-regional     (SK: regional hint sub-menu)
      // O   → hint-detect-links (SK: hint URL-like text)
      // Ctrl-h → hint-mouseover (SK)
      // Ctrl-j → hint-mouseout  (SK)
      // Note: Ctrl-h collides with nothing in SK; Ctrl-j likewise free
      'q':          'hint-click-media',
      'gi':         'hint-input-layer',
      'L':          'hint-regional',
      'O':          'hint-detect-links',
      '<Ctrl-h>':   'hint-mouseover',
      '<Ctrl-j>':   'hint-mouseout',

      // ── Find ──────────────────────────────────────────────────────────────
      '/':   'find',
      'n':   'find-next',
      'N':   'find-prev',

      // ── Yank / clipboard ─────────────────────────────────────────────────
      'yy':  'yank-url',
      'yl':  'yank-title',
      'yh':  'yank-host',
      'ys':  'yank-source',
      'yf':  'yank-form-json',
      'yj':  'settings-copy',
      'yY':  'yank-all-tabs',
      ';pf': 'form-fill',
      ';pp': 'paste-html',
      ';pj': 'settings-restore',
      'ab':  'bookmark-add',
      ';db': 'bookmark-remove',

      // ── Marks ─────────────────────────────────────────────────────────────
      'm':   'mark-set',
      "'":   'mark-jump',

      // ── Tab move ──────────────────────────────────────────────────────────
      '<<':  'tab-move',
      '>>':  'tab-move',

      // ── Proxy ─────────────────────────────────────────────────────────────
      'cp':  'proxy-toggle-host',

      // ── New Wave 1 tab commands (SK upstream keys) ───────────────────────────
      'B':          'tab-history-back',    // SK B = go back in tab history
      'F':          'tab-history-forward', // SK F = go forward in tab history
      '<Ctrl-6>':   'tab-last-used',       // SK Ctrl-6 = alternate last tab
      'gT':         'tab-first-activated', // SK gT = first tab
      'gt':         'tab-last-activated',  // SK gt = last tab
      'gxt':        'tab-close-left',
      'gxT':        'tab-close-right',
      'gx0':        'tab-close-left-all',
      'gx$':        'tab-close-right-all',
      'gxp':        'tab-close-audible',
      'gxx':        'tab-only',
      ';G':         'tab-group',
      ';gw':        'tab-gather',
      'oi':         'window-new-private',
      // Note: 'on' already = tab-new; window-new has no clean SK key without collision

      // ── Modes ─────────────────────────────────────────────────────────────
      'v':   'caret-mode',
      'V':   'visual-restore',          // SK V = restore last visual selection
      'zv':  'visual-select-element',   // SK zv = enter visual and select element

      // ── Search ────────────────────────────────────────────────────────────
      '*':   'search-word',             // SK * = search word under cursor

      // ── Wave 5: Page / browser features (SK upstream keys) ────────────────
      // Zoom: SK zi/zo/zr
      'zi':  'zoom-in',
      'zo':  'zoom-out',
      'zr':  'zoom-reset',
      // Reload variants: SK g?=reload-no-query, g#=reload-no-hash
      'g?':  'reload-no-query',
      'g#':  'reload-no-hash',
      // navigate prev/next: SK [[ / ]]
      '[[':  'navigate-prev',
      ']]':  'navigate-next',
      // view-source: SK gs
      'gs':  'view-source',
      // read-aloud: SK gr (mnemonic: Go Read)
      'gr':  'read-aloud',
      // translate-page: SK ;t (mnemonic: ;Translate)
      ';t':  'translate-page',
      // capture-visible: SK yg (mnemonic: Yank Graphics)
      'yg':  'capture-visible',
      // download-image: SK ;di (mnemonic: ;Download Image)
      ';di': 'download-image',
      // history-delete-old: SK ;dh (mnemonic: ;Delete History)
      ';dh': 'history-delete-old',
    },

    insert: {
      '<Escape>': 'mode-normal',
    },

    visual: {
      'y':        'yank-selection',
      '<Escape>': 'mode-normal',
    },
  },
};
