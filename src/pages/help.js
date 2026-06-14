/* QuteSurf Help page script — runs on DOMContentLoaded in the browser only */
/* global chrome */

/* NOTE: This file is copied as-is to dist/pages/ by CopyWebpackPlugin.
   It is NOT bundled by webpack, so it cannot use require()/import().
   All logic is self-contained.
*/

(function () {
  'use strict';

  // ── Category helpers (mirrors help-data.js categorize) ───────────────────
  var CATEGORY_ORDER = [
    'Navigation', 'Hints', 'Tabs', 'Omnibar', 'Find',
    'Clipboard', 'Visual', 'Marks', 'Sessions', 'Proxy',
    'Userscripts', 'Editor', 'Settings', 'Other',
  ];

  function categorize(name) {
    if (/^tab-/.test(name))                                      return 'Tabs';
    if (/^session-/.test(name))                                  return 'Sessions';
    if (
      /^scroll/.test(name) || /^back$/.test(name) ||
      /^forward$/.test(name) || /^reload/.test(name) ||
      /^stop$/.test(name) || /^url-/.test(name) || /^home$/.test(name)
    )                                                            return 'Navigation';
    if (/^hint/.test(name))                                      return 'Hints';
    if (/^omnibar/.test(name) || /^cmdline$/.test(name))        return 'Omnibar';
    if (/^find/.test(name))                                      return 'Find';
    if (/^yank/.test(name) || /^paste/.test(name))              return 'Clipboard';
    if (/^caret/.test(name) || /^visual/.test(name) || /^selection/.test(name)) return 'Visual';
    if (/^mark/.test(name) || /^quickmark/.test(name))          return 'Marks';
    if (/^proxy/.test(name))                                     return 'Proxy';
    if (/^userscript/.test(name))                               return 'Userscripts';
    if (/^edit-with/.test(name))                                 return 'Editor';
    if (
      /^set$/.test(name) || /^bind$/.test(name) ||
      /^unbind$/.test(name) || /^profile$/.test(name) ||
      /^help$/.test(name) || /^mode-/.test(name)
    )                                                            return 'Settings';
    return 'Other';
  }

  // ── Inline CANONICAL_COMMANDS list (mirrors profiles/index.js) ───────────
  var CANONICAL_COMMANDS = [
    'scroll-down','scroll-up','scroll-left','scroll-right',
    'scroll-halfpage-down','scroll-halfpage-up',
    'scroll-page-down','scroll-page-up',
    'scroll-to-top','scroll-to-bottom','scroll-to-perc',
    'back','forward','reload','reload-hard','stop',
    'url-up','url-root','home',
    'hint','hint-newtab','hint-yank','hint-hover','hint-input',
    'hint-download','hint-images','hint-multi','hint-text',
    'tab-new','tab-close','tab-clone','tab-next','tab-prev',
    'tab-first','tab-last','tab-goto','tab-pin','tab-mute',
    'tab-move','tab-undo','tab-only','tab-detach',
    'omnibar-open','omnibar-open-newtab','omnibar-bookmarks',
    'omnibar-history','omnibar-tabs','omnibar-commands',
    'omnibar-marks','cmdline',
    'find','find-next','find-prev',
    'yank-url','yank-title','yank-mdlink','yank-selection',
    'yank-anchor','paste-and-go','paste-and-go-newtab',
    'caret-mode','visual-mode','selection-toggle',
    'mark-set','mark-jump',
    'quickmark-save','quickmark-open','quickmark-open-newtab',
    'session-save','session-load','session-list','session-delete',
    'proxy-set','proxy-clear','proxy-toggle-host',
    'userscript-add','userscript-list','userscript-remove',
    'edit-with-vim','edit-with-nvim',
    'mode-insert','mode-normal','mode-passthrough','help',
    'set','bind','unbind','profile',
  ];

  // Known descriptions (from command registrations)
  var KNOWN_DESCRIPTIONS = {
    'scroll-down':        'Scroll down',
    'scroll-up':          'Scroll up',
    'scroll-left':        'Scroll left',
    'scroll-right':       'Scroll right',
    'scroll-halfpage-down': 'Scroll halfpage down',
    'scroll-halfpage-up':   'Scroll halfpage up',
    'scroll-page-down':   'Scroll one full page down',
    'scroll-page-up':     'Scroll one full page up',
    'scroll-to-top':      'Scroll to the top of the page',
    'scroll-to-bottom':   'Scroll to the bottom of the page',
    'scroll-to-perc':     'Scroll to a percentage of the page height',
    'back':               'Go back in browser history',
    'forward':            'Go forward in browser history',
    'reload':             'Reload the current page',
    'reload-hard':        'Hard-reload the current page',
    'stop':               'Stop loading the current page',
    'url-up':             'Navigate up one path segment in the current URL',
    'url-root':           'Navigate to the root of the current URL',
    'home':               'Navigate to the origin root of the current site',
    'hint':               'Show hints and follow the selected link or button',
    'hint-newtab':        'Show hints and open the selected link in a new tab',
    'hint-yank':          'Show hints and copy the URL or text',
    'hint-hover':         'Show hints and hover the selected element',
    'hint-input':         'Show hints and focus the selected input field',
    'hint-download':      'Show hints and download the selected link',
    'hint-images':        'Show hints for images',
    'hint-multi':         'Show hints and follow multiple targets',
    'hint-text':          'Show hints and copy the visible text',
    'tab-new':            'Open a new tab',
    'tab-close':          'Close the current tab',
    'tab-clone':          'Duplicate the current tab',
    'tab-next':           'Switch to the next tab',
    'tab-prev':           'Switch to the previous tab',
    'tab-first':          'Switch to the first tab',
    'tab-last':           'Switch to the last tab',
    'tab-goto':           'Switch to tab by index',
    'tab-pin':            'Pin or unpin the current tab',
    'tab-mute':           'Mute or unmute the current tab',
    'tab-move':           'Move the current tab',
    'tab-undo':           'Reopen the last closed tab',
    'tab-only':           'Close all other tabs',
    'tab-detach':         'Move tab to a new window',
    'omnibar-open':       'Open URL or search in current tab',
    'omnibar-open-newtab':'Open URL or search in new tab',
    'omnibar-bookmarks':  'Search bookmarks',
    'omnibar-history':    'Search history',
    'omnibar-tabs':       'Search open tabs',
    'omnibar-commands':   'Search commands',
    'omnibar-marks':      'Search marks',
    'cmdline':            'Open the command line',
    'find':               'Start a find search',
    'find-next':          'Jump to the next match',
    'find-prev':          'Jump to the previous match',
    'yank-url':           'Copy the current page URL',
    'yank-title':         'Copy the current page title',
    'yank-mdlink':        'Copy the page as a Markdown link',
    'yank-selection':     'Copy the current selection',
    'yank-anchor':        'Copy anchor URL',
    'paste-and-go':       'Paste clipboard and navigate',
    'paste-and-go-newtab':'Paste clipboard and open in new tab',
    'caret-mode':         'Enter caret mode',
    'visual-mode':        'Enter visual mode',
    'selection-toggle':   'Toggle text selection',
    'mark-set':           'Set a mark at the current position',
    'mark-jump':          'Jump to a mark',
    'quickmark-save':     'Save a quickmark',
    'quickmark-open':     'Open a quickmark',
    'quickmark-open-newtab': 'Open a quickmark in new tab',
    'session-save':       'Save the current session',
    'session-load':       'Load a saved session',
    'session-list':       'List saved sessions',
    'session-delete':     'Delete a saved session',
    'proxy-set':          'Set a proxy',
    'proxy-clear':        'Clear the proxy',
    'proxy-toggle-host':  'Toggle proxy for the current host',
    'userscript-add':     'Add a userscript',
    'userscript-list':    'List userscripts',
    'userscript-remove':  'Remove a userscript',
    'edit-with-vim':      'Edit the focused input with Vim',
    'edit-with-nvim':     'Edit the focused input with Neovim',
    'mode-insert':        'Enter insert mode',
    'mode-normal':        'Return to normal mode',
    'mode-passthrough':   'Enter passthrough mode',
    'help':               'Show the keybinding cheatsheet',
    'set':                'Set a configuration option',
    'bind':               'Add a key binding',
    'unbind':             'Remove a key binding',
    'profile':            'Switch the active profile',
  };

  // ── Default profile bindings (hybrid) ────────────────────────────────────
  // Loaded from storage; fallback to an empty set if unavailable.

  var STORAGE_KEY = 'qutesurf:config';

  // The real profile keymaps live in the (bundled) background, not in storage.
  // Ask the background for the active profile's resolved bindings + user overrides.
  function loadData(callback) {
    if (
      typeof chrome !== 'undefined' &&
      chrome.runtime &&
      chrome.runtime.sendMessage
    ) {
      try {
        chrome.runtime.sendMessage({ type: 'command', name: 'keymap-get', args: [] }, function (resp) {
          if (chrome.runtime.lastError || !resp || !resp.ok || !resp.result) {
            callback({});
            return;
          }
          callback(resp.result); // { activeProfile, profileBindings, userBindings }
        });
      } catch (_) {
        callback({});
      }
    } else {
      callback({});
    }
  }

  // ── Build cheatsheet (inline, mirrors help-data.js) ───────────────────────

  function buildCheatsheet(profileBindings, userBindings) {
    var MODES = ['normal', 'insert', 'visual'];
    var commandMap = {}; // cmdName → { keys: [], mode, description }

    // Seed all canonical commands
    CANONICAL_COMMANDS.forEach(function (name) {
      commandMap[name] = {
        keys: [],
        mode: 'normal',
        description: KNOWN_DESCRIPTIONS[name] || '',
      };
    });

    MODES.forEach(function (mode) {
      var profBindings = (profileBindings && profileBindings[mode]) || {};
      var userBind     = (userBindings && userBindings[mode]) || {};
      var merged = Object.assign({}, profBindings, userBind);

      Object.keys(merged).forEach(function (seq) {
        var cmdString = merged[seq];
        var cmdName = cmdString.trim().split(/\s+/)[0];
        if (!commandMap[cmdName]) {
          commandMap[cmdName] = { keys: [], mode: mode, description: '' };
        }
        // Avoid duplicate keys
        if (commandMap[cmdName].keys.indexOf(seq) === -1) {
          commandMap[cmdName].keys.push(seq);
        }
        commandMap[cmdName].mode = mode;
      });
    });

    // Group by category
    var groups = {};
    Object.keys(commandMap).forEach(function (cmdName) {
      var entry = commandMap[cmdName];
      var cat = categorize(cmdName);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({
        keys:        entry.keys.join(' '),
        command:     cmdName,
        description: entry.description,
        mode:        entry.mode,
      });
    });

    // Sort rows within groups
    Object.keys(groups).forEach(function (cat) {
      groups[cat].sort(function (a, b) { return a.command.localeCompare(b.command); });
    });

    // Output in fixed category order
    var result = [];
    CATEGORY_ORDER.forEach(function (cat) {
      if (groups[cat]) result.push({ category: cat, rows: groups[cat] });
    });
    Object.keys(groups).forEach(function (cat) {
      if (CATEGORY_ORDER.indexOf(cat) === -1) result.push({ category: cat, rows: groups[cat] });
    });
    return result;
  }

  // ── DOM rendering ─────────────────────────────────────────────────────────

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function highlightText(text, query) {
    if (!query) return escHtml(text);
    var safe = escHtml(text);
    var safeQ = escHtml(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return safe.replace(new RegExp('(' + safeQ + ')', 'gi'), '<mark>$1</mark>');
  }

  function renderKeys(keysStr, query) {
    if (!keysStr) return '<span class="no-binding">unbound</span>';
    return keysStr.split(' ').map(function (k) {
      return '<kbd>' + highlightText(k, query) + '</kbd>';
    }).join('');
  }

  function renderSheet(sheet, query) {
    var sheetEl  = document.getElementById('sheet');
    var noRes    = document.getElementById('no-results');
    sheetEl.innerHTML = '';

    var totalVisible = 0;

    sheet.forEach(function (group) {
      var card = document.createElement('div');
      card.className = 'cat-card';
      card.dataset.category = group.category;

      var header = document.createElement('div');
      header.className = 'cat-header';
      header.innerHTML =
        '<h2>' + escHtml(group.category) + '</h2>' +
        '<span class="cat-count">' + group.rows.length + '</span>';
      card.appendChild(header);

      var table = document.createElement('table');
      table.className = 'cat-table';

      var visibleRows = 0;
      group.rows.forEach(function (row) {
        var q = query ? query.toLowerCase() : '';
        var matches = !q ||
          row.keys.toLowerCase().includes(q) ||
          row.command.toLowerCase().includes(q) ||
          row.description.toLowerCase().includes(q);

        var tr = document.createElement('tr');
        if (!matches) {
          tr.hidden = true;
        } else {
          visibleRows++;
          totalVisible++;
        }

        var tdKeys = document.createElement('td');
        tdKeys.className = 'td-keys';
        tdKeys.innerHTML = renderKeys(row.keys, query);

        var tdCmd = document.createElement('td');
        tdCmd.className = 'td-cmd';
        tdCmd.innerHTML = highlightText(row.command, query);

        var tdDesc = document.createElement('td');
        tdDesc.className = 'td-desc';
        tdDesc.innerHTML = highlightText(row.description, query);

        tr.appendChild(tdKeys);
        tr.appendChild(tdCmd);
        tr.appendChild(tdDesc);
        table.appendChild(tr);
      });

      card.appendChild(table);

      // Hide entire card if no rows match
      if (visibleRows === 0 && query) {
        card.hidden = true;
      }

      sheetEl.appendChild(card);
    });

    if (query && totalVisible === 0) {
      noRes.classList.add('visible');
    } else {
      noRes.classList.remove('visible');
    }
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    var searchEl = document.getElementById('search');

    loadData(function (data) {
      var activeProfile   = data.activeProfile   || 'hybrid';
      var profileBindings = data.profileBindings || {};
      var userBindings    = data.userBindings    || { normal: {}, insert: {}, visual: {} };

      var sheet = buildCheatsheet(profileBindings, userBindings);

      renderSheet(sheet, '');

      // Update subtitle to show active profile
      var subtitle = document.querySelector('.subtitle');
      if (subtitle) {
        subtitle.textContent = 'Keybinding Cheatsheet — profile: ' + activeProfile;
      }

      // Live search
      searchEl.addEventListener('input', function () {
        var q = searchEl.value.trim();
        renderSheet(sheet, q);
      });

      // Focus search on load
      searchEl.focus();
    });
  });

})();
