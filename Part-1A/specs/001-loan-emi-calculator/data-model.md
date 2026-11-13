# Data Model: Loan EMI & Amortization Calculator

The application is stateless: one invocation validates one loan and returns
one calculation result. Monetary amounts are exposed as JSON numbers rounded
to cents using round-half-up; for example, 0.005 -> 0.01, 0.0049 -> 0.00,
0.0051 -> 0.01, and 2.675 -> 2.68. Schedule working amounts and aggregates
are represented internally as integer cents. Rate decimals are retained as
exact rational values during calculation.

## Loan Inputs

| Field | Type at CLI boundary | Normalized type | Rules |
|---|---|---|---|
| principal | Decimal string | Integer cents | Required; 1 through 100,000,000 inclusive; at most two fractional decimal digits. |
| annual rate | Decimal string | Exact rational percentage | Required; 0 through 50 inclusive; nominal annual percentage rate, divided by 12 for each monthly period. |
| tenure | Decimal string | Integer | Required; whole number from 1 through 480 inclusive. |

Exactly three positional inputs are accepted, in principal, annual-rate, tenure
order. Missing or extra arguments, malformed or non-finite field values,
fractional tenure, and out-of-range values are invalid. A principal with more
than two fractional digits is invalid. No calculation result is created for
invalid inputs.

## Instalment

One schedule record represents a payment period.

| Field | Type | Meaning and rules |
|---|---|---|
| month | Integer | One-based period index, ascending from 1 to tenure. |
| emi | JSON number | Actual amount paid in the period, rounded to cents. Normally the regular rounded EMI; the final entry may be adjusted. |
| interest | JSON number | Interest for the period, computed from opening balance and monthly rate, rounded half-up to cents. |
| principal | JSON number | Amount applied to principal, rounded to cents. On the final period it equals the remaining opening balance. |
| balance | JSON number | Remaining principal after payment, rounded to cents; non-negative, and exactly zero in the final entry. |

For each entry, `emi = interest + principal`, and the closing balance is the
opening balance minus principal. Rounded monetary schedule values are
represented internally as integer cents to make these identities exact.

## Amortization Schedule

An ordered list of exactly `tenure` instalments. Interest is based on the
opening balance for that month. For zero interest, divide principal evenly by
the tenure before rounding the regular payment. The final instalment is set to
the remaining balance plus that period's interest, making final principal equal
the opening balance and final balance exactly zero.

## Calculation Result

| Field | Type | Meaning |
|---|---|---|
| emi | JSON number | Regular rounded EMI, even when the final scheduled payment differs. |
| total_interest | JSON number | Sum of all schedule interest amounts. |
| total_payment | JSON number | Sum of actual schedule payment amounts, including any final adjustment. |
| schedule | Array of Instalment | Complete ordered repayment schedule. |

The result has exactly these four top-level fields. Monetary totals are sums of
the rounded schedule values, not independently recomputed approximations.

## Input Error

An invalid invocation returns exactly:

```json
{
  "error": {
    "code": "INVALID_ARGUMENT_COUNT",
    "message": "A concise description of the invalid input or constraint."
  }
}
```

The `error` object has exactly the non-empty string fields `code` and `message`.
The code is selected from this closed mapping:

| Code | Invalid class |
|---|---|
| `INVALID_ARGUMENT_COUNT` | Missing or extra positional arguments. |
| `INVALID_PRINCIPAL` | Malformed, out-of-range, or more than two fractional digits. |
| `INVALID_RATE` | Malformed or out-of-range. |
| `INVALID_TENURE` | Malformed, fractional, or out-of-range. |

The message identifies the invalid field or constraint. The command exits
with status 1. Error wording is not otherwise prescribed.
