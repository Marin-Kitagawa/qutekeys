const { keyEventToString } = require('../../src/content_scripts/keyhandler');
test('plain key', () => { expect(keyEventToString({ key:'a' })).toBe('a'); });
test('shifted letter uses uppercase from key', () => { expect(keyEventToString({ key:'J', shiftKey:true })).toBe('J'); });
test('escape special', () => { expect(keyEventToString({ key:'Escape' })).toBe('<Escape>'); });
test('ctrl combo', () => { expect(keyEventToString({ key:'i', ctrlKey:true })).toBe('<C-i>'); });
test('space special', () => { expect(keyEventToString({ key:' ' })).toBe('<Space>'); });

const { KeyHandler, makeContentKeydownHandler } = require('../../src/content_scripts/keyhandler');
const { KeyMap } = require('../../src/core/keymap');
test('KeyHandler fires onMatched for a complete sequence', () => {
  const km = new KeyMap(); km.bind('j', 'scroll-down');
  let fired = null;
  const kh = new KeyHandler(km, { onMatched: (c,n)=>{ fired = c; }, onPending(){}, onCleared(){} });
  kh.handleKey('j');
  expect(fired).toBe('scroll-down');
});

describe('makeContentKeydownHandler (mode-aware routing)', () => {
  test('routes keys to the keymap only in normal mode', () => {
    const calls = [];
    let mode = 'normal';
    const handler = makeContentKeydownHandler({
      modes: { current: () => mode },
      keyHandler: { handleKey: (k) => calls.push(k) },
      toKeyString: (e) => e.key,
    });
    handler({ key: 'j' });                 // normal → routed
    mode = 'hints';   handler({ key: 'a' }); // owned by hints controller → NOT routed
    mode = 'caret';   handler({ key: 'l' }); // owned by visual controller → NOT routed
    mode = 'command'; handler({ key: 'd' }); // owned by omnibar → NOT routed
    mode = 'normal';  handler({ key: 'k' }); // normal again → routed
    expect(calls).toEqual(['j', 'k']);
  });
  test('ignores standalone modifier keys', () => {
    const calls = [];
    const handler = makeContentKeydownHandler({
      modes: { current: () => 'normal' },
      keyHandler: { handleKey: (k) => calls.push(k) },
      toKeyString: (e) => e.key,
    });
    ['Shift', 'Control', 'Alt', 'Meta'].forEach((key) => handler({ key }));
    expect(calls).toEqual([]);
  });
});
test('ctrl + arrow uses mapped name', () => { expect(keyEventToString({ key:'ArrowUp', ctrlKey:true })).toBe('<C-Up>'); });
test('ctrl + enter', () => { expect(keyEventToString({ key:'Enter', ctrlKey:true })).toBe('<C-Enter>'); });
