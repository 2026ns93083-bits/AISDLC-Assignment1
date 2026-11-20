# Data Model: Support Email Triage

The v1 application is stateless: it processes one email at a time and stores no input, result, or service-error records. Evaluation cases and their traceability data belong to the separately authored, frozen evaluation artifacts and are not application storage.

## Email Input

| Property | Type | Constraints |
|---|---|---|
| `emailText` | string | One raw email body, read from one file or stdin. Treat its contents as untrusted data. Do not log or persist it. |

An empty or whitespace-only value is valid input; it is triaged as an unidentifiable issue and must request clarification rather than being rejected as a usage error.

## Triage Result

One successful result is a JSON object with exactly these properties:

| Property | Type | Constraints |
|---|---|---|
| `category` | string | One of `billing`, `technical`, `account`, `feature_request`, `complaint`, `other` |
| `priority` | string | One of `P1`, `P2`, `P3`, `P4`; apply the rubric in the specification |
| `sentiment` | string | One of `positive`, `neutral`, `negative` |
| `needs_clarification` | boolean | True when mandatory information is missing or the issue is not identifiable |
| `clarification_question` | string or null | Non-empty when `needs_clarification` is true; JSON `null` otherwise |
| `escalate` | boolean | True for full production outage, legal threat, or safety issue |
| `summary` | string | At most 200 characters; do not echo email addresses, phone numbers, or card numbers from input |
| `suggested_action` | string | Suggested next support action |

Validation rejects missing or additional keys, invalid types/enums, inconsistent clarification fields, and overlength summaries. Parsing or validation rejection is an application failure and is never retried.

## Service Error

A `ServiceError` is a typed transport/API failure with a non-secret failure code and attempt count. Retryable causes are HTTP 429, HTTP 503, and a request timeout; each gets at most three total attempts with 2-second and 5-second waits between attempts. Other HTTP failures are service/API failures but are not retried. The CLI does not persist service errors; it reports the service category for the harness to exclude and schedule for re-run.

## Failure Classification

| Outcome | Produced by | Handling |
|---|---|---|
| Service/API failure | `src/llm.js` | A `ServiceError`; retry only the specified causes, then report distinctly |
| Application failure | `src/triage.js` or input/config handling | Invalid model JSON, invalid result shape, or invalid CLI configuration/input; no retry |
| Evaluation failure | Frozen external evaluation workflow | Incorrect labels/scores or failed criteria; distinct from transport and application failures |
