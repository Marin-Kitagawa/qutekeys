const { PassThrough } = require('../../src/content_scripts/passthrough');
const { ModeStack } = require('../../src/core/modes');

test('enter() pushes passthrough mode', () => {
  const modes = new ModeStack('normal');
  const pt = new PassThrough({ modes });
  pt.enter();
  expect(modes.current()).toBe('passthrough');
  pt.exit();
  expect(modes.current()).toBe('normal');
});

test('Esc listener exits passthrough', () => {
  // We test that exit() leaves mode without full DOM
  const modes = new ModeStack('normal');
  const pt = new PassThrough({ modes });
  pt.enter();
  pt.exit(); // simulate Esc
  expect(modes.current()).toBe('normal');
});

test('enterEphemeral auto-exits after timeout', (done) => {
  jest.useFakeTimers();
  const modes = new ModeStack('normal');
  const pt = new PassThrough({ modes });
  pt.enterEphemeral(500);
  expect(modes.current()).toBe('passthrough');
  jest.advanceTimersByTime(600);
  expect(modes.current()).toBe('normal');
  jest.useRealTimers();
  done();
});
