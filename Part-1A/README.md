# Part 1A – Loan EMI & Amortization Calculator (deterministic)

A Node.js command-line tool that calculates the fixed-rate loan EMI and a full month-by-month amortization schedule. It was built with **Spec-Driven Development (GitHub Spec Kit)** and **GitHub Copilot Agent mode**, and checked by a **deterministic harness** (lint, security lint, dependency audit, tests).

## Requirements
- Node.js 20 or later and npm (no runtime dependencies; dev dependencies are ESLint and its security plugin)
- Install once: `npm install`

## Usage
Run from the `Part-1A/` folder. Exactly three positional inputs: **principal**, **annual rate (%)**, **tenure (whole months)**.

```text
node src/cli.js <principal> <annual_rate_percent> <tenure_months>
node src/cli.js 1000 0 3
node src/cli.js 120000 12 12
```

Valid range (spec FR-002): principal 1 to 100,000,000; rate 0 to 50; tenure 1 to 480 (whole months).

**Success** (exit code 0): one JSON object with `emi`, `total_interest`, `total_payment` and `schedule`. Each schedule entry has `month`, `emi`, `interest`, `principal`, `balance`. The last instalment is adjusted so the final balance is exactly 0.

**Invalid input** (exit code 1): one JSON object, for example:
```json
{"error":{"code":"INVALID_PRINCIPAL","message":"Principal must be a finite decimal value."}}
```
Error codes: `INVALID_ARGUMENT_COUNT`, `INVALID_PRINCIPAL`, `INVALID_RATE`, `INVALID_TENURE`.

## Tests and harness
```text
npm test               # unit and CLI tests (node:test)
npm run lint           # ESLint
npm run harness        # all gates: LINT, SECURITY, DEPS (npm audit), TESTS
```
`npm run harness` writes a JSON report to `evidence/harness-results/`.

## Repository layout (Part-1A)
| Path | Purpose |
|---|---|
| `src/` | `cli.js` (entry), `validate.js` (input rules), `emi.js` (calculation, round-half-up) |
| `tests/` | Acceptance tests derived from the spec (AC-001 to AC-008) |
| `specs/001-loan-emi-calculator/` | Spec Kit artefacts: spec, plan, research, data model, contracts, quickstart, tasks, checklists |
| `.specify/`, `.github/` | Spec Kit templates, scripts and Copilot agent prompts |
| `.harness/` | `run-harness.js` and the security lint config (feedback loop) |
| `evidence/agent-sessions/` | Saved Copilot agent session logs, in workflow order (constitution to implement) |
| `evidence/initial-generation/`, `evidence/final-generation/` | Source as first generated and as finally repaired, plus manual probe notes |
| `evidence/harness-results/` | Harness reports: `initial`, `failure1`, `repair1` |
| `evidence/Terminal-logs/` | Terminal output captured while implementing and running the harness |

## Workflow and git evidence
Spec Kit flow: constitution, specify, clarify, plan, tasks, analyze (2 rounds), then implement in two phases (tests first, then implementation).

| Tag | Meaning |
|---|---|
| `part1a-harness-ready` | Harness written before implementation |
| `part1a-tests-reviewed` | Skeleton and spec-derived acceptance tests (tests first) |
| `part1a-initial` | First generated implementation, preserved with manual probe evidence |
| `part1a-tests-extended` | Boundary tests added from FR-002/FR-003 after a manual probe |
| `part1a-final` | `validate.js` repaired with exact boundary checks; harness passes |

Harness loop: `initial` PASS, then after the boundary tests were added `failure1` (TESTS failed), then `repair1` PASS. The repair changed only `src/validate.js`.

See `evidence/harness-log.md` for the full account: generation, each harness run, the failure and repair, and the final human decision.
