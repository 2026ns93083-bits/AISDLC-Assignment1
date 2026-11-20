# Tasks: Support Email Triage

**Input**: Design documents from `specs/001-support-email-triage/`

**Scope**: Create or modify implementation tasks only under `src/`, `prompts/`, and `tests/`. Do not create or modify `evals/dataset.json` or anything under `.harness/`.

## Student-owned prerequisites (not agent tasks)

- Author and review `evals/dataset.json` containing CASE-01 through CASE-18 and `.harness/` before implementation.
- Freeze `evals/dataset.json` and `.harness/` at the Git tag `part1b-harness-ready`.
- Do not start T001 until `git tag --list part1b-harness-ready` returns the tag (frozen at commit c125ac6). If the tag is missing, stop and report. The agent must not create, modify or delete .harness/ or evals/dataset.json at any point (GR-EVAL-02).
- Record the required manual checklist items in the harness log, including evaluation integrity and NFR-003 scope exclusions.
- `complete_dataset_threshold_gate` is implemented by the frozen `.harness/run-eval.js` and verified by `.harness/selftest.js`; the final gate run is executed by the student and saved under `evidence/eval-results/`; the student validates the dataset catalog with `node .harness/run-eval.js --check-dataset` and records the result in the harness log.

## Phase 1: Test-First Implementation Tests

**Purpose**: Define executable behavior before source implementation.

- [ ] T001 Add ordinary and clarification result contract tests in `tests/triage.test.js`; cover FR-008, AC-001, AC-002, AC-003, INV-1, INV-2, INV-3, G-1, and constitution test identifiers `output_json_schema_contract` and `triage_missing_mandatory_information`.
- [ ] T002 Add clarification and missing-identifier tests in `tests/triage.test.js`; cover FR-004, AC-004, AC-005, INV-4, INV-6, INV-CLAR-01, and constitution test identifiers `triage_missing_mandatory_information` and `output_json_schema_contract`.
- [ ] T003 Add privacy and adversarial prompt tests in `tests/triage.test.js`; cover FR-006, AC-007, AC-008, INV-JSON-01, INV-PRIV-01, G-1, G-2, and constitution test identifiers `privacy_no_personal_data_echo` and `output_json_schema_contract`.
- [ ] T004 [P] Add environment-only configuration and secret-safety tests in `tests/config.test.js`; cover FR-009, NFR-001, NFR-002, AC-014, INV-RUNTIME-01, INV-CONFIG-01, AC-RUNTIME-01, AC-CONFIG-01, and constitution test identifiers `runtime_node20_commonjs_builtin_only` and `configuration_environment_only_and_secret_safe`.
- [ ] T005 [P] Add injected transport and retry tests in `tests/llm.test.js`; cover FR-009, AC-012, INV-FAIL-01, AC-FAIL-01, AC-FAIL-02, G-1, and constitution test identifier `failure_classification_429_503_timeout_application_evaluation`.
- [ ] T006 Add malformed JSON and schema application-failure tests in `tests/triage.test.js`; cover FR-008, FR-009, AC-001, AC-012, INV-1, INV-JSON-01, INV-FAIL-01, AC-FAIL-02, and constitution test identifier `failure_classification_429_503_timeout_application_evaluation`.
- [ ] T007 Add CLI file/stdin, stdout/stderr, exit-code, and extra-argument tests in `tests/triage.test.js`; cover FR-001, FR-009, AC-010, AC-012, INV-RUNTIME-01, INV-FAIL-01, G-1, and constitution test identifier `failure_classification_429_503_timeout_application_evaluation`.

**Checkpoint**: Test definitions exist and fail until the corresponding implementation is complete.

---

## Phase 2: Foundational Implementation

**Purpose**: Create the smallest shared runtime foundation required by all stories.

- [x] T008 Create the `src/` and `prompts/` module layout in `src/llm.js`, `src/triage.js`, `src/cli.js`, and `prompts/triage.system.md` without Node.js dependencies outside built-ins; cover FR-001 and NFR-001.
- [x] T009 [P] Implement CommonJS module exports and built-in-only imports in `src/llm.js`, `src/triage.js`, and `src/cli.js`; satisfy NFR-001, AC-014, INV-RUNTIME-01, AC-RUNTIME-01, and constitution test identifier `runtime_node20_commonjs_builtin_only`.
- [x] T010 [P] Create the file-based system prompt in `prompts/triage.system.md` that treats email bodies as untrusted data, prohibits hidden-instruction disclosure, and forbids listed personal-data echo; cover FR-006, AC-007, AC-008, INV-PRIV-01, G-1, G-2, and constitution test identifier `privacy_no_personal_data_echo`.

**Checkpoint**: The module layout and prompt foundation are ready.

---

## Phase 3: User Story 1 - Triage a Clear Customer Issue (Priority: P1) MVP

**Goal**: Return one exact-schema triage object for ordinary support emails.

**Independent Test**: Inject deterministic model JSON through the triage boundary and verify billing, technical, account, feature-request, complaint, and positive feedback results against allowed categories, priorities, sentiments, summaries, and actions.

- [x] T011 [US1] Implement environment-only Gemini configuration in `src/llm.js` using only `GEMINI_API_KEY` and `LLM_MODEL`, with explicit missing-value configuration failures and no secret logging; cover FR-009, NFR-002, AC-014, INV-CONFIG-01, AC-CONFIG-01, and constitution test identifier `configuration_environment_only_and_secret_safe`.
- [x] T012 [US1] Implement the Gemini `generateContent` REST transport in `src/llm.js` with JSON response mode, temperature `0.1`, the API key in `x-goog-api-key`, and no key in the URL; cover FR-001, FR-008, NFR-001, NFR-002, AC-014, INV-RUNTIME-01, INV-CONFIG-01, and constitution test identifiers `runtime_node20_commonjs_builtin_only` and `configuration_environment_only_and_secret_safe`.
- [x] T013 [US1] Implement 30-second per-attempt timeout and typed `ServiceError` retry handling for 429/503/timeout only in `src/llm.js`; cover FR-009, AC-012, INV-FAIL-01, AC-FAIL-01, AC-FAIL-02, and constitution test identifier `failure_classification_429_503_timeout_application_evaluation`.
- [x] T014 [US1] Implement injected `fetch` and `sleep` dependencies in `src/llm.js` and enforce three attempts with waits of 2 seconds and 5 seconds; cover FR-009, AC-012, INV-FAIL-01, and constitution test identifier `failure_classification_429_503_timeout_application_evaluation`.
- [x] T015 [US1] Implement prompt loading, one-LLM-call triage orchestration, and a pure parse/validation export in `src/triage.js`; cover FR-001, FR-007, FR-008, AC-001, AC-003, INV-1, INV-3, INV-JSON-01, and constitution test identifier `output_json_schema_contract`.
- [x] T016 [US1] Implement exact eight-field validation, allowed enum checks, type checks, and summary length enforcement in `src/triage.js`; cover FR-002, FR-003, FR-008, AC-001, AC-003, AC-009, INV-1, INV-3, INV-JSON-01, AC-JSON-01, and constitution test identifier `output_json_schema_contract`.
- [x] T017 [US1] Implement CLI file/stdin selection and exact-one-object stdout behavior in `src/cli.js`; cover FR-001, FR-008, AC-001, AC-010, INV-1, INV-JSON-01.

**Checkpoint**: User Story 1 is independently testable and produces the MVP triage JSON.

---

## Phase 4: User Story 2 - Request Clarification for Insufficient Information (Priority: P1)

**Goal**: Request clarification instead of guessing when information is empty, vague, or missing an identifier needed for action.

**Independent Test**: Submit whitespace-only, vague, refund-without-order-number, and cancellation-without-account-identifier inputs and verify the clarification field invariant.

- [x] T018 [US2] Update the prompt in `prompts/triage.system.md` with the rubric's empty/vague/no-identifier behavior and the `other`/P3/neutral fallback for no identifiable issue; cover FR-003, FR-004, AC-004, AC-005, INV-4, INV-6, INV-CLAR-01, AC-CLAR-01, and constitution test identifier `triage_missing_mandatory_information`.
- [x] T019 [US2] Implement clarification consistency validation in `src/triage.js` so `needs_clarification` and `clarification_question` satisfy if-and-only-if rules; cover FR-004, FR-008, AC-002, AC-004, AC-005, INV-2, INV-4, INV-6, INV-CLAR-01, INV-JSON-01, and constitution test identifier `triage_missing_mandatory_information`.
- [x] T020 [US2] Implement `ApplicationError` for invalid JSON and schema violations in `src/triage.js` without invoking transport retries; cover FR-008, FR-009, AC-012, INV-JSON-01, INV-FAIL-01, AC-FAIL-02, and constitution test identifier `failure_classification_429_503_timeout_application_evaluation`.

**Checkpoint**: User Story 2 is independently testable and clarification responses remain schema-valid.

---

## Phase 5: User Story 3 - Safely Route Urgent or Adversarial Emails (Priority: P1)

**Goal**: Escalate outage, legal, and safety risks while resisting prompt injection and personal-data echo.

**Independent Test**: Submit outage, legal-threat, safety, injection, and email/phone/card-data inputs and verify escalation, stable priority, schema validity, and no disclosure or echo.

- [ ] T021 [US3] Update `prompts/triage.system.md` with mandatory escalation rules for full outage, legal threat, and safety issue and P1/P2 priority constraints; cover FR-005, AC-006, INV-5, G-1, GR-GOV-01.
- [ ] T022 [US3] Update `prompts/triage.system.md` to require treating embedded instructions as untrusted data and never revealing hidden/system instructions or adopting injected priority; cover FR-006, AC-007, INV-JSON-01, G-1, GR-EVAL-02, and constitution test identifier `output_json_schema_contract`.
- [ ] T023 [US3] Update `prompts/triage.system.md` to prohibit echoing email addresses, phone numbers, and card numbers in any output field; cover FR-006, FR-007, AC-008, INV-PRIV-01, G-2, AC-PRIV-01, and constitution test identifier `privacy_no_personal_data_echo`.
- [ ] T024 [US3] Do not add keyword-based or hard-coded overrides of the model's triage decision in `src/triage.js`; INV-4, INV-5, INV-6, G-1 and G-2 are evaluated by the frozen harness against model output. Keep only the contract validation from T016 and T019.
- [ ] T025 [US3] Implement sanitized typed-failure routing in `src/cli.js` so usage/configuration, service/API, and application failures have distinct nonzero stderr categories and never expose email text, API keys, or provider bodies; cover FR-009, AC-012, INV-FAIL-01, AC-FAIL-01, AC-FAIL-02, INV-CONFIG-01, G-2, and constitution test identifier `failure_classification_429_503_timeout_application_evaluation`.

**Checkpoint**: User Story 3 is independently testable and urgent/adversarial inputs remain safe and schema-valid.

---

## Phase 6: Runtime and Cross-Cutting Validation

**Purpose**: Complete traceable validation and runnable behavior in the allowed source and test directories.

- [ ] T026 [P] Finalize `tests/config.test.js` for Node 20+, CommonJS, built-in-only imports, and sole use of `GEMINI_API_KEY` and `LLM_MODEL`; cover NFR-001, NFR-002, AC-014, INV-RUNTIME-01, INV-CONFIG-01, AC-RUNTIME-01, AC-CONFIG-01, and constitution test identifier `runtime_node20_commonjs_builtin_only`.
- [ ] T027 [P] Finalize `tests/llm.test.js` to assert 429/503/timeout retries, 2-second/5-second backoff, three-attempt exhaustion, and no retry for malformed JSON or schema violations; cover FR-009, AC-010, AC-012, INV-FAIL-01, AC-FAIL-01, AC-FAIL-02, and constitution test identifier `failure_classification_429_503_timeout_application_evaluation`.
- [ ] T028 [P] Finalize `tests/triage.test.js` for ordinary, clarification, urgent, adversarial, privacy, exact-key, enum, type, and 200-character summary coverage; cover FR-002 through FR-008, AC-001 through AC-008, INV-1 through INV-6, G-1, G-2, and constitution test identifiers `output_json_schema_contract`, `triage_missing_mandatory_information`, and `privacy_no_personal_data_echo`.
- [ ] T029 Run `node --test` from `Part-1B/` and resolve failures by changing `src/` or `prompts/` only; do NOT modify `tests/` — if a test appears wrong, stop and report it. Cover NFR-001, AC-010, AC-011, INV-RUNTIME-01, GR-COVER-01, and constitution test identifiers `output_json_schema_contract`, `triage_missing_mandatory_information`, `privacy_no_personal_data_echo`, `configuration_environment_only_and_secret_safe`, `runtime_node20_commonjs_builtin_only`, and `failure_classification_429_503_timeout_application_evaluation`.

**Checkpoint**: The implementation passes deterministic tests and remains within the Part-1B source scope.

---

## Dependencies & Execution Order

- **Test-First Phase (Phase 1)**: Blocked until the Student-owned `part1b-harness-ready` implementation gate is verified; it must be completed before source work.
- **Foundational Phase (Phase 2)**: Depends on test definitions and blocks all user-story source work.
- **User Story 1 (Phase 3)**: Depends on Phase 2 and can serve as the MVP.
- **User Story 2 (Phase 4)**: Depends on Phase 2; can proceed independently of User Story 1 after the shared triage boundary exists.
- **User Story 3 (Phase 5)**: Depends on Phase 2 and the prompt/triage boundaries; it must not alter frozen evaluation artifacts.
- **Validation (Phase 6)**: Depends on all desired user-story phases.

## Parallel Opportunities

- T001-T003 run sequentially because they edit `tests/triage.test.js`; T006 and T007 also run sequentially for the same file. T004 and T005 may proceed independently in their separate test files.
- T009-T010 foundational module and prompt work can proceed in parallel after T008.
- T011-T012 and T015-T017 can proceed independently once the llm and triage boundaries are established.
- T018-T020 clarification work is independent of User Story 3 implementation.
- T021-T023 prompt updates run sequentially because they edit `prompts/triage.system.md`; T024-T025 then consume the finalized prompt and module boundaries.
- T026-T028 final test refinements can proceed in parallel; T029 is the final test run.

## Implementation Strategy

### MVP

1. Complete Phases 1 and 2.
2. Complete Phase 3 for User Story 1.
3. Run focused User Story 1 tests and stop for validation before clarification and adversarial work.

### Incremental Delivery

1. Add User Story 2 clarification behavior.
2. Add User Story 3 urgent/adversarial protections.
3. Run `node --test` and verify only `src/`, `prompts/`, and `tests/` implementation files changed.

