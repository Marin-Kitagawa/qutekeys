'use strict';

/**
 * Glass find bar CSS — small translucent bar anchored to the bottom-left
 * of the viewport, with violet accent/caret and a match-count display.
 */
const FINDBAR_CSS = `
  .qs-findbar {
    position: fixed;
    bottom: 14px;
    left: 14px;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 6px;

    /* Glass morphism */
    background: rgba(20, 14, 36, 0.72);
    backdrop-filter: blur(14px) saturate(160%);
    -webkit-backdrop-filter: blur(14px) saturate(160%);
    border: 1px solid rgba(167, 139, 250, 0.30);
    border-radius: 8px;
    padding: 5px 10px;
    box-shadow:
      0 4px 24px rgba(0, 0, 0, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);

    font-family: ui-monospace, 'Cascadia Code', 'Fira Code', monospace;
    font-size: 13px;
    line-height: 1;
    color: rgba(233, 221, 255, 0.92);
    min-width: 220px;
    max-width: 380px;
  }

  .qs-findbar__input {
    background: transparent;
    border: none;
    outline: none;
    color: inherit;
    font: inherit;
    flex: 1 1 auto;
    min-width: 0;
    padding: 2px 0;
    caret-color: #a78bfa;
  }

  .qs-findbar__input::placeholder {
    color: rgba(167, 139, 250, 0.45);
  }

  .qs-findbar__input::selection {
    background: rgba(139, 92, 246, 0.45);
  }

  .qs-findbar__count {
    flex: 0 0 auto;
    font-size: 11px;
    color: rgba(167, 139, 250, 0.80);
    white-space: nowrap;
    min-width: 32px;
    text-align: right;
  }

  /* Current match highlight injected into the page */
  .qs-find-highlight {
    background: rgba(139, 92, 246, 0.35);
    color: inherit;
    border-radius: 2px;
    outline: 1.5px solid rgba(167, 139, 250, 0.65);
    outline-offset: 0;
  }
`;

module.exports = { FINDBAR_CSS };
