# Test Handoff: API Client Configuration and Utilities

> Engineering document for downstream agents. Not reviewed by the BA.

**Source:** [story-3-api-client-and-utilities-test-design.md](./story-3-api-client-and-utilities-test-design.md)
**Epic:** 1 | **Story:** 3
**Render scope:** `api` — no UI components; all tests are pure function/module tests using Vitest with mocked `fetch`.

## Coverage for WRITE-TESTS

Every AC from the story mapped to examples:

- AC-1: `NEXT_PUBLIC_API_BASE_URL` defaults to `http://localhost:8042` → Example 1
- AC-2: No `/api/*` or `/v1/*` rewrite rules in Next.js config → Example 1
- AC-3: Mutation responses parsed and returned correctly by the API client → Examples 4, 5, 6 (park, unpark, batch)
- AC-4: `LastChangedUser` header injected on `POST /v1/payment-batches` → Example 6
- AC-5: `getDashboard()` calls `GET /v1/payments/dashboard`, returns `PaymentsDashboard` → Example 2
- AC-6: `getPayments()` calls `GET /v1/payments`, returns `Payment[]` → Example 3
- AC-7: `parkPayments(ids)` calls `PUT /v1/payments/park` with `{ PaymentIds: ids }` body → Example 4
- AC-8: `unparkPayments(ids)` calls `PUT /v1/payments/unpark` with `{ PaymentIds: ids }` body → Example 5
- AC-9: `createPaymentBatch(ids, user)` calls `POST /v1/payment-batches` with `LastChangedUser` header and body → Example 6
- AC-10: `getPaymentBatches()` calls `GET /v1/payment-batches`, returns `PaymentBatch[]` → (standalone test, no design example — straightforward GET, same pattern as AC-5/6)
- AC-11: `downloadInvoicePdf(id)` calls `POST /v1/payment-batches/{id}/download-invoice-pdf`, returns `Blob` → Example 7
- AC-12: `resetDemoData()` calls `POST /demo/reset-demo` → Example 8
- AC-13: `PaymentsDashboard` type has required fields (`PaymentStatusReport`, `ParkedPaymentsAgingReport`, `TotalPaymentCountInLast14Days`, `PaymentsByAgency`) → TypeScript compilation check
- AC-14: `Payment` type has `Status: { StatusCode: string; Description?: string }` (object form, not plain string) → TypeScript compilation check + Examples 13, 14
- AC-15: `PaymentBatch` type has required fields → TypeScript compilation check
- AC-16: TypeScript build produces no type errors → `npm --prefix web run build`
- AC-17: `formatCurrency(1234567.89)` returns `"R 1,234,567.89"` → Example 9
- AC-18: `formatCurrency(0)` returns `"R 0.00"` → Example 10
- AC-19: `formatCurrency(1000)` returns `"R 1,000.00"` → Example 11
- AC-20: `formatDate("2024-03-15")` returns `"15 Mar 2024"` → Example 12
- AC-21: Smoke test for `getDashboard()` → use mocked fetch (see note below)

## Handoff Notes for WRITE-TESTS

- Only generate executable tests from examples in the test-design document.
- Do not invent behavior not represented there or explicitly approved.
- Preferred render scope: `api` — no UI, no jsdom component rendering. All tests use Vitest directly, with global `fetch` mocked via `vi.stubGlobal('fetch', ...)` or `vi.spyOn(global, 'fetch')`.
- Target test file: `web/src/__tests__/api/endpoints.test.ts` (as specified in the story implementation notes).
- Secondary test file for format utilities: `web/src/__tests__/utils/format.test.ts`.
- Playwright spec: `web/e2e/epic-1-story-3-api-client-and-utilities.spec.ts` must be wrapped in `test.fixme()` with the comment from the story implementation notes (infrastructure only, no route).

### Resolved BA decisions — lock these values in tests

All four BA decisions are resolved. No placeholders or pending comments are needed. Use these exact values:

- **formatDate expected output:** `"15 Mar 2024"` for input `"2024-03-15"` (or `"2024-03-15T00:00:00"`).
- **formatCurrency null/undefined expected output:** `"—"` (U+2014 em-dash). Test both `null` and `undefined` inputs.
- **formatDate null/invalid expected output:** `"—"` (U+2014 em-dash). Test `null`, `undefined`, and `""` inputs.
- **Payment.Status TypeScript type:** `{ StatusCode: string; Description?: string }`. The type must NOT be `string`.

### Status normalisation requirement (BA-4 — CRITICAL)

The API client must normalise the `Status` field on every `Payment` object returned by `GET /v1/payments` before returning the array to callers. Normalisation rules:

1. If the backend returns `Status` as a plain string (e.g., `"REG"`), convert it to `{ StatusCode: "REG" }`.
2. If the backend returns `Status` already as an object (e.g., `{ StatusCode: "MAN-PAY", Description: "Manual Payment" }`), pass it through unchanged.
3. If `Status` is absent or null, the normalised value should be `{ StatusCode: "" }` or omitted — do not let the field be a string.

Write two dedicated unit tests for this normalisation (Examples 13 and 14 in the test-design document):

- **Test 13:** Mock `GET /v1/payments` returning `Status: "REG"` (plain string). Assert that `getPayments()` returns a payment where `.Status` deep-equals `{ StatusCode: "REG" }`.
- **Test 14:** Mock `GET /v1/payments` returning `Status: { StatusCode: "MAN-PAY", Description: "Manual Payment" }` (already object). Assert that `getPayments()` returns a payment where `.Status` deep-equals `{ StatusCode: "MAN-PAY", Description: "Manual Payment" }` (no double-wrapping).

The normalisation must be implemented inside the `getPayments()` function (or a shared response-transform utility it calls), not in the consuming component. All Epic 2–4 components that read `.Status.StatusCode` depend on this contract.

### Suggested primary assertions

- For each endpoint function: assert `fetch` was called with the correct URL (including full base URL), correct HTTP method, correct `Content-Type` header, and correct JSON body.
- For `createPaymentBatch`: assert `fetch` was called with `LastChangedUser: "Jane Smith"` header present.
- For `downloadInvoicePdf`: assert the response is handled as a Blob (not JSON-parsed).
- For `formatCurrency`: assert exact string equality — `"R 1,234,567.89"`, `"R 0.00"`, `"R 1,000.00"`, `"R 0.50"`, `"—"` (null), `"—"` (undefined).
- For `formatDate`: assert `"15 Mar 2024"` for input `"2024-03-15"`; assert `"—"` for null, undefined, and empty string inputs.
- TypeScript AC (13–16): verified by `npm --prefix web run build` passing — no dedicated test needed; these are compilation checks.
- AC-21 smoke test: use mocked fetch returning a valid `PaymentsDashboard` shape; assert the resolved value has a non-null `PaymentStatusReport` array. Do NOT require the real backend to be running in CI.

### Important ambiguity flags

- **PaymentIds integer vs string:** The OpenAPI spec defines `PaymentIds` items as `integer`. The story example code uses strings. Verify with the actual API — mock the correct type in tests. If integers are correct, the endpoint function signatures (`ids: number[]`) must reflect that.
- **Response envelope unwrapping:** `GET /v1/payments` returns `{ PaymentList: [...] }` and `GET /v1/payment-batches` returns `{ PaymentBatchList: [...] }` per the OpenAPI spec. The endpoint functions must unwrap these envelopes before returning the array. Tests must mock the envelope shape and assert the unwrapped array is returned.
- **`getPaymentById` and `getPaymentBatchById`:** These endpoint functions appear in the story's endpoint table but have no AC. Create them (for completeness and future use), but do not write tests for them in this story. If test coverage tooling flags them as untested, add a comment explaining they are tested in the epics that use them.
- **Status normalisation interaction with envelope unwrapping:** The normalisation of `Status` must happen after the `PaymentList` envelope is unwrapped and before the array is returned. Order matters: unwrap first, then normalise each item in the array.

## Testability Classification

| Scenario | Category | Reason |
| --- | --- | --- |
| Example 1 — API base URL, no proxy rules | Unit-testable (RTL) | Pure constant/config inspection; no browser or network stack required |
| Example 2 — `getDashboard()` HTTP call | Unit-testable (RTL) | Mocked fetch; asserts URL, method, return shape — fully exercisable in Vitest/jsdom |
| Example 3 — `getPayments()` HTTP call | Unit-testable (RTL) | Mocked fetch; same pattern as Example 2 |
| Example 4 — `parkPayments()` HTTP call | Unit-testable (RTL) | Mocked fetch; asserts URL, method, body |
| Example 5 — `unparkPayments()` HTTP call | Unit-testable (RTL) | Mocked fetch; same pattern as Example 4 |
| Example 6 — `createPaymentBatch()` with `LastChangedUser` header | Unit-testable (RTL) | Mocked fetch; asserts header injection alongside body |
| Example 7 — `downloadInvoicePdf()` Blob response | Unit-testable (RTL) | Mocked fetch returning a Blob; verifies binary response path |
| Example 8 — `resetDemoData()` HTTP call | Unit-testable (RTL) | Mocked fetch; trivial POST assertion |
| Example 9 — `formatCurrency(1234567.89)` | Unit-testable (RTL) | Pure function, exact string equality — no DOM or network |
| Example 10 — `formatCurrency(0)` | Unit-testable (RTL) | Pure function |
| Example 11 — `formatCurrency(1000)` | Unit-testable (RTL) | Pure function |
| Example 12 — `formatDate("2024-03-15")` → `"15 Mar 2024"` | Unit-testable (RTL) | Pure function; expected string locked to BA-1 decision |
| Example 13 — Status normalisation: string → object | Unit-testable (RTL) | Mocked fetch; asserts transform applied to returned Payment array |
| Example 14 — Status normalisation: object → object passthrough | Unit-testable (RTL) | Mocked fetch; asserts no double-wrapping occurs |
| Edge A — `formatCurrency(0.5)` | Unit-testable (RTL) | Pure function |
| Edge B — `formatCurrency(null/undefined)` → `"—"` | Unit-testable (RTL) | Pure function; BA-2 resolved to em-dash |
| Edge C — `formatDate(null/invalid)` → `"—"` | Unit-testable (RTL) | Pure function; BA-3 resolved to em-dash |

All scenarios in this story are unit-testable. No runtime verification needed.

> Note: The `test.fixme()` Playwright spec is required by workflow policy for this non-routable story. It does not represent a runtime-only verification gap — it is a placeholder confirming that E2E coverage for these endpoint functions comes from Epics 2–4.

## Playwright Spec Requirement

This story is non-routable. Create `web/e2e/epic-1-story-3-api-client-and-utilities.spec.ts` with:

```typescript
import { test } from '@playwright/test';

// Story 1.3 is infrastructure only (no route). API client correctness is
// verified by Vitest unit/integration tests. E2E coverage comes from
// Epic 2–4 stories that exercise the endpoint functions against the running backend.
test.fixme('api client and utilities', () => {});
```

No assertions inside the fixme block.
