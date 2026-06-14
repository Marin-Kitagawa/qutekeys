'use strict';
class PassThrough {
  constructor({ modes }) {
    this._modes = modes;
    this._onEsc = null;
    this._timer = null;
  }
  enter() {
    if (this._modes) this._modes.enter('passthrough');
    this._installEscListener();
  }
  exit() {
    this._removeEscListener();
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    if (this._modes && this._modes.current() === 'passthrough') this._modes.leave();
  }
  enterEphemeral(ms = 1200) {
    this.enter();
    this._timer = setTimeout(() => this.exit(), ms);
  }
  _installEscListener() {
    if (typeof document === 'undefined') return;
    this._onEsc = (e) => {
      if (e.key === 'Escape' || (e.key === 'Escape' && e.shiftKey)) {
        e.stopPropagation();
        this.exit();
      }
    };
    document.addEventListener('keydown', this._onEsc, true);
  }
  _removeEscListener() {
    if (this._onEsc && typeof document !== 'undefined') {
      document.removeEventListener('keydown', this._onEsc, true);
      this._onEsc = null;
    }
  }
}
module.exports = { PassThrough };
