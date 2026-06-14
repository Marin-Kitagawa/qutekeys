const { CommandRegistry } = require('../../src/core/registry');
const { registerAllContentCommands } = require('../../src/content_scripts/commands');
test('aggregator registers nav and hint commands', () => {
  const reg = new CommandRegistry();
  const fakeController = { start(){} };
  registerAllContentCommands(reg, { hintsController: fakeController });
  expect(reg.get('scroll-down')).toBeTruthy();
  expect(reg.get('back')).toBeTruthy();
  expect(reg.get('hint')).toBeTruthy();
});

// Regression: a live run revealed the bootstrap never constructed/passed the
// Omnibar, so `cmdline` / `omnibar-*` were never registered and `:` was a no-op.
// This asserts the wiring contract: when an omnibar is supplied, its commands register.
test('aggregator registers omnibar commands when an omnibar is supplied', () => {
  const reg = new CommandRegistry();
  const fakeOmnibar = { open(){} };
  registerAllContentCommands(reg, { hintsController: { start(){} }, omnibar: fakeOmnibar });
  expect(reg.get('cmdline')).toBeTruthy();
  expect(reg.get('omnibar-open')).toBeTruthy();
  expect(reg.get('omnibar-tabs')).toBeTruthy();
});
