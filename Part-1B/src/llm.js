'use strict';

class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

class ServiceError extends Error {
  constructor(code, attempts) {
    super(`Gemini service failure: ${code}`);
    this.name = 'ServiceError';
    this.code = code;
    this.attempts = attempts;
  }
}

function readConfig(environment) {
  const env = environment || {};
  const apiKey = env.GEMINI_API_KEY;
  const model = env.LLM_MODEL;

  if (typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new ConfigurationError('GEMINI_API_KEY is missing');
  }
  if (typeof model !== 'string' || model.trim() === '') {
    throw new ConfigurationError('LLM_MODEL is missing');
  }

  return { apiKey, model };
}

function createGeminiClient({
  fetchImpl = globalThis.fetch,
  sleepImpl = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required');
  }

  async function sleep(milliseconds) {
    if (typeof sleepImpl === 'function') {
      await sleepImpl(milliseconds);
      return;
    }
    throw new Error('A sleep implementation is required');
  }

  return {
    async generateContent({ apiKey, model, systemPrompt, emailText }) {
      if (typeof apiKey !== 'string' || apiKey.trim() === '') {
        throw new ConfigurationError('GEMINI_API_KEY is missing');
      }
      if (typeof model !== 'string' || model.trim() === '') {
        throw new ConfigurationError('LLM_MODEL is missing');
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const response = await fetchImpl(url, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: [{
                role: 'user',
                parts: [{ text: emailText }],
              }],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json',
              },
            }),
            signal: AbortSignal.timeout(30000),
          });

          if (response.ok) {
            const responseText = await response.text();
            let payload;
            try {
              payload = JSON.parse(responseText);
            } catch (error) {
              if (error instanceof SyntaxError) {
                return '';
              }
              throw error;
            }

            if (!payload || typeof payload !== 'object' || !Array.isArray(payload.candidates)) {
              return '';
            }

            return payload.candidates.flatMap((candidate) => {
              const parts = candidate && candidate.content && candidate.content.parts;
              if (!Array.isArray(parts)) {
                return [];
              }
              return parts
                .filter((part) => part && typeof part.text === 'string')
                .map((part) => part.text);
            }).join('');
          }

          if (response.status === 429 || response.status === 503) {
            if (attempt < 3) {
              await sleep(attempt === 1 ? 2000 : 5000);
              continue;
            }
            throw new ServiceError(response.status, attempt);
          }

          throw new ServiceError(response.status, attempt);
        } catch (error) {
          if (error instanceof ServiceError) {
            throw error;
          }
          if (error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
            if (attempt < 3) {
              await sleep(attempt === 1 ? 2000 : 5000);
              continue;
            }
            throw new ServiceError('TIMEOUT', attempt);
          }
          throw error;
        }
      }

      throw new ServiceError('TIMEOUT', 3);
    },
  };
}

module.exports = {
  ConfigurationError,
  ServiceError,
  readConfig,
  createGeminiClient,
};
