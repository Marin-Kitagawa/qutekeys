'use strict';

/**
 * Register all hint-mode commands into the given CommandRegistry.
 *
 * Each command calls controller.start(<action>) which triggers the hints
 * engine to collect targets, render Glass labels, and await user input.
 *
 * @param {import('../core/registry').CommandRegistry} registry
 * @param {import('../content_scripts/hints').HintsController} controller
 */
function registerHintCommands(registry, controller) {
  const cmds = [
    {
      name: 'hint',
      action: 'follow',
      description: 'Show hints and follow the selected link or button',
    },
    {
      name: 'hint-newtab',
      action: 'newtab',
      description: 'Show hints and open the selected link in a new tab',
    },
    {
      name: 'hint-yank',
      action: 'yank',
      description: 'Show hints and copy the URL or text of the selected element',
    },
    {
      name: 'hint-hover',
      action: 'hover',
      description: 'Show hints and hover (mouseover) the selected element',
    },
    {
      name: 'hint-input',
      action: 'input',
      description: 'Show hints and focus the selected input field',
    },
    {
      name: 'hint-download',
      action: 'download',
      description: 'Show hints and download the selected link',
    },
    {
      name: 'hint-images',
      action: 'images',
      description: 'Show hints for images and open the selected image in a new tab',
    },
    {
      name: 'hint-multi',
      action: 'multi',
      description: 'Show hints and follow multiple targets without closing hint mode',
    },
    {
      name: 'hint-text',
      action: 'text',
      description: 'Show hints and copy the visible text of the selected element',
    },

    // ── Wave-2 hint commands ────────────────────────────────────────────────
    {
      name: 'hint-newtab-bg',
      action: 'hint-newtab-bg',
      description: 'Show hints and open the selected link in a background tab (qute ;b, SK gf)',
    },
    {
      name: 'hint-newtab-fg',
      action: 'hint-newtab-fg',
      description: 'Show hints and open the selected link in a foreground new tab (qute ;f, SK af)',
    },
    {
      name: 'hint-rapid',
      action: 'hint-rapid',
      description: 'Rapid-hint: open multiple links in background tabs until Esc (qute ;r, SK cf)',
    },
    {
      name: 'hint-images-tab',
      action: 'hint-images-tab',
      description: 'Show hints for images and open the selected image src in a new tab (qute ;I)',
    },
    {
      name: 'hint-fill',
      action: 'hint-fill',
      description: 'Show hints and pre-fill the omnibar with the hinted URL for editing (qute ;o)',
    },
    {
      name: 'hint-input-first',
      action: 'hint-input-first',
      description: 'Focus the first input on the page without showing hint labels (qute gi)',
    },
    {
      name: 'hint-input-layer',
      action: 'hint-input-layer',
      description: 'Overlay all inputs; Tab/Shift-Tab cycles through them (SK gi)',
    },
    {
      name: 'hint-yank-multi',
      action: 'hint-yank-multi',
      description: 'Yank multiple link URLs; Esc finishes and writes all to clipboard (SK yma)',
    },
    {
      name: 'hint-yank-column',
      action: 'hint-yank-column',
      description: 'Hint a table column header and yank the column\'s cell text (SK yc)',
    },
    {
      name: 'hint-yank-pre',
      action: 'hint-yank-pre',
      description: 'Hint a <pre> block and yank its text content (SK yq)',
    },
    {
      name: 'hint-yank-input',
      action: 'hint-yank-input',
      description: 'Hint an input/textarea/select and yank its current value (SK yi)',
    },
    {
      name: 'hint-click-media',
      action: 'hint-click-media',
      description: 'Hint images and buttons and click the selected one (SK q)',
    },
    {
      name: 'hint-mouseover',
      action: 'hint-mouseover',
      description: 'Hint elements and dispatch mouseover on the selected one (SK Ctrl-h)',
    },
    {
      name: 'hint-mouseout',
      action: 'hint-mouseout',
      description: 'Hint elements and dispatch mouseout on the selected one (SK Ctrl-j)',
    },
    {
      name: 'hint-regional',
      action: 'hint-regional',
      description: 'Hint large regions; sub-menu: t=copy text, h=copy html, d=delete (SK L)',
    },
    {
      name: 'hint-detect-links',
      action: 'hint-detect-links',
      description: 'Hint visible text that looks like a URL and navigate to it (SK O)',
    },
  ];

  for (const { name, action, description } of cmds) {
    registry.register({
      name,
      description,
      context: 'content',
      modes: ['normal'],
      handler(_ctx, _parsed) {
        controller.start(action);
      },
    });
  }
}

module.exports = { registerHintCommands };
