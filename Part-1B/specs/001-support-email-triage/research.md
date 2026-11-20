# Research: Support Email Triage

**Date**: 2026-11-20  
**Scope**: Resolve implementation choices for the approved v1 specification and the requested Node.js/Gemini design.

## Decisions

### Node.js runtime and deterministic tests

- **Decision**: Use CommonJS and only Node.js built-ins. Use `node:test` and `node:assert/strict` for deterministic tests.
- **Rationale**: This meets NFR-001 and constitution `INV-RUNTIME-01` without adding a package dependency. The built-in test runner is stable in Node 20.
- **Alternatives considered**: A third-party test framework or Gemini SDK would add runtime dependencies and are unnecessary for the specified unit-level checks.
- **Evidence**: [Node.js v20 test runner](https://nodejs.org/docs/latest-v20.x/api/test.html) documents the stable runner and CommonJS `require('node:test')` usage.

### Gemini REST request and response

- **Decision**: POST to `https://generativelanguage.googleapis.com/v1beta/models/{LLM_MODEL}:generateContent`. Pass `GEMINI_API_KEY` in the `x-goog-api-key` header, the system prompt in `systemInstruction`, the email as user content, and `temperature: 0.1` with `responseMimeType: "application/json"` in `generationConfig`. Read generated text from the first candidate's content parts.
- **Rationale**: This is the direct REST interface requested and avoids an SDK dependency. Local parsing and validation remain authoritative; JSON response mode does not replace contract validation.
- **Alternatives considered**: The Google GenAI SDK (disallowed by the built-in-only runtime constraint); placing the key in the URL (needlessly exposes it to URL logging).
- **Evidence**: [Gemini `generateContent` REST reference](https://ai.google.dev/api/generate-content/generate-content) documents the endpoint, `systemInstruction`, `temperature`, and `responseMimeType`. The selected model is read only from `LLM_MODEL`; there is no code fallback. The API key is never logged.

### Timeout and retry behavior

- **Decision**: Give each request attempt a 30-second timeout using `AbortSignal.timeout(30000)`. Retry only HTTP 429, HTTP 503, and request timeouts; make at most three attempts with injected waits of 2 seconds and then 5 seconds. Raise a distinguishable `ServiceError` after retries are exhausted. Do not retry other HTTP statuses, malformed JSON, or schema violations.
- **Rationale**: This follows the specification's exact retry schedule and the timeout duration confirmed for planning. Keeping retry logic in `llm.js` ensures parsing and validation failures remain application failures.
- **Alternatives considered**: An unbounded timeout, a configurable timeout environment variable (not permitted by the stated configuration boundary), or retrying all HTTP errors (not specified).
- **Evidence**: [Node.js v20 `AbortSignal.timeout()`](https://nodejs.org/docs/latest-v20.x/api/globals.html#static-method-abortsignaltimeoutdelay) provides the required built-in timeout signal. The timeout is per attempt, not a total-operation deadline.

### Module boundaries and error categories

- **Decision**: Keep transport, triage/prompt/validation, and command-line I/O in `src/llm.js`, `src/triage.js`, and `src/cli.js`. Give transport failures a `ServiceError` identity/code; represent invalid JSON and invalid output shape as application errors. Evaluation errors remain the evaluation harness's responsibility.
- **Rationale**: This directly reflects FR-009, AC-012, and constitution `INV-FAIL-01` while keeping the implementation small. Dependency injection of fetch and sleep makes retry tests deterministic.
- **Alternatives considered**: Catching all failures as one generic error (would obscure service versus application versus evaluation outcomes); live API tests (non-deterministic and unnecessary for the requested test scope).
- **Outcome handling**: The CLI emits only the successful JSON result on stdout. It reports usage/configuration, service, and application failures distinctly on stderr and exits unsuccessfully; evaluation classification and service-error exclusion/re-run are performed by the external evaluation workflow, not stored by this no-database CLI.

### Evaluation and artifact boundary

- **Decision**: Preserve the threshold, scoring method, and v1 coverage in the approved specification. Treat the student-authored `.harness/` and `evals/dataset.json`, once frozen at a Git tag, as read-only and outside generated implementation artifacts.
- **Rationale**: This is required by GR-EVAL-01 through GR-EVAL-03 and the user's explicit scope constraint. The implementation plan does not create, edit, or delete either artifact.
- **Alternatives considered**: Generating or changing the evaluation harness/dataset during implementation (prohibited by constitution `GR-EVAL-02`).

## Resolved Context

- The only runtime configuration inputs are `GEMINI_API_KEY` and `LLM_MODEL`; the current model value is provided by the environment, not embedded as a fallback.
- Node 20.6 or later is needed when using the requested `node --env-file=.env` launch form; this is a compatible subset of Node.js 20 or later. The application itself remains CommonJS and built-in-only.
- There are no remaining planning clarifications. The per-attempt timeout is 30 seconds as confirmed by the user.
