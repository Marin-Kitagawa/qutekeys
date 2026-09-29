'use strict';

/**
 * Key-capture gate.
 *
 * Commands like mark-set / quickmark-save / macro-record capture the NEXT key
 * with a one-shot document listener. That listener is registered after the
 * bootstrap keydown handler, so `stopImmediatePropagation()` cannot stop the
 * normal-mode keymap from ALSO processing the captured key (e.g. after
 * `m b`, the next key would additionally trigger quickmark-open).
 *
 * While a capture is pending, the capture module raises a flag that the
 * bootstrap keydown handler checks and honours.
 */

let _active = false;

/** Is a one-shot key capture currently pending? */
function isKeyCaptureActive() {
  return _active;
}

/**
 * Capture the next keypress exclusively.
 * @returns {Promise<string|null>} the pressed key (single char), or null
 */
function captureNextKey() {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    _active = true;
    function onKey(e) {
      document.removeEventListener('keydown', onKey, true);
      _active = false;
      e.preventDefault();
      e.stopImmediatePropagation();
      resolve(e.key.length === 1 ? e.key : null);
    }
    document.addEventListener('keydown', onKey, true);
  });
}

module.exports = { isKeyCaptureActive, captureNextKey };
