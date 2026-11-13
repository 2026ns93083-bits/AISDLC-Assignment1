# CLI Contract

## Invocation

```text
node src/cli.js <principal> <annualRatePercent> <tenureMonths>
```

Arguments are exactly three positional decimal values, in the order shown.
Principal is from 1 through 100,000,000 with no more than two fractional
digits; a principal with more than two fractional digits is invalid. Annual
rate is a percentage from 0 through 50; tenure is an integer from 1 through
480. All ranges are inclusive.

## Successful response

On valid input, stdout contains one JSON object with exactly these fields:

```json
{
  "emi": 1,
  "total_interest": 0,
  "total_payment": 1,
  "schedule": [
    {
      "month": 1,
      "emi": 1,
      "interest": 0,
      "principal": 1,
      "balance": 0
    }
  ]
}
```

This is the response for `node src/cli.js 1 0 1`. An actual schedule has exactly
the requested number of entries, each with exactly `month`, `emi`, `interest`,
`principal`, and `balance`. All money fields are JSON numbers rounded to cents.
The top-level `emi` is the regular rounded instalment; the last schedule
payment may differ. `total_interest` and `total_payment` are sums of schedule
values. Exit status is 0.

## Invalid response

For invalid input, the code is selected from this closed list:

| Code | Invalid class |
|---|---|
| `INVALID_ARGUMENT_COUNT` | Missing or extra positional arguments. |
| `INVALID_PRINCIPAL` | Malformed principal, principal outside 1 through 100,000,000 inclusive, or more than two fractional digits. |
| `INVALID_RATE` | Malformed rate or rate outside 0 through 50 inclusive. |
| `INVALID_TENURE` | Malformed, fractional, or out-of-range tenure (1 through 480 inclusive). |

Non-finite numeric values are malformed values for their corresponding field.
stdout contains one JSON object with exactly the following shape:

```json
{
  "error": {
    "code": "INVALID_ARGUMENT_COUNT",
    "message": "A concise description of the invalid input or constraint."
  }
}
```

`code` and `message` are non-empty strings. Exit status is 1. No success-shaped
fields are returned for invalid input. No explanatory or diagnostic text is
written to stdout.

## Calculation invariants

- Monetary rounding is half-up: 0.005 -> 0.01, 0.0049 -> 0.00,
  0.0051 -> 0.01, and 2.675 -> 2.68.
- The annual nominal percentage rate is divided into 12 equal monthly periods.
- Period interest is calculated from the opening balance and rounded half-up
  to cents before deriving that period's principal.
- The final schedule payment pays the remaining opening balance and that
  period's interest; final principal equals the opening balance and final
  balance is exactly 0.00.
- No schedule balance is negative.
- JSON numeric serialization need not retain trailing zero characters.
