'use strict';

const STATUSLINE_CSS = `
/* ── QuteSurf Statusline — Themeable Glass ─────────────────────── */
#qs-statusline {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2147483646;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 14px;
  height: 28px;
  background: var(--qs-sl-bg, rgba(28, 33, 48, 0.85));
  backdrop-filter: var(--qs-blur, blur(16px));
  -webkit-backdrop-filter: var(--qs-blur, blur(16px));
  border-top: 1px solid var(--qs-panel-border, rgba(255, 255, 255, 0.07));
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);
  font-family: var(--qs-mono, -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace);
  font-size: 12px;
  color: var(--qs-sl-text, rgba(255, 255, 255, 0.75));
  box-sizing: border-box;
}

#qs-statusline-mode {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--qs-accent, #7c5cff);
  color: var(--qs-accent-fg, #fff);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.35);
  flex-shrink: 0;
  line-height: 18px;
  min-width: 52px;
  justify-content: center;
}

#qs-statusline-host {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--qs-text-muted, rgba(255, 255, 255, 0.6));
  font-size: 11px;
}

#qs-statusline-percent {
  flex-shrink: 0;
  color: var(--qs-text-muted, rgba(255, 255, 255, 0.45));
  font-size: 11px;
  min-width: 36px;
  text-align: right;
}
`;

module.exports = { STATUSLINE_CSS };
