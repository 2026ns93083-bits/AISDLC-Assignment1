'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const validOrdinary = {
  category: 'billing',
  priority: 'P2',
  sentiment: 'negative',
  needs_clarification: false,
  clarification_question: null,
  escalate: false,
  summary: 'The customer was charged twice.',
  suggested_action: 'Investigate the duplicate charge.',
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('ordinary and clarification results satisfy the exact output contract', async () => {
  const { parseAndValidate } = require('../src/triage');

  assert.deepEqual(parseAndValidate(JSON.stringify(validOrdinary)), validOrdinary);

  const clarification = clone(validOrdinary);
  clarification.category = 'other';
  clarification.priority = 'P3';
  clarification.sentiment = 'neutral';
  clarification.needs_clarification = true;
  clarification.clarification_question = 'Which order number should I investigate?';
  assert.deepEqual(parseAndValidate(JSON.stringify(clarification)), clarification);
});

test('empty, vague, missing-identifier, and malformed inputs require clarification', async () => {
  const { parseAndValidate } = require('../src/triage');

  for (const fixture of [
    { ...validOrdinary, category: 'other', priority: 'P3', sentiment: 'neutral', needs_clarification: true, clarification_question: 'What issue can I help with?', summary: 'The issue is unclear.' },
    { ...validOrdinary, category: 'billing', priority: 'P3', needs_clarification: true, clarification_question: 'What is the order number?', summary: 'A refund is requested.' },
    { ...validOrdinary, category: 'account', priority: 'P3', needs_clarification: true, clarification_question: 'What account or subscription identifier should I use?', summary: 'Subscription cancellation was requested.' },
  ]) {
    assert.deepEqual(parseAndValidate(JSON.stringify(fixture)), fixture);
  }
});

test('clarification_question is a non-empty string exactly when clarification is needed', async () => {
  const { parseAndValidate, ApplicationError } = require('../src/triage');

  const missingQuestion = clone(validOrdinary);
  missingQuestion.needs_clarification = true;
  missingQuestion.clarification_question = null;
  assert.throws(() => parseAndValidate(JSON.stringify(missingQuestion)), ApplicationError);

  const unexpectedQuestion = clone(validOrdinary);
  unexpectedQuestion.clarification_question = 'Do not ask';
  assert.throws(() => parseAndValidate(JSON.stringify(unexpectedQuestion)), ApplicationError);

  const emptyQuestion = clone(validOrdinary);
  emptyQuestion.needs_clarification = true;
  emptyQuestion.clarification_question = '   ';
  assert.throws(() => parseAndValidate(JSON.stringify(emptyQuestion)), ApplicationError);
});

test('privacy and adversarial results remain schema-valid without personal-data echo', async () => {
  const { parseAndValidate } = require('../src/triage');

  const privacy = clone(validOrdinary);
  privacy.summary = 'The customer reported a duplicate charge.';
  privacy.suggested_action = 'Review the dispute details.';
  assert.deepEqual(parseAndValidate(JSON.stringify(privacy)), privacy);

  const adversarial = clone(validOrdinary);
  adversarial.category = 'technical';
  adversarial.priority = 'P3';
  adversarial.sentiment = 'neutral';
  adversarial.escalate = false;
  adversarial.summary = 'A minor browser display issue was reported.';
  adversarial.suggested_action = 'Inspect the browser display issue.';
  assert.deepEqual(parseAndValidate(JSON.stringify(adversarial)), adversarial);
});

test('malformed JSON and exact schema violations are ApplicationError failures', async () => {
  const { parseAndValidate, ApplicationError } = require('../src/triage');

  assert.throws(
    () => parseAndValidate('{not-json'),
    (error) => error instanceof ApplicationError && error.name === 'ApplicationError',
  );

  for (const mutate of [
    (value) => { value.extra = true; },
    (value) => { delete value.summary; },
    (value) => { value.category = 'unknown'; },
    (value) => { value.priority = 'P5'; },
    (value) => { value.sentiment = 'angry'; },
    (value) => { value.needs_clarification = 'false'; },
    (value) => { value.escalate = 'false'; },
    (value) => { value.summary = 'x'.repeat(201); },
  ]) {
    const invalid = clone(validOrdinary);
    mutate(invalid);
    assert.throws(
      () => parseAndValidate(JSON.stringify(invalid)),
      (error) => error instanceof ApplicationError && error.name === 'ApplicationError',
    );
  }
});

test('ApplicationError and ServiceError remain distinct', async () => {
  const { ApplicationError } = require('../src/triage');
  const { ServiceError } = require('../src/llm');

  const applicationError = new ApplicationError('invalid');
  const serviceError = new ServiceError(429, 1);
  assert.equal(applicationError.name, 'ApplicationError');
  assert.equal(applicationError instanceof ServiceError, false);
  assert.equal(serviceError.name, 'ServiceError');
  assert.equal(serviceError instanceof ApplicationError, false);
});

test('CLI reads exactly one file argument and writes only successful JSON', async () => {
  const { runCli } = require('../src/cli');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'triage-test-'));
  const emailFile = path.join(directory, 'email.txt');
  fs.writeFileSync(emailFile, 'I was charged twice.');

  let stdout = '';
  let stderr = '';
  let receivedEmail = '';
  const exitCode = await runCli({
    argv: [emailFile],
    stdin: '',
    stdout: { write: (text) => { stdout += text; } },
    stderr: { write: (text) => { stderr += text; } },
    triageImpl: async (email) => {
      receivedEmail = email;
      return validOrdinary;
    },
  });

  assert.equal(exitCode, 0);
  assert.equal(receivedEmail, 'I was charged twice.');
  assert.deepEqual(JSON.parse(stdout), validOrdinary);
  assert.equal(stdout.trim().endsWith('}'), true);
  assert.equal(stderr, '');
  fs.rmSync(directory, { recursive: true, force: true });
});

test('CLI reads stdin when no file argument is supplied', async () => {
  const { runCli } = require('../src/cli');
  let stdout = '';
  let receivedEmail = '';
  const exitCode = await runCli({
    argv: [],
    stdin: '  Please help  ',
    stdout: { write: (text) => { stdout += text; } },
    stderr: { write: () => {} },
    triageImpl: async (email) => {
      receivedEmail = email;
      return validOrdinary;
    },
  });

  assert.equal(exitCode, 0);
  assert.equal(receivedEmail, '  Please help  ');
  assert.deepEqual(JSON.parse(stdout), validOrdinary);
});

test('CLI rejects extra arguments without invoking triage', async () => {
  const { runCli } = require('../src/cli');
  let stderr = '';
  let invoked = false;
  const exitCode = await runCli({
    argv: ['one.txt', 'two.txt'],
    stdin: '',
    stdout: { write: () => {} },
    stderr: { write: (text) => { stderr += text; } },
    triageImpl: async () => {
      invoked = true;
      return validOrdinary;
    },
  });

  assert.equal(exitCode, 1);
  assert.equal(invoked, false);
  assert.match(stderr, /usage/i);
});

test('CLI routes typed failures to distinct sanitized nonzero categories', async () => {
  const { runCli } = require('../src/cli');
  const { ServiceError } = require('../src/llm');
  const { ApplicationError } = require('../src/triage');

  for (const fixture of [
    { error: new ApplicationError('secret-free application detail'), category: 'application' },
    { error: new ServiceError(503, 3), category: 'service' },
  ]) {
    let stdout = '';
    let stderr = '';
    const exitCode = await runCli({
      argv: [],
      stdin: 'private customer email',
      stdout: { write: (text) => { stdout += text; } },
      stderr: { write: (text) => { stderr += text; } },
      triageImpl: async () => { throw fixture.error; },
    });
    assert.equal(exitCode, 1);
    assert.equal(stdout, '');
    assert.match(stderr.toLowerCase(), new RegExp(fixture.category));
    assert.doesNotMatch(stderr, /private customer email|test-key|provider-secret/);
  }
});

