/**
 * qute.js — Built-in profile translating qutebrowser default normal-mode
 * bindings to QuteSurf canonical command names.
 *
 * Source: qutebrowser/qutebrowser/config/configdata.yml
 *         Block: bindings.default.default.normal (~line 3679)
 *
 * Mapping decisions
 * -----------------
 * qute cmd-set-text -s :open        → omnibar-open
 * qute cmd-set-text -s :open -t     → omnibar-open-newtab
 * qute tab-focus / cmd-set-text … tab-select → omnibar-tabs
 * qute scroll left/right/up/down    → scroll-{left,right,up,down}
 * qute scroll-to-perc 0             → scroll-to-top
 * qute scroll-to-perc (no arg)      → scroll-to-bottom
 * qute search-next / search-prev    → find-next / find-prev
 * qute cmd-set-text /               → find
 * qute mode-enter insert            → mode-insert
 * qute mode-enter caret             → caret-mode
 * qute mode-enter set_mark          → mark-set
 * qute mode-enter jump_mark         → mark-jump
 * qute yank                         → yank-url
 * qute yank title                   → yank-title
 * qute yank inline [{title}]({url}) → yank-mdlink
 * qute open -- {clipboard}          → paste-and-go
 * qute open -t -- {clipboard}       → paste-and-go-newtab
 * qute quickmark-save               → quickmark-save
 * qute cmd-set-text … quickmark-load → quickmark-open
 * qute navigate up                  → url-up
 * qute navigate up -t               → (omit — no canonical newtab variant)
 * qute cmd-set-text :               → cmdline
 * qute tab-give / devtools / etc.   → omit (no canonical command)
 * qute undo                         → tab-undo
 * Bindings with no sensible canonical match are omitted.
 */

'use strict';

module.exports = {
  name: 'qute',
  bindings: {
    normal: {
      // ── Omnibar / open ────────────────────────────────────────────────────
      'o':   'omnibar-open',
      'O':   'omnibar-open-newtab',
      'go':  'omnibar-open',          // pre-fills current URL — closest match
      ':':   'cmdline',
      'T':   'omnibar-tabs',

      // ── Tabs ──────────────────────────────────────────────────────────────
      'J':   'tab-next',
      'K':   'tab-prev',
      'd':   'tab-close',
      'D':   'tab-close',             // close other (no canonical variant; closest is tab-close)
      'co':  'tab-only',
      'gC':  'tab-clone',
      'gm':  'tab-move',
      'u':   'tab-undo',
      'ga':  'tab-new',
      '<Ctrl-T>': 'tab-new',
      '<Ctrl-p>': 'tab-pin',
      '<Alt-m>':  'tab-mute',

      // ── New Wave 1 tab commands ──────────────────────────────────────────────
      'gJ':  'tab-move +1',          // move tab right (relative)
      'gK':  'tab-move -1',          // move tab left (relative)
      '<Ctrl-Tab>': 'tab-last-used', // switch to MRU tab
      // Note: B=quickmark-open-newtab (taken), F=hint-newtab (taken)

      // ── Navigation ────────────────────────────────────────────────────────
      'H':   'back',
      'L':   'forward',
      'r':   'reload',
      'R':   'reload-hard',
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
      '<Ctrl-F>': 'scroll-page-down',
      '<Ctrl-B>': 'scroll-page-up',
      '<Ctrl-D>': 'scroll-halfpage-down',
      '<Ctrl-U>': 'scroll-halfpage-up',

      // ── Hints ─────────────────────────────────────────────────────────────
      'f':   'hint',
      'F':   'hint-newtab',
      ';i':  'hint-images',
      ';y':  'hint-yank',
      ';h':  'hint-hover',
      ';t':  'hint-input',
      ';d':  'hint-download',

      // Wave-2 hint keys (qute upstream ;-family)
      // ;b  → hint-newtab-bg  (qute: hint --tab background)
      // ;f  → hint-newtab-fg  (qute: hint --tab foreground)
      // ;r  → hint-rapid      (qute: hint --rapid, replaces old hint-multi alias)
      // ;I  → hint-images-tab (qute: hint --target tab images)
      // ;o  → hint-fill       (qute: hint --target run :open {hint-url})
      // gi  → hint-input-first (qute: hint --single-char input, equivalent)
      // Note: ;r previously mapped to hint-multi; now maps to proper hint-rapid
      ';b':  'hint-newtab-bg',
      ';f':  'hint-newtab-fg',
      ';r':  'hint-rapid',
      ';I':  'hint-images-tab',
      ';o':  'hint-fill',
      'gi':  'hint-input-first',

      // ── Find ──────────────────────────────────────────────────────────────
      '/':   'find',
      'n':   'find-next',
      'N':   'find-prev',

      // ── Yank / clipboard ─────────────────────────────────────────────────
      'yy':  'yank-url',
      'yt':  'yank-title',
      'ym':  'yank-mdlink',
      'yd':  'yank-domain',
      'yp':  'yank-pretty-url',
      'pp':  'paste-and-go',
      'Pp':  'paste-and-go-newtab',
      'M':   'bookmark-add',

      // ── Marks ─────────────────────────────────────────────────────────────
      'm':   'quickmark-save',
      'b':   'quickmark-open',
      'B':   'quickmark-open-newtab',
      '`':   'mark-set',
      "'":   'mark-jump',

      // ── Modes ─────────────────────────────────────────────────────────────
      'i':   'mode-insert',
      'v':   'caret-mode',
      '<Ctrl-V>': 'mode-passthrough',

      // ── Wave 6: Modes & macros ────────────────────────────────────────────
      // 'q' is free in qute (not previously bound)
      'q':   'macro-record',
      '@':   'macro-run',
      '.':   'repeat-last',

      // ── Search ────────────────────────────────────────────────────────────
      '*':   'search-word',             // search word under cursor (qute caret *)

      // ── Wave 5: Page / browser features ──────────────────────────────────
      // fullscreen: F11 (qute has no default; F11 is universal browser shortcut)
      '<F11>':       'fullscreen',
      // print: Ctrl-Alt-p (avoids Ctrl-p which is tab-pin)
      '<Ctrl-Alt-p>': 'print',
      // navigate prev/next: qute upstream [[ / ]] (follows rel links)
      '[[':           'navigate-prev',
      ']]':           'navigate-next',
      // URL increment/decrement: qute upstream Ctrl-A / Ctrl-X
      '<Ctrl-A>':    'url-increment',
      '<Ctrl-X>':    'url-decrement',
      // view-source: qute gf = open current URL in background (repurposed here);
      // also gs as alias (mnemonic: Go Source)
      'gf':           'view-source',
      'gs':           'view-source',
      // zoom: qute uses + - = (also zi/zo/zr for SK compatibility)
      '+':            'zoom-in',
      'zi':           'zoom-in',
      '-':            'zoom-out',
      'zo':           'zoom-out',
      '=':            'zoom-reset',
      'zr':           'zoom-reset',
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
