'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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

test('API key is sent in x-goog-api-key and never placed in the URL', async () => {
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

test('runtime configuration is CommonJS and restricts require imports (AC-014, INV-RUNTIME-01)', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const packagePath = path.join(projectRoot, 'package.json');

  assert.equal(fs.existsSync(packagePath), true, 'package.json must exist');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  assert.equal(Object.prototype.hasOwnProperty.call(packageJson, 'dependencies'), false);
  assert.notEqual(packageJson.type, 'module');
  assert.match(
    String(packageJson.engines && packageJson.engines.node),
    /(?:^|\s)>=?\s*20(?:\.0)?(?:\.0)?(?:\s|$)/,
  );

  const srcDirectory = path.join(projectRoot, 'src');
  assert.equal(fs.existsSync(srcDirectory), true, 'src directory must exist');
  for (const fileName of fs.readdirSync(srcDirectory)) {
    if (!fileName.endsWith('.js')) continue;
    const source = fs.readFileSync(path.join(srcDirectory, fileName), 'utf8');
    const requirePattern = /require\s*\(\s*(['"])([^'"]+)\1\s*\)/g;
    for (const match of source.matchAll(requirePattern)) {
      const specifier = match[2];
      assert.equal(
        specifier.startsWith('node:') || specifier.startsWith('.'),
        true,
        `${fileName} has non-runtime import ${specifier}`,
      );
    }
  }
});

