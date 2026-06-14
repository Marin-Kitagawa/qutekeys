'use strict';

const { serializeFormsJson, serializeFormsPost, fillForms } = require('../../src/content_scripts/formdata');

describe('serializeFormsJson', () => {
  test('returns JSON string of name→value pairs', () => {
    const form = document.createElement('form');
    const name = document.createElement('input');
    name.name = 'username'; name.value = 'alice';
    const email = document.createElement('input');
    email.name = 'email'; email.value = 'alice@x.com';
    form.appendChild(name);
    form.appendChild(email);
    const result = serializeFormsJson([form]);
    const parsed = JSON.parse(result);
    expect(parsed.username).toBe('alice');
    expect(parsed.email).toBe('alice@x.com');
  });

  test('returns empty JSON object for empty forms array', () => {
    const result = serializeFormsJson([]);
    expect(JSON.parse(result)).toEqual({});
  });

  test('merges fields across multiple forms', () => {
    const form1 = document.createElement('form');
    const f1 = document.createElement('input');
    f1.name = 'a'; f1.value = '1';
    form1.appendChild(f1);

    const form2 = document.createElement('form');
    const f2 = document.createElement('input');
    f2.name = 'b'; f2.value = '2';
    form2.appendChild(f2);

    const parsed = JSON.parse(serializeFormsJson([form1, form2]));
    expect(parsed.a).toBe('1');
    expect(parsed.b).toBe('2');
  });
});

describe('serializeFormsPost', () => {
  test('returns URL-encoded string', () => {
    const form = document.createElement('form');
    const el = document.createElement('input');
    el.name = 'q'; el.value = 'hello world';
    form.appendChild(el);
    const result = serializeFormsPost([form]);
    expect(result).toBe('q=hello+world');
  });

  test('returns empty string for empty forms', () => {
    expect(serializeFormsPost([])).toBe('');
  });

  test('joins multiple fields with &', () => {
    const form = document.createElement('form');
    const a = document.createElement('input'); a.name = 'x'; a.value = '1';
    const b = document.createElement('input'); b.name = 'y'; b.value = '2';
    form.appendChild(a);
    form.appendChild(b);
    expect(serializeFormsPost([form])).toBe('x=1&y=2');
  });
});

describe('fillForms', () => {
  test('fills matching fields and returns count', () => {
    const form = document.createElement('form');
    const el = document.createElement('input');
    el.name = 'name'; el.value = '';
    form.appendChild(el);
    const count = fillForms([form], { name: 'Bob' });
    expect(el.value).toBe('Bob');
    expect(count).toBe(1);
  });

  test('skips fields with no matching key', () => {
    const form = document.createElement('form');
    const el = document.createElement('input');
    el.name = 'city'; el.value = 'NY';
    form.appendChild(el);
    const count = fillForms([form], { name: 'Bob' });
    expect(el.value).toBe('NY');
    expect(count).toBe(0);
  });

  test('fills multiple fields across multiple forms', () => {
    const form1 = document.createElement('form');
    const f1 = document.createElement('input');
    f1.name = 'first'; f1.value = '';
    form1.appendChild(f1);

    const form2 = document.createElement('form');
    const f2 = document.createElement('input');
    f2.name = 'last'; f2.value = '';
    form2.appendChild(f2);

    const count = fillForms([form1, form2], { first: 'Alice', last: 'Smith' });
    expect(f1.value).toBe('Alice');
    expect(f2.value).toBe('Smith');
    expect(count).toBe(2);
  });
});
