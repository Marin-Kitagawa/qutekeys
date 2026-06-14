'use strict';

const WHICHKEY_CSS = `
/* ── QuteSurf WhichKey — Themeable Glass ───────────────────────── */
#qs-whichkey {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2147483647;
  min-width: 280px;
  max-width: calc(100vw - 48px);
  max-height: 320px;
  overflow-y: auto;
  background: var(--qs-panel-bg, rgba(28, 33, 48, 0.9));
  backdrop-filter: var(--qs-blur, blur(24px));
  -webkit-backdrop-filter: var(--qs-blur, blur(24px));
  border: 1px solid var(--qs-panel-border, rgba(255, 255, 255, 0.09));
  border-radius: var(--qs-radius, 14px);
  box-shadow: var(--qs-panel-shadow, 0 16px 56px rgba(0,0,0,.55), 0 4px 16px rgba(0,0,0,.35));
  padding: 8px 0;
  font-family: var(--qs-mono, -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace);
  font-size: 13px;
  color: var(--qs-text, rgba(255, 255, 255, 0.85));
  scrollbar-width: thin;
  scrollbar-color: var(--qs-accent, rgba(124, 92, 255, 0.4)) transparent;
}

#qs-whichkey::-webkit-scrollbar {
  width: 4px;
}
#qs-whichkey::-webkit-scrollbar-thumb {
  background: var(--qs-accent, rgba(124, 92, 255, 0.4));
  border-radius: 2px;
  opacity: 0.4;
}

.qs-wk-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 5px 16px;
  transition: background 60ms;
}

.qs-wk-row:hover {
  background: var(--qs-row-sel-bg, rgba(124, 92, 255, 0.1));
}

.qs-wk-seq {
  flex-shrink: 0;
  min-width: 44px;
  font-weight: 700;
  color: var(--qs-name, #7c5cff);
  letter-spacing: 0.04em;
  font-size: 12px;
}

.qs-wk-cmd {
  flex: 1;
  color: var(--qs-text-muted, rgba(255, 255, 255, 0.55));
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
`;

module.exports = { WHICHKEY_CSS };
