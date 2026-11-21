# Tasks: Loan EMI & Amortization Calculator

**Input**: Design documents from `/specs/001-loan-emi-calculator/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), data-model.md, contracts/cli.md, research.md, quickstart.md

**Tests**: Acceptance tests are required and must appear before implementation tasks in each user story phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. Each task references the relevant AC and/or FR requirement IDs.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and shared toolchain

- [x] T001 Create the Node.js 20 CommonJS project structure in package.json, src/, and tests/ per plan.md and project structure decisions
- [x] T002 [P] Initialize package.json scripts for `npm test`, `npm run lint`, and `npm audit` with Node.js 20/CommonJS configuration in package.json
- [x] T003 [P] Configure ESLint with recommended and security rules in eslint.config.js and install the required development dependencies

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared validation and calculation boundaries that all user stories rely on

- [X] T004 Create the validation, calculation, and CLI module skeletons in src/validate.js, src/emi.js, and src/cli.js with the specified boundaries from FR-001 to FR-014
- [X] T005 [P] Define the shared input contract and normalized validation API in src/validate.js for principal, rate, and tenure constraints from FR-001 to FR-004 and data-model.md
- [X] T006 [P] Define the pure calculation API in src/emi.js for monthly rate, annuity math, and schedule output using exact BigInt math and integer-cent rounding from FR-006 to FR-012 and research.md
- [X] T007 Implement the CLI boundary in src/cli.js for process argv parsing, JSON serialization, and exit code handling from FR-004, FR-005, and FR-013
- [X] T008 Create the baseline test harness in tests/validate.test.js, tests/emi.test.js, and tests/cli.test.js with Node.js built-in test runner assertions using AC-001 through AC-008 names

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Calculate a fixed-rate loan (Priority: P1) 🎯 MVP

**Goal**: Produce a valid fixed-rate EMI and complete amortization schedule for positive-rate loans.

**Independent Test**: Run `node src/cli.js <principal> <rate> <months>` with valid positive-rate inputs and verify the summary, exact schedule length, and zero final balance.

### Tests for User Story 1 (must be written first)

- [X] T009 [P] [US1] Add AC-003 positive-rate schedule acceptance test in tests/emi.test.js covering FR-005, FR-006, FR-007, FR-008, and FR-011 for principal 120000, rate 12, and tenure 12, asserting EMI 10661.85 and final balance 0.00
- [X] T010 [P] [US1] Add AC-005 schedule-sum and final-balance acceptance test in tests/emi.test.js covering FR-010, FR-011, and FR-012 for (1,0,1), (100000000,50,480), (120000,12,12), (1000,0,3), and (50000,7.5,36)
- [X] T011 [P] [US1] Add AC-006 half-up rounding acceptance test in tests/emi.test.js covering FR-009 for 0.005 -> 0.01, 0.0049 -> 0.00, 0.0051 -> 0.01, and 2.675 -> 2.68
- [X] T012 [P] [US1] Add AC-007 480-month performance acceptance test in tests/emi.test.js covering NFR-002 and FR-007 for the maximum schedule length
- [X] T013 [P] [US1] Add AC-008 successful JSON-only stdout acceptance test in tests/cli.test.js covering FR-005 and FR-013 for valid execution output

### Implementation for User Story 1

- [X] T014 [US1] Implement the validated principal/rate input parsing and finite decimal checks in src/validate.js for FR-001, FR-002, FR-003, and FR-004
- [X] T015 [US1] Implement exact monthly-rate and EMI calculation logic in src/emi.js for positive-rate loans using BigInt and half-up cents rounding from FR-006, FR-009, and FR-011
- [X] T016 [US1] Implement the monthly amortization schedule generation in src/emi.js so each period uses opening balance interest, principal allocation, and exact final adjustment from FR-007, FR-008, FR-010, and FR-012
- [X] T017 [US1] Serialize the calculation result in src/cli.js with exactly `emi`, `total_interest`, `total_payment`, and `schedule`, and exit code 0 as required by FR-005 and FR-013
- [X] T018 [US1] Verify positive-rate schedule invariants against `src/emi.js` and `tests/emi.test.js`: non-negative balances, exact zero final balance, and integer-cent totals from FR-010 to FR-012

**Checkpoint**: At this point, User Story 1 should be fully functional and independently testable.

---

## Phase 4: User Story 2 - Calculate a zero-interest loan and settle the final balance (Priority: P1)

**Goal**: Support zero-interest loans and ensure the final schedule payment settles the remaining balance exactly.

**Independent Test**: Run `node src/cli.js 1000 0 3` and verify zero interest, a regular EMI of 333.33, and a final adjusted instalment that yields a final balance of 0.00.

### Tests for User Story 2 (must be written first)

- [X] T019 [P] [US2] Add AC-002 zero-interest acceptance test in tests/emi.test.js covering FR-006, FR-010, FR-011, and FR-012 for principal 1000 at 0% over 3 months
- [X] T020 [P] [US2] Add AC-005 final-balance acceptance test in tests/emi.test.js covering zero-rate and residual-payment settlement logic from FR-010 and FR-012
- [X] T021 [P] [US2] Add AC-008 error/success JSON contract test in tests/cli.test.js covering valid zero-rate success output from FR-005 and FR-013

### Implementation for User Story 2

- [X] T022 [US2] Implement the zero-rate calculation branch in src/emi.js to divide principal evenly over the tenure before half-up cents rounding from FR-006 and FR-009
- [X] T023 [US2] Implement final-period adjustment logic in src/emi.js so the last payment equals remaining balance plus interest, leaving the final balance exactly 0.00 from FR-010 and FR-011
- [X] T024 [US2] Check schedule invariants for zero-interest loans in src/emi.js: `interest` is zero, `total_interest` is zero, and `total_payment` equals principal after the final adjustment from FR-012
- [X] T025 [US2] Validate the CLI output for zero-rate success in src/cli.js against the contract in contracts/cli.md and FR-005 / FR-013

**Checkpoint**: At this point, User Stories 1 and 2 should both work independently.

---

## Phase 5: User Story 3 - Receive actionable input errors (Priority: P1)

**Goal**: Reject malformed and out-of-range inputs with a deterministic structured error and exit status 1.

**Independent Test**: Invoke the CLI with each invalid value class and validate the JSON error shape, exit status, and absence of non-JSON stdout content.

### Tests for User Story 3 (must be written first)

- [X] T026 [P] [US3] Add AC-001 boundary acceptance test in tests/validate.test.js covering inclusive min/max values and valid 1- through 480-month tenure from FR-002 and edge cases
- [X] T027 [P] [US3] Add AC-004 invalid-input acceptance test in tests/validate.test.js covering missing/extra args and asserting the mapped code for each malformed, out-of-range, excessive-principal-precision, and fractional-tenure class from FR-003 and FR-004
- [X] T028 [P] [US3] Add AC-008 invalid stdout contract test in tests/cli.test.js covering structured error output with no extra stdout text from FR-004 and FR-013

### Implementation for User Story 3

- [X] T029 [US3] Implement argument-count and decimal-format validation in src/validate.js for principal, annual rate, and tenure, mapping malformed fields and missing/extra arguments to their AC-004 codes from FR-001, FR-003, and FR-004
- [X] T030 [US3] Implement inclusive range, principal fractional-digit, and fractional-tenure checks in src/validate.js for principal 1..100000000 with at most two fractional digits, rate 0..50, and tenure 1..480 from FR-002, FR-003, and edge cases
- [X] T031 [US3] Emit the exact structured error shape in src/cli.js with the AC-004 code matching the invalid class, non-empty `error.message`, and exit status 1 from FR-004 and FR-013
- [X] T032 [US3] Confirm boundary-valid values are accepted and produce a schedule of the requested length in `src/validate.js` + `tests/validate.test.js` per AC-001 and FR-002

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and quality gates

- [X] T033 [P] Run the relevant Node.js test suite against `tests/validate.test.js`, `tests/emi.test.js`, and `tests/cli.test.js` to confirm the AC-001 through AC-008 coverage is passing
- [X] T034 Run ESLint across the project with `npm run lint` and fix any violations flagged by the recommended and security rules
- [X] T035 Run `npm audit` and resolve any high- or critical-severity dependency issues before completion
- [X] T036 [P] Review the final CLI output, rounding logic, and schedule invariants against `contracts/cli.md`, `data-model.md`, and the constitution to confirm no accidental intermediate rounding or process leakage remains
- [ ] T037 Refresh any directly related project docs or quickstart examples in `specs/001-loan-emi-calculator/quickstart.md` if implementation changes the required command or output examples
- [x] T038 Confirm the CLI and calculation boundary do not expose any UI, database, conversion, prepayment, or variable-rate behavior, and record the exclusion check in the final validation checklist for FR-014
- [ ] T039 Add deterministic repeatability validation in `tests/cli.test.js` or `tests/emi.test.js` asserting identical valid-input output on repeated invocations for NFR-001

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user story work
- **User Stories (Phase 3-5)**: All depend on the Foundational phase completion
  - User Stories can proceed in parallel if staffed, but each story must be independently testable
- **Polish (Phase 6)**: Depends on all required user story tasks being complete

### User Story Dependencies

- **User Story 1 (US1)**: No story dependency; core fixed-rate lender flow
- **User Story 2 (US2)**: No story dependency; zero-rate and final adjustment path
- **User Story 3 (US3)**: No story dependency; validation and error handling path

### Within Each User Story

- Tests must be written and fail before implementation
- Validation or model boundary tasks before business logic tasks
- Calculation logic before CLI wiring
- Story complete before moving to the next story or final polish

---

## Parallel Opportunities

- Setup tasks T001-T003 can run in parallel if the implementation is split among contributors
- Foundational work T004-T008 can be developed in parallel across the validation, calculation, and CLI seams
- Story tests T009-T013, T019-T021, and T026-T028 can be created in parallel within their user story phases
- Story implementation tasks marked [P] can overlap safely when they touch different files and do not depend on each other

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational tasks
2. Implement User Story 1 tests and calculation path
3. Validate the positive-rate schedule and 480-month performance case
4. Stop and confirm the core CLI contract before adding zero-rate and validation-edge work

### Incremental Delivery

1. Complete US1 fixed-rate validation and calculation path
2. Add US2 zero-interest calculation and final-payment adjustment
3. Add US3 input validation and structured error handling
4. Run final lint/test/audit gates and close the feature

---

## Validation Checklist

- [ ] All tasks follow the required checklist format: `- [ ] T### ...`
- [ ] Each user story phase includes tests before implementation tasks
- [ ] Every task includes a requirement or acceptance reference (for example `AC-003`, `FR-005`, `NFR-002`)
- [ ] Every task includes an exact file path or file set in its description
- [ ] Task numbering is sequential and non-duplicated
