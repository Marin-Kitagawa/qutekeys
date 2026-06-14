'use strict';

/**
 * Themeable Glass label styles for hint overlays.
 * Uses --qs-* custom properties with violet fallbacks.
 * IMPORTANT: .qs-hint-layer positioning MUST remain absolute + document-anchored.
 */
const HINTS_CSS = `
.qs-hint {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 5px;
  min-width: 16px;
  height: 18px;
  font-family: var(--qs-mono, 'FiraCode Nerd Font', 'FiraCode Nerd Font Mono', 'Fira Code', monospace);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: var(--qs-hint-fg, #fff);
  background: var(--qs-hint-bg, rgba(124, 92, 255, 0.9));
  border: 1px solid var(--qs-hint-border, rgba(255, 255, 255, 0.25));
  border-radius: 6px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35),
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  letter-spacing: 0.5px;
  z-index: 2147483647;
  pointer-events: none;
  user-select: none;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  transform: translateY(-50%);
  white-space: nowrap;
  cursor: default;
}

.qs-hint.qs-hint--matched {
  opacity: 1;
}

.qs-hint.qs-hint--dimmed {
  opacity: 0.35;
}

.qs-hint-layer {
  /* Absolute (NOT fixed) and anchored at the document origin, so the absolutely
     positioned labels inside use document coordinates and scroll WITH the page,
     staying glued to their target elements. */
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  overflow: visible;
  pointer-events: none;
  z-index: 2147483646;
}
`;

module.exports = { HINTS_CSS };
