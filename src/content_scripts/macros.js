'use strict';
/**
 * MacroStore — pure, DOM-free macro recorder/replayer. Unit-testable.
 */
class MacroStore {
  constructor() {
    this._recording = false;
    this._currentRegister = null;
    this._registers = {}; // { [char]: string[] }
  }
  isRecording() { return this._recording; }
  currentRegister() { return this._currentRegister; }
  startRecord(register) {
    this._currentRegister = register;
    this._registers[register] = [];
    this._recording = true;
  }
  recordKey(keyStr) {
    if (this._recording && this._currentRegister) {
      this._registers[this._currentRegister].push(keyStr);
    }
  }
  stopRecord() {
    this._recording = false;
    this._currentRegister = null;
  }
  get(register) { return this._registers[register] || []; }
  replay(register, replayFn) {
    const keys = this.get(register);
    for (const k of keys) replayFn(k);
  }
}

/**
 * Macros controller — wraps MacroStore with DOM/mode lifecycle.
 */
class Macros {
  constructor({ onReplayKey } = {}) {
    this._store = new MacroStore();
    this._onReplayKey = onReplayKey || (() => {});
  }
  get store() { return this._store; }
  startRecord(register) { this._store.startRecord(register); }
  stopRecord() { this._store.stopRecord(); }
  isRecording() { return this._store.isRecording(); }
  recordKey(keyStr) { this._store.recordKey(keyStr); }
  run(register) { this._store.replay(register, this._onReplayKey); }
}

module.exports = { MacroStore, Macros };
