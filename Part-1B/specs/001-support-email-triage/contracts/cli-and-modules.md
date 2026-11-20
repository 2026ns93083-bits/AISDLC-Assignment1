# CLI and Module Contracts

## Command line

Run from `Part-1B/` with Node.js 20.6 or later:

```text
node --env-file=.env src/cli.js [email-file]
```

- With exactly one `email-file` argument, read that file as UTF-8.
- With no file argument, read the email body from stdin.
- Reject extra arguments and file-read errors as input/usage failures.
- On success, write exactly one schema-valid JSON object to stdout.
- On failure, write a sanitized, category-identifiable message to stderr and exit nonzero. Never include the API key, raw email, or an unsanitized provider body in diagnostics.
- Keep error categories distinct: usage/configuration, service/API, and application. The evaluation harness separately identifies evaluation failures.

## `src/llm.js`

- Read `GEMINI_API_KEY` and `LLM_MODEL` from the process environment only; missing values produce an explicit configuration failure. Do not provide a model fallback, log either value, or place the key in a URL.
- Make a Gemini `generateContent` REST request using the model in the endpoint, the key in the `x-goog-api-key` header, the system instruction and email content, `temperature: 0.1`, and `responseMimeType: "application/json"`.
- Set a 30-second timeout for each attempt with `AbortSignal.timeout(30000)`.
- Retry HTTP 429, HTTP 503, and timeouts only: three attempts maximum, with 2-second and 5-second backoff. Inject the fetch and sleep functions so tests do not call the network or wait.
- Export `ServiceError` for service/API failures. Its `name` is `"ServiceError"` and its `code` is `429`, `503`, or `"TIMEOUT"`. Include the attempt count. Do not return error-shaped successful content.

## `src/triage.js`

- Export `triage(emailText) => Promise<triage result object>`.
- Load `prompts/triage.system.md` from a path anchored to the module/project layout, not the process working directory.
- Treat the email as untrusted data in the prompt; do not obey instructions in the body or echo personal data identified by the specification.
- Call the LLM client once per triage operation, parse its JSON text, and validate the exact eight-field output contract in the specification.
- Export `ApplicationError` with `name` `"ApplicationError"` and throw it for invalid JSON or schema violations. Expose a pure parse/validation boundary for deterministic tests; do not retry these failures.

## `src/cli.js`

- Select file or stdin input, invoke triage once, and write only the successful JSON result to stdout.
- Route typed failures to a nonzero process exit and sanitized stderr classification. Do not log email text, API keys, or successful model payloads.

## Test boundary

Use built-in `node:test` and `node:assert/strict`. Unit tests cover parsing/validation, configuration sourced only from the two permitted environment variables, and `ServiceError`/failure classification with injected HTTP 429, HTTP 503, and timeout outcomes. Inject sleep to assert backoff order without waiting. Do not make live Gemini calls in unit tests.
