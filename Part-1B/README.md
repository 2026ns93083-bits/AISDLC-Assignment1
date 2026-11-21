# Part 1B – Customer Support Email Triage (non-deterministic, LLM)

A Node.js command-line tool that reads one customer support email and uses the **Gemini API** to return a single structured JSON triage result. Built with **Spec-Driven Development (GitHub Spec Kit)** and **GitHub Copilot Agent mode**, and checked by a **student-authored evaluation harness** that was frozen before implementation.

## Requirements
- Node.js 20.6 or later (CommonJS, built-in modules only, no npm dependencies)
- A Gemini API key from Google AI Studio

## Configuration (environment only)
Copy `.env.example` to `.env` (never commit `.env`) and set:
```text
GEMINI_API_KEY=<your key>
LLM_MODEL=gemini-3.6-flash
```
Nothing else is configurable. The key is never printed or logged.

## Usage
Run from the `Part-1B/` folder, with the email as a file or on stdin:
```text
node --env-file=.env src/cli.js email.txt
Get-Content -Raw -Encoding utf8 email.txt | node --env-file=.env src/cli.js      # PowerShell stdin
```

**Success** (exit 0): one JSON object with exactly eight fields:

| Field | Values |
|---|---|
| `category` | billing, technical, account, feature_request, complaint, other |
| `priority` | P1 to P4 |
| `sentiment` | positive, neutral, negative |
| `needs_clarification` | boolean |
| `clarification_question` | non-empty string if `needs_clarification` is true, otherwise null |
| `escalate` | boolean |
| `summary` | at most 200 characters, no personal data echoed |
| `suggested_action` | short support action |

**Failure** (non-zero exit, nothing on stdout, one line on stderr): `usage error`, `input error`, `configuration error`, `service error` (429/503/timeout after 3 attempts, waits 2 s and 5 s) or `application error` (the model reply broke the contract).

Guardrails: the email is treated as untrusted data, injected instructions are ignored, the system prompt is never revealed, and emails, phone numbers and card numbers are not echoed.

## Tests (no network needed)
```text
npm test        # node --test : 27 tests (config, LLM client retry/classification, triage parsing and validation)
```

## Evaluation harness (live model, uses API quota)
```text
node .harness/selftest.js                        # 8 self-tests of the harness itself, no network
node .harness/dataset-check.js                   # validates evals/dataset.json
node --env-file=.env .harness/run-eval.js initial
```
Free-tier limits are low (about 5 requests per minute, 20 per day per model), so the runner paces calls 13 s apart (about 4 minutes for 18 cases).

The harness uses a frozen dataset of 18 cases (`evals/dataset.json`, `traces_to` links to the spec acceptance criteria).
- **Structural gate:** 100% of replies match the 8-field contract
- **Invariant / guardrail gate:** 100% (clarification pairing, no personal-data echo, no prompt leak, injection ignored, forbidden priority)
- **Semantic gate:** mean score at least 0.80, where score = 0.4 category + 0.3 priority + 0.2 sentiment + 0.1 summary keywords
- Service errors (429/503/timeout) are excluded and re-run. If any stay unresolved the verdict is `INCOMPLETE`, never `PASS`.

**Result (20 Nov 2026 UTC, `gemini-3.6-flash`):** 18/18 scored, structural 100%, invariants 100%, mean semantic 0.9241, verdict **PASS**. Evidence: `evidence/eval-results/initial-2026-11-20T20-42-39-574Z.json` (dataset SHA-256 `348e4fb2…`). The earlier file `initial-2026-11-20T20-24-08-551Z.json` is a run where every call hit a 429 quota error; it was recorded as service errors and not counted.

## Repository layout (Part-1B)
| Path | Purpose |
|---|---|
| `src/` | `cli.js` (entry and exit codes), `llm.js` (Gemini REST client, retries), `triage.js` (prompt call, parse and validate) |
| `prompts/triage.system.md` | System prompt |
| `tests/` | Unit tests written first from the spec |
| `.harness/` | Student-authored evaluation harness (schema, invariants, semantic scoring, runner, self-test) |
| `evals/dataset.json` | Frozen 18-case evaluation dataset |
| `.specify/memory/constitution.md`, `specs/001-support-email-triage/` | Constitution (evaluation gates), spec, plan, tasks, contracts, quickstart |
| `evidence/agent-sessions/` | Copilot agent session logs 01 to 13, in workflow order |
| `evidence/analyze-1.md` … `analyze-3.md` | Three `/speckit.analyze` reports |
| `evidence/eval-results/` | Evaluation result files |
| `evidence/initial-generation/`, `evidence/final-generation/` | Source as first generated, and as finally evaluated (identical: no repair was needed) |
| `harness-log.md` | Harness engineering log |

## Git evidence
| Tag | Meaning |
|---|---|
| `part1b-harness-ready` | Dataset and harness frozen before implementation |
| `part1b-tests-written`, `-reviewed`, `-final`, `-final-2` | Tests first, reviewed, fixed, and extended for a coverage gap |
| `part1b-initial` | Initial generation ready for evaluation |
| `part1b-harness-ready-2` | Harness fixes after freeze (INCOMPLETE logic, 13 s pacing); no gate or threshold changed |
| `part1b-final` | Final evaluated state (PASS) |

## Known limitations (honest notes)
- The model asks for an order/invoice identifier in a few cases where the dataset expects no clarification. The gates only enforce clarification when it is expected, so this passes but is a quality gap.
- A few label disagreements (CASE-08, 12, 13, 17, 18) and lexical keyword matching lower some semantic scores.
- Results vary between runs and models, so one PASS is evidence, not a guarantee.
