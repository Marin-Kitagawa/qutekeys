'use strict';

/**
 * Emoji picker (Wave 8, SurfingKeys emoji insertion parity).
 *
 * Opened with `:` in insert mode (config `emoji: true`, default) or via
 * `:emoji-picker`. Type to filter by name, Enter/click inserts the selected
 * emoji at the caret of the originating editable element (or copies it to the
 * clipboard when there is none).
 *
 * The dataset is a compact built-in list of common emoji; it is intentionally
 * dependency-free.
 */

const EMOJIS = [
  ['😀', 'grinning face happy smile'], ['😃', 'smiley face happy'], ['😄', 'smile happy laugh'],
  ['😁', 'grin beam'], ['😆', 'laughing lol haha'], ['😅', 'sweat laugh'], ['🤣', 'rofl rolling laugh'],
  ['😂', 'joy tears laugh'], ['🙂', 'slight smile'], ['🙃', 'upside down'], ['😉', 'wink'],
  ['😊', 'blush smile'], ['😇', 'innocent halo angel'], ['🥰', 'love hearts'], ['😍', 'heart eyes love'],
  ['🤩', 'star struck wow'], ['😘', 'kiss'], ['😗', 'kissing'], ['😚', 'kissing closed'], ['😙', 'kissing smile'],
  ['😋', 'yum tasty'], ['😛', 'tongue'], ['😜', 'wink tongue'], ['🤪', 'zany crazy'], ['😝', 'squint tongue'],
  ['🤑', 'money mouth'], ['🤗', 'hug'], ['🤭', 'giggle oops'], ['🤫', 'shush quiet'], ['🤔', 'thinking hmm'],
  ['🤐', 'zipper quiet'], ['🤨', 'raised eyebrow sus'], ['😐', 'neutral'], ['😑', 'expressionless'],
  ['😶', 'no mouth'], ['😏', 'smirk'], ['😒', 'unamused meh'], ['🙄', 'eye roll'], ['😬', 'grimace awkward'],
  ['🤥', 'lying pinocchio'], ['😌', 'relieved calm'], ['😔', 'pensive sad'], ['😪', 'sleepy'], ['🤤', 'drooling'],
  ['😴', 'sleeping zzz'], ['😷', 'mask sick'], ['🤒', 'thermometer sick'], ['🤕', 'bandage hurt'],
  ['🤢', 'nauseated sick'], ['🤮', 'vomit'], ['🤧', 'sneeze'], ['🥵', 'hot heat'], ['🥶', 'cold freeze'],
  ['🥴', 'woozy dizzy'], ['😵', 'dizzy dead'], ['🤯', 'mind blown'], ['🤠', 'cowboy'], ['🥳', 'party celebrate'],
  ['😎', 'cool sunglasses'], ['🤓', 'nerd glasses'], ['🧐', 'monocle inspect'], ['😕', 'confused'],
  ['😟', 'worried'], ['🙁', 'frown'], ['☹️', 'frowning'], ['😮', 'open mouth wow'], ['😯', 'hushed'],
  ['😲', 'astonished'], ['😳', 'flushed embarrassed'], ['🥺', 'pleading puppy'], ['😦', 'frowning open'],
  ['😧', 'anguished'], ['😨', 'fearful scared'], ['😰', 'anxious sweat'], ['😥', 'sad relieved'],
  ['😢', 'cry tear'], ['😭', 'sob crying'], ['😱', 'scream fear'], ['😖', 'confounded'], ['😣', 'persevere'],
  ['😞', 'disappointed'], ['😓', 'downcast sweat'], ['😩', 'weary tired'], ['😫', 'tired exhausted'],
  ['🥱', 'yawn'], ['😤', 'triumph huff'], ['😡', 'rage angry'], ['😠', 'angry'], ['🤬', 'swearing cursing'],
  ['😈', 'devil smiling'], ['👿', 'imp angry devil'], ['💀', 'skull dead'], ['☠️', 'skull crossbones'],
  ['💩', 'poop'], ['🤡', 'clown'], ['👹', 'ogre demon'], ['👻', 'ghost'], ['👽', 'alien ufo'],
  ['🤖', 'robot'], ['😺', 'cat smile'], ['😸', 'cat grin'], ['😹', 'cat joy'], ['😻', 'cat heart eyes'],
  ['🙀', 'cat scream'], ['😿', 'cat cry'], ['😾', 'cat pouting'],
  ['👋', 'wave hello bye'], ['🤚', 'raised back hand'], ['🖐️', 'hand fingers'], ['✋', 'raised hand stop'],
  ['🖖', 'vulcan spock'], ['👌', 'ok'], ['🤌', 'pinched fingers'], ['✌️', 'victory peace'],
  ['🤞', 'crossed fingers luck'], ['🤟', 'love you'], ['🤘', 'rock horns'], ['🤙', 'call me'],
  ['👈', 'point left'], ['👉', 'point right'], ['👆', 'point up'], ['👇', 'point down'],
  ['☝️', 'index up'], ['👍', 'thumbs up like'], ['👎', 'thumbs down dislike'], ['✊', 'fist punch'],
  ['👊', 'punch bump'], ['🤛', 'left fist'], ['🤜', 'right fist'], ['👏', 'clap applause'],
  ['🙌', 'raising hands hooray'], ['👐', 'open hands'], ['🤲', 'palms up'], ['🤝', 'handshake deal'],
  ['🙏', 'pray thanks please'], ['✍️', 'writing'], ['💅', 'nails polish'], ['🤳', 'selfie'],
  ['💪', 'muscle strong flex'], ['🦾', 'mechanical arm'],
  ['🧠', 'brain smart'], ['👀', 'eyes look'], ['👁️', 'eye'], ['👄', 'mouth lips'], ['🦷', 'tooth'],
  ['👅', 'tongue'], ['👂', 'ear listen'], ['👃', 'nose'],
  ['👶', 'baby'], ['🧒', 'child kid'], ['👦', 'boy'], ['👧', 'girl'], ['🧑', 'person'], ['👨', 'man'],
  ['👩', 'woman'], ['🧓', 'older person'], ['👴', 'old man'], ['👵', 'old woman'],
  ['👨‍💻', 'man technologist developer coder'], ['👩‍💻', 'woman technologist developer coder'],
  ['🧑‍💻', 'technologist developer coder'], ['🧑‍🔬', 'scientist'], ['🧑‍🎨', 'artist painter'],
  ['🕵️', 'detective spy'], ['💼', 'briefcase work'], ['🎓', 'graduation cap school'],
  ['❤️', 'red heart love'], ['🧡', 'orange heart'], ['💛', 'yellow heart'], ['💚', 'green heart'],
  ['💙', 'blue heart'], ['💜', 'purple heart'], ['🖤', 'black heart'], ['🤍', 'white heart'],
  ['💔', 'broken heart'], ['❣️', 'heart exclamation'], ['💕', 'two hearts'], ['💞', 'revolving hearts'],
  ['💓', 'beating heart'], ['💗', 'growing heart'], ['💖', 'sparkling heart'], ['💘', 'heart arrow'],
  ['💝', 'heart ribbon'], ['💟', 'heart decoration'], ['💯', 'hundred points perfect'],
  ['💬', 'speech comment'], ['💭', 'thought thought bubble'], ['💤', 'zzz sleep'],
  ['🔥', 'fire hot lit'], ['⭐', 'star'], ['🌟', 'glowing star'], ['✨', 'sparkles shine'],
  ['⚡', 'lightning zap fast'], ['🌈', 'rainbow'], ['☀️', 'sun'], ['🌙', 'moon night'],
  ['☁️', 'cloud'], ['❄️', 'snowflake cold'], ['🌊', 'wave water sea'], ['🌸', 'cherry blossom'],
  ['🌹', 'rose flower'], ['🌻', 'sunflower'], ['🌷', 'tulip'], ['🍀', 'clover luck'],
  ['🎉', 'party tada celebrate'], ['🎊', 'confetti'], ['🎈', 'balloon'], ['🎁', 'gift present'],
  ['🏆', 'trophy win'], ['🥇', 'gold medal first'], ['🎯', 'dart bullseye target'],
  ['🚀', 'rocket ship launch'], ['✈️', 'plane travel'], ['🚗', 'car'], ['🚕', 'taxi'],
  ['🚲', 'bike bicycle'], ['🛸', 'ufo'], ['⛵', 'sailboat'],
  ['🍕', 'pizza'], ['🍔', 'burger hamburger'], ['🌮', 'taco'], ['🍣', 'sushi'], ['🍜', 'noodles ramen'],
  ['🍩', 'donut doughnut'], ['🍪', 'cookie'], ['🎂', 'birthday cake'], ['☕', 'coffee tea hot'],
  ['🍺', 'beer'], ['🍷', 'wine'], ['🥂', 'champagne cheers'],
  ['🐱', 'cat face kitty'], ['🐶', 'dog face puppy'], ['🐭', 'mouse'], ['🐹', 'hamster'],
  ['🐰', 'rabbit bunny'], ['🦊', 'fox'], ['🐻', 'bear'], ['🐼', 'panda'], ['🐨', 'koala'],
  ['🐯', 'tiger'], ['🦁', 'lion'], ['🐮', 'cow'], ['🐷', 'pig'], ['🐸', 'frog'],
  ['🐵', 'monkey'], ['🐔', 'chicken'], ['🐧', 'penguin'], ['🐦', 'bird'], ['🦆', 'duck'],
  ['🦉', 'owl'], ['🦄', 'unicorn'], ['🐝', 'bee'], ['🦋', 'butterfly'], ['🐢', 'turtle'],
  ['🐍', 'snake'], ['🐙', 'octopus'], ['🦑', 'squid'], ['🦀', 'crab'], ['🐬', 'dolphin'],
  ['🐳', 'whale'], ['🦈', 'shark'], ['🐊', 'crocodile'], ['🦖', 't-rex dinosaur'],
  ['✅', 'check done yes'], ['☑️', 'checkbox'], ['❌', 'cross no x'], ['⭕', 'circle'],
  ['❓', 'question'], ['❗', 'exclamation'], ['⚠️', 'warning caution'], ['🚫', 'prohibited no'],
  ['♻️', 'recycle'], ['🔒', 'lock secure'], ['🔓', 'unlock'], ['🔑', 'key'], ['🔍', 'search magnify'],
  ['💡', 'bulb idea'], ['🔋', 'battery'], ['💾', 'floppy save'], ['📁', 'folder'], ['📅', 'calendar date'],
  ['📌', 'pin'], ['📎', 'clip attach'], ['📏', 'ruler'], ['✂️', 'scissors cut'], ['🗑️', 'trash delete'],
  ['📖', 'book open reading'], ['📚', 'books'], ['📝', 'memo note write'], ['📝', 'note'],
  ['💰', 'money bag'], ['💵', 'dollar'], ['💳', 'credit card'], ['📈', 'chart up growth'],
  ['📉', 'chart down'], ['📊', 'bar chart'], ['🧮', 'abacus calculate'],
  ['⏰', 'alarm clock'], ['⏳', 'hourglass wait'], ['🕐', 'clock time'],
  ['🔔', 'bell notify'], ['🔕', 'bell off mute'], ['🎵', 'music note'], ['🎶', 'music notes'],
  ['🎤', 'microphone sing'], ['🎧', 'headphones'], ['📱', 'phone mobile'], ['💻', 'laptop computer'],
  ['🖥️', 'desktop monitor'], ['⌨️', 'keyboard'], ['🖱️', 'mouse computer'], ['🖨️', 'printer'],
  ['📷', 'camera photo'], ['🎥', 'movie camera'], ['📺', 'tv television'], ['🎮', 'game controller'],
  ['🎲', 'dice random'], ['♟️', 'chess pawn'], ['🧩', 'puzzle'], ['🪄', 'magic wand'],
];

function EmojiPicker({ host, modes, config }) {
  let _panel = null;
  let _input = null;
  let _grid = null;
  let _target = null;
  let _results = [];
  let _selected = 0;
  let _keyListener = null;
  let _prevMode = null;

  function visible() { return !!_panel; }

  function open(target) {
    if (typeof document === 'undefined') return;
    _target = target && target.nodeType === 1 ? target : (document.activeElement || null);
    if (_panel) close();
    _prevMode = modes ? modes.current() : null;
    if (modes && _prevMode !== 'command') modes.enter('command');

    _panel = document.createElement('div');
    _panel.id = 'qs-emoji-panel';

    _input = document.createElement('input');
    _input.id = 'qs-emoji-input';
    _input.type = 'text';
    _input.placeholder = 'Search emoji… (: toggles, Esc closes)';
    _input.addEventListener('input', () => search(_input.value));
    _input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        insertEmoji(_results[_selected] || EMOJIS[0]);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault(); move(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); move(-1);
      } else if (e.key === 'Escape') {
        e.preventDefault(); close();
      }
    });

    _grid = document.createElement('div');
    _grid.id = 'qs-emoji-grid';

    _panel.appendChild(_input);
    _panel.appendChild(_grid);
    host.replaceStyle('emoji', EMOJI_CSS);
    host.mount(_panel);
    _input.focus();
    search('');
  }

  function close() {
    if (_keyListener && typeof document !== 'undefined') {
      document.removeEventListener('keydown', _keyListener, true);
      _keyListener = null;
    }
    if (_panel) _panel.remove();
    _panel = null; _input = null; _grid = null; _results = [];
    if (modes && modes.current() === 'command') modes.leave();
    // Return focus to the editable we came from
    if (_target && typeof _target.focus === 'function') {
      try { _target.focus(); } catch (_) { /* detached */ }
    }
  }

  function search(q) {
    const needle = String(q || '').toLowerCase().trim();
    _results = needle
      ? EMOJIS.filter(([, names]) => names.includes(needle))
      : EMOJIS.slice();
    _selected = 0;
    renderGrid();
  }

  function move(delta) {
    if (!_results.length) return;
    _selected = (_selected + delta + _results.length) % _results.length;
    renderGrid();
  }

  function renderGrid() {
    if (!_grid) return;
    _grid.innerHTML = '';
    const shown = _results.slice(0, 48);
    if (!shown.length) {
      const none = document.createElement('div');
      none.id = 'qs-emoji-empty';
      none.textContent = 'No emoji match';
      _grid.appendChild(none);
      return;
    }
    shown.forEach(([char, names], idx) => {
      const cell = document.createElement('div');
      cell.className = 'qs-emoji-cell' + (idx === _selected ? ' selected' : '');
      cell.textContent = char;
      cell.title = names;
      cell.addEventListener('mousedown', (e) => {
        e.preventDefault();
        insertEmoji([char, names]);
      });
      _grid.appendChild(cell);
    });
  }

  function insertEmoji(entry) {
    const char = entry[0];
    const el = _target;
    let inserted = false;
    if (el && typeof el.selectionStart === 'number') {
      const s = el.selectionStart;
      el.setRangeText(char, s, el.selectionEnd, 'end');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      inserted = true;
    } else if (el && typeof document !== 'undefined' && document.execCommand) {
      document.execCommand('insertText', false, char);
      inserted = true;
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(char).catch(() => {});
      inserted = true;
    }
    close();
    return inserted;
  }

  function installKeyCloseListener() {
    if (_keyListener || typeof document === 'undefined') return;
    _keyListener = (e) => {
      if (e.key === 'Escape') { close(); e.preventDefault(); e.stopPropagation(); }
    };
    document.addEventListener('keydown', _keyListener, true);
  }

  const EMOJI_CSS = `
    #qs-emoji-panel {
      position: fixed; left: 50%; bottom: 70px; transform: translateX(-50%);
      width: 360px; max-height: 320px; z-index: 2147483647;
      background: rgba(30, 30, 40, 0.96); border: 1px solid rgba(124,92,255,0.4);
      border-radius: 14px; box-shadow: 0 10px 34px rgba(0,0,0,0.45);
      display: flex; flex-direction: column; overflow: hidden;
      font: 13px/1.4 'Hanken Grotesk', system-ui, sans-serif; color: #e8e8ef;
    }
    #qs-emoji-input {
      border: none; outline: none; background: transparent; color: #e8e8ef;
      padding: 10px 14px; border-bottom: 1px solid rgba(124,92,255,0.3); font: inherit;
    }
    #qs-emoji-grid {
      display: grid; grid-template-columns: repeat(8, 1fr);
      overflow-y: auto; padding: 8px; gap: 2px;
    }
    .qs-emoji-cell {
      font-size: 22px; text-align: center; padding: 4px 0; border-radius: 8px; cursor: pointer;
    }
    .qs-emoji-cell:hover { background: rgba(124,92,255,0.2); }
    .qs-emoji-cell.selected { background: rgba(124,92,255,0.4); }
    #qs-emoji-empty { grid-column: 1 / -1; text-align: center; color: #8d87a8; padding: 16px 0; }
  `;

  return { open, close, visible, search };
}

module.exports = { EmojiPicker, EMOJIS };
