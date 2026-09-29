'use strict';

/**
 * Wave 8 content-command tests (jsdom).
 */

const { CommandRegistry } = require('../../src/core/registry');
const { registerWave8Commands } = require('../../src/commands/wave8-commands');
const { EmojiPicker, EMOJIS } = require('../../src/content_scripts/emoji');
const { ModeStack } = require('../../src/core/modes');

function fakeHost() {
  const mounted = [];
  return {
    root: {},
    replaceStyle: () => {},
    mount: (el) => mounted.push(el),
    mounted,
  };
}

function fakeMessaging() {
  const sent = [];
  return {
    sent,
    sendMessage: async (msg) => { sent.push(msg); return { ok: true, result: null }; },
  };
}

describe('wave 8 command registration', () => {
  test('registers all Wave 8 commands', () => {
    const reg = new CommandRegistry();
    registerWave8Commands(reg, {});
    for (const name of [
      'preview-markdown', 'inline-query', 'llm-chat-open', 'emoji-picker',
      'tts-voices', 'tts-say', 'container-open',
    ]) {
      expect(reg.get(name)).toBeTruthy();
    }
  });

  test('container-open forwards container + current URL to background', async () => {
    const reg = new CommandRegistry();
    const messaging = fakeMessaging();
    registerWave8Commands(reg, { messaging });
    await reg.get('container-open').handler({}, { args: ['Work'], flags: {} });
    expect(messaging.sent.length).toBe(1);
    expect(messaging.sent[0].name).toBe('open-in-container');
    expect(messaging.sent[0].args[0]).toBe('Work');
    expect(messaging.sent[0].args[1]).toBe(location.href);
  });

  test('container-open with explicit URL passes it through', async () => {
    const reg = new CommandRegistry();
    const messaging = fakeMessaging();
    registerWave8Commands(reg, { messaging });
    await reg.get('container-open').handler({}, { args: ['Work', 'https://explicit.com'], flags: {} });
    expect(messaging.sent[0].args[1]).toBe('https://explicit.com');
  });

  test('tts-voices is a no-op without speechSynthesis', () => {
    const reg = new CommandRegistry();
    registerWave8Commands(reg, { host: fakeHost() });
    expect(() => reg.get('tts-voices').handler({}, { args: [], flags: {} })).not.toThrow();
  });

  test('tts-say without speechSynthesis is a no-op', () => {
    const reg = new CommandRegistry();
    registerWave8Commands(reg, { host: fakeHost() });
    expect(() => reg.get('tts-say').handler({}, { args: ['hello'], flags: {} })).not.toThrow();
  });

  test('inline-query without text or selection does not throw', async () => {
    const reg = new CommandRegistry();
    const inlineQuery = { query: async () => 'called', queryWord: async () => 'called' };
    registerWave8Commands(reg, { inlineQuery });
    const calls = [];
    const iq = { query: async (t) => calls.push(['query', t]), queryWord: async () => calls.push(['word']) };
    const reg2 = new CommandRegistry();
    registerWave8Commands(reg2, { inlineQuery: iq });
    await reg2.get('inline-query').handler({}, { args: [], flags: {} });
    expect(calls).toContainEqual(['word']);
    await reg2.get('inline-query').handler({}, { args: ['lookup', 'this'], flags: {} });
    expect(calls).toContainEqual(['query', 'lookup this']);
  });

  test('llm-chat-open delegates with joined args', () => {
    const opened = [];
    const reg = new CommandRegistry();
    registerWave8Commands(reg, { llmChat: { open: (p) => opened.push(p) } });
    reg.get('llm-chat-open').handler({}, { args: ['explain', 'this'], flags: {} });
    expect(opened).toEqual(['explain this']);
    reg.get('llm-chat-open').handler({}, { args: [], flags: {} });
    expect(opened[1]).toBe(undefined);
  });
});

describe('emoji picker', () => {
  test('dataset entries are [char, names] pairs with lowercase names', () => {
    expect(EMOJIS.length).toBeGreaterThan(100);
    for (const [char, names] of EMOJIS) {
      expect(typeof char).toBe('string');
      expect(typeof names).toBe('string');
      expect(names).toBe(names.toLowerCase());
    }
  });

  test('opens, mounts UI and closes', () => {
    document.body.innerHTML = '';
    const host = fakeHost();
    const modes = new ModeStack('normal');
    const picker = new EmojiPicker({ host, modes, config: null });
    picker.open();
    expect(picker.visible()).toBe(true);
    expect(host.mounted.length).toBe(1);
    picker.close();
    expect(picker.visible()).toBe(false);
  });
});
