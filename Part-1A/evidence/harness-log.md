# Harness Log – Part 1A

**Loan EMI & Amortization Calculator (deterministic application)**

| **Student ID**                 | 2026ns93083                                            |
|--------------------------------|--------------------------------------------------------|
| **Email ID**                   | 2026ns93083@wilp.bits-pilani.ac.in                     |
| **Course / Assignment**        | SEZG534 AI-Augmented SDLC – Assignment 1, Part 1A      |
| **GitHub repository**          | https://github.com/2026ns93083-bits/AISDLC-Assignment1 |
| **Part 1A folder (final tag)** | Part-1A/ at `part1a-final` (e4b866e)                     |

For Part 1A, I chose a straightforward, deterministic command-line Loan EMI & Amortization Calculator to walk through a Spec-Driven Development (SDD) workflow backed by an automated verification harness. Instead of letting the AI coding assistant jump straight into writing code or take its word that the output worked, I wrote the rules and acceptance checks first and let the harness evaluate the generated source files. When I uncovered a real validation bug through manual testing, I fed the exact failure logs back to the agent, restricted edits strictly to the broken source module, and re-ran the identical harness checks before doing my own final verification and sign-off.

# 1. Setup

I installed the required tools locally, cloned the repository, and initialized Spec Kit inside the Part-1A directory by running `specify init --here --integration copilot --script ps`. That command scaffolded the .github/ and .specify/ folders and prompt templates used throughout the SDD workflow.

| **Item**              | **Detail**                                                                                                                                                                  |
|-----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Application           | CLI: `node src/cli.js <principal> <annual-rate-%> <tenure-months>`; JSON result or JSON error on stdout; exit code 0 or 1                                               |
| Runtime and tools     | `Node.js` 20 (CommonJS, no runtime dependencies), GitHub Spec Kit (specify), GitHub Copilot in Agent mode (VS Code), ESLint with eslint-plugin-security, npm audit, node:test |
| Tool versions         | Node v24.22.2 specify 1.1.3                                                                                                                                                 |
| Harness runs recorded | 13 Nov 2026, 21:17–21:31 UTC (14 Nov 2026, 02:47–03:01 IST)                                                                                                                 |
| Local folder          | `D:\kpmyrepo\AISDLC-Assignment1\Part-1A`                                                                                                                                      |

# 2. Specification Context Given to the Agent

Before generating any application code, I generated the SDD artifacts with Spec Kit and Copilot, reviewed them, and committed them (c9ee4d3) so that the agent had firm boundaries upfront rather than making assumptions on its own.

- **Artifacts provided:** `.specify/memory/constitution.md`, `spec.md` (acceptance criteria AC-001 to AC-008), `data-model.md`, `contracts/cli.md`, `plan.md` and `tasks.md`.

- **Clarification and analysis:** /speckit.clarify was run to remove ambiguities, and /speckit.analyze was run across the spec, plan and tasks. The proposed remediation edits were reviewed and then applied to `spec.md` (session logs `06-analyze.json`, `07-analyze-fix1.json` and `08-analyze2-Fix2.json`).

- **Key rules:** `Node.js` 20 with zero runtime dependencies; money is rounded half-up to two decimals using `BigInt` integer-cent arithmetic; error codes are a fixed list (`INVALID_ARGUMENT_COUNT`, `INVALID_PRINCIPAL`, `INVALID_RATE`, `INVALID_TENURE`); the final instalment is adjusted so that the closing balance is exactly 0.00.

- **Protection rule (set in my prompts to the agent):** the agent was prohibited from modifying tests/, .harness/, eslint.config.js, `package.json` scripts or anything under specs/ to obtain a passing result.

# 3. Initial Generation

I set up the harness and test suite prior to implementation, and saved the initial generated code untouched before attempting any fixes.

- **Harness first:** the lint, security, dependency-audit and test gates (`.harness/run-harness.js`) were committed as cd74835 (tag `part1a-harness-ready`).

- **Tests first:** module skeletons and 20 acceptance tests were generated from the specification (328870d, tag `part1a-tests-reviewed`). Against the unimplemented stubs, 20 failures were observed, as expected.

- **Independent verification of expected values:** the key values were recalculated in Excel with PMT: EMI 10661.85 for 120000 / 12% / 12; month 1 interest 1200.00, principal 9461.85, balance 110538.15; zero-interest case 333.33 / 333.33 / 333.34.

- **Implementation:** `src/validate.js`, `src/emi.js` and `src/cli.js` were generated by the agent in the Part 2 implementation session (`10-…`) in three increments (`validate.js`, then `emi.js`, then `cli.js`), with the protection rule applied. The tests and project foundation came from the earlier session `09-…`.

- **Preservation:** the untouched first output was stored in `evidence/initial-generation/src/` and tagged `part1a-initial` (7bc18a5). The Copilot session logs for every step (`01-constitution.json` to `11-implement-Part2-implementation Harness Fail & Fix.json`) are stored in `evidence/agent-sessions/`.

# 4. Harness Run \#1 (label: initial)

I ran the harness against the first generated codebase, logging the output to `evidence/harness-results/initial-2026-11-13T21-17-53-265Z.json`. Every gate passed, including all 20 tests.

| **Gate** | **Command**                                          | **Result**                                                                                                       |
|----------|------------------------------------------------------|------------------------------------------------------------------------------------------------------------------|
| LINT     | `npx eslint src tests`                                 | PASS                                                                                                             |
| SECURITY | `npx eslint -c .harness/eslint.security.config.js src` | PASS (exit 0). Two `security/detect-unsafe-regex` warnings were reported: `src/emi.js` 5:28 and `src/validate.js` 3:25 |
| DEPS     | `npm audit --audit-level=high`                         | PASS. Four moderate advisories (minimatch via ESLint, development dependencies); no high or critical issues      |
| TESTS    | `node --test`                                          | PASS (20 / 20)                                                                                                   |

Even though the harness came back completely green on the first try, manual boundary probing right afterward exposed the bug documented in Section 5. The harness only caught it once I translated that probe into a formal spec-based test—a practical reminder that an automated harness is only as thorough as the tests written for it, and cannot replace human review.

# 5. Failure and Repair

## 5.1 Discovery

While testing edge-case inputs slightly outside the permitted limits directly via the CLI, I found three invalid inputs that the program mistakenly accepted with exit code 0, printing a full amortization schedule instead of rejecting them (saved in `probe-rate.txt`, `probe-tenure-high.txt`, and `probe-tenure-fraction.txt` inside `evidence/initial-generation/`).

| **Input (principal, rate, tenure)**            | **Expected**           | **Observed**              |
|------------------------------------------------|------------------------|---------------------------|
| `1000 50.0000000000000001 12` (rate above 50)    | `INVALID_RATE`, exit 1   | Schedule returned, exit 0 |
| `1000 0 480.0000000000000001` (tenure above 480) | `INVALID_TENURE`, exit 1 | Schedule returned, exit 0 |
| `1000 0 1.0000000000000001` (fractional tenure)  | `INVALID_TENURE`, exit 1 | Schedule returned, exit 0 |

**Root cause:** The initial validation code parsed input strings using `Number(value)` prior to checking ranges or integers. Because IEEE-754 double-precision floats lose precision past 15–17 significant digits, `Number("50.0000000000000001")` evaluated to 50, `Number("480.0000000000000001")` evaluated to 480, and `Number("1.0000000000000001")` evaluated to 1, silently bypassing the boundary checks.

## 5.2 Failure captured by the harness (label: failure1)

I added three new boundary tests mapped to FR-002, FR-003, and AC-004 into `tests/validate.test.js` (aa45a3c, tag `part1a-tests-extended`) and re-ran the harness (`failure1-2026-11-13T21-23-39-467Z.json`). This time, TESTS failed with 20 passing and 3 failing (0 !== 1 because exit code 0 was returned instead of 1 at lines 92, 98, and 104 of `tests/validate.test.js`), while LINT, SECURITY, and DEPS remained green.

## 5.3 Evidence fed back to the agent

I gave Copilot a targeted repair prompt containing the failing gate, the three failing test names, expected versus observed behavior, raw failure logs, the violated requirements (FR-002, FR-003, AC-004), and the root cause diagnosis. I locked edits strictly to `src/validate.js`—explicitly forbidding any changes to tests/, .harness/, eslint.config.js, `package.json`, `src/emi.js`, `src/cli.js`, or specs/, as well as prohibiting any weakening of existing checks. The repair session transcript is saved in `evidence/agent-sessions/`.

## 5.4 What changed in the repair

In `src/validate.js`, `parseFiniteDecimal` (which relied on `Number(value)`) was replaced with a string-based decimal parser, `parseDecimal`, that stores the integer portion as a `BigInt` and keeps the fractional digits as raw text. A companion helper, `compareDecimalToInteger`, compares those parsed components directly against integer bounds so any non-zero fractional tail above a maximum limit is caught accurately. No other file in src/ was touched (52 lines changed in the diff).

## 5.5 Verification of the repair (label: repair1)

- Checking git diff between `part1a-tests-extended` and `part1a-final` across tests/, .harness/, eslint.config.js, `package.json`, specs/, `src/emi.js`, and `src/cli.js` returned an empty diff, confirming that every protected file stayed untouched and no test assertions were weakened.

- When I re-ran the harness (`repair1-2026-11-13T21-31-33-181Z.json`), all four gates passed and all 23 tests succeeded. Re-running the manual CLI probes confirmed that `1000 50.0000000000000001 12` now exits with 1 and `INVALID_RATE`, while `1000 0 480.0000000000000001` and `1000 0 1.0000000000000001` both exit with 1 and `INVALID_TENURE`. Valid boundary inputs (`1000 50 480` and `1 0 1`) still return valid schedules with exit code 0.

# 6. Final Harness Result

I tagged the repaired version `part1a-final` (e4b866e) and copied the final source files into `evidence/final-generation/src/`. Every gate in the harness—linting, security rules, dependency audit, and all 23 deterministic tests—passed cleanly without relaxing any rules.

| **Run**  | **Evidence file (UTC time)** | **LINT** | **SECURITY** | **DEPS** | **TESTS**    |
|----------|------------------------------|----------|--------------|----------|--------------|
| initial  | initial-…`21-17-53Z.json`      | PASS     | PASS\*       | PASS\*   | PASS (20/20) |
| failure1 | failure1-…`21-23-39Z.json`     | PASS     | PASS\*       | PASS\*   | FAIL (20/23) |
| repair1  | repair1-…`21-31-33Z.json`      | PASS     | PASS\*       | PASS\*   | PASS (23/23) |

\* Passed with warnings or advisories (see Section 4); they do not fail the gate.

# 7. Manual Code Review of the Final Source

A green harness is necessary but not sufficient (see Section 4), so after the repair I read the final `src/` files myself.

| Check | Result | Where |
|---|---|---|
| No floating-point money arithmetic | Principal, rate and tenure are parsed from strings to `BigInt`. The EMI, interest and balance are computed in integer cents. The only conversion to a JSON number is the final `Number(cents) / 100` at output | `emi.js:3-17`, `emi.js:50-57`, `emi.js:59-61` |
| Round half up | `roundRatioHalfUp` rounds exact ratios with integer arithmetic (`remainder * 2n >= denominator`), so 0.005 gives 0.01 and 2.675 gives 2.68 | `emi.js:44-48` |
| Exact cents on input | A principal with more than two decimal digits is rejected rather than rounded | `emi.js:53-55`, `validate.js:55-69` |
| Final instalment adjustment | In the last month, the principal paid equals the remaining balance, so the closing balance is exactly 0.00 and the totals include the adjusted instalment | `emi.js:97-104` |
| Zero-interest loans | When the monthly rate is zero, the EMI is principal divided by tenure, rounded half up | `emi.js:76-78` |
| Exact boundary checks (the repaired defect) | `parseDecimal` keeps the integer part as `BigInt` and the fraction as text, and `compareDecimalToInteger` compares them with the limits, so `50.0000000000000001` is above 50 | `validate.js:9-39` |
| Error contract | Only four error codes exist, each returned as `{error:{code,message}}` with exit code 1 | `validate.js:5-7`, `validate.js:41-95`, `cli.js` |
| Scope | Three source files, no runtime dependencies, no UI, database, currency conversion or prepayment | `package.json`, `src/` |

**Known limitations found in review:**
- `validate.js:3` accepts loose forms such as `+1000` and `1000.`.
- `Number(tenure.integer)` at `validate.js:93` is safe only because tenure is limited to 480 by that point.
- `powBigInt` in `emi.js:29-42` builds very large integers for long tenures; it is fast enough for 480 months, but I measured AC-007 on one machine only.
- `tasks.md` still shows T001 to T003 (project setup) unticked, although `package.json` and `eslint.config.js` exist and the harness uses them. T038 (scope exclusion check) is covered by the Scope row above. T037 (refresh quickstart examples) and T039 (a repeatability test asserting identical output on repeated runs, for NFR-001) were not completed: `tests/` contains no such test, so determinism rests on the exact expected-value tests.

# 8. Human Decision

**Decision: ACCEPT.** The implementation meets the functional requirements (AC-001 to AC-008), keeps exact integer-cent precision, and was re-verified independently (Excel values, manual probes and a real failure-and-repair cycle) before acceptance.

**Known limitations and residual risks:**

- Two `security/detect-unsafe-regex` warnings remain in `src/emi.js` and `src/validate.js`; they are non-blocking because ESLint warnings exit with status 0.

- Four moderate npm audit advisories remain in development dependencies (minimatch through ESLint); the suggested fix is a breaking downgrade and was not applied.

- Loose number formats such as +1000 and 1000. are accepted.

- Very long input strings were not stress-tested, and the one-second performance criterion (AC-007) was measured on a single development machine only.

- Task T039 (explicit repeatability test) and T037 (quickstart refresh) were not done; see Section 7.

- The initial 20 tests passed even though the boundary defect existed; the defect was found only by manual probing, which shows that a passing harness depends on the quality of its tests.

**Controls proposed before higher-risk or production use (not yet implemented):** failing the security gate on any warning (--max-warnings 0) after the flagged regular expressions are replaced by non-backtracking parsing, a limit on input length, and a wider set of boundary and property-based tests reviewed by a second person.

# Appendix A – Timeline (commits and tags)

| **Commit** | **Tag**               | **Description**                                                      |
|------------|-----------------------|----------------------------------------------------------------------|
| 3e762d5    | –                     | Initial repo structure                                               |
| c9ee4d3    | –                     | Constitution, spec, clarifications, plan, tasks                      |
| cd74835    | `part1a-harness-ready`  | Harness (lint, security, dependencies, tests)                        |
| 328870d    | `part1a-tests-reviewed` | Skeleton modules and acceptance tests from the spec (tests first)    |
| 7bc18a5    | `part1a-initial`        | First generated implementation preserved, with manual probe evidence |
| aa45a3c    | `part1a-tests-extended` | Boundary tests added after manual probing                            |
| e4b866e    | `part1a-final`          | Repair of `validate.js` with exact boundary checks; harness passes     |
| 22b4d4d    | –                     | Copilot session log for the harness repair added      |

# Appendix B – Evidence index

| **Location (under Part-1A/)**  | **Content**                                                           |
|--------------------------------|-----------------------------------------------------------------------|
| `evidence/initial-generation/`   | First generated src/ and the three probe output files                 |
| `evidence/final-generation/src/` | Final source after repair                                             |
| `evidence/harness-results/`      | initial, failure1 and repair1 harness JSON reports                    |
| `evidence/agent-sessions/`       | Copilot session logs (analysis, implementation, harness fail and fix) |
| `evidence/Terminal-logs/`        | Terminal output captured during implementation and the harness fail and pass runs |
| `specs/001-loan-emi-calculator/` | `spec.md`, `plan.md`, `tasks.md`, `data-model.md`, `contracts/cli.md`           |
| .harness/, tests/, src/        | Harness scripts, acceptance tests and final implementation            |
