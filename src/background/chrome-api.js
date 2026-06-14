function api() {
  return (typeof globalThis !== 'undefined' && globalThis.chrome) || (typeof chrome !== 'undefined' ? chrome : undefined);
}

module.exports = { api };
