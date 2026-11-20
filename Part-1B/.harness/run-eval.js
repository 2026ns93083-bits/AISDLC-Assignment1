'use strict';
// Frozen evaluation harness for Support Email Triage (spec: Evaluation Control, dataset v1).
// Usage:  node --env-file=.env .harness/run-eval.js <label>
//         node .harness/run-eval.js --check-dataset
// Exit codes: 0 PASS, 1 FAIL, 2 INCOMPLETE (unresolved service errors), 3 usage/dataset problem.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateSchema } = require('./schema');
const { checkInvariants } = require('./invariants');
const { scoreCase, THRESHOLD } = require('./semantic');
const { checkDataset } = require('./dataset-check');

const ROOT = path.resolve(__dirname, '..');
const DATASET_PATH = path.join(ROOT, 'evals', 'dataset.json');
const CALL_DELAY_MS = 4000;      // pacing between live calls (free-tier rate limits)
const RERUN_COOLDOWN_MS = 30000; // wait before re-running SERVICE_ERROR cases

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runCase(tc, triage) {
  try {
    const result = await triage(tc.input);
    return { status: 'OK', result };
  } catch (err) {
    const name = err && err.name;
    const msg = String((err && err.message) || err).slice(0, 200);
    if (name === 'ServiceError') return { status: 'SERVICE_ERROR', error: `${name} code=${err.code}` };
    if (name === 'ApplicationError') return { status: 'APPLICATION_ERROR', error: msg };
    return { status: 'UNEXPECTED_ERROR', error: `${name}: ${msg}` };
  }
}

function evaluate(tc, outcome) {
  const record = { id: tc.id, type: tc.type, status: outcome.status };
  if (outcome.error) record.error = outcome.error;
  if (outcome.status !== 'OK') {
    record.structural = false;
    record.invariants = { pass: false, checks: [] };
    record.semantic = { total: 0 };
    return record;
  }
  const schemaErrors = validateSchema(outcome.result);
  record.output = outcome.result;
  record.structural = schemaErrors.length === 0;
  if (!record.structural) record.schema_errors = schemaErrors;
  if (record.structural) {
    record.invariants = checkInvariants(tc, outcome.result);
    record.semantic = scoreCase(tc, outcome.result);
  } else {
    record.invariants = { pass: false, checks: [] };
    record.semantic = { total: 0 };
  }
  return record;
}

function summarise(records) {
  const scored = records.filter((r) => r.status !== 'SERVICE_ERROR');
  const unresolved = records.filter((r) => r.status === 'SERVICE_ERROR').map((r) => r.id);
  const n = scored.length;
  const rate = (f) => (n === 0 ? 0 : scored.filter(f).length / n);
  const structuralRate = rate((r) => r.structural);
  const invariantRate = rate((r) => r.invariants.pass);
  const meanSemantic = n === 0 ? 0 : Math.round((scored.reduce((s, r) => s + r.semantic.total, 0) / n) * 1e6) / 1e6;
  const gates = {
    structural_100: structuralRate === 1,
    invariants_100: invariantRate === 1,
    semantic_ge_threshold: meanSemantic >= THRESHOLD,
  };
  let verdict;
  if (n === 0 || unresolved.length > 0) verdict = gates.structural_100 && gates.invariants_100 && gates.semantic_ge_threshold ? 'INCOMPLETE' : 'FAIL';
  else verdict = gates.structural_100 && gates.invariants_100 && gates.semantic_ge_threshold ? 'PASS' : 'FAIL';
  return { scored_cases: n, unresolved_service_errors: unresolved, structural_rate: structuralRate,
    invariant_rate: invariantRate, mean_semantic: Number(meanSemantic.toFixed(4)), threshold: THRESHOLD, gates, verdict };
}

async function runAll(dataset, triage, opts = {}) {
  const delay = opts.delay ?? CALL_DELAY_MS;
  const cooldown = opts.cooldown ?? RERUN_COOLDOWN_MS;
  const log = opts.log || (() => {});
  const records = [];
  for (const tc of dataset.cases) {
    const rec = evaluate(tc, await runCase(tc, triage));
    log(`${tc.id}: ${rec.status}`);
    records.push(rec);
    if (delay) await sleep(delay);
  }
  const retry = records.filter((r) => r.status === 'SERVICE_ERROR');
  if (retry.length > 0) {
    log(`re-running ${retry.length} service-error case(s) after cool-down`);
    if (cooldown) await sleep(cooldown);
    for (const old of retry) {
      const tc = dataset.cases.find((c) => c.id === old.id);
      const rec = evaluate(tc, await runCase(tc, triage));
      rec.rerun = true;
      log(`${tc.id} (re-run): ${rec.status}`);
      records[records.findIndex((r) => r.id === old.id)] = rec;
      if (delay) await sleep(delay);
    }
  }
  return { records, summary: summarise(records) };
}

async function main() {
  const arg = process.argv[2];
  const raw = fs.readFileSync(DATASET_PATH, 'utf8');
  const dataset = JSON.parse(raw);
  const problems = checkDataset(dataset);
  if (arg === '--check-dataset') {
    if (problems.length) { console.error(problems.join('\n')); process.exit(3); }
    console.log(`dataset v1 OK: ${dataset.cases.length} cases`);
    return;
  }
  if (!arg) { console.error('usage: node --env-file=.env .harness/run-eval.js <label>'); process.exit(3); }
  if (problems.length) { console.error('dataset problems:\n' + problems.join('\n')); process.exit(3); }
  if (!/^[\w.-]+$/.test(arg)) { console.error('label may contain only letters, digits, dot, dash, underscore'); process.exit(3); }
  let triage;
  try { ({ triage } = require(path.join(ROOT, 'src', 'triage.js'))); } catch (e) {
    console.error('cannot load src/triage.js: ' + e.message); process.exit(3);
  }
  const { records, summary } = await runAll(dataset, triage, { log: (m) => console.log(m) });
  const evidence = {
    label: arg,
    run_at: new Date().toISOString(),
    dataset_version: dataset.dataset_version,
    dataset_sha256: crypto.createHash('sha256').update(raw).digest('hex'),
    model: process.env.LLM_MODEL || null,
    summary,
    cases: records,
  };
  const dir = path.join(ROOT, 'evidence', 'eval-results');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${arg}-${evidence.run_at.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
  console.log('evidence written: ' + path.relative(ROOT, file));
  process.exit(summary.verdict === 'PASS' ? 0 : summary.verdict === 'INCOMPLETE' ? 2 : 1);
}

if (require.main === module) main();
module.exports = { runCase, evaluate, summarise, runAll };
