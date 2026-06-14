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
