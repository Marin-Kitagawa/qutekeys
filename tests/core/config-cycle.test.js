'use strict';

const { Config } = require('../../src/core/config');

function fakeStorage() {
  const d = {};
  return {
    get: async (k) => ({ [k]: d[k] }),
    set: async (o) => { Object.assign(d, o); },
    remove: async (k) => { delete d[k]; },
    _data: d,
  };
}

describe('Config extensions (cycle / unset / clearOptions)', () => {
  test('set with no value stores true (config-commands semantics)', async () => {
    const cfg = new Config(fakeStorage());
    await cfg.set('smoothscroll', true);
    expect(cfg.get('smoothscroll')).toBe(true);
  });

  test('cycle toggles a boolean', async () => {
    const cfg = new Config(fakeStorage());
    expect(cfg.get('smoothscroll')).toBe(true);
    const next = await cfg.cycle('smoothscroll');
    expect(next).toBe(false);
    expect((await cfg.cycle('smoothscroll'))).toBe(true);
  });

  test('cycle walks a provided value list', async () => {
    const cfg = new Config(fakeStorage());
    await cfg.set('theme', 'aurora');
    expect(await cfg.cycle('theme', ['aurora', 'obsidian', 'frost'])).toBe('obsidian');
    expect(await cfg.cycle('theme', ['aurora', 'obsidian', 'frost'])).toBe('frost');
    expect(await cfg.cycle('theme', ['aurora', 'obsidian', 'frost'])).toBe('aurora');
  });

  test('cycle with unknown current value starts at the first list entry', async () => {
    const cfg = new Config(fakeStorage());
    await cfg.set('theme', 'weird');
    expect(await cfg.cycle('theme', ['aurora', 'obsidian'])).toBe('aurora');
  });

  test('unset restores the default value', async () => {
    const cfg = new Config(fakeStorage());
    await cfg.set('scrollstep', 200);
    expect(cfg.get('scrollstep')).toBe(200);
    await cfg.unset('scrollstep');
    expect(cfg.get('scrollstep')).toBe(70);
  });

  test('clearOptions resets all user options but keeps bindings', async () => {
    const cfg = new Config(fakeStorage());
    await cfg.set('theme', 'obsidian');
    await cfg.set('homepage', 'https://example.com');
    await cfg.bind('normal', 'Z', 'tab-close');
    await cfg.clearOptions();
    expect(cfg.get('theme')).toBe('aurora');
    expect(cfg.get('homepage')).toBe('');
    expect(cfg.getUserBindings('normal')['Z']).toBe('tab-close');
  });
});
