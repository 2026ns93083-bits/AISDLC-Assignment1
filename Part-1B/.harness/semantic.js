'use strict';
// Semantic score exactly as declared in spec AC-009 / Evaluation Control (dataset v1).
//   score = 0.4*category_match + 0.3*priority_score + 0.2*sentiment_match + 0.1*keyword_overlap
// Priority: 1 exact, 0.5 one level off, 0 otherwise. Keywords: case-insensitive match in summary;
// an empty expected-keyword list gives full keyword credit (nothing to overlap).

const THRESHOLD = 0.80; // declared in spec.md; never lowered (GR-EVAL-01)
const ORDER = ['P1', 'P2', 'P3', 'P4'];

function priorityScore(expected, actual) {
  const a = ORDER.indexOf(expected);
  const b = ORDER.indexOf(actual);
  if (a < 0 || b < 0) return 0;
  const diff = Math.abs(a - b);
  return diff === 0 ? 1 : diff === 1 ? 0.5 : 0;
}

function keywordOverlap(keywords, summary) {
  if (!Array.isArray(keywords) || keywords.length === 0) return 1;
  const text = String(summary || '').toLowerCase();
  const hits = keywords.filter((k) => text.includes(String(k).toLowerCase())).length;
  return hits / keywords.length;
}

function scoreCase(testCase, result) {
  const e = testCase.expected;
  const category = result.category === e.category ? 1 : 0;
  const priority = priorityScore(e.priority, result.priority);
  const sentiment = result.sentiment === e.sentiment ? 1 : 0;
  const keyword = keywordOverlap(testCase.summary_keywords, result.summary);
  const total = Math.round((0.4 * category + 0.3 * priority + 0.2 * sentiment + 0.1 * keyword) * 1e6) / 1e6; // rounded: avoids float drift near the threshold
  return { category, priority, sentiment, keyword, total };
}

module.exports = { THRESHOLD, priorityScore, keywordOverlap, scoreCase };
