<!--
Sync Impact Report
Version change: 1.0.0 -> 1.0.1 (PATCH: runtime version clarification and verification-method clarification)
Modified principles: IV. Minimal, Explicit Runtime; V. Honest Evaluation and Simple Design (GR-EVAL-02)
Added sections: none
Removed sections: none
Modified workflow: GR-TRACE-01 / GR-COVER-01 coverage mapping and related manual review checklist requirements
Follow-up TODOs: none
-->

# Customer Support Email Triage Assistant Constitution

## Core Principles

### I. Privacy by Default
**INV-PRIV-01** The assistant MUST NOT echo personal data from input emails, including email addresses, phone numbers, or card numbers, in any output. This applies to triage fields, explanations, and clarification requests. The required test case is `privacy_no_personal_data_echo`; it MUST include examples of each listed data type.

### II. Clarify, Do Not Guess
**INV-CLAR-01** When information mandatory for a triage decision is missing or ambiguous, the assistant MUST ask for clarification instead of guessing. The clarification MUST itself conform to the output schema and MUST NOT expose personal data. The required test case is `triage_missing_mandatory_information`.

### III. Schema-Valid JSON Always
**INV-JSON-01** Every model response MUST be JSON conforming to the output schema, including responses that request clarification. The application MUST validate the response before returning it; malformed JSON or schema violations MUST be reported as application failures, not returned as successful triage. The required test is `output_json_schema_contract`, covering both ordinary triage and clarification.

### IV. Minimal, Explicit Runtime
**INV-RUNTIME-01** The application MUST run on Node.js 20 or later, use CommonJS, and have no runtime dependencies beyond Node.js built-in modules, including built-in `fetch`. Verify with `runtime_node20_commonjs_builtin_only`.

**INV-CONFIG-01** The API key and model name MUST be read only from `GEMINI_API_KEY` and `LLM_MODEL` environment variables. They MUST NOT be hard-coded, logged, or committed. The required test is `configuration_environment_only_and_secret_safe`.

### V. Honest Evaluation and Simple Design
**INV-FAIL-01** HTTP 429, HTTP 503, and request timeouts MUST be distinguishable as service/API failures. Application errors, such as invalid JSON or schema violations, and evaluation failures, such as incorrect results, MUST be reported separately. The required test is `failure_classification_429_503_timeout_application_evaluation`.

**INV-SIMPLE-01** Solutions MUST use the simplest design that satisfies these principles. Added complexity MUST be justified by a requirement or measured test result. Verify with the manual review checklist item `minimal_design_requirement_review`, recorded in the harness log.

**GR-EVAL-01** The feature specification MUST declare the numeric evaluation threshold and evaluation method before the final evaluation begins. Once declared, neither may be lowered or weakened to obtain a passing result. Verify with the manual review checklist item `evaluation_threshold_declared_and_unchanged`, recorded in the harness log.

**GR-EVAL-02** Before implementation starts, the student MUST author `.harness/` and `evals/dataset.json` and freeze them at a Git tag. After they are frozen, the coding agent MUST NOT create, modify, or delete either artifact. To obtain a PASS, the coding agent MUST NOT delete dataset cases, change expected results, lower thresholds, edit `.harness/`, or disable guardrails. Verify with the manual review checklist item `evaluation_integrity_no_case_or_guardrail_tampering`, recorded in the harness log.

## Technical and Runtime Constraints

- **AC-RUNTIME-01** The supported runtime is Node.js 20 or later and the module system is CommonJS. Runtime dependencies beyond built-in Node.js modules are not permitted. Verify with `runtime_node20_commonjs_builtin_only`.
- **AC-CONFIG-01** `GEMINI_API_KEY` and `LLM_MODEL` are the sole configuration sources for the API key and model name. Verify with `configuration_environment_only_and_secret_safe`; inspect logging and committed files for secrets as part of review.
- **AC-JSON-01** Every successful model response, including clarification responses, is valid JSON conforming to the output schema: 100% of evaluated responses. Verify with `output_json_schema_contract`.
- **AC-PRIV-01** Personal-data echo rate for email addresses, phone numbers, and card numbers from input is 0%. Verify with `privacy_no_personal_data_echo`.
- **AC-CLAR-01** All cases with missing or ambiguous mandatory information request clarification rather than guessing: 100% of those cases. Verify with `triage_missing_mandatory_information`.
- **AC-FAIL-01** Every injected HTTP 429, HTTP 503, and timeout is classified as a service/API failure, and application and evaluation failures remain separately identifiable. Verify with `failure_classification_429_503_timeout_application_evaluation`.

## Development and Evaluation Workflow

- **GR-TRACE-01** Every acceptance criterion, invariant, and guardrail MUST have a unique ID and map to at least one named dataset case, executable test, or applicable manual review checklist item recorded in the harness log. The feature specification MUST contain a traceability matrix with the ID, its dataset case, test, or checklist item, and the result. Unmapped requirements block final evaluation. Verify with the manual review checklist item `traceability_matrix_complete`, recorded in the harness log.
- **GR-COVER-01** Before final evaluation, executable tests or dataset cases MUST cover these technical identifiers: schema (`output_json_schema_contract`), privacy (`privacy_no_personal_data_echo`), clarification (`triage_missing_mandatory_information`), configuration (`configuration_environment_only_and_secret_safe`), runtime (`runtime_node20_commonjs_builtin_only`), failure classification (`failure_classification_429_503_timeout_application_evaluation`), and the complete-dataset threshold gate (`complete_dataset_threshold_gate`). These are the only identifiers requiring executable tests or dataset cases under this rule. The review-type identifiers `constitution_compliance_review`, `constitution_version_and_change_report`, `minimal_design_requirement_review`, and `traceability_matrix_complete` MUST instead be verified by a manual review checklist recorded in the harness log, not by automated tests. The evaluation-control identifiers `evaluation_threshold_declared_and_unchanged` and `evaluation_integrity_no_case_or_guardrail_tampering` MUST also be verified by manual checklist entries recorded in the harness log.
- **GR-EVAL-03** Before final evaluation, the feature specification MUST record the numeric threshold, evaluation method, and covered dataset version. Evaluation MUST use those frozen values and the complete dataset. Verify the declaration and integrity with the manual checklist items `evaluation_threshold_declared_and_unchanged` and `evaluation_integrity_no_case_or_guardrail_tampering`, recorded in the harness log.
- **AC-FAIL-02** Test output MUST distinguish service/API failures (including HTTP 429, HTTP 503, and timeouts), application failures, and evaluation failures. Verify with `failure_classification_429_503_timeout_application_evaluation`.
- **AC-PASS-01** A final PASS requires all mapped criteria, invariants, and guardrails to pass at the declared threshold. Report failures in their correct category; do not turn unavailable service results into application or evaluation passes. Verify with `complete_dataset_threshold_gate`.

## Governance

This constitution governs the Customer Support Email Triage assistant and supersedes conflicting project practices. **GR-GOV-01** Changes MUST be reviewed for privacy, output-contract, evaluation-integrity, and traceability impact. Any affected IDs and their mapped tests or dataset cases MUST be updated together. Verify with the manual review checklist item `constitution_compliance_review`, recorded in the harness log.

**GR-GOV-03** Constitution amendments MUST be documented and reviewed before adoption. Versioning follows semantic versioning: MAJOR for backward-incompatible governance changes or removal/redefinition of a principle; MINOR for a new principle or materially expanded guidance; PATCH for clarifications and non-semantic refinements. Every amendment MUST update the version and last-amended date and include a sync impact report. Verify with the manual review checklist item `constitution_version_and_change_report`, recorded in the harness log.

**GR-GOV-02** Every feature review MUST check the traceability matrix and applicable tests. Final evaluation review MUST confirm the threshold and method were declared in the specification before evaluation, remained unchanged, and were applied to the complete dataset without prohibited harness or guardrail changes. Verify with the manual review checklist item `constitution_compliance_review`, recorded in the harness log.

**Version**: 1.0.1 | **Ratified**: 2026-11-20 | **Last Amended**: 2026-11-20
