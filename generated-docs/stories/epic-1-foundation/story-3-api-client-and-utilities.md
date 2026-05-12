# Story: API Client Configuration and Utilities

**Epic:** Foundation — Auth, Branding, Navigation, and API Setup | **Story:** 3 of 3 | **Wireframe:** N/A (infrastructure only)

**Role:** N/A (infrastructure — no user-facing UI)

**Requirements:** [R25](../../specs/feature-requirements.md#authentication), [NFR4](../../specs/feature-requirements.md#non-functional-requirements), [NFR5](../../specs/feature-requirements.md#non-functional-requirements)

## Story Metadata

| Field | Value |
|-------|-------|
| **Route** | `N/A` (infrastructure only) |
| **Target File** | `lib/api/endpoints.ts` (new), `types/api-generated.ts` (new), `lib/utils/format.ts` (new), `lib/utils/constants.ts` (update) |
| **Page Action** | `create_new` (endpoint functions and types), `modify_existing` (constants) |
| **Routable** | No — infrastructure only, no route |

## User Story

**As a** developer implementing Epics 2–4 **I want** typed API endpoint functions for every FRS-defined endpoint and shared utility functions **So that** I can call the BetterBond backend at `http://localhost:8042` without writing raw `fetch` calls or reinventing currency formatting in each epic.

## Acceptance Criteria

### API Client Base Configuration

- [ ] AC-1: Given the application is running, when any API call is made, then it targets `http://localhost:8042` (verified via `NEXT_PUBLIC_API_BASE_URL` defaulting to `http://localhost:8042` in `lib/utils/constants.ts`) — no Next.js rewrite proxy is configured.
- [ ] AC-2: Given the application is running, when I inspect the Next.js config (`next.config.ts` or `next.config.js`), then there are no `rewrites()` rules that proxy `/api/*` or `/v1/*` to the backend — direct browser calls are the pattern per NFR5.
- [ ] AC-3: Given the API client is called for any mutation endpoint (`PUT /v1/payments/park`, `PUT /v1/payments/unpark`, `POST /v1/payment-batches`), when the call succeeds, then the response is parsed and returned correctly by the existing `apiClient` base function.
- [ ] AC-4: Given `POST /v1/payment-batches` is called, when the `lastChangedUser` option is provided to the endpoint function, then the `LastChangedUser` header is included in the HTTP request (the existing `buildHeaders` function already handles this — verified by test).

### Endpoint Functions

- [ ] AC-5: Given the `lib/api/endpoints.ts` file exists, when I import `getDashboard`, then calling it makes a `GET /v1/payments/dashboard` request and returns a typed `PaymentsDashboard` object.
- [ ] AC-6: Given the `lib/api/endpoints.ts` file exists, when I import `getPayments`, then calling it makes a `GET /v1/payments` request and returns a typed `Payment[]` array.
- [ ] AC-7: Given the `lib/api/endpoints.ts` file exists, when I import `parkPayments`, then calling it with an array of payment IDs makes a `PUT /v1/payments/park` request with the IDs in the request body.
- [ ] AC-8: Given the `lib/api/endpoints.ts` file exists, when I import `unparkPayments`, then calling it with an array of payment IDs makes a `PUT /v1/payments/unpark` request with the IDs in the request body.
- [ ] AC-9: Given the `lib/api/endpoints.ts` file exists, when I import `createPaymentBatch`, then calling it with `PaymentIds` and `lastChangedUser` makes a `POST /v1/payment-batches` request with the `LastChangedUser` header and `{ PaymentIds: [...] }` body.
- [ ] AC-10: Given the `lib/api/endpoints.ts` file exists, when I import `getPaymentBatches`, then calling it makes a `GET /v1/payment-batches` request and returns a typed `PaymentBatch[]` array.
- [ ] AC-11: Given the `lib/api/endpoints.ts` file exists, when I import `downloadInvoicePdf`, then calling it with a batch ID makes a `POST /v1/payment-batches/{Id}/download-invoice-pdf` request and returns a `Blob`.
- [ ] AC-12: Given the `lib/api/endpoints.ts` file exists, when I import `resetDemoData`, then calling it makes a `POST /demo/reset-demo` request.

### TypeScript Types

- [ ] AC-13: Given `types/api-generated.ts` exists, when I import `PaymentsDashboard`, then it has the fields: `PaymentStatusReport` (array of `PaymentStatusReportItem`), `ParkedPaymentsAgingReport` (array of `ParkedPaymentsAgingReportItem`), `TotalPaymentCountInLast14Days` (number), `PaymentsByAgency` (array of `PaymentsByAgencyReportItem`).
- [ ] AC-14: Given `types/api-generated.ts` exists, when I import `Payment`, then it has the fields: `Id`, `Reference`, `AgencyName`, `AgentName`, `AgentSurname`, `ClaimDate`, `BondAmount`, `CommissionType`, `CommissionAmount`, `VAT`, `Status` (object containing `StatusCode` string), `GrantDate`, `RegistrationDate`, `Bank`, `LastChangedUser`, `LastChangedDate`, `BatchId` — and does NOT include `CommissionPercent`.
- [ ] AC-15: Given `types/api-generated.ts` exists, when I import `PaymentBatch`, then it has the fields: `Id`, `Reference`, `CreatedDate`, `Status`, `AgencyName`, `PaymentCount`, `TotalCommissionAmount`, `TotalVat`, `LastChangedUser`.
- [ ] AC-16: Given `types/api-generated.ts` exists, when the TypeScript compiler runs (`npm --prefix web run build`), then there are no type errors related to these new types.

### Currency Formatting Utility

- [ ] AC-17: Given `lib/utils/format.ts` exports `formatCurrency`, when called with `1234567.89`, then it returns the string `"R 1,234,567.89"` (R prefix, space, US-style thousand separator comma, period decimal separator — per BR9).
- [ ] AC-18: Given `lib/utils/format.ts` exports `formatCurrency`, when called with `0`, then it returns `"R 0.00"`.
- [ ] AC-19: Given `lib/utils/format.ts` exports `formatCurrency`, when called with `1000`, then it returns `"R 1,000.00"`.

### Date Formatting Utility

- [ ] AC-20: Given `lib/utils/format.ts` exports `formatDate`, when called with an ISO date string (e.g., `"2024-03-15T00:00:00"`), then it returns a human-readable date string (e.g., `"15 Mar 2024"` or `"2024-03-15"` — the exact format must be documented in the implementation notes and used consistently throughout Epics 2–4).

### Smoke Test

- [ ] AC-21: Given the backend is running at `http://localhost:8042`, when the Vitest test suite runs the smoke-test spec for `getDashboard()`, then the call resolves without error and the response has the expected shape (non-null `PaymentStatusReport` array).

## API Endpoints (from OpenAPI spec at `generated-docs/specs/api-spec.yaml`)

| Method | Endpoint | Purpose | Endpoint Function |
|--------|----------|---------|-------------------|
| GET | `/v1/payments/dashboard` | Fetch all dashboard metric data | `getDashboard()` |
| GET | `/v1/payments` | Fetch all payment records | `getPayments(params?)` |
| GET | `/v1/payments/{Id}` | Fetch single payment by ID | `getPaymentById(id)` |
| PUT | `/v1/payments/park` | Bulk-park payments by ID array | `parkPayments(ids[])` |
| PUT | `/v1/payments/unpark` | Bulk-unpark payments by ID array | `unparkPayments(ids[])` |
| GET | `/v1/payment-batches` | Fetch all payment batches | `getPaymentBatches(params?)` |
| POST | `/v1/payment-batches` | Create a payment batch | `createPaymentBatch(PaymentIds[], lastChangedUser)` |
| GET | `/v1/payment-batches/{Id}` | Fetch single payment batch by ID | `getPaymentBatchById(id)` |
| POST | `/v1/payment-batches/{Id}/download-invoice-pdf` | Download invoice PDF | `downloadInvoicePdf(id)` |
| POST | `/demo/reset-demo` | Reset all demo data | `resetDemoData()` |

## Implementation Notes

### Non-Routable Story — Playwright Spec

This story is infrastructure only with no route. The Playwright spec at `web/e2e/epic-1-story-3-api-client-and-utilities.spec.ts` must be wrapped in `test.fixme()`:

```typescript
// Story 1.3 is infrastructure only (no route). API client correctness is
// verified by Vitest unit/integration tests. E2E coverage comes from
// Epic 2–4 stories that exercise the endpoint functions against the running backend.
test.fixme('api client and utilities', () => { ... });
```

### API Client: Already Correct — Verify, Don't Rewrite

The existing `web/src/lib/api/client.ts` is fully functional and already supports:
- `get<T>()`, `post<T>()`, `put<T>()`, `del<T>()` convenience methods
- `lastChangedUser` header injection via `buildHeaders()`
- `isBinaryResponse` flag for PDF blob downloads
- Query parameter serialization via `buildUrl()`
- `API_BASE_URL` from `NEXT_PUBLIC_API_BASE_URL` env var, defaulting to `http://localhost:8042`

Do NOT rewrite `client.ts`. The only change needed is to verify `constants.ts` already defaults to `http://localhost:8042` (it does — confirmed during infrastructure scan).

### Endpoint Functions File

Create `web/src/lib/api/endpoints.ts`. Each function imports from `@/lib/api/client` and uses the typed response from `@/types/api-generated`. Example structure:

```typescript
import { get, post, put } from '@/lib/api/client';
import type { PaymentsDashboard, Payment, PaymentBatch } from '@/types/api-generated';

export const getDashboard = () =>
  get<PaymentsDashboard>('/v1/payments/dashboard');

export const getPayments = () =>
  get<Payment[]>('/v1/payments');

export const parkPayments = (ids: string[]) =>
  put<void>('/v1/payments/park', { PaymentIds: ids });

export const unparkPayments = (ids: string[]) =>
  put<void>('/v1/payments/unpark', { PaymentIds: ids });

export const createPaymentBatch = (paymentIds: string[], lastChangedUser: string) =>
  post<PaymentBatch>('/v1/payment-batches', { PaymentIds: paymentIds }, lastChangedUser);

export const getPaymentBatches = () =>
  get<PaymentBatch[]>('/v1/payment-batches');

export const downloadInvoicePdf = (id: string) =>
  post<Blob>(`/v1/payment-batches/${id}/download-invoice-pdf`, undefined, undefined, {
    // Use isBinaryResponse flag via apiClient directly if the post() helper doesn't expose it
  });

export const resetDemoData = () =>
  post<void>('/demo/reset-demo');
```

Note: `downloadInvoicePdf` needs `isBinaryResponse: true` in the `apiClient` config. If the `post()` convenience function doesn't pass this through, call `apiClient` directly with `{ method: 'POST', isBinaryResponse: true }`.

### TypeScript Types

Generate types from `generated-docs/specs/api-spec.yaml`. Read the spec carefully and hand-write `types/api-generated.ts` (or use a type-generation tool). Key fields to verify against the spec:

- `Payment.Status` — this is an object (e.g., `{ StatusCode: string, Description: string }`) not a plain string. The `StatusCode` field within it carries the values `REG` and `MAN-PAY` used by BR3–BR5.
- `CommissionPercent` — this field appears in some source data but is NOT in the API schema. Do not include it in the TypeScript type (per FRS note under Data Model).
- `PaymentsByAgencyReportItem.TotalCommissionCount` — used in R5 for the 14-day total monetary value. Confirm field name against the API spec.

### Currency Format Utility

```typescript
// lib/utils/format.ts
export function formatCurrency(amount: number): string {
  // BR9: R 1,234,567.89 — US-style separators, "R" prefix
  return `R ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
```

Important: Use `en-US` locale (comma thousands, period decimal) NOT `en-ZA` locale (which uses space thousands, comma decimal — that is the format NOT used per BR9).

### Date Format Utility

Choose a consistent date display format for the application. Suggested: `"dd MMM yyyy"` (e.g., "15 Mar 2024") using `date-fns` or native `Intl.DateTimeFormat`. Document the chosen format in the function's JSDoc comment so all subsequent stories use the same format. Store as a constant in `constants.ts` if needed.

### LastChangedUser Field

Story 1.1 simplifies the session to `{ user: { id, email, name } }`. The `LastChangedUser` header sent in `createPaymentBatch()` must use the session user's `name` field (per R25, BR8). Document this choice in the `createPaymentBatch` function's JSDoc so Epic 3's implementation reads the correct session field. If `session.user.name` is not available, redirect to sign-in per BR8.

### Pagination Constants

The FRS specifies 20 rows per page for both Payment Management (R8) and Payments Made (R18). Update `PAGINATION.DEFAULT_PAGE_SIZE` in `constants.ts` from 25 to 20, or add a dedicated `PAYMENT_PAGE_SIZE = 20` constant. This constant will be imported by Epics 3 and 4.

### Smoke Test

Write a Vitest integration test in `web/src/__tests__/api/endpoints.test.ts` that mocks `fetch` and verifies:
1. `getDashboard()` calls `GET http://localhost:8042/v1/payments/dashboard`
2. `parkPayments(['id-1', 'id-2'])` calls `PUT http://localhost:8042/v1/payments/park` with body `{ PaymentIds: ['id-1', 'id-2'] }`
3. `createPaymentBatch(['id-1'], 'Admin User')` calls `POST http://localhost:8042/v1/payment-batches` with header `LastChangedUser: Admin User` and body `{ PaymentIds: ['id-1'] }`
4. `downloadInvoicePdf('batch-123')` calls `POST http://localhost:8042/v1/payment-batches/batch-123/download-invoice-pdf` and the response is handled as a Blob.

The AC-21 "smoke test against running backend" is an optional manual verification step — the automated tests use mocked fetch and do not require the backend to be running during CI.
