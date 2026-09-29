'use strict';

/**
 * LLM chat panel (Wave 8, SurfingKeys `A` / llmchat parity — pluggable,
 * user-configured endpoint only; no bundled keys).
 *
 * Open with `A` (normal mode) or `:llm-chat-open [prompt]`. If a text
 * selection exists it is offered as the initial prompt. Requests run through
 * the background command `llm-chat` (settings: llm.endpoint / llm.model /
 * llm.apikey / llm.system via `:set`).
 *
 * Import-safe under Jest: DOM access guarded.
 */

const CHAT_CSS = `
  #qs-llm {
    position: fixed; right: 18px; bottom: 52px; z-index: 2147483647;
    width: 380px; height: 440px; display: flex; flex-direction: column;
    background: rgba(26, 26, 34, 0.97);
    border: 1px solid rgba(124, 92, 255, 0.45);
    border-radius: 14px; box-shadow: 0 12px 40px rgba(0,0,0,0.5);
    color: #e8e8ef; font: 13px/1.5 'Hanken Grotesk', system-ui, sans-serif;
    overflow: hidden;
  }
  #qs-llm-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; border-bottom: 1px solid rgba(124,92,255,0.3);
    color: #c9b8ff; font-weight: 600;
  }
  #qs-llm-close { cursor: pointer; color: #8d87a8; padding: 0 4px; }
  #qs-llm-close:hover { color: #e8e8ef; }
  #qs-llm-messages { flex: 1; overflow-y: auto; padding: 10px 12px; }
  .qs-llm-msg { margin: 6px 0; padding: 8px 10px; border-radius: 10px; white-space: pre-wrap; word-break: break-word; }
  .qs-llm-msg.user { background: rgba(124,92,255,0.22); margin-left: 24px; }
  .qs-llm-msg.assistant { background: rgba(255,255,255,0.06); margin-right: 24px; }
  .qs-llm-msg.error { background: rgba(235,80,80,0.15); color: #f0a0a0; margin-right: 24px; }
  #qs-llm-inputrow { display: flex; border-top: 1px solid rgba(124,92,255,0.3); }
  #qs-llm-input {
    flex: 1; border: none; outline: none; background: transparent;
    color: #e8e8ef; padding: 10px 12px; font: inherit; resize: none;
  }
  #qs-llm-send {
    border: none; background: rgba(124,92,255,0.25); color: #e8e8ef;
    padding: 0 14px; cursor: pointer; font: inherit;
  }
  #qs-llm-send:hover { background: rgba(124,92,255,0.45); }
`;

function LLMChat({ host, messaging }) {
  let _panel = null;
  let _messagesEl = null;
  let _input = null;
  let _history = []; // {role, content}
  let _escListener = null;
  let _busy = false;

  function isOpen() { return !!_panel; }

  function close() {
    if (_panel) _panel.remove();
    _panel = null; _messagesEl = null; _input = null;
    if (_escListener && typeof document !== 'undefined') {
      document.removeEventListener('keydown', _escListener, true);
      _escListener = null;
    }
  }

  function installEsc() {
    if (_escListener || typeof document === 'undefined') return;
    _escListener = (e) => {
      if (e.key === 'Escape' && document.activeElement !== _input) {
        close(); e.preventDefault(); e.stopPropagation();
      }
    };
    document.addEventListener('keydown', _escListener, true);
  }

  function renderMessage(role, content) {
    if (!_messagesEl) return;
    const div = document.createElement('div');
    div.className = 'qs-llm-msg ' + role;
    div.textContent = content; // textContent only — never HTML
    _messagesEl.appendChild(div);
    _messagesEl.scrollTop = _messagesEl.scrollHeight;
  }

  function renderHistory() {
    if (!_messagesEl) return;
    _messagesEl.innerHTML = '';
    for (const m of _history) renderMessage(m.role, m.content);
  }

  async function send(text) {
    const content = String(text || '').trim();
    if (!content || _busy) return;
    _history.push({ role: 'user', content });
    renderMessage('user', content);
    _busy = true;
    renderMessage('assistant', '…');
    try {
      if (!messaging || typeof messaging.sendMessage !== 'function') {
        throw new Error('no messaging channel');
      }
      const encoded = encodeURIComponent(JSON.stringify(_history.filter(m => m.role !== 'error')));
      const res = await messaging.sendMessage({
        type: 'command', name: 'llm-chat',
        args: [encoded], flags: {}, count: null,
      });
      const ok = res && typeof res === 'object' && 'ok' in res ? res.ok : true;
      const value = res && typeof res === 'object' && 'ok' in res ? res.result : res;
      // Replace the '…' placeholder bubble
      if (_messagesEl && _messagesEl.lastChild) _messagesEl.lastChild.remove();
      if (!ok) {
        renderMessage('error', (res && res.error) || 'request failed');
      } else {
        _history.push({ role: 'assistant', content: String(value) });
        renderMessage('assistant', String(value));
      }
    } catch (err) {
      if (_messagesEl && _messagesEl.lastChild) _messagesEl.lastChild.remove();
      renderMessage('error', String(err && err.message ? err.message : err));
    } finally {
      _busy = false;
    }
  }

  /**
   * Open the chat panel. With a current selection, prefill the input with it.
   */
  function open(prefill) {
    if (typeof document === 'undefined') return;
    if (_panel) { close(); return; }

    _panel = document.createElement('div');
    _panel.id = 'qs-llm';

    const header = document.createElement('div');
    header.id = 'qs-llm-header';
    const title = document.createElement('span');
    title.textContent = 'QuteSurf Chat';
    const closeBtn = document.createElement('span');
    closeBtn.id = 'qs-llm-close';
    closeBtn.textContent = '✕';
    closeBtn.title = 'Close (Esc)';
    closeBtn.addEventListener('mousedown', (e) => { e.preventDefault(); close(); });
    header.appendChild(title);
    header.appendChild(closeBtn);

    _messagesEl = document.createElement('div');
    _messagesEl.id = 'qs-llm-messages';

    const inputRow = document.createElement('div');
    inputRow.id = 'qs-llm-inputrow';
    _input = document.createElement('textarea');
    _input.id = 'qs-llm-input';
    _input.rows = 2;
    _input.placeholder = 'Ask… (Enter to send)';
    _input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const val = _input.value;
        _input.value = '';
        send(val);
      } else if (e.key === 'Escape') {
        e.preventDefault(); close();
      }
    });
    const sendBtn = document.createElement('button');
    sendBtn.id = 'qs-llm-send';
    sendBtn.textContent = '➤';
    sendBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const val = _input.value;
      _input.value = '';
      send(val);
    });
    inputRow.appendChild(_input);
    inputRow.appendChild(sendBtn);

    _panel.appendChild(header);
    _panel.appendChild(_messagesEl);
    _panel.appendChild(inputRow);

    host.replaceStyle('llmchat', CHAT_CSS);
    host.mount(_panel);
    installEsc();
    renderHistory();

    let pre = typeof prefill === 'string' ? prefill : '';
    if (!pre && typeof window !== 'undefined' && window.getSelection) {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) pre = sel.toString().trim();
    }
    if (pre) {
      _input.value = pre;
      _input.select();
    }
    _input.focus();
  }

  return { open, close, isOpen, send };
}

module.exports = { LLMChat };
