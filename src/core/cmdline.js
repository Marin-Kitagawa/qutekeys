function splitChain(line) {
  return line.split(';;').map(s => s.trim()).filter(Boolean);
}

function tokenize(line) {
  const out = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    out.push(m[1] ?? m[2] ?? m[3]);
  }
  return out;
}

function parseCommandLine(line) {
  const toks = tokenize(line.trim());
  const name = toks.shift() || '';
  const flags = {};
  const args = [];

  for (const t of toks) {
    if (t.startsWith('--')) {
      flags[t.slice(2)] = true;
    } else if (t.startsWith('-') && t.length > 1 && isNaN(Number(t))) {
      for (const ch of t.slice(1)) {
        flags[ch] = true;
      }
    } else {
      args.push(t);
    }
  }

  return { name, flags, args };
}

module.exports = { parseCommandLine, splitChain, tokenize };
