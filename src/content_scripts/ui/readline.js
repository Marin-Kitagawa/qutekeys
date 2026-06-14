'use strict';
/** Kill from caret to start of line. Returns {value, caret}. */
function killToStart(value, caret) {
  return { value: value.slice(caret), caret: 0 };
}
/** Kill from caret to end of line. */
function killToEnd(value, caret) {
  return { value: value.slice(0, caret), caret };
}
/** Delete one word backward (stops at word boundary before caret). */
function deleteWordBack(value, caret) {
  if (caret === 0) return { value, caret };
  let i = caret;
  // Skip trailing spaces
  while (i > 0 && value[i - 1] === ' ') i--;
  // Skip the word chars
  while (i > 0 && value[i - 1] !== ' ') i--;
  return { value: value.slice(0, i) + value.slice(caret), caret: i };
}
/** Move caret one word backward (find start of prev word). */
function wordBack(value, caret) {
  let i = caret;
  while (i > 0 && value[i - 1] === ' ') i--;
  while (i > 0 && value[i - 1] !== ' ') i--;
  return i;
}
/** Move caret one word forward (find end of next word). */
function wordForward(value, caret) {
  let i = caret;
  const len = value.length;
  while (i < len && value[i] === ' ') i++;
  while (i < len && value[i] !== ' ') i++;
  return i;
}
module.exports = { killToStart, killToEnd, deleteWordBack, wordBack, wordForward };
