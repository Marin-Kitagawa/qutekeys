'use strict';

/**
 * Regression test: an attacker-controlled title (e.g. a malicious page title
 * that became a history/bookmark entry) must be rendered INERT in the omnibar.
 * It must never create an executable element such as <img onerror=…>.
 */

const { Omnibar } = require('../../src/content_scripts/ui/omnibar');

function makeHost() {
  // Mount directly into a container we can inspect.
  const container = document.createElement('div');
  document.body.appendChild(container);
  return {
    container,
    addStyle() {},
    mount(el) { container.appendChild(el); },
  };
}

describe('Omnibar render — DOM XSS hardening', () => {
  test('malicious title with <img onerror> is escaped, not executed', () => {
    const host = makeHost();
    const omni = new Omnibar({ host });

    omni._render();

    const evil = '<img src=x onerror="window.__XSS_FIRED=true">';
    window.__XSS_FIRED = false;

    omni._results = [
      { item: { type: 'history', title: evil, url: 'https://e.com' }, ranges: [] },
    ];
    omni._renderResults();

    // No real <img> element should have been created from the title text.
    const imgs = host.container.querySelectorAll('img');
    // (favicon img is allowed; assert NONE has the attacker's onerror payload)
    for (const img of imgs) {
      expect(img.getAttribute('onerror')).toBeNull();
    }

    // The title must appear verbatim as TEXT content (escaped markup).
    const titleEl = host.container.querySelector('.qs-omni-title');
    expect(titleEl).not.toBeNull();
    expect(titleEl.textContent).toContain('onerror');
    // And the title element must contain no child <img> element.
    expect(titleEl.querySelector('img')).toBeNull();

    expect(window.__XSS_FIRED).toBe(false);
  });

  test('highlight ranges still escape the matched substring', () => {
    const host = makeHost();
    const omni = new Omnibar({ host });
    omni._render();

    const evil = '<b>x</b>';
    omni._results = [
      { item: { type: 'history', title: evil, url: 'https://e.com' }, ranges: [[0, 3]] },
    ];
    omni._renderResults();

    const titleEl = host.container.querySelector('.qs-omni-title');
    // The only element children allowed are our own highlight <span>s.
    expect(titleEl.querySelector('b')).toBeNull();
    expect(titleEl.textContent).toContain('<b>x</b>');
  });
});
