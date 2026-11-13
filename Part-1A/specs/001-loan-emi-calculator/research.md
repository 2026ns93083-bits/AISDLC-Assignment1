# Research: Loan EMI & Amortization Calculator

## Decision: Use a pure CommonJS calculation module

**Decision**: Implement the EMI and schedule calculation in `src/emi.js` as a
pure function, with validation and CLI concerns in their own modules.

**Rationale**: The constitution requires deterministic, side-effect-free
business logic and Node.js 20/CommonJS. Separating the CLI makes all monetary
behavior directly testable without subprocess or I/O setup.

**Alternatives considered**: A single CLI module was rejected because it mixes
process concerns into financial calculations. An external calculation
dependency was rejected because runtime dependencies are prohibited and the
bounded formula and schedule are straightforward to test directly.

## Decision: Keep money in integer cents and decimal inputs as exact ratios

**Decision**: Parse the validated decimal rate string into an exact rational
numerator/denominator and use native `BigInt` for the annuity formula,
per-period interest, integer-cent balances, and aggregates. Convert cents to
JSON number amounts only when assembling the public result.

**Rationale**: Repeatedly updating a binary floating-point balance can create
residual cents or negative final balances. Integer cents make schedule
reconciliation exact and keep all monetary outputs at the required precision.
Exact rational arithmetic also lets half-up rounding distinguish a mathematical
tie from a value just below or above it. `BigInt` is built into Node.js and
avoids introducing a runtime dependency. The specified value and tenure maxima
keep returned cent totals within JavaScript's safe-integer range.

**Alternatives considered**: Keeping all schedule state as decimal-looking
`Number` amounts was rejected because binary representation can misclassify
ties and accumulate residual error. Using `Number` plus a fixed or
magnitude-scaled epsilon was rejected because a tolerance can round a truly
below-tie value upward. Adding a decimal arithmetic runtime package was rejected
by the no-runtime-dependencies constraint.

## Decision: Isolate half-up rounding at specified monetary boundaries

**Decision**: Compute the regular EMI from the unrounded level-payment formula
as an exact rational, round it half-up once to cents, and retain it as integer
cents. Calculate each period's interest from the opening balance and exact
monthly-rate ratio, then round that interest half-up before deriving principal.
In the zero-rate case, divide principal by tenure before the same half-up cents
rounding. Centralize rational-to-cents rounding: divide numerator by
denominator, then increment the quotient if twice the remainder is greater
than or equal to the denominator.

**Rationale**: This preserves the boundaries specified by FR-006 and FR-009
while preventing accidental intermediate rounding. Exact integer arithmetic
avoids the IEEE-754 binary64 approximation used by JavaScript `Number` for
decimal fractions. `Number.EPSILON` describes spacing near 1, not a universal
rounding tolerance; adding a fixed or scale-adjusted tolerance can change a
value on the wrong side of a tie. See [MDN BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt),
[MDN Number encoding](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number#number_encoding),
and [MDN Number.EPSILON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/EPSILON).
Tests should exercise exact half-cent cases and values on both sides, including
interest and EMI at the upper supported principal scale.

**Alternatives considered**: Rounding every intermediate formula operation was
rejected because FR-009 requires the regular EMI to be computed from unrounded
values. Using `Math.round(value * 100)`, `toFixed`, parsing a computed
`Number`'s string, or adding epsilon was rejected because none recovers exact
decimal intent after binary floating-point operations. A decimal arithmetic
dependency was rejected by the runtime dependency constraint.

## Decision: Keep exact-ratio size proportional to supplied decimal precision

**Decision**: Do not add a maximum rate precision not present in the approved
specification. Parse only the accepted decimal token, reduce the rational
numerator/denominator, and use exponentiation by squaring for the bounded
tenure when evaluating the annuity factor.

**Rationale**: The input specification accepts finite decimal rates without
stating a decimal-place limit. Imposing a new cap would change the public
validation contract. Ratio reduction and exponentiation by squaring keep
ordinary inputs efficient while preserving exact half-up semantics.

**Alternatives considered**: Adding an arbitrary decimal-place cap was rejected
because it would be a new input restriction. Falling back to `Number` at a
high precision threshold was rejected because it would make rounding behavior
depend on the input's representation and could violate AC-006.

## Decision: Adjust only the final instalment

**Decision**: In each non-final period, calculate rounded interest from the
opening balance, allocate the regular rounded instalment's remainder to
principal, and reduce the balance by that principal. In the final period, set
principal to the remaining opening balance and payment to that balance plus
final-period interest.

**Rationale**: This yields an exact zero final balance, prevents an overpayment
or residual due solely to regular-payment rounding, and conforms to FR-010 and
FR-011. Totals can then be computed as sums of the actual schedule entries,
conforming to FR-012.

**Alternatives considered**: Applying the regular instalment unchanged for all
periods was rejected because it can leave a residual or overshoot the balance.
Adjusting earlier payments was rejected because the specification permits a
final-period adjustment and expects a regular EMI.

## Decision: Validate raw CLI strings before calculation

**Decision**: Accept exactly three positional decimal arguments, validate syntax
and field constraints before invoking the calculator, and return a structured
error for any invalid invocation.

**Rationale**: `Number()` alone accepts forms such as empty strings and
non-decimal numeric representations that are not useful for a predictable
positional contract. Explicit parsing provides deterministic malformed-input,
finite-number, decimal-precision, and range checks before business logic runs.

**Alternatives considered**: Permissive JavaScript number coercion was rejected
because it can silently accept malformed or ambiguous values. Option flags
were excluded because the approved spec explicitly defines three positional
inputs.

## Decision: Use built-in tests and development-only lint tooling

**Decision**: Use `node:test` and `node:assert/strict`; use ESLint recommended
and security rules with only `eslint`, `@eslint/js`, `globals`, and
`eslint-plugin-security` as development dependencies.

**Rationale**: The built-in test runner satisfies the constitution without a
test framework dependency. The requested development toolchain satisfies the
security lint gate while leaving runtime installation dependency-free.

**Alternatives considered**: Third-party test runners and runtime validation or
decimal packages were rejected as unnecessary for this small CLI and/or
inconsistent with the stated dependency constraint.
