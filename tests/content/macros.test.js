const { MacroStore, Macros } = require('../../src/content_scripts/macros');

test('MacroStore: records keys when in recording state', () => {
  const store = new MacroStore();
  store.startRecord('a');
  expect(store.isRecording()).toBe(true);
  expect(store.currentRegister()).toBe('a');
  store.recordKey('j');
  store.recordKey('k');
  store.stopRecord();
  expect(store.isRecording()).toBe(false);
  expect(store.get('a')).toEqual(['j', 'k']);
});

test('MacroStore: replay calls replayFn for each key', () => {
  const store = new MacroStore();
  store.startRecord('b');
  store.recordKey('x');
  store.recordKey('y');
  store.stopRecord();
  const replayed = [];
  store.replay('b', k => replayed.push(k));
  expect(replayed).toEqual(['x', 'y']);
});

test('MacroStore: empty register returns empty array', () => {
  const store = new MacroStore();
  expect(store.get('z')).toEqual([]);
});

test('MacroStore: stopRecord before startRecord does nothing', () => {
  const store = new MacroStore();
  expect(() => store.stopRecord()).not.toThrow();
  expect(store.isRecording()).toBe(false);
});

test('Macros: isRecording delegates to store', () => {
  const replayed = [];
  const m = new Macros({ onReplayKey: k => replayed.push(k) });
  m.startRecord('a');
  m.recordKey('g');
  m.stopRecord();
  m.run('a');
  expect(replayed).toEqual(['g']);
});
