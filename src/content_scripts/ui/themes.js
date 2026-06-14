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
