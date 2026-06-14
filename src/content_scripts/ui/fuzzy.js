'use strict';

/**
 * fuzzyRank — pure subsequence fuzzy matcher with highlight ranges.
 *
 * @param {string} query
 * @param {any[]} items
 * @param {(item: any) => string} keyFn  — extracts the string to match against
 * @returns {{ item: any, score: number, ranges: [number, number][] }[]}
 *   Sorted best-first. Non-matching items are excluded.
 *   ranges are [start, end) pairs marking matched character positions.
 */
function fuzzyRank(query, items, keyFn) {
  if (!query) {
    return items.map(item => ({ item, score: 0, ranges: [] }));
  }

  const q = query.toLowerCase();
  const results = [];

  for (const item of items) {
    const text = keyFn(item).toLowerCase();
    const matchResult = _subsequenceMatch(q, text);
    if (matchResult !== null) {
      results.push({ item, score: matchResult.score, ranges: matchResult.ranges });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

/**
 * Attempt a greedy left-to-right subsequence match of query inside text.
 * Returns { score, ranges } if all query chars are found, else null.
 *
 * Score heuristic (higher = better):
 *   +10 per contiguous run of matched characters
 *   +5 per match at position 0 or immediately after a separator (. - _ / space)
 *   -1 per gap unit (sum of gaps between matched positions)
 *   Ties favour earlier first-match position (handled via gap penalty)
 */
function _subsequenceMatch(query, text) {
  const positions = [];
  let ti = 0;

  for (let qi = 0; qi < query.length; qi++) {
    const ch = query[qi];
    const found = text.indexOf(ch, ti);
    if (found === -1) return null;
    positions.push(found);
    ti = found + 1;
  }

  // Build merged [start, end) ranges from matched positions
  const ranges = [];
  let runStart = positions[0];
  let runEnd = positions[0] + 1;
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] === runEnd) {
      runEnd++;
    } else {
      ranges.push([runStart, runEnd]);
      runStart = positions[i];
      runEnd = positions[i] + 1;
    }
  }
  ranges.push([runStart, runEnd]);

  // Score calculation
  const SEPARATORS = new Set(['.', '-', '_', '/', ' ']);
  let score = 0;

  // Contiguous run bonus
  for (const [start, end] of ranges) {
    const runLen = end - start;
    if (runLen > 1) score += runLen * 10;
  }

  // Word-boundary bonus
  for (const pos of positions) {
    if (pos === 0 || SEPARATORS.has(text[pos - 1])) {
      score += 5;
    }
  }

  // Gap penalty: sum of gap sizes between consecutive matched positions
  for (let i = 1; i < positions.length; i++) {
    score -= (positions[i] - positions[i - 1] - 1);
  }

  // Early match bonus: subtract position of first match
  score -= positions[0];

  return { score, ranges };
}

module.exports = { fuzzyRank };
