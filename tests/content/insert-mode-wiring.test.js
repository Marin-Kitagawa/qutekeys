'use strict';

const { marks } = require('../../src/content_scripts/ui/sources');

function fakeConfig(marksMap) {
  return {
    get: (key) => (key === 'marks' ? marksMap : undefined),
  };
}

describe('omnibar marks source (Wave 0 fix)', () => {
  test('normalizes { url, scrollY } mark objects', async () => {
    const cfg = fakeConfig({
      a: { url: 'https://example.com', scrollY: 400 },
      b: { url: 'https://other.com', scrollY: 0 },
    });
    const items = await marks('', cfg);
    expect(items.length).toBe(2);
    expect(items[0].type).toBe('mark');
    expect(items[0].url).toBe('https://example.com');
    expect(items[0].action).toEqual({ kind: 'open', url: 'https://example.com' });
  });

  test('tolerates legacy plain-string marks', async () => {
    const cfg = fakeConfig({ a: 'https://legacy.com' });
    const items = await marks('', cfg);
    expect(items.length).toBe(1);
    expect(items[0].url).toBe('https://legacy.com');
  });

  test('filters by query on key or url and skips empty urls', async () => {
    const cfg = fakeConfig({
      a: { url: 'https://alpha.com', scrollY: 0 },
      b: { url: '', scrollY: 0 },
      c: { url: 'https://beta.com', scrollY: 0 },
    });
    const items = await marks('beta', cfg);
    expect(items.length).toBe(1);
    expect(items[0].url).toBe('https://beta.com');
  });
});

describe('mode-insert / mode-normal command wiring', () => {
  test('mode-insert delegates to the insert controller, mode-normal leaves insert', async () => {
    const { CommandRegistry } = require('../../src/core/registry');
    const { ModeStack } = require('../../src/core/modes');
    const { registerWave6Commands } = require('../../src/commands/wave6-commands');

    const registry = new CommandRegistry();
    const modes = new ModeStack('normal');
    const calls = { enterExplicit: 0 };
    const insert = {
      enterExplicit: () => { calls.enterExplicit++; },
      leaveIfActive: () => {
        if (modes.current() === 'insert') { modes.leave(); return true; }
        return false;
      },
    };
    registerWave6Commands(registry, { modes, insert });

    expect(registry.get('mode-insert')).toBeTruthy();
    expect(registry.get('mode-normal')).toBeTruthy();

    await registry.get('mode-insert').handler({}, { args: [], flags: {} });
    expect(calls.enterExplicit).toBe(1);

    // mode-normal while in normal mode → no crash, mode unchanged
    await registry.get('mode-normal').handler({}, { args: [], flags: {} });
    expect(modes.current()).toBe('normal');
  });
});
