'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('configuration is environment-only and exposes explicit missing-value failures', () => {
  const { readConfig } = require('../src/llm');

  const config = readConfig({
    GEMINI_API_KEY: 'test-key',
    LLM_MODEL: 'test-model',
  });
  assert.deepEqual(config, {
    apiKey: 'test-key',
    model: 'test-model',
  });

  assert.throws(
    () => readConfig({ LLM_MODEL: 'test-model' }),
    (error) => error.name === 'ConfigurationError' && /GEMINI_API_KEY/.test(error.message),
  );
  assert.throws(
    () => readConfig({ GEMINI_API_KEY: 'test-key' }),
    (error) => error.name === 'ConfigurationError' && /LLM_MODEL/.test(error.message),
  );
});

test('model and API key are read only from the two permitted environment names', () => {
  const { readConfig } = require('../src/llm');

  assert.throws(
    () => readConfig({
      API_KEY: 'forbidden-key',
      MODEL: 'forbidden-model',
    }),
    (error) => error.name === 'ConfigurationError',
  );

  assert.deepEqual(
    readConfig({
      GEMINI_API_KEY: 'test-key',
      LLM_MODEL: 'test-model',
      OTHER_SETTING: 'ignored',
    }),
    { apiKey: 'test-key', model: 'test-model' },
  );
});

test('API key is sent in a header and never placed in a URL or logged', async () => {
  const { createGeminiClient } = require('../src/llm');
  let requestUrl = '';
  let requestHeaders = null;
  const fetchImpl = async (url, options) => {
    requestUrl = String(url);
    requestHeaders = options.headers;
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
      }),
    };
  };

  const client = createGeminiClient({
    fetchImpl,
    sleepImpl: async () => {},
  });
  await client.generateContent({
    apiKey: 'test-key',
    model: 'test-model',
    systemPrompt: 'Test system prompt',
    emailText: 'test email',
  });

  assert.doesNotMatch(requestUrl, /test-key/i);
  assert.equal(requestHeaders['x-goog-api-key'], 'test-key');
  assert.equal(Object.keys(requestHeaders).some((name) => /authorization/i.test(name)), false);
});

