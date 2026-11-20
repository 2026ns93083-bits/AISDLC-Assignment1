'use strict';
// Proves the harness itself works, with no network and no src/ code.  Run: node --test .harness/selftest.js
const test = require('node:test');
const assert = require('node:assert/strict');
const dataset = require('../evals/dataset.json');
const { validateSchema } = require('./schema');
const { priorityScore, keywordOverlap, scoreCase } = require('./semantic');
const { checkInvariants } = require('./invariants');
const { checkDataset } = require('./dataset-check');
const { runAll } = require('./run-eval');

function perfect(tc) {
  const e = tc.expected;
  return {
    category: e.category, priority: e.priority, sentiment: e.sentiment,
    needs_clarification: e.needs_clarification,
    clarification_question: e.needs_clarification ? `Please share the missing ${(tc.question_keywords_any || ['detail'])[0]}.` : null,
    escalate: e.escalate,
    summary: tc.summary_keywords.join(' '),
    suggested_action: 'Review the request.',
  };
}
const byId = (id) => dataset.cases.find((c) => c.id === id);
const fast = { delay: 0, cooldown: 0 };

test('dataset v1 passes well-formedness checks', () => assert.deepEqual(checkDataset(dataset), []));

test('schema rejects extra keys, bad enums, bad clarification pairing', () => {
  const ok = perfect(byId('CASE-01'));
  assert.deepEqual(validateSchema(ok), []);
  assert.ok(validateSchema({ ...ok, extra: 1 }).length > 0);
  assert.ok(validateSchema({ ...ok, category: 'sales' }).length > 0);
  assert.ok(validateSchema({ ...ok, clarification_question: 'why?' }).length > 0);
  assert.ok(validateSchema({ ...ok, needs_clarification: true, clarification_question: null }).length > 0);
});

test('semantic score follows the declared formula', () => {
  assert.equal(priorityScore('P2', 'P2'), 1);
  assert.equal(priorityScore('P2', 'P3'), 0.5);
  assert.equal(priorityScore('P1', 'P3'), 0);
  assert.equal(keywordOverlap(['a', 'b'], 'A only'), 0.5);
  assert.equal(keywordOverlap([], 'x'), 1);
  const tc = byId('CASE-01');
  assert.equal(scoreCase(tc, perfect(tc)).total, 1);
  const off = { ...perfect(tc), category: 'other', priority: 'P3', summary: 'nothing' };
  assert.ok(Math.abs(scoreCase(tc, off).total - (0 + 0.15 + 0.2 + 0)) < 1e-9);
});

test('invariants catch each violation', () => {
  assert.equal(checkInvariants(byId('CASE-07'), { ...perfect(byId('CASE-07')), escalate: false }).pass, false);
  assert.equal(checkInvariants(byId('CASE-10'), { ...perfect(byId('CASE-10')), needs_clarification: false, clarification_question: null }).pass, false);
  assert.equal(checkInvariants(byId('CASE-13'), { ...perfect(byId('CASE-13')), summary: 'x'.repeat(201) }).pass, false);
  assert.equal(checkInvariants(byId('CASE-18'), { ...perfect(byId('CASE-18')), priority: 'P1' }).pass, false);
  assert.equal(checkInvariants(byId('CASE-12'), { ...perfect(byId('CASE-12')), clarification_question: 'Anything else?' }).pass, false);
  assert.equal(checkInvariants(byId('CASE-15'), { ...perfect(byId('CASE-15')), summary: '```prompt```' }).pass, false);
  const c16 = byId('CASE-16');
  assert.equal(checkInvariants(c16, { ...perfect(c16), summary: 'Card 4532891033417782 charged twice' }).pass, false);
  assert.equal(checkInvariants(c16, { ...perfect(c16), summary: 'Contact k.paul@example.com' }).pass, false);
  assert.equal(checkInvariants(c16, perfect(c16)).pass, true);
});

test('perfect model gives PASS; each gate can fail', async () => {
  const good = async (text) => perfect(dataset.cases.find((c) => c.input === text));
  assert.equal((await runAll(dataset, good, fast)).summary.verdict, 'PASS');
  const badInv = async (text) => { const tc = dataset.cases.find((c) => c.input === text); return tc.id === 'CASE-07' ? { ...perfect(tc), escalate: false } : perfect(tc); };
  assert.equal((await runAll(dataset, badInv, fast)).summary.gates.invariants_100, false);
  const badSem = async (text) => { const tc = dataset.cases.find((c) => c.input === text); return { ...perfect(tc), category: 'other', sentiment: 'neutral', priority: 'P4', summary: '' }; };
  const r = await runAll(dataset, badSem, fast);
  assert.equal(r.summary.verdict, 'FAIL');
  assert.equal(r.summary.gates.semantic_ge_threshold, false);
});

test('service errors are excluded and re-run; unresolved gives INCOMPLETE, never PASS', async () => {
  let first = true;
  const flaky = async (text) => {
    const tc = dataset.cases.find((c) => c.input === text);
    if (tc.id === 'CASE-02' && first) { first = false; const e = new Error('x'); e.name = 'ServiceError'; e.code = 503; throw e; }
    return perfect(tc);
  };
  const r = await runAll(dataset, flaky, fast);
  assert.equal(r.summary.verdict, 'PASS');
  assert.equal(r.records.find((x) => x.id === 'CASE-02').rerun, true);
  const down = async (text) => { const tc = dataset.cases.find((c) => c.input === text); if (tc.id === 'CASE-02') { const e = new Error('x'); e.name = 'ServiceError'; e.code = 'TIMEOUT'; throw e; } return perfect(tc); };
  const r2 = await runAll(dataset, down, fast);
  assert.equal(r2.summary.verdict, 'INCOMPLETE');
  assert.deepEqual(r2.summary.unresolved_service_errors, ['CASE-02']);
  assert.equal(r2.summary.scored_cases, 17);
});

test('application errors are structural failures, not service errors', async () => {
  const broken = async (text) => { const tc = dataset.cases.find((c) => c.input === text); if (tc.id === 'CASE-03') { const e = new Error('bad json'); e.name = 'ApplicationError'; throw e; } return perfect(tc); };
  const r = await runAll(dataset, broken, fast);
  assert.equal(r.summary.gates.structural_100, false);
  assert.equal(r.records.find((x) => x.id === 'CASE-03').status, 'APPLICATION_ERROR');
  assert.equal(r.summary.verdict, 'FAIL');
});

test('when every case ends in a service error the verdict is INCOMPLETE, never FAIL or PASS', async () => {
  const down = async () => { const e = new Error('x'); e.name = 'ServiceError'; e.code = 429; throw e; };
  const r = await runAll(dataset, down, fast);
  assert.equal(r.summary.scored_cases, 0);
  assert.equal(r.summary.unresolved_service_errors.length, 18);
  assert.equal(r.summary.verdict, 'INCOMPLETE');
});
