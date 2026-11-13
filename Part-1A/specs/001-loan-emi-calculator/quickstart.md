# Quickstart: Loan EMI & Amortization Calculator

## Prerequisites

- Node.js 20 and npm
- Install project development dependencies once with `npm install`

There are no runtime dependencies.

## Validate the feature

Run all built-in unit and CLI tests:

```sh
npm test
```

Run lint checks:

```sh
npm run lint
```

Check dependency advisories:

```sh
npm audit
```

## Run a successful calculation

```sh
node src/cli.js 1000 0 3
```

Expected output is one JSON object. Its regular `emi` is `333.33`, interest is
zero, total payment is `1000`, and its schedule payments are `333.33`, `333.33`,
and `333.34`, with a final balance of `0`. The process exits 0.

## Verify an input error

```sh
node src/cli.js 1000 0 3.5
```

Expected output is one JSON error object with non-empty `code` and `message`
fields; the process exits 1. There must be no non-JSON text on stdout.

## Acceptance coverage

Tests in `tests/*.test.js` should include the applicable AC ID in each
acceptance test name:

- `AC-001`: inclusive input boundaries and schedule lengths.
- `AC-002`: zero-interest payment and final adjustment.
- `AC-003`: positive-rate 12-month schedule and internal reconciliation.
- `AC-004`: each invalid-input class, exact error shape, and exit status.
- `AC-005`: schedule sums, zero final balance, and non-negative balances across
  representative and boundary loans.
- `AC-006`: half-up ties and values on either side of ties.
- `AC-007`: complete 480-period calculation under one second.
- `AC-008`: valid JSON only on stdout for both success and error.

See the [CLI contract](./contracts/cli.md) for the exact invocation and output
shapes, and the [data model](./data-model.md) for entity and rounding rules.
