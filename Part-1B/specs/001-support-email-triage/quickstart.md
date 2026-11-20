# Quickstart: Validate Support Email Triage

## Prerequisites

- Node.js 20.6 or later (CommonJS and built-in modules only).
- `GEMINI_API_KEY` and `LLM_MODEL` supplied through the local environment file or process environment. Do not print or commit the key.
- For final evaluation only: the student-authored `.harness/` and `evals/dataset.json` must already be frozen at a Git tag. The implementation must not create or alter them.

## Deterministic tests

From `Part-1B/`, run:

```text
node --test
```

Expected: parsing and schema-validation cases, environment-only configuration checks, and injected 429/503/timeout classification and retry-schedule checks pass without network access or real backoff waits.

## CLI smoke check

With one email text file located inside `Part-1B/`, run:

```text
node --env-file=.env src/cli.js .\email.txt
```

Or pipe one email body to stdin:

```powershell
Get-Content -Raw -Encoding utf8 .\email.txt | node --env-file=.env src/cli.js
```

Expected on success: stdout contains one JSON object with exactly the eight fields in the [output contract](./contracts/cli-and-modules.md), and no other success text. On failure, stdout contains no triage result; stderr and the nonzero exit distinguish configuration/usage, service/API, and application failures. Do not expose the email, API key, or provider response body in diagnostics.

## Frozen evaluation

After confirming the pre-implementation freeze required by the constitution, run the existing evaluation harness using its documented command. A final PASS requires the complete frozen dataset and all three declared gates: 100% structural pass rate excluding service errors, 100% invariant/guardrail pass rate, and mean semantic score of at least 0.80. Record unresolved retries as `SERVICE_ERROR`, exclude them from statistics, and re-run those cases; do not count them as application or evaluation passes.
