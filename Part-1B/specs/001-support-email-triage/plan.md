# Implementation Plan: Support Email Triage

**Branch**: `001-support-email-triage` | **Date**: 2026-11-20 | **Spec**: [spec.md](./spec.md)

**Input**: Approved feature specification in `specs/001-support-email-triage/spec.md`, plus the implementation constraints supplied with the planning request.

## Summary

Build a stateless CommonJS CLI that reads one email from a file or stdin, sends it to Gemini's `generateContent` REST API, and prints exactly one locally parsed and validated triage JSON result. Use only Node.js built-ins, environment-only API/model configuration, a file-based system prompt, and deterministic injected tests. Transport retries are limited to HTTP 429, HTTP 503, and 30-second per-attempt timeouts; malformed JSON and schema violations are application failures and are never retried.

## Technical Context

**Language/Version**: JavaScript, CommonJS, Node.js 20.6 or later for the requested `--env-file` launch form  
**Primary Dependencies**: Node.js built-ins only (`fetch`, `node:test`, `node:assert/strict`, `node:fs`, `node:path`)  
**Storage**: N/A; no database or persistent application state  
**Testing**: Built-in Node test runner; deterministic unit tests only, with injected fetch/sleep for transport cases  
**Target Platform**: Node.js CLI on Windows and other Node-supported platforms  
**Project Type**: Single-project command-line application  
**Performance Goals**: One triage result per invocation; each API attempt is bounded to 30 seconds, with a maximum three attempts and 2-second/5-second backoffs  
**Constraints**: Gemini REST API; `GEMINI_API_KEY` and `LLM_MODEL` are the only configuration sources; temperature 0.1 and JSON response mode; no third-party runtime dependencies; exact eight-field output contract; no UI, database, reply sending, or expanded multilingual support; never log secrets or raw email; do not generate or modify `.harness/` or `evals/dataset.json`
**Scale/Scope**: One email per CLI invocation; v1 evaluation uses the complete frozen dataset v1 as declared in the specification

## Constitution Check

### Pre-research gate

- **Privacy by default (`INV-PRIV-01`)**: Pass. The system prompt must prohibit personal-data echo, application diagnostics must not print the email or provider payload, and privacy remains covered by the frozen evaluation case and required named test.
- **Clarify rather than guess (`INV-CLAR-01`)**: Pass. The prompt carries the specification's empty, ambiguous, and missing-identifier behavior; clarification results use the same validated schema.
- **Schema-valid JSON (`INV-JSON-01`)**: Pass. Parse and validate every candidate locally before returning success; invalid JSON/schema is an application failure.
- **Runtime/configuration (`INV-RUNTIME-01`, `INV-CONFIG-01`)**: Pass. CommonJS, built-in-only runtime; read only `GEMINI_API_KEY` and `LLM_MODEL` from the process environment, with no hard-coded fallback or secret logging.
- **Failure separation (`INV-FAIL-01`, `AC-FAIL-02`)**: Pass. Typed service/API errors, application errors, and external evaluation errors remain distinct. Only HTTP 429, HTTP 503, and timeouts retry.
- **Simple design (`INV-SIMPLE-01`)**: Pass. Three requested source modules and one prompt file; no framework, database, extra configuration layer, or live network test suite.
- **Evaluation integrity (`GR-EVAL-01`, `GR-EVAL-02`, `GR-EVAL-03`)**: Pass as a plan. The declared 0.80 semantic threshold, 100% structural/invariant gates, method, and v1 dataset remain unchanged. The student-owned harness/dataset must be frozen before implementation and remain untouched by the coding work.
- **Traceability and coverage (`GR-TRACE-01`, `GR-COVER-01`)**: Pass. The approved specification maps each criterion and constitution identifier to cases, required tests, or manual checklist items; the implementation tests cover the constitution-required technical identifiers, and review-only identifiers remain manual.
- **Governance (`GR-GOV-01`, `GR-GOV-02`, `GR-GOV-03`)**: Pass. No constitution or approved specification changes are planned. Release review retains the privacy, output, evaluation-integrity, and traceability checks.

**Pre-research result**: PASS. No constitution violation requires a complexity justification.

## Research Decisions

Research details and source references are in [research.md](./research.md).

1. Use the Gemini `generateContent` REST endpoint directly; send the model in the endpoint, the API key in `x-goog-api-key`, and the prompt/input in their API fields. Set `generationConfig.temperature` to `0.1` and `responseMimeType` to `application/json`.
2. Read both credentials/settings from their named environment variables only; do not supply a default model in code.
3. Use `AbortSignal.timeout(30000)` per attempt. Retry only 429, 503, and timeout outcomes with waits of 2 seconds and then 5 seconds, for three total attempts maximum.
4. Inject fetch and sleep at the transport boundary so retry behavior is testable without network access or wall-clock delays.
5. Keep JSON parsing and contract validation in triage logic, outside the retry loop. Keep evaluation failure accounting in the frozen evaluation harness.
6. Require Node.js 20.6 or later for the requested `--env-file` launch command; it remains within the Node.js 20-or-later runtime requirement.

## Project Structure

### Documentation (this feature)

```text
specs/001-support-email-triage/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── cli-and-modules.md
```

### Source Code (Part-1B root)

```text
src/
├── llm.js
├── triage.js
└── cli.js
prompts/
└── triage.system.md
tests/
├── triage.test.js
├── llm.test.js
└── config.test.js
```

**Structure Decision**: Use the requested single Node.js CLI layout rooted at `Part-1B/`. `llm.js` owns REST transport, timeouts, retries, and `ServiceError`; `triage.js` loads the prompt, calls the client, parses JSON, and validates the contract; `cli.js` handles file/stdin and stdout/stderr. Tests use Node's built-in runner. All plan artifacts are also under `Part-1B/specs/001-support-email-triage/`. The plan does not create implementation files, `.harness/`, or `evals/dataset.json`.

## Interfaces and Validation

- The successful CLI contract is one JSON object with exactly the eight properties and rules in the approved specification.
- The REST request uses Gemini's `generateContent` JSON response mode, but local validation remains authoritative.
- Service/API failures are typed and distinguishable from application failures. Evaluation failures are reported by the external evaluator, not conflated with CLI outcomes.
- Retry schedules are asserted with injected fetch/sleep responses; parsing/schema and environment-only configuration tests require no live credentials or API access.
- The declared complete-dataset PASS gate remains unchanged: 100% structural pass excluding service errors, 100% invariant/guardrail pass, and mean semantic score at least 0.80.

## Constitution Check (post-design)

- **Privacy, clarification, and JSON contract**: Pass; result validation is mandatory before success, prompt rules cover untrusted content, and private input/credentials are excluded from diagnostics.
- **Runtime and configuration**: Pass; all runtime imports are built-ins, and only the two specified environment variables configure model/key.
- **Retry and failure categories**: Pass; only 429/503/timeout are retried; invalid JSON/schema errors remain application failures; evaluation outcomes remain separate.
- **Evaluation and traceability integrity**: Pass; threshold/method/dataset version are preserved, required technical checks and manual reviews remain mapped, and frozen student-authored artifacts are explicitly outside generated scope.
- **Minimal design and v1 scope**: Pass; no database, UI, reply sending, extra dependencies, or unsupported capabilities are introduced.

**Post-design result**: PASS. No unjustified constitution violations.

## Complexity Tracking

No constitution violations. No additional complexity is proposed.
