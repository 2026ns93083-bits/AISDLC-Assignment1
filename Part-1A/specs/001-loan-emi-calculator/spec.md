# Feature Specification: Loan EMI & Amortization Calculator

**Feature Branch**: `001-loan-emi-calculator`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "Build a command-line Loan EMI & Amortization Calculator. Inputs: principal, annual interest rate (percent), tenure in months. Outputs (JSON on stdout): emi, total_interest, total_payment, and a month-by-month schedule with month, emi, interest, principal, balance. Zero interest rate is supported. The last instalment is adjusted so the final balance is exactly 0.00. Valid ranges: principal 1 to 100,000,000; rate 0 to 50; tenure 1 to 480 whole months. Invalid input returns {\"error\":{\"code\":\"...\",\"message\":\"...\"}} and exit code 1. Define functional and non-functional requirements and measurable, binary acceptance criteria. Identify assumptions and unresolved questions. Exclude: UI, database, currency conversion, prepayment, variable rates."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Calculate a fixed-rate loan (Priority: P1)

A borrower supplies a principal, annual interest rate, and whole-month tenure to obtain the regular monthly instalment and a complete repayment schedule.

**Why this priority**: This is the core value of the calculator and the primary valid-input journey.

**Independent Test**: Run the command with valid positive-rate inputs and verify the JSON summary and every month of the schedule.

**Acceptance Scenarios**:

1. **Given** principal 120000, annual rate 12 percent, and tenure 12 months, **When** the borrower runs the calculator, **Then** stdout contains valid JSON with the EMI summary, totals, and exactly 12 schedule entries.
2. **Given** any valid positive-rate loan, **When** the borrower inspects each schedule entry, **Then** the entry's interest is based on the opening balance, its principal is the amount of the instalment applied to principal, and each balance follows from the preceding balance.

### User Story 2 - Calculate a zero-interest loan and settle the final balance (Priority: P1)

A borrower can calculate an interest-free loan and see a final adjusted instalment that pays the balance down exactly to zero.

**Why this priority**: Zero interest is an explicitly required case, and exact settlement prevents a residual balance caused by rounding.

**Independent Test**: Calculate principal 1000 at zero percent for 3 months; verify zero interest, a regular EMI of 333.33, and a final schedule instalment of 333.34 with balance 0.00.

**Acceptance Scenarios**:

1. **Given** principal 1000, annual rate 0 percent, and tenure 3 months, **When** the borrower runs the calculator, **Then** total interest is 0.00, total payment is 1000.00, and the final balance is 0.00.
2. **Given** any valid loan whose rounded regular instalments leave a cents-level residual, **When** the final schedule entry is produced, **Then** only the final instalment is adjusted by the remaining amount due and its balance is exactly 0.00.

### User Story 3 - Receive actionable input errors (Priority: P1)

A borrower who provides malformed or out-of-range values receives a structured error instead of a misleading calculation.

**Why this priority**: Financial results must not be produced from invalid values; the caller must be able to detect failure reliably.

**Independent Test**: Invoke the command with each invalid field and verify its exit status and JSON error shape.

**Acceptance Scenarios**:

1. **Given** a principal, rate, or tenure outside its allowed range or format, **When** the borrower runs the calculator, **Then** the process exits with status 1 and stdout contains one JSON object with an `error` object containing non-empty `code` and `message` fields.
2. **Given** valid values at all inclusive range boundaries, **When** the borrower runs the calculator, **Then** the input is accepted and a schedule of the requested length is returned.

### Edge Cases

- Principal is exactly 1 or 100,000,000; annual rate is exactly 0 or 50; tenure is exactly 1 or 480 months. Each inclusive boundary is accepted.
- A value just outside any range, a nonnumeric value, missing or extra positional arguments, or a fractional tenure is rejected with a structured error and exit status 1.
- Zero interest is calculated without dividing by the interest rate.
- The final instalment may differ from the regular EMI due to rounding and must settle the remaining balance without a negative balance.
- A one-month tenure produces one schedule entry, and its final balance is exactly 0.00.
- Calculations at half-cent ties use round-half-up; values immediately above and below ties round consistently.
- Output remains valid JSON when errors occur; diagnostic or explanatory text does not appear on stdout.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The command MUST accept exactly three positional inputs, in this order: principal, annual interest rate expressed as a percentage, and tenure in whole months.
- **FR-002**: The system MUST accept a principal from 1 through 100,000,000 inclusive, an annual rate from 0 through 50 inclusive, and an integer tenure from 1 through 480 inclusive.
- **FR-003**: The system MUST reject missing or extra inputs, malformed or non-finite numeric values, and values outside the specified ranges before calculating a result. A principal with more than two fractional digits MUST be rejected with `INVALID_PRINCIPAL`.
- **FR-004**: For invalid input, the command MUST write one JSON object to stdout with exactly the top-level `error` field and an error object with exactly the `code` and `message` fields. The `code` MUST be one of the closed set in the Error Contract and match the invalid input category, and `message` MUST identify the specific invalid value or constraint; both error fields MUST be non-empty strings, and the process MUST exit with status 1.
- **FR-005**: For valid input, the command MUST write one JSON object to stdout with exactly the fields `emi`, `total_interest`, `total_payment`, and `schedule`, and MUST exit with status 0.
- **FR-006**: The system MUST calculate a level-payment loan using the annual nominal rate divided into 12 equal monthly periods; at a zero annual rate it MUST divide principal evenly across the tenure before monetary rounding.
- **FR-007**: The schedule MUST contain exactly one entry per month, in ascending month order from 1 through the requested tenure. Each entry MUST contain exactly the numeric fields `month`, `emi`, `interest`, `principal`, and `balance`.
- **FR-008**: For each schedule entry, the system MUST calculate interest from the opening balance and monthly rate, allocate the remaining instalment to principal, and reduce the balance by the principal paid.
- **FR-009**: The system MUST round monetary amounts to two decimal places using round-half-up at the defined monetary calculation boundaries. Amounts exactly halfway between two cents round up (0.005 -> 0.01); values below the tie round down (0.0049 -> 0.00); values above the tie round up (0.0051 -> 0.01); and 2.675 rounds to 2.68. It MUST calculate the regular EMI from unrounded values, round it to cents, and calculate each period's interest to cents before deriving that period's principal.

### Calculation Rule Summary

- The regular EMI is computed from the unrounded monthly annuity formula.
- The regular EMI is then rounded half-up to two decimal places.
- Each month’s interest is calculated from the opening balance and monthly rate, then rounded half-up to two decimal places.
- The period principal is the actual payment for that month minus the rounded interest.
- For the final period only, the payment is adjusted so the remaining balance is exactly 0.00 after the rounded interest is applied.
- Total interest equals the sum of rounded schedule interest values, and total payment equals the sum of actual schedule payments.

- **FR-010**: The final schedule instalment MUST be adjusted to pay the remaining opening balance and that period's interest; the final principal MUST equal the remaining balance and the final balance MUST be exactly 0.00.
- **FR-011**: The top-level `emi` MUST report the regular rounded instalment; each schedule entry's `emi` MUST report the actual payment for that month, including any final-instalment adjustment.
- **FR-012**: `total_interest` MUST equal the sum of the schedule's monthly interest values, and `total_payment` MUST equal the sum of the actual schedule instalments, including the adjusted final instalment.
- **FR-013**: Successful and error responses MUST be machine-readable JSON on stdout with no other stdout content. All monetary values MUST be JSON numbers representing amounts rounded to cents.
- **FR-014**: The system MUST NOT provide a graphical user interface, database persistence, currency conversion, prepayment support, or variable-rate calculations.

### Non-Functional Requirements

- **NFR-001**: For identical valid inputs, the command MUST return identical JSON values and schedule entries on every run.
- **NFR-002**: A valid calculation, including a 480-month schedule, MUST complete within one second on a typical supported development machine.
- **NFR-003**: The command MUST distinguish success from invalid input through process exit status: 0 for a valid calculation and 1 for invalid input.
- **NFR-004**: Monetary output MUST use two-decimal-place precision and MUST NOT leave a nonzero final balance or a negative balance after the final instalment.

### Key Entities

- **Loan inputs**: The principal amount, annual percentage rate, and whole-month tenure used to calculate repayment.
- **Instalment**: A monthly payment consisting of an amount applied to interest and an amount applied to principal, with the remaining balance after payment.
- **Amortization schedule**: The ordered sequence of monthly instalments that accounts for the complete loan repayment.
- **Calculation result**: The regular EMI, aggregate interest, aggregate payments, and amortization schedule for one set of loan inputs.
- **Input error**: A stable machine-readable error code and human-readable message describing the invalid command input or constraint.

### Error Contract

- Valid error responses MUST contain exactly one top-level `error` object.
- The `error` object MUST contain exactly the fields `code` and `message`.
- `code` MUST be exactly one of these stable identifiers, mapped to the invalid class:
  - `INVALID_ARGUMENT_COUNT`: missing or extra positional arguments.
  - `INVALID_PRINCIPAL`: malformed, out-of-range, or more than two fractional digits.
  - `INVALID_RATE`: malformed or out-of-range.
  - `INVALID_TENURE`: malformed, fractional, or out-of-range.
- `message` MUST be non-empty and describe the invalid input or boundary violation.

## Success Criteria *(mandatory)*

### Measurable Outcomes and Binary Acceptance Criteria

- **AC-001**: Given valid inputs at each inclusive minimum and maximum, the command exits 0 and returns a schedule with exactly the requested number of entries; pass only if every boundary case is accepted.
- **AC-002**: Given principal 1000, rate 0, and tenure 3, the result reports regular `emi` 333.33, `total_interest` 0.00, `total_payment` 1000.00, schedule payments 333.33, 333.33, and 333.34, and final balance 0.00; pass only if every value matches.
- **AC-003**: Given principal 120000, rate 12, and tenure 12, the command exits 0, returns exactly 12 ordered schedule entries each with the five required fields, reports `emi` 10661.85, and has final balance 0.00; pass only if the schedule is complete and internally reconciles and both expected values match.
- **AC-004**: Given each invalid class—missing or extra arguments, malformed principal/rate/tenure, out-of-range principal/rate/tenure, principal with more than two fractional digits, and fractional tenure—the command exits 1 and emits valid JSON with exactly the specified error fields. It MUST return `INVALID_ARGUMENT_COUNT` for missing or extra arguments, `INVALID_PRINCIPAL` for malformed, out-of-range, or excessive-precision principal, `INVALID_RATE` for malformed or out-of-range rate, and `INVALID_TENURE` for malformed, fractional, or out-of-range tenure; pass only if every class returns its specified code and satisfies the error-shape and exit-status requirements.
- **AC-005**: For each of (1,0,1), (100000000,50,480), (120000,12,12), (1000,0,3), and (50000,7.5,36), the sum of schedule interest equals `total_interest`, the sum of schedule payments equals `total_payment`, and the final balance is exactly 0.00 with no negative schedule balance; pass only if all three invariants hold for all five loans.
- **AC-006**: For the rounding cases 0.005 -> 0.01, 0.0049 -> 0.00, 0.0051 -> 0.01, and 2.675 -> 2.68, pass only if each result matches round-half-up.
- **AC-007**: A valid 480-month calculation completes in under one second on a typical supported development machine; pass only if elapsed time is below the limit and a complete schedule is returned.
- **AC-008**: For valid and invalid invocations, stdout contains only one valid JSON value and no non-JSON text; pass only if both response types parse as JSON with the required shape.

## Assumptions

- The command receives exactly three positional arguments: principal, annual rate, and tenure; option flags are not part of this version.
- Principal is a positive monetary amount with no more than two fractional decimal digits. The annual rate may be a finite decimal percentage; tenure must be a whole-number decimal integer.
- The annual percentage rate is nominal and divided by 12 for each monthly period; payments are made monthly in arrears against a reducing balance.
- Monetary input and intermediate calculation values are retained without premature rounding; amounts are rounded half-up to cents at the calculation boundaries defined in FR-009.
- The summary `emi` is the regular instalment; if rounding requires a final adjustment, that adjusted payment is reported in the final schedule entry and included in `total_payment`.
- Monetary values in JSON are numbers; JSON numeric formatting need not preserve trailing zero characters, while values represent amounts rounded to cents.
- Error codes are stable identifiers for the error category and messages identify the invalid input or constraint; exact wording is not prescribed.
- Performance is evaluated on a typical supported development machine without a fixed hardware specification.

## Unresolved Questions

- None blocking specification. The argument convention, principal precision, nominal monthly rate treatment, and error-message flexibility are set as explicit defaults above and can be revised during clarification if needed.
