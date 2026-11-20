'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

function response(status, text = '') {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
  };
}

test('429 and 503 are retried three times with 2-second then 5-second waits', async () => {
  const { createGeminiClient, ServiceError } = require('../src/llm');

  for (const status of [429, 503]) {
    let attempts = 0;
    const waits = [];
    const fetchImpl = async () => {
      attempts += 1;
      return response(status);
    };
    const sleepImpl = async (milliseconds) => {
      waits.push(milliseconds);
    };
    const client = createGeminiClient({ fetchImpl, sleepImpl });

    await assert.rejects(
      () => client.generateContent({
        apiKey: 'test-key',
        model: 'test-model',
        systemPrompt: 'Test system prompt',
        emailText: 'test email',
      }),
      (error) =>
        error instanceof ServiceError &&
        error.name === 'ServiceError' &&
        error.code === status &&
        error.attempts === 3,
    );
    assert.equal(attempts, 3);
    assert.deepEqual(waits, [2000, 5000]);
  }
});

test('timeout is retried three times and surfaced as a TIMEOUT ServiceError', async () => {
  const { createGeminiClient, ServiceError } = require('../src/llm');
  let attempts = 0;
  const waits = [];
  const fetchImpl = async () => {
    attempts += 1;
    throw new DOMException('timed out', 'TimeoutError');
  };
  const client = createGeminiClient({
    fetchImpl,
    sleepImpl: async (milliseconds) => waits.push(milliseconds),
  });

  await assert.rejects(
    () => client.generateContent({
      apiKey: 'test-key',
      model: 'test-model',
      systemPrompt: 'Test system prompt',
      emailText: 'test email',
    }),
    (error) =>
      error instanceof ServiceError &&
      error.name === 'ServiceError' &&
      error.code === 'TIMEOUT' &&
      error.attempts === 3,
  );
  assert.equal(attempts, 3);
  assert.deepEqual(waits, [2000, 5000]);
});

test('only 429, 503, and timeout are retried', async () => {
  const { createGeminiClient, ServiceError } = require('../src/llm');

  for (const outcome of [
    { kind: 'status', status: 500 },
    { kind: 'status', status: 401 },
  ]) {
    let attempts = 0;
    const waits = [];
    const client = createGeminiClient({
      fetchImpl: async () => {
        attempts += 1;
        return response(outcome.status);
      },
      sleepImpl: async (milliseconds) => waits.push(milliseconds),
    });

    await assert.rejects(
      () => client.generateContent({
        apiKey: 'test-key',
        model: 'test-model',
        systemPrompt: 'Test system prompt',
        emailText: 'test email',
      }),
      (error) => error instanceof ServiceError,
    );
    assert.equal(attempts, 1);
    assert.deepEqual(waits, []);
  }
});

test('malformed JSON and schema violations are not retried', async () => {
  const { createGeminiClient } = require('../src/llm');
  const { parseAndValidate, ApplicationError } = require('../src/triage');

  for (const text of [
    '{not-json',
    JSON.stringify({
      category: 'invalid',
      priority: 'P2',
      sentiment: 'negative',
      needs_clarification: false,
      clarification_question: null,
      escalate: false,
      summary: 'Invalid category',
      suggested_action: 'Review',
      extra: true,
    }),
  ]) {
    let llmAttempts = 0;
    const waits = [];
    const client = createGeminiClient({
      fetchImpl: async () => {
        llmAttempts += 1;
        return response(200, JSON.stringify({
          candidates: [{ content: { parts: [{ text }] } }],
        }));
      },
      sleepImpl: async (milliseconds) => waits.push(milliseconds),
    });

    const generated = await client.generateContent({
      apiKey: 'test-key',
      model: 'test-model',
      systemPrompt: 'Test system prompt',
      emailText: 'test email',
    });
    assert.throws(
      () => parseAndValidate(generated),
      (error) => error instanceof ApplicationError,
    );
    assert.equal(llmAttempts, 1);
    assert.deepEqual(waits, []);
  }
});

