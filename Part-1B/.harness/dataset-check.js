'use strict';
// Dataset v1 well-formedness (spec AC-013): >= 15 cases, unique IDs, traces_to populated, required coverage.
const { CATEGORIES, PRIORITIES, SENTIMENTS } = require('./schema');

const REQUIRED_TYPES = ['normal', 'boundary', 'ambiguous', 'missing_information', 'malformed', 'adversarial', 'privacy_guardrail'];

function checkDataset(ds) {
  const problems = [];
  if (!ds || !Array.isArray(ds.cases)) return ['dataset has no cases array'];
  if (ds.dataset_version !== 'v1') problems.push('dataset_version is not v1');
  if (ds.cases.length < 15) problems.push(`only ${ds.cases.length} cases (need >= 15)`);
  const ids = new Set();
  for (const c of ds.cases) {
    if (!c.id || ids.has(c.id)) problems.push(`missing or duplicate id: ${c.id}`);
    ids.add(c.id);
    if (!Array.isArray(c.traces_to) || c.traces_to.length === 0) problems.push(`${c.id}: traces_to empty`);
    if (typeof c.input !== 'string') problems.push(`${c.id}: input must be a string`);
    const e = c.expected || {};
    if (!CATEGORIES.includes(e.category)) problems.push(`${c.id}: bad expected.category`);
    if (!PRIORITIES.includes(e.priority)) problems.push(`${c.id}: bad expected.priority`);
    if (!SENTIMENTS.includes(e.sentiment)) problems.push(`${c.id}: bad expected.sentiment`);
    if (typeof e.needs_clarification !== 'boolean' || typeof e.escalate !== 'boolean') problems.push(`${c.id}: expected booleans missing`);
    if (!Array.isArray(c.summary_keywords)) problems.push(`${c.id}: summary_keywords must be an array`);
  }
  const types = new Set(ds.cases.map((c) => c.type));
  for (const t of REQUIRED_TYPES) if (!types.has(t)) problems.push(`no case of type ${t}`);
  return problems;
}

module.exports = { checkDataset };
