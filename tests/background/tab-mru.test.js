const { recordActivation, getMru, lastUsed, historyStep, firstActivated, lastActivated, _setMru } = require('../../src/background/tab-mru');

beforeEach(() => { _setMru([]); });

test('recordActivation pushes to front and deduplicates', () => {
  recordActivation(1);
  recordActivation(2);
  recordActivation(1);
  expect(getMru()).toEqual([1, 2]);
});

test('recordActivation caps at 50', () => {
  for (let i = 0; i < 60; i++) recordActivation(i);
  expect(getMru().length).toBe(50);
});

test('lastUsed returns the most recent tab that is not current', () => {
  recordActivation(1);
  recordActivation(2);
  recordActivation(3);
  // MRU is [3, 2, 1]; current is 3; lastUsed should be 2
  expect(lastUsed(3)).toBe(2);
});

test('lastUsed returns null when only one tab', () => {
  recordActivation(5);
  expect(lastUsed(5)).toBe(null);
});

test('historyStep dir=-1 goes back in history (to less recent)', () => {
  recordActivation(1);
  recordActivation(2);
  recordActivation(3);
  // MRU: [3, 2, 1]. Current=3 at idx 0. dir=-1 → idx 0 - (-1) = idx 1 → id 2
  expect(historyStep(3, -1)).toBe(2);
});

test('historyStep dir=+1 goes forward in history (to more recent)', () => {
  recordActivation(1);
  recordActivation(2);
  recordActivation(3);
  // MRU: [3, 2, 1]. Current=2 at idx 1. dir=+1 → idx 1 - 1 = idx 0 → id 3
  expect(historyStep(2, +1)).toBe(3);
});

test('historyStep returns null at boundary', () => {
  recordActivation(1);
  recordActivation(2);
  // MRU: [2, 1]. Current=1 at idx 1. dir=-1 → idx 2 which is OOB
  expect(historyStep(1, -1)).toBe(null);
  // Current=2 at idx 0. dir=+1 → idx -1 which is OOB
  expect(historyStep(2, +1)).toBe(null);
});

test('firstActivated returns oldest tab', () => {
  recordActivation(1);
  recordActivation(2);
  recordActivation(3);
  // MRU: [3, 2, 1]. Oldest = 1
  expect(firstActivated()).toBe(1);
});

test('lastActivated returns most recently activated tab', () => {
  recordActivation(1);
  recordActivation(2);
  recordActivation(3);
  expect(lastActivated()).toBe(3);
});

test('_setMru replaces the internal list', () => {
  recordActivation(99);
  _setMru([10, 20, 30]);
  expect(getMru()).toEqual([10, 20, 30]);
});
