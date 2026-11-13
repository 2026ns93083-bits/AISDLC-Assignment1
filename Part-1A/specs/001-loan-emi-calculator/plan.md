# Implementation Plan: Loan EMI & Amortization Calculator

**Branch**: `001-loan-emi-calculator` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

## Summary

Build a deterministic Node.js 20 command-line calculator that accepts principal,
annual nominal interest rate, and whole-month tenure, then emits a JSON EMI
summary and complete amortization schedule. Use CommonJS and no runtime
dependencies. Keep validation, pure calculation, and argument/output handling
separate in `src/validate.js`, `src/emi.js`, and `src/cli.js`; verify behavior
with `node:test` and lint with ESLint plus its security plugin.

The calculation will parse the validated decimal rate as an exact rational and
use native `BigInt` arithmetic for the annuity formula and monetary rounding.
Represent schedule values as integer cents, round the regular EMI and each
period's interest half-up at their specified boundaries, and adjust only the
final payment to settle the opening balance plus that period's interest. This
follows FR-009 through FR-012 without relying on binary floating-point
correction or allowing rounding residue to accumulate in the balance ledger.

## Technical Context

**Language/Version**: Node.js 20, CommonJS
**Primary Dependencies**: None at runtime; development dependencies only:
`eslint`, `@eslint/js`, `globals`, and `eslint-plugin-security`
**Storage**: None
**Testing**: Node.js `node:test` and `node:assert/strict`
**Target Platform**: Node.js 20-supported platforms
**Project Type**: Standalone command-line application
**Performance Goals**: A complete 480-month calculation in under one second
**Constraints**: Exactly three positional inputs; specified inclusive value
ranges; JSON-only stdout; two-decimal monetary precision; half-up rounding;
final balance exactly zero; no database, UI, conversion, prepayment, or
variable-rate support
**Scale/Scope**: One loan calculation per process invocation, at most 480
schedule entries

## Constitution Check

*Gate: evaluated before research and again after design.*

| Principle / gate | Plan compliance |
|---|---|
| I. Node.js 20 and CommonJS | Pass: Node.js 20, CommonJS modules, no production dependencies. |
| II. Financial Calculation Accuracy | Pass: define half-up rounding at monetary boundaries; retain cents as integer ledger values; test exact ties and values on either side. |
| III. Validated Inputs and Explicit Errors | Pass: validate all raw arguments before calculation; expose only `code` and `message` within the error response; emit JSON and exit 1. |
| IV. Pure Business Logic and CLI Separation | Pass: calculation and validation are side-effect-free modules; argument parsing, serialization, and process exit handling stay in `cli.js`. |
| V. Measurable Quality and Simplicity | Pass: `node:test`, AC-ID-bearing test names, ESLint recommended/security rules, and `npm audit`; no added runtime abstraction or dependency. |
| Additional constraints | Pass: no secrets or machine-specific paths; avoid intermediate monetary rounding other than the specified boundaries. |
| Quality gates | Pass by design: run targeted/full feature tests, ESLint, and `npm audit` during implementation. |

No constitution violations or exceptions are required.

## Design Decisions

- **Three-module boundary**: `src/validate.js` validates the exact positional
  arguments and returns a normalized input or a structured validation error;
  `src/emi.js` accepts normalized values and returns a calculation result without
  I/O; `src/cli.js` owns `process.argv`, JSON serialization, and exit status.
- **Money representation**: hold schedule balances, rounded instalments,
  period interest, period principal, and totals as integer cents using `BigInt`.
  Convert cents to JSON number amounts only when assembling the result. The
  specified maxima keep output cents within JavaScript's safe-integer range.
- **Exact decimal arithmetic**: parse the validated annual-rate decimal string
  into a rational numerator and denominator, reduce the ratio, and calculate
  the annuity factor and monthly interest with `BigInt`. For a nonnegative
  rational amount `n/d`, round to cents by quotient and remainder, incrementing
  when twice the remainder is at least the denominator. This implements
  half-up exactly; it avoids binary floating-point error and does not bias
  values below or above a tie. Avoid any unapproved input-precision limit;
  performance tests should include the required 480-period case.
- **Schedule and final payment**: round each period's interest to cents before
  deriving principal. For non-final periods, apply the regular rounded EMI;
  for the final period, pay the remaining opening balance plus rounded
  interest. Sum actual schedule payments and period interest for totals, and
  report the regular EMI separately at the top level.
- **Validation and error contract**: require exactly three arguments; validate
  finite decimal syntax, the principal's maximum of two fractional digits,
  each inclusive range, and whole-month tenure. Return stable non-empty error
  codes/messages and no partial calculation.
- **Tooling**: use Node.js built-ins for runtime and tests. The only declared
  development dependencies are ESLint, `@eslint/js`, `globals`, and
  `eslint-plugin-security`; configure ESLint with recommended and security
  rules, and provide npm scripts for tests and lint. No database or
  environment-specific configuration is needed.
- **Serialization boundary**: convert safe integer cents to JSON number amounts
  only after calculation. Keep BigInt values internal because JSON does not
  serialize BigInt directly.

## Project Structure

### Documentation (this feature)

```text
specs/001-loan-emi-calculator/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── cli.md
└── quickstart.md
```

### Source Code (repository root)

```text
src/
├── emi.js
├── validate.js
└── cli.js

tests/
├── validate.test.js
├── emi.test.js
└── cli.test.js

package.json
eslint.config.js
```

**Structure Decision**: Use one CommonJS CLI project at the repository root.
The three requested source modules define the calculation, validation, and
process-facing boundaries. Node's built-in test runner exercises these modules
without a runtime or test-framework dependency.

## Complexity Tracking

No constitution violations; no complexity exceptions are requested.
