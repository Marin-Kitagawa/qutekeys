'use strict';

const { api } = require('./chrome-api');

/**
 * LLM chat + inline query (Wave 8).
 *
 * All HTTP happens in the background service worker, where the extension's
 * host_permissions (<all_urls>) allow cross-origin fetch. The content-side
 * panel/never embeds an API key in the page.
 *
 * LLM settings are read from the shared QuteSurf config storage
 * ('qutesurf:config' → options):
 *   llm.endpoint  (default https://api.openai.com/v1/chat/completions)
 *   llm.model     (default gpt-4o-mini)
 *   llm.apikey    (required for real use)
 *   llm.system    (system prompt)
 * Inline query:
 *   inlinequery.url — GET template with %s placeholder (e.g. a dictionary API)
 */

const DEFAULTS = {
  'llm.endpoint': 'https://api.openai.com/v1/chat/completions',
  'llm.model': 'gpt-4o-mini',
  'llm.apikey': '',
  'llm.system': 'You are a helpful assistant.',
  'inlinequery.url': '',
};

async function loadOptions() {
  const chrome = api();
  const result = await chrome.storage.local.get('qutesurf:config');
  const stored = result && result['qutesurf:config'];
  const options = (stored && stored.options) || {};
  const merged = {};
  for (const key of Object.keys(DEFAULTS)) {
    merged[key] = options[key] !== undefined ? options[key] : DEFAULTS[key];
  }
  return merged;
}

/** Decode a single token produced by encodeURIComponent(JSON.stringify(x)). */
function decodeJsonArg(token) {
  if (!token) throw new Error('missing argument');
  const raw = decodeURIComponent(token);
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (_) {
    // Accept plain text that was not JSON-encoded
    parsed = raw;
  }
  return parsed;
}

function registerLlmCommands(registry) {
  registry.register({
    name: 'llm-chat',
    description: 'Send a chat completion request. Args: URL-encoded JSON array of {role, content} messages.',
    args: ['messages'],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, parsed) => {
      const opts = await loadOptions();
      if (!opts['llm.apikey']) {
        throw new Error('llm-chat: no API key configured — :set llm.apikey <key>');
      }
      const messages = decodeJsonArg(parsed.args[0]);
      if (!Array.isArray(messages) || !messages.length) {
        throw new Error('llm-chat: messages must be a non-empty array');
      }
      const chrome = api();
      const response = await fetch(opts['llm.endpoint'], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + opts['llm.apikey'],
        },
        body: JSON.stringify({
          model: opts['llm.model'],
          messages,
        }),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`llm-chat: HTTP ${response.status} ${body.slice(0, 300)}`);
      }
      const data = await response.json();
      const text = data &&
        data.choices && data.choices[0] &&
        data.choices[0].message && data.choices[0].message.content;
      if (typeof text !== 'string') throw new Error('llm-chat: unexpected response shape');
      // Persist to storage rather than returning large payloads through the
      // router; the panel reads the latest reply from storage.
      await chrome.storage.local.set({
        'qutesurf:llm:last': { role: 'assistant', content: text, at: Date.now() },
      });
      return text.slice(0, 10000);
    },
  });

  registry.register({
    name: 'inline-query',
    description: 'Query the configured inline-query endpoint (dictionary/translate API). Args: URL-encoded text.',
    args: ['text'],
    context: 'background',
    modes: ['normal'],
    handler: async (_ctx, parsed) => {
      const opts = await loadOptions();
      const template = opts['inlinequery.url'];
      if (!template) {
        throw new Error('inline-query: not configured — :set inlinequery.url <url-with-%s>');
      }
      const text = decodeURIComponent(parsed.args[0] || '');
      if (!text) throw new Error('inline-query: no text');
      const url = template.replace('%s', encodeURIComponent(text));
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('inline-query: HTTP ' + response.status);
      }
      const body = await response.text();
      return body.slice(0, 4000);
    },
  });
}

module.exports = { registerLlmCommands, decodeJsonArg, loadOptions, DEFAULTS };
