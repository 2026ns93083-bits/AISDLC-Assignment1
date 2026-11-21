# Assignment 1: Spec-Driven Development and Harness Engineering (SEZG534)

AI-Augmented Software Development Life Cycle, BITS Pilani WILP. Individual assignment by Kausik (ID 2026ns93083).

Two small Node.js applications were built with the GitHub Spec Kit workflow (constitution, specify, clarify, plan, tasks, analyze, implement) using GitHub Copilot Agent mode, and checked by a harness that sits outside the generated code:

| Part | Application | Behaviour | Harness |
|---|---|---|---|
| `Part-1A/` | Loan EMI & Amortization Calculator (command line) | Deterministic | Lint, security lint, dependency audit, tests |
| `Part-1B/` | Customer Support Email Triage (command line, Gemini LLM) | Non-deterministic | Offline tests, plus a live evaluation with a declared pass rule (18 frozen cases) |

## Repository layout

```text
AISDLC-Assignment1/
├── README.md
├── Part-1A/
│   ├── README.md                    usage, tests, harness, tags
│   ├── .github/ .specify/           Spec Kit setup and Copilot agent prompts
│   ├── specs/001-loan-emi-calculator/   spec, plan, research, data model, contracts, quickstart, tasks, checklists
│   ├── src/                         cli.js, validate.js, emi.js (agent-generated, one repaired)
│   ├── tests/                       acceptance tests written from the spec before the implementation
│   ├── .harness/                    run-harness.js and security lint config
│   └── evidence/
└── Part-1B/
    ├── README.md                    usage, evaluation, tags, limitations
    ├── harness-log.md               harness engineering log
    ├── .github/ .specify/           Spec Kit setup; constitution in .specify/memory/constitution.md
    ├── specs/001-support-email-triage/  spec, plan, research, data model, contracts, quickstart, tasks
    ├── src/                         cli.js, llm.js, triage.js (agent-generated)
    ├── prompts/triage.system.md     system prompt
    ├── tests/                       27 offline tests, written before the implementation
    ├── evals/dataset.json           18 evaluation cases (student-authored, frozen)
    ├── .harness/                    evaluation harness (student-authored, frozen)
    └── evidence/
```

## Requirements

Node.js 20.6 or later (developed on Node 22) and Git. The commands below are for Windows PowerShell.
Part 1A needs `npm install` once (ESLint and its security plugin are dev dependencies only). Part 1B has no dependencies.
Part 1B additionally needs a Gemini API key from Google AI Studio for live runs; the tests and the harness self-test need no key and no network.

## Part 1A: run the application and the harness

```powershell
cd Part-1A
npm install
npm test                                  # unit and CLI tests
npm run harness                           # LINT, SECURITY, DEPS (npm audit), TESTS; report goes to evidence/harness-results/

node src/cli.js 1000 0 3                  # principal, annual rate %, tenure in months
node src/cli.js 120000 12 12
```

Expected for `120000 12 12`: `emi` 10661.85, 12 schedule entries, final balance 0. Invalid input prints one JSON error such as `{"error":{"code":"INVALID_PRINCIPAL",...}}` and exits 1.

## Part 1B: run the application, the tests and the evaluation

```powershell
cd Part-1B
npm test                                  # 27 offline tests
node .harness/selftest.js                 # 8 self-tests of the harness, including the dataset check
```

Live runs need your own key. Copy `.env.example` to `.env` and fill in two lines of the form `NAME=value` (no quotes): `GEMINI_API_KEY` and `LLM_MODEL` (used: `gemini-3.6-flash`). The real `.env` is git-ignored and is never committed.

```powershell
Copy-Item .env.example .env               # then edit .env
node --env-file=.env src/cli.js email.txt             # triage one email, prints one JSON object
node --env-file=.env .harness/run-eval.js initial     # 18 live calls, paced by CALL_DELAY_MS to respect free-tier limits
```

The model is not deterministic, so results can differ between runs and models. Service errors (429, 503, timeout) are excluded and re-run, and unresolved ones give an `INCOMPLETE` verdict, never `PASS`. Every run is saved under `evidence/eval-results/`.

**Result:** 20 Nov 2026 (UTC), `gemini-3.6-flash`: 18 of 18 cases scored, structural 100%, invariants 100%, mean semantic score 0.9241 (threshold 0.80), verdict **PASS**.

## How the harness stays independent

- Part 1A: the harness is a set of deterministic gates (lint, security lint, dependency audit, tests). The acceptance tests were written from the spec's acceptance criteria and reviewed before any implementation (tag `part1a-tests-reviewed`).
- Part 1B: the evaluation dataset and harness were written and frozen at tag `part1b-harness-ready` before the implementation existed, and the constitution forbids the coding agent from changing them. Any later change to the harness is disclosed in `Part-1B/harness-log.md`; no gate, threshold or dataset case was changed.

## Evidence

Each part keeps its evidence under `evidence/`:

| Path | Content |
|---|---|
| `agent-sessions/` | Exported Copilot agent sessions for each Spec Kit step, implementation increment and repair, numbered in order |
| `initial-generation/`, `final-generation/` | The first implementation as the agent produced it, and the final version |
| `harness-results/` (Part 1A) | Harness reports: `initial` (pass), `failure1` (a boundary test failed), `repair1` (pass) |
| `Terminal-logs/` (Part 1A) | Terminal output captured during implementation and harness runs |
| `analyze-1.md` to `analyze-3.md` (Part 1B) | The three `/speckit.analyze` reports |
| `eval-results/` (Part 1B) | Live evaluation results (one run with every call blocked by a 429 quota error, then the PASS run) |
| `harness-log.md` (Part 1B) | Narrative of the harness work: freeze, runs, checks and decisions |

Git tags mark the milestones.
- Part 1A: `part1a-harness-ready`, `part1a-tests-reviewed`, `part1a-initial`, `part1a-tests-extended`, `part1a-final`.
- Part 1B: `part1b-harness-ready`, `part1b-tests-written`, `part1b-tests-reviewed`, `part1b-tests-final`, `part1b-tests-final-2`, `part1b-initial`, `part1b-harness-ready-2`, `part1b-final`.

## Use of AI

- GitHub Copilot (Agent mode) with GitHub Spec Kit generated the constitution, specifications, plans, task lists, tests and application code. Its sessions are exported in `evidence/agent-sessions/`.
- An AI assistant (Claude) was used to plan the work, draft prompts for Copilot, review the generated artefacts and test results, and help draft the evaluation dataset and harness (permitted by the assignment's AI policy), and to draft this README and the READMEs of each part.
- I ran every step, reviewed the generated artefacts, answered the clarification questions, decided which analyze findings to act on, and approved or rejected changes. The harness log and the reflection report are written in my own words.

## Deliverables

- Source and evidence: this repository.
- Demonstration video (both applications): `<paste Google Drive / OneDrive link here>`
- Reflection report: uploaded to the LMS together with the links to this repository and the video.
