'use strict';

const OMNIBAR_CSS = `
/* ── QuteSurf Omnibar — Modern Glass ─────────────────────────── */
#qs-omnibar-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
}

#qs-omnibar-panel {
  width: 640px;
  max-width: calc(100vw - 32px);
  max-height: 480px;
  display: flex;
  flex-direction: column;
  background: rgba(28, 33, 48, 0.82);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.6),
    0 8px 24px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

/* ── Input row ─────────────────────────────────────────────────── */
#qs-omnibar-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

#qs-omnibar-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #8b5cf6;
  flex-shrink: 0;
  box-shadow: 0 0 6px #8b5cf6;
}

#qs-omnibar-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: rgba(255, 255, 255, 0.95);
  font-size: 15px;
  font-family: inherit;
  caret-color: #8b5cf6;
}

#qs-omnibar-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

/* ── Results list ──────────────────────────────────────────────── */
#qs-omnibar-results {
  overflow-y: auto;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: rgba(139, 92, 246, 0.4) transparent;
}

#qs-omnibar-results::-webkit-scrollbar {
  width: 4px;
}
#qs-omnibar-results::-webkit-scrollbar-thumb {
  background: rgba(139, 92, 246, 0.4);
  border-radius: 2px;
}

/* ── Result row ────────────────────────────────────────────────── */
.qs-omni-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 80ms;
  min-height: 48px;
}

.qs-omni-row:hover {
  background: rgba(139, 92, 246, 0.12);
}

.qs-omni-row.selected {
  background: linear-gradient(90deg,
    rgba(139, 92, 246, 0.22) 0%,
    rgba(139, 92, 246, 0.08) 100%);
  border-left: 2px solid #8b5cf6;
  padding-left: 14px;
}

/* ── Favicon ───────────────────────────────────────────────────── */
.qs-omni-favicon {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  object-fit: contain;
  flex-shrink: 0;
  opacity: 0.85;
}

.qs-omni-favicon-placeholder {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

/* ── Text block ────────────────────────────────────────────────── */
.qs-omni-text {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.qs-omni-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  line-height: 1.4;
}

.qs-omni-url {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  line-height: 1.4;
  margin-top: 1px;
}

/* ── Fuzzy highlight ───────────────────────────────────────────── */
.qs-omni-hl {
  color: #a78bfa;
  font-weight: 600;
}

/* ── Source badge ──────────────────────────────────────────────── */
.qs-omni-badge {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.06);
  text-transform: uppercase;
}

.qs-omni-badge.badge-bookmark { border-color: rgba(251, 191, 36, 0.4); color: #fbbf24; background: rgba(251, 191, 36, 0.08); }
.qs-omni-badge.badge-history  { border-color: rgba(99, 179, 237, 0.4); color: #63b3ed; background: rgba(99, 179, 237, 0.08); }
.qs-omni-badge.badge-tab      { border-color: rgba(52, 211, 153, 0.4); color: #34d399; background: rgba(52, 211, 153, 0.08); }
.qs-omni-badge.badge-cmd      { border-color: rgba(248, 113, 113, 0.4); color: #f87171; background: rgba(248, 113, 113, 0.08); }
.qs-omni-badge.badge-search   { border-color: rgba(139, 92, 246, 0.4); color: #a78bfa; background: rgba(139, 92, 246, 0.08); }
.qs-omni-badge.badge-url      { border-color: rgba(139, 92, 246, 0.4); color: #a78bfa; background: rgba(139, 92, 246, 0.08); }
.qs-omni-badge.badge-mark     { border-color: rgba(251, 146, 60, 0.4); color: #fb923c; background: rgba(251, 146, 60, 0.08); }

/* ── Empty state ───────────────────────────────────────────────── */
#qs-omnibar-empty {
  padding: 24px 16px;
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  font-size: 13px;
}
`;

module.exports = { OMNIBAR_CSS };
