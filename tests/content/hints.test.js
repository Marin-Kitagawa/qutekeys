/** @jest-environment jsdom */
const { hintPosition } = require('../../src/content_scripts/hints');
test('hintPosition converts viewport rect to document coords (adds scroll)', () => {
  // Labels are position:absolute in a document-anchored layer, so they must use
  // document coordinates (rect + scroll) and thereby scroll with the page,
  // staying glued to their target element.
  const pos = hintPosition({ left: 100, top: 200 }, 30, 500);
  expect(pos).toEqual({ left: '130px', top: '700px' });
});
test('hintPosition defaults scroll to 0', () => {
  expect(hintPosition({ left: 10, top: 20 })).toEqual({ left: '10px', top: '20px' });
});

const {
  generateHintLabels,
  collectTargets,
  filterTargets,
  isUrlLike,
  getTableColumnCells,
  joinYankedUrls,
} = require('../../src/content_scripts/hints');

test('generateHintLabels produces N unique labels from the charset', () => {
  const labels = generateHintLabels(5, 'ASDFG');
  expect(labels.length).toBe(5);
  expect(new Set(labels).size).toBe(5);
  labels.forEach(l => [...l].forEach(ch => expect('ASDFG').toContain(ch)));
});
test('generateHintLabels uses multi-char labels when count exceeds charset', () => {
  const labels = generateHintLabels(30, 'ASDFG'); // 5 single + need doubles
  expect(labels.length).toBe(30);
  expect(new Set(labels).size).toBe(30);
});
test('collectTargets finds links and buttons', () => {
  document.body.innerHTML = `<a href="/x">x</a><button>b</button><div>plain</div><input>`;
  const targets = collectTargets();
  // a, button, input are interactive; plain div is not
  const tags = targets.map(t => t.tagName.toLowerCase());
  expect(tags).toContain('a');
  expect(tags).toContain('button');
  expect(tags).toContain('input');
  expect(tags).not.toContain('div');
});
test('generateHintLabels are prefix-free', () => {
  for (const count of [3, 5, 9, 10, 26, 50, 90]) {
    const labels = generateHintLabels(count, 'ASDFG');
    expect(labels.length).toBe(count);
    expect(new Set(labels).size).toBe(count);
    for (const a of labels) for (const b of labels) {
      if (a !== b) expect(b.startsWith(a)).toBe(false);
    }
  }
});
test('filterTargets narrows by typed prefix and returns exact match flag', () => {
  const hints = [{ label:'A', el:{} }, { label:'AB', el:{} }, { label:'S', el:{} }];
  const r1 = filterTargets(hints, 'A');
  expect(r1.matches.map(h=>h.label)).toEqual(['A','AB']);
  expect(r1.exact).toBeNull(); // 'A' is a prefix of 'AB' so don't auto-fire
  const r2 = filterTargets(hints, 'S');
  expect(r2.exact && r2.exact.label).toBe('S'); // unique exact match → fire
});

// ── Wave-2 pure-function tests ────────────────────────────────────────────────

describe('isUrlLike', () => {
  test('returns true for http:// URLs', () => {
    expect(isUrlLike('https://example.com')).toBe(true);
    expect(isUrlLike('http://foo.bar/path?q=1')).toBe(true);
  });
  test('returns true for ftp:// URLs', () => {
    expect(isUrlLike('ftp://files.example.org')).toBe(true);
  });
  test('returns true for www. URLs (no scheme)', () => {
    expect(isUrlLike('www.example.com/page')).toBe(true);
  });
  test('returns false for plain text', () => {
    expect(isUrlLike('just some text')).toBe(false);
    expect(isUrlLike('example.com')).toBe(false);
    expect(isUrlLike('')).toBe(false);
  });
  test('returns false for non-string', () => {
    expect(isUrlLike(null)).toBe(false);
    expect(isUrlLike(undefined)).toBe(false);
    expect(isUrlLike(42)).toBe(false);
  });
  test('trims whitespace before testing', () => {
    expect(isUrlLike('  https://example.com  ')).toBe(true);
  });
});

describe('getTableColumnCells', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <table id="t1">
        <tr><th id="h0">Name</th><th id="h1">Score</th></tr>
        <tr><td>Alice</td><td>90</td></tr>
        <tr><td>Bob</td><td>85</td></tr>
        <tr><td>Carol</td><td>92</td></tr>
      </table>
    `;
  });

  test('returns all body cells for the given column index', () => {
    const th = document.getElementById('h1'); // "Score" column
    const cells = getTableColumnCells(th);
    expect(cells.length).toBe(3);
    expect(cells.map(c => c.textContent.trim())).toEqual(['90', '85', '92']);
  });

  test('returns cells for the first column', () => {
    const th = document.getElementById('h0'); // "Name" column
    const cells = getTableColumnCells(th);
    expect(cells.length).toBe(3);
    expect(cells.map(c => c.textContent.trim())).toEqual(['Alice', 'Bob', 'Carol']);
  });

  test('returns empty array for null input', () => {
    expect(getTableColumnCells(null)).toEqual([]);
  });

  test('returns empty array for element not in a table', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    expect(getTableColumnCells(div)).toEqual([]);
  });
});

describe('joinYankedUrls', () => {
  test('joins multiple URLs with newlines', () => {
    const result = joinYankedUrls(['https://a.com', 'https://b.com', 'https://c.com']);
    expect(result).toBe('https://a.com\nhttps://b.com\nhttps://c.com');
  });

  test('returns a single URL unchanged (no trailing newline)', () => {
    expect(joinYankedUrls(['https://only.com'])).toBe('https://only.com');
  });

  test('returns empty string for empty array', () => {
    expect(joinYankedUrls([])).toBe('');
  });
});
