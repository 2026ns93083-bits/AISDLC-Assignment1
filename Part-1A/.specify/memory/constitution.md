<!--
Sync Impact Report
Version change: unversioned scaffold -> 1.0.0
Modified principles: unfilled Principle 1 -> Node.js 20 and CommonJS;
  unfilled Principle 2 -> Financial Calculation Accuracy;
  unfilled Principle 3 -> Validated Inputs and Explicit Errors;
  unfilled Principle 4 -> Pure Business Logic and CLI Separation;
  unfilled Principle 5 -> Measurable Quality and Simplicity.
Added sections: Additional Constraints; Quality Gates.
Removed sections: None.
Follow-up TODOs: None.
-->
# Loan EMI & Amortization Calculator Constitution

## Core Principles

### I. Node.js 20 and CommonJS
The application MUST run on Node.js 20 and use CommonJS modules. Production code
MUST have no runtime dependencies. Any proposed runtime dependency requires a
constitution amendment before it is added. This fixed baseline keeps deployment
and execution predictable.

### II. Financial Calculation Accuracy
All monetary values MUST be rounded half-up to exactly two decimal places at
defined calculation and presentation boundaries. Tests MUST cover ordinary
values, exact half-cent ties, and values immediately above and below ties.
Financial outputs MUST be deterministic for the same valid inputs.

### III. Validated Inputs and Explicit Errors
Every external input MUST be validated before it affects a calculation. Invalid
input MUST produce a structured error with exactly the public fields `code` and
`message`; the CLI MUST report the error and exit with status code 1. Validation
MUST identify the invalid field or constraint without exposing secrets or
producing a successful-looking result.

### IV. Pure Business Logic and CLI Separation
Business logic MUST live in `src/` as pure functions: for the same arguments,
functions return the same result and perform no input/output, filesystem,
environment, or process side effects. CLI input/output and process exit handling
MUST remain separate from those functions. This separation makes financial
behavior independently testable.

### V. Measurable Quality and Simplicity
Tests MUST use Node.js `node:test` and `node:assert/strict`. Every acceptance
criterion MUST map to at least one test whose name includes that criterion's
AC ID. ESLint with recommended and security rules MUST pass with zero errors.
`npm audit` MUST report no high- or critical-severity vulnerabilities.
Implementations MUST prefer the simplest maintainable design that satisfies
these requirements; added complexity MUST have a documented need.

## Additional Constraints

The project MUST NOT hard-code secrets, credentials, or machine-specific paths.
Configuration that varies by environment MUST be provided at runtime or through
environment-neutral project configuration. Monetary calculations MUST avoid
intermediate rounding that changes the defined half-up result.

## Quality Gates

Before a change is considered complete, run the relevant `node:test` tests,
ESLint, and `npm audit` checks. A change that affects an acceptance criterion
MUST include or update a test named with its AC ID. Reviewers MUST verify the
structured invalid-input error and CLI exit status for changed validation paths,
and MUST verify monetary rounding behavior for changed calculation paths.

## Governance

This constitution governs implementation and review of the Loan EMI &
Amortization Calculator. Amendments MUST be made in a reviewed change that
states the rationale and impact on existing requirements. Any conflict between
this constitution and lower-level project guidance MUST be resolved in favor of
this constitution unless the constitution is amended.

Versioning follows semantic versioning: MAJOR for incompatible changes to
governance requirements, MINOR for new principles or materially expanded
requirements, and PATCH for clarifications and non-semantic wording changes.
Every amendment MUST update the version and last-amended date. Compliance MUST
be reviewed for each change by checking the applicable tests, lint, dependency
audit, and the requirements affected by the change.

**Version**: 1.0.0 | **Ratified**: 2026-11-14 | **Last Amended**: 2026-11-14
