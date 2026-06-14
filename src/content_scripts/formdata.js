'use strict';

/**
 * formdata.js — Pure helpers for form serialization and fill.
 *
 * No globals are accessed at module load time — safe to require in Jest/Node.
 */

/**
 * Serialize an array of HTMLFormElement objects to a JSON string mapping
 * field name → value.
 *
 * @param {HTMLFormElement[]} forms
 * @returns {string}
 */
function serializeFormsJson(forms) {
  const data = {};
  for (const form of forms) {
    const elements = form.elements;
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (el.name) data[el.name] = el.value;
    }
  }
  return JSON.stringify(data);
}

/**
 * Serialize an array of HTMLFormElement objects to a URL-encoded query string
 * (application/x-www-form-urlencoded).
 *
 * @param {HTMLFormElement[]} forms
 * @returns {string}
 */
function serializeFormsPost(forms) {
  const parts = [];
  for (const form of forms) {
    const elements = form.elements;
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (el.name) {
        parts.push(
          encodeURIComponent(el.name).replace(/%20/g, '+') +
          '=' +
          encodeURIComponent(el.value).replace(/%20/g, '+')
        );
      }
    }
  }
  return parts.join('&');
}

/**
 * Fill form fields whose name matches a key in `data`.
 * Returns the number of fields filled.
 *
 * @param {HTMLFormElement[]} forms
 * @param {Object} data  — plain object mapping field name → value string
 * @returns {number}
 */
function fillForms(forms, data) {
  let count = 0;
  for (const form of forms) {
    const elements = form.elements;
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (el.name && Object.prototype.hasOwnProperty.call(data, el.name)) {
        el.value = data[el.name];
        count++;
      }
    }
  }
  return count;
}

module.exports = { serializeFormsJson, serializeFormsPost, fillForms };
