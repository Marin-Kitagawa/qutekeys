class CommandRegistry {
  constructor() {
    this._byName = new Map();
  }

  register(cmd) {
    if (!cmd || !cmd.name) throw new Error('command requires a name');
    if (this._byName.has(cmd.name)) throw new Error(`command "${cmd.name}" already registered`);

    const full = { aliases: [], description: '', args: [], context: 'content', modes: ['normal'], ...cmd };
    this._byName.set(cmd.name, full);

    for (const a of full.aliases) {
      this._byName.set(a, full);
    }

    return full;
  }

  get(nameOrAlias) {
    return this._byName.get(nameOrAlias) || null;
  }

  all() {
    return [...new Set(this._byName.values())];
  }

  search(q) {
    const s = q.toLowerCase();
    return this.all().filter(c =>
      c.name.toLowerCase().includes(s) ||
      (c.description || '').toLowerCase().includes(s)
    );
  }
}

module.exports = { CommandRegistry };
