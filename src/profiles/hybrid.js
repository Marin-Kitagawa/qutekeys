/**
 * hybrid.js — Curated best-of-both profile.
 *
 * Backbone: qutebrowser conventions (H/L back-forward, J/K tabs, o/O open,
 * gg/G scroll, f/F hints, yy/yt yank, `/N/n find, m/b marks).
 *
 * SurfingKeys additions where they don't collide:
 *   t  → omnibar-open       (SK mnemonic; no conflict — qute uses o)
 *   E  → tab-prev           (SK tab cycling; K kept as well)
 *   R  → tab-next (via SK)  (r already reload; uppercase R is reload-hard in
 *                             qute, but SK's R=tab-next wins — qute uses J/K)
 *   x  → tab-close          (SK; qute uses d — both kept)
 *   X  → tab-undo           (SK)
 *   S  → back               (SK; H kept as well)
 *   D  → forward            (SK; L kept as well)
 *   e  → scroll-halfpage-up (SK)
 *   U  → scroll-page-up     (SK; Ctrl-B also kept from qute)
 *   ya → hint-yank          (SK; ;y kept from qute)
 *   af → hint-newtab        (SK; F kept from qute)
 *   oh → omnibar-history    (SK)
 *   yl → yank-title         (SK; yt kept from qute)
 *   cp → proxy-toggle-host  (SK)
 *   om → omnibar-marks      (SK)
 *   '  → mark-jump          (SK m=mark-set + qute ` / ')
 *
 * Collision resolution: qute binding wins on conflict.
 *   e.g. R = reload-hard in qute; here R = tab-next (SK wins because
 *   reload-hard is still available via <F5>/r+shift concept, and tab-next
 *   via J is the primary path — but we keep R as tab-next for SK users).
 *   Actually: J=tab-next (qute), K=tab-prev (qute) are primary; R=tab-next
 *   and E=tab-prev are secondary SK aliases. We KEEP R=tab-next (drop
 *   reload-hard on R, since reload-hard is accessible via dedicated R in
 *   the qute profile and via no binding here — omit reload-hard from R).
 */

'use strict';

module.exports = {
  name: 'hybrid',
  bindings: {
    normal: {
      // ── Omnibar / open ────────────────────────────────────────────────────
      'o':   'omnibar-open',
      'O':   'omnibar-open-newtab',
      't':   'omnibar-open',          // SK alias
      'T':   'omnibar-tabs',
      ':':   'cmdline',
      'b':   'quickmark-open',
      'oh':  'omnibar-history',
      'om':  'omnibar-marks',

      // ── Tabs ──────────────────────────────────────────────────────────────
      'J':   'tab-next',
      'K':   'tab-prev',
      'E':   'tab-prev',             // SK alias
      'R':   'tab-next',             // SK alias
      'd':   'tab-close',
      'x':   'tab-close',            // SK alias
      'X':   'tab-undo',             // SK
      'u':   'tab-undo',             // qute
      'co':  'tab-only',
      'gC':  'tab-clone',
      'gm':  'tab-move',
      'ga':  'tab-new',
      '<Ctrl-p>': 'tab-pin',
      '<Alt-m>':  'tab-mute',

      // ── New Wave 1 tab commands ──────────────────────────────────────────────
      '<Ctrl-Tab>': 'tab-last-used',  // most useful: switch to last tab
      'gJ':  'tab-move +1',           // relative tab move right
      'gK':  'tab-move -1',           // relative tab move left
      '<<':  'tab-move',              // SK tab move
      '>>':  'tab-move',              // SK tab move
      'gxt': 'tab-close-left',
      'gxT': 'tab-close-right',
      'gx0': 'tab-close-left-all',
      'gx$': 'tab-close-right-all',
      'gxp': 'tab-close-audible',
      'gxx': 'tab-only',              // SK alias for co
      ';G':  'tab-group',
      ';gw': 'tab-gather',
      'oi':  'window-new-private',
      // Note: B=quickmark-open-newtab (taken in hybrid), D=forward (taken in hybrid)
      // tab-history-back/forward: no clean key without collision in hybrid

      // ── Navigation ────────────────────────────────────────────────────────
      'H':   'back',
      'S':   'back',                 // SK alias
      'L':   'forward',
      'D':   'forward',              // SK alias
      'r':   'reload',
      'gu':  'url-up',
      'gU':  'url-root',
      '<Ctrl-h>': 'home',
      '<Ctrl-s>': 'stop',

      // ── Scrolling ─────────────────────────────────────────────────────────
      'h':   'scroll-left',
      'j':   'scroll-down',
      'k':   'scroll-up',
      'l':   'scroll-right',
      'gg':  'scroll-to-top',
      'G':   'scroll-to-bottom',
      'e':   'scroll-halfpage-up',   // SK
      'U':   'scroll-page-up',       // SK
      '<Ctrl-D>': 'scroll-halfpage-down',
      '<Ctrl-U>': 'scroll-halfpage-up',
      '<Ctrl-F>': 'scroll-page-down',
      '<Ctrl-B>': 'scroll-page-up',

      // ── Hints ─────────────────────────────────────────────────────────────
      'f':   'hint',
      'F':   'hint-newtab',
      ';i':  'hint-images',
      ';y':  'hint-yank',
      'ya':  'hint-yank',            // SK alias

      // Wave-2 hint bindings (hybrid: qute ;-family + SK specials)
      // Qute ;-family for new-tab/fill/input variants:
      ';b':  'hint-newtab-bg',       // qute ;b → background tab
      ';f':  'hint-newtab-fg',       // qute ;f → foreground tab
      ';r':  'hint-rapid',           // qute ;r → rapid (replaces old hint-multi alias)
      ';I':  'hint-images-tab',      // qute ;I → image in tab
      ';o':  'hint-fill',            // qute ;o → fill omnibar with url
      // SK af/gf for new-tab variants (SK muscle memory):
      'af':  'hint-newtab-fg',       // SK af = foreground tab (was hint-newtab)
      'gf':  'hint-newtab-bg',       // SK gf = background tab
      'cf':  'hint-rapid',           // SK cf = rapid multi-tab (alias for ;r)
      // gi: conflict — qute gi=hint-input-first, SK gi=hint-input-layer
      //     hybrid uses qute gi=hint-input-first (simpler, more predictable)
      'gi':  'hint-input-first',
      // SK wave-2 yank variants (no qute collision):
      'yma': 'hint-yank-multi',
      'yc':  'hint-yank-column',
      'yq':  'hint-yank-pre',
      'yi':  'hint-yank-input',
      // SK wave-2 media/regional/detect (no qute key collisions below):
      'q':   'hint-click-media',     // SK q (free in qute/hybrid)
      // L: conflict — qute L=forward, SK L=hint-regional
      //    hybrid: L stays forward (qute wins); hint-regional has no binding here
      //    (accessible via cmdline: :hint-regional)
      // O: conflict — qute O=omnibar-open-newtab (already bound above), SK O=hint-detect-links
      //    hybrid: O stays omnibar-open-newtab (qute wins); hint-detect-links has no binding
      //    (accessible via cmdline: :hint-detect-links)

      ';h':  'hint-hover',
      ';t':  'hint-input',
      ';d':  'hint-download',

      // ── Find ──────────────────────────────────────────────────────────────
      '/':   'find',
      'n':   'find-next',
      'N':   'find-prev',

      // ── Yank / clipboard ─────────────────────────────────────────────────
      'yy':  'yank-url',
      'yt':  'yank-title',
      'yl':  'yank-title',           // SK alias
      'ym':  'yank-mdlink',
      'yh':  'yank-host',
      'yd':  'yank-domain',
      'yp':  'yank-pretty-url',
      'ys':  'yank-source',
      'yY':  'yank-all-tabs',
      'yj':  'settings-copy',
      'yf':  'yank-form-json',
      'pp':  'paste-and-go',
      'Pp':  'paste-and-go-newtab',
      'M':   'bookmark-add',
      ';pf': 'form-fill',
      ';pp': 'paste-html',
      ';pj': 'settings-restore',
      'ab':  'bookmark-add',
      ';db': 'bookmark-remove',

      // ── Marks ─────────────────────────────────────────────────────────────
      'm':   'mark-set',
      "'":   'mark-jump',
      '`':   'mark-set',
      'B':   'quickmark-open-newtab',

      // ── Proxy ─────────────────────────────────────────────────────────────
      'cp':  'proxy-toggle-host',

      // ── Modes ─────────────────────────────────────────────────────────────
      'i':   'mode-insert',
      'v':   'caret-mode',
      '<Ctrl-V>': 'mode-passthrough',
      'zv':  'visual-select-element',   // SK zv = enter visual and select element

      // ── Search ────────────────────────────────────────────────────────────
      '*':   'search-word',             // search word under cursor

      // ── Wave 5: Page / browser features ──────────────────────────────────
      // fullscreen: F11 (universal; no collision in either source profile)
      '<F11>':        'fullscreen',
      // navigate prev/next: [[ / ]] (both qute and SK use this; no conflict)
      '[[':           'navigate-prev',
      ']]':           'navigate-next',
      // zoom: zi/zo/zr (SK) — + / - / = omitted to avoid potential conflicts
      'zi':           'zoom-in',
      'zo':           'zoom-out',
      'zr':           'zoom-reset',
      // reload without query/hash: SK g? / g# (no qute equivalent; no collision)
      'g?':           'reload-no-query',
      'g#':           'reload-no-hash',
      // view-source: gs (SK; qute has gf for background tab — omit gf collision,
      // gs is free in hybrid so this is clean)
      'gs':           'view-source',
      // read-aloud: gr (SK mnemonic; no qute collision)
      'gr':           'read-aloud',
      // translate-page: ;t (qute uses ;t=hint-input; hybrid keeps hint-input
      // on ;t for qute users — use ;T for translate to avoid collision)
      ';T':           'translate-page',
      // capture-visible: yg (SK mnemonic; no collision in hybrid)
      'yg':           'capture-visible',
      // history-delete-old: ;dh (SK; no collision)
      ';dh':          'history-delete-old',
      // download-image: ;di (SK; no collision)
      ';di':          'download-image',
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
