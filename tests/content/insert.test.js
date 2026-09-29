'use strict';

/**
 * Tests for the Insert mode controller.
 * jsdom environment: document/window are available.
 */

const { Insert, isEditable, firstEditable } = require('../../src/content_scripts/insert');
const { ModeStack } = require('../../src/core/modes');
const { KeyMap } = require('../../src/core/keymap');

function fireKey(target, init) {
  const e = new KeyboardEvent('keydown', Object.assign({ bubbles: true, cancelable: true }, init));
  target.dispatchEvent(e);
  return e;
}

describe('isEditable / firstEditable', () => {
  test('detects text inputs, textareas and contenteditable', () => {
    const input = document.createElement('input');
    expect(isEditable(input)).toBe(true);
    const checkbox = document.createElement('input');
    checkbox.setAttribute('type', 'checkbox');
    expect(isEditable(checkbox)).toBe(false);
    const ta = document.createElement('textarea');
    expect(isEditable(ta)).toBe(true);
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    expect(isEditable(div)).toBe(true);
    const span = document.createElement('span');
    expect(isEditable(span)).toBe(false);
  });

  test('firstEditable finds an input on the page', () => {
    document.body.innerHTML = '<div></div><input id="q1">';
    const el = firstEditable();
    expect(el).toBeTruthy();
    expect(el.id).toBe('q1');
  });
});

describe('Insert controller', () => {
  let modes;
  let controllers;
  function makeInsert(opts) {
    const insert = new Insert(opts);
    controllers.push(insert);
    return insert;
  }
  beforeEach(() => {
    document.body.innerHTML = '';
    modes = new ModeStack('normal');
    controllers = [];
  });
  afterEach(() => {
    // Remove every installed document listener so tests stay isolated
    for (const c of controllers) c.exit();
  });

  test('enter/exit manages the mode stack and key listener', () => {
    const insert = makeInsert({ modes });
    expect(modes.current()).toBe('normal');
    insert.enter();
    expect(modes.current()).toBe('insert');
    insert.exit();
    expect(modes.current()).toBe('normal');
  });

  test('Escape exits insert mode', () => {
    const insert = makeInsert({ modes });
    insert.enter();
    fireKey(document.body, { key: 'Escape' });
    expect(modes.current()).toBe('normal');
  });

  test('typing passes through (no preventDefault for plain chars)', () => {
    const insert = makeInsert({ modes });
    insert.enter();
    const e = fireKey(document.body, { key: 'j' });
    expect(e.defaultPrevented).toBe(false);
    expect(modes.current()).toBe('insert');
  });

  test('<C-e> moves caret to end of an input line', () => {
    document.body.innerHTML = '<input id="i1" value="hello world">';
    const input = document.getElementById('i1');
    input.focus();
    input.setSelectionRange(0, 0);
    const insert = makeInsert({ modes });
    insert.enter();
    fireKey(input, { key: 'e', ctrlKey: true });
    expect(input.selectionStart).toBe(11);
  });

  test('<C-u> deletes all before the cursor', () => {
    document.body.innerHTML = '<input id="i2" value="abcdef">';
    const input = document.getElementById('i2');
    input.focus();
    input.setSelectionRange(4, 4);
    const insert = makeInsert({ modes });
    insert.enter();
    fireKey(input, { key: 'u', ctrlKey: true });
    expect(input.value).toBe('ef');
  });

  test('<A-d> deletes one word forward', () => {
    document.body.innerHTML = '<input id="i3" value="foo bar baz">';
    const input = document.getElementById('i3');
    input.focus();
    input.setSelectionRange(0, 0);
    const insert = makeInsert({ modes });
    insert.enter();
    fireKey(input, { key: 'd', altKey: true });
    expect(input.value).toBe('bar baz');
  });

  test("<C-'> wraps selection in double quotes", () => {
    document.body.innerHTML = '<input id="i4" value="say hi">';
    const input = document.getElementById('i4');
    input.focus();
    input.setSelectionRange(4, 6); // select "hi"
    const insert = makeInsert({ modes });
    insert.enter();
    fireKey(input, { key: "'", ctrlKey: true });
    expect(input.value).toBe('say "hi"');
  });

  test('custom insert bindings dispatch through onCommand', () => {
    const insertKeymap = new KeyMap();
    insertKeymap.bind('<Enter>', 'mode-normal');
    const dispatched = [];
    const insert = makeInsert({ modes, insertKeymap, onCommand: (c) => dispatched.push(c) });
    insert.enter();
    fireKey(document.body, { key: 'Enter' });
    expect(dispatched).toEqual(['mode-normal']);
  });

  test('auto-enter on editable focusin and leave on focusout', () => {
    document.body.innerHTML = '<input id="i5"><div id="d5"></div>';
    const input = document.getElementById('i5');
    const plain = document.getElementById('d5');
    const insert = makeInsert({ modes });
    insert.installFocusTracking();
    // jsdom does not fire focus events on .focus() unless the element is in
    // the document and focusable — it is, so focus() triggers focusin.
    input.focus();
    expect(modes.current()).toBe('insert');
    // Blur by focusing a non-editable element → leave insert
    plain.setAttribute('tabindex', '-1');
    plain.focus();
    expect(modes.current()).toBe('normal');
  });

  test('enterExplicit focuses the first editable when nothing is focused', () => {
    document.body.innerHTML = '<div></div><textarea id="t5"></textarea>';
    const insert = makeInsert({ modes });
    insert.enterExplicit();
    expect(document.activeElement.id).toBe('t5');
    expect(modes.current()).toBe('insert');
  });

  test('leaveIfActive exits only when insert is the current mode', () => {
    const insert = makeInsert({ modes });
    expect(insert.leaveIfActive()).toBe(false);
    insert.enter();
    expect(insert.leaveIfActive()).toBe(true);
    expect(modes.current()).toBe('normal');
  });
});
