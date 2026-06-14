const { ModeStack } = require('../../src/core/modes');
test('pushes and pops modes, Escape pops to previous', () => {
  const ms = new ModeStack('normal');
  expect(ms.current()).toBe('normal');
  ms.enter('hints'); expect(ms.current()).toBe('hints');
  ms.enter('insert'); expect(ms.current()).toBe('insert');
  ms.leave(); expect(ms.current()).toBe('hints');
  ms.leave(); expect(ms.current()).toBe('normal');
  ms.leave(); expect(ms.current()).toBe('normal'); // never pops base
});
test('notifies subscribers on change', () => {
  const ms = new ModeStack('normal'); const cb = jest.fn();
  ms.onChange(cb); ms.enter('visual');
  expect(cb).toHaveBeenCalledWith('visual', 'normal');
});
test('unsubscribe function stops notifications', () => {
  const ms = new ModeStack('normal'); const cb = jest.fn();
  const unsubscribe = ms.onChange(cb);
  ms.enter('visual');
  expect(cb).toHaveBeenCalledTimes(1);
  unsubscribe();
  ms.enter('insert');
  expect(cb).toHaveBeenCalledTimes(1); // no new call
});
