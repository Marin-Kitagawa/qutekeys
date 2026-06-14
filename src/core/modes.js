class ModeStack {
  constructor(baseMode) {
    this.baseMode = baseMode;
    this.stack = [baseMode];
    this.subscribers = [];
  }

  current() {
    return this.stack[this.stack.length - 1];
  }

  enter(mode) {
    const prevMode = this.current();
    this.stack.push(mode);
    const newMode = this.current();
    if (newMode !== prevMode) {
      this.subscribers.forEach(cb => cb(newMode, prevMode));
    }
  }

  leave() {
    if (this.stack.length > 1) {
      const prevMode = this.current();
      this.stack.pop();
      const newMode = this.current();
      if (newMode !== prevMode) {
        this.subscribers.forEach(cb => cb(newMode, prevMode));
      }
    }
  }

  onChange(cb) {
    this.subscribers.push(cb);
    return () => {
      this.subscribers = this.subscribers.filter(subscriber => subscriber !== cb);
    };
  }
}

module.exports = { ModeStack };
