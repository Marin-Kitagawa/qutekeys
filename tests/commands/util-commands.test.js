'use strict';

const { showBanner, parseKeySequence } = require('../../src/commands/util-commands');
const { CommandRegistry } = require('../../src/core/registry');
const { registerUtilCommands } = require('../../src/commands/util-commands');

function fakeHost() {
  const mounted = [];
  const styles = {};
  return {
    root: {},
    replaceStyle: (marker, css) => { styles[marker] = css; },
    mount: (el) => mounted.push(el),
    mounted,
    styles,
  };
}

describe('message banner', () => {
  test('showBanner mounts a text-only element (XSS-safe)', () => {
    jest.useFakeTimers();
    const host = fakeHost();
    showBanner(host, '<img src=x onerror=alert(1)>', 'error', 100);
    expect(host.mounted.length).toBe(1);
    const el = host.mounted[0];
    expect(el.className).toContain('qs-banner-error');
    // textContent — never innerHTML — so the payload must not become markup
    expect(el.innerHTML).not.toContain('<img');
    expect(el.textContent).toBe('<img src=x onerror=alert(1)>');
    jest.advanceTimersByTime(120);
    jest.useRealTimers();
  });
});

describe('parseKeySequence', () => {
  test('parses plain chars, space and modifier chords', () => {
    const seq = parseKeySequence('j <C-a> <Escape>');
    expect(seq.length).toBe(3);
    expect(seq[0]).toMatchObject({ key: 'j', ctrlKey: false });
    expect(seq[1]).toMatchObject({ key: 'a', ctrlKey: true });
    expect(seq[2]).toMatchObject({ key: 'Escape' });
  });

  test('maps special names', () => {
    const seq = parseKeySequence('<Space><Up>');
    expect(seq[0].key).toBe(' ');
    expect(seq[1].key).toBe('ArrowUp');
  });
});

describe('run-with-count / later', () => {
  test('run-with-count runs a command N times via dispatcher', async () => {
    const registry = new CommandRegistry();
    const runs = [];
    const dispatcher = { runString: (s) => { runs.push(s); return Promise.resolve(); } };
    registerUtilCommands(registry, { dispatcher });
    await registry.get('run-with-count').handler({}, { args: ['3', 'scroll-down'], flags: {}, count: null });
    expect(runs).toEqual(['scroll-down', 'scroll-down', 'scroll-down']);
  });

  test('run-with-count honours a keymap count prefix', async () => {
    const registry = new CommandRegistry();
    const runs = [];
    const dispatcher = { runString: (s) => { runs.push(s); return Promise.resolve(); } };
    registerUtilCommands(registry, { dispatcher });
    await registry.get('run-with-count').handler({}, { args: ['scroll-down'], flags: {}, count: 5 });
    expect(runs.length).toBe(5);
  });

  test('later schedules a command after the delay', async () => {
    jest.useFakeTimers();
    const registry = new CommandRegistry();
    const runs = [];
    const dispatcher = { runString: (s) => { runs.push(s); return Promise.resolve(); } };
    registerUtilCommands(registry, { dispatcher });
    registry.get('later').handler({}, { args: ['500', 'tab-close'], flags: {}, count: null });
    expect(runs).toEqual([]);
    jest.advanceTimersByTime(600);
    expect(runs).toEqual(['tab-close']);
    jest.useRealTimers();
  });
});

describe('fake-key event synthesis', () => {
  test('dispatches keydown/keyup pairs for the parsed sequence', () => {
    document.body.innerHTML = '<input id="fk">';
    const registry = new CommandRegistry();
    registerUtilCommands(registry, {});
    const input = document.getElementById('fk');
    input.focus();
    const events = [];
    input.addEventListener('keydown', (e) => events.push(e));
    registry.get('fake-key').handler({}, { args: ['<C-a>'], flags: {}, count: null });
    expect(events.length).toBe(1);
    expect(events[0].ctrlKey).toBe(true);
    expect(events[0].key).toBe('a');
  });
});
