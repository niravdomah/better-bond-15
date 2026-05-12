# Test Design: API Client Configuration and Utilities

## Story Summary

**Epic:** 1 — Foundation: Auth, Branding, Navigation, and API Setup
**Story:** 3 of 3
**As a** developer implementing Epics 2–4
**I want** typed API endpoint functions for every FRS-defined endpoint and shared utility functions
**So that** I can call the BetterBond backend at `http://localhost:8042` without writing raw fetch calls or reinventing currency formatting in each epic.

## Review Purpose

This document presents concrete business examples for BA review before executable tests are written.

Its purpose is to:
- surface missing business decisions
- let the BA review behavior using examples and expected outcomes
- provide an approved source for downstream test generation

This story is pure infrastructure — no user interface. The examples here describe the contracts that all subsequent epics depend on: where the backend is reached, what data shapes are expected, and how currency and dates are formatted on screen throughout the application.

## Business Behaviors Identified

- The API client always directs requests to `http://localhost:8042` — no Next.js proxy layer in between.
- No Next.js rewrite rules exist that would silently redirect `/api/*` or `/v1/*` calls.
- Each endpoint function wraps the underlying HTTP call and returns a typed result, so calling code in Epics 2–4 never deals with raw `fetch`.
- The `LastChangedUser` HTTP header is injected automatically when creating a payment batch — the calling code passes a username string and the client handles the header.
- Downloading an invoice PDF is handled as a binary (Blob) response, not as JSON.
- The `formatCurrency` function always produces exactly `R 1,234,567.89` style output (R prefix, space, US-style comma thousands separator, period decimal, exactly 2 decimal places) as required by BR9.
- The `formatDate` function produces `"15 Mar 2024"` format — day, abbreviated month name, full year — applied consistently throughout all screens in Epics 2–4.
- `PaymentRead.Status` is typed as `{ StatusCode: string; Description?: string }`. When the backend returns a plain string for this field, the API client normalises it into the object form before returning. All consuming code in Epics 2–4 sees the object shape, never a raw string.
- TypeScript types for API responses are generated from the OpenAPI spec and must compile without errors.

## Key Decisions Surfaced by AI

All four BA decisions have been resolved. No open decisions remain for this story.

**Resolved decisions (for audit trail):**

- **BA-1 (date display format):** Approved `"15 Mar 2024"` — day, abbreviated month, full year. Applies to every date column in Epics 2–4.
- **BA-2 (formatCurrency null/undefined):** Approved `"—"` (em-dash). Real zero still returns `"R 0.00"`.
- **BA-3 (formatDate null/missing):** Approved `"—"` (em-dash). Consistent with formatCurrency null handling.
- **BA-4 (Payment.Status shape):** Approved object `{ StatusCode: string; Description?: string }`. API client normalises plain-string responses from the backend into this shape. All consumers see the object form.

## Test Scenarios / Review Examples

### 1. API base URL is `http://localhost:8042` with no proxy

| Input | Value |
| --- | --- |
| Environment variable | `NEXT_PUBLIC_API_BASE_URL` not set (or set to `http://localhost:8042`) |
| Next.js config file | Inspected for rewrite rules |

| Expected | Value |
| --- | --- |
| Default API base URL in `constants.ts` | `http://localhost:8042` |
| Rewrite rules in Next.js config | None — no `/api/*` or `/v1/*` proxy rules present |
| Network destination for any API call | `http://localhost:8042` directly |

---

### 2. Fetching the dashboard

| Input | Value |
| --- | --- |
| Function called | `getDashboard()` |
| Backend response (mocked) | `{ PaymentStatusReport: [...], ParkedPaymentsAgingReport: [...], TotalPaymentCountInLast14Days: 14, PaymentsByAgency: [...] }` |

| Expected | Value |
| --- | --- |
| HTTP method | GET |
| URL | `http://localhost:8042/v1/payments/dashboard` |
| Return value type | `PaymentsDashboard` — includes `PaymentStatusReport` (array), `ParkedPaymentsAgingReport` (array), `TotalPaymentCountInLast14Days` (number), `PaymentsByAgency` (array) |

---

### 3. Fetching the payments list

| Input | Value |
| --- | --- |
| Function called | `getPayments()` |
| Backend response (mocked) | `{ PaymentList: [ { Id: 101, Reference: "REF-001", AgencyName: "ABC Realty", ... } ] }` |

| Expected | Value |
| --- | --- |
| HTTP method | GET |
| URL | `http://localhost:8042/v1/payments` |
| Return value type | `Payment[]` (array unwrapped from the `PaymentList` wrapper) |

---

### 4. Parking payments by ID array

| Input | Value |
| --- | --- |
| Function called | `parkPayments([101, 102])` |
| Payment IDs | `[101, 102]` |

| Expected | Value |
| --- | --- |
| HTTP method | PUT |
| URL | `http://localhost:8042/v1/payments/park` |
| Request body | `{ "PaymentIds": [101, 102] }` |

---

### 5. Unparking payments by ID array

| Input | Value |
| --- | --- |
| Function called | `unparkPayments([203])` |
| Payment IDs | `[203]` |

| Expected | Value |
| --- | --- |
| HTTP method | PUT |
| URL | `http://localhost:8042/v1/payments/unpark` |
| Request body | `{ "PaymentIds": [203] }` |

---

### 6. Creating a payment batch with `LastChangedUser` header

| Input | Value |
| --- | --- |
| Function called | `createPaymentBatch([101, 102], "Jane Smith")` |
| Payment IDs | `[101, 102]` |
| Last changed user | `"Jane Smith"` (the authenticated user's name from the session) |

| Expected | Value |
| --- | --- |
| HTTP method | POST |
| URL | `http://localhost:8042/v1/payment-batches` |
| Request header | `LastChangedUser: Jane Smith` |
| Request body | `{ "PaymentIds": [101, 102] }` |

---

### 7. Downloading an invoice PDF as a binary file

| Input | Value |
| --- | --- |
| Function called | `downloadInvoicePdf(55)` |
| Batch ID | `55` |

| Expected | Value |
| --- | --- |
| HTTP method | POST |
| URL | `http://localhost:8042/v1/payment-batches/55/download-invoice-pdf` |
| Response handling | Treated as binary (Blob), not parsed as JSON |

---

### 8. Resetting demo data

| Input | Value |
| --- | --- |
| Function called | `resetDemoData()` |

| Expected | Value |
| --- | --- |
| HTTP method | POST |
| URL | `http://localhost:8042/demo/reset-demo` |
| Response | No body expected (200 status only) |

---

### 9. Currency formatting — large amount

| Input | Value |
| --- | --- |
| Function | `formatCurrency` |
| Input value | `1234567.89` |

| Expected | Value |
| --- | --- |
| Return value | `"R 1,234,567.89"` |
| Format pattern | R (space) (number with comma thousands, period decimal, exactly 2 decimal places) |

---

### 10. Currency formatting — zero

| Input | Value |
| --- | --- |
| Function | `formatCurrency` |
| Input value | `0` |

| Expected | Value |
| --- | --- |
| Return value | `"R 0.00"` |
| Note | Real zero returns the formatted value, not the em-dash placeholder |

---

### 11. Currency formatting — whole thousands

| Input | Value |
| --- | --- |
| Function | `formatCurrency` |
| Input value | `1000` |

| Expected | Value |
| --- | --- |
| Return value | `"R 1,000.00"` |

---

### 12. Date formatting — valid ISO date string

| Input | Value |
| --- | --- |
| Function | `formatDate` |
| Input value | `"2024-03-15"` (or `"2024-03-15T00:00:00"`) |

| Expected | Value |
| --- | --- |
| Return value | `"15 Mar 2024"` |
| Format | Day (no leading zero), space, three-letter month abbreviation, space, four-digit year |
| Consistency | This exact format appears on every date column in the payment grid, batch cards, and payment detail views across Epics 2, 3, and 4 |

---

### 13. API client normalises a plain-string Status to the object form

| Setup | Value |
| --- | --- |
| Backend response for `GET /v1/payments` (mocked) | Payment record where `Status` field is a plain string: `"REG"` |

| Expected | Value |
| --- | --- |
| Value returned by `getPayments()` for that record's `.Status` | `{ StatusCode: "REG" }` (object form, `Description` absent when not provided) |
| TypeScript type of `.Status` on all `Payment` objects | `{ StatusCode: string; Description?: string }` |
| What consuming code in Epics 2–4 sees | Always the object form — never a raw string |

---

### 14. API client passes through an already-normalised Status object unchanged

| Setup | Value |
| --- | --- |
| Backend response for `GET /v1/payments` (mocked) | Payment record where `Status` field is already an object: `{ "StatusCode": "MAN-PAY", "Description": "Manual Payment" }` |

| Expected | Value |
| --- | --- |
| Value returned by `getPayments()` for that record's `.Status` | `{ StatusCode: "MAN-PAY", Description: "Manual Payment" }` (passed through, not double-wrapped) |

---

## Edge and Alternate Examples

### Edge A. Currency formatting — small fractional amount

| Input | Value |
| --- | --- |
| Function | `formatCurrency` |
| Input value | `0.5` |

| Expected | Value |
| --- | --- |
| Return value | `"R 0.50"` (exactly two decimal places, no rounding to zero) |

---

### Edge B. `formatCurrency` called with `null` or `undefined`

| Input | Value |
| --- | --- |
| Function | `formatCurrency` |
| Input value | `null` or `undefined` |

| Expected | Value |
| --- | --- |
| Return value | `"—"` (em-dash, indicating data is unavailable) |
| Note | Distinguishes missing data from a genuine zero amount — important for parked payment records where commission fields may be absent |

---

### Edge C. `formatDate` called with `null`, empty string, or an unparseable value

| Input | Value |
| --- | --- |
| Function | `formatDate` |
| Input value | `null`, `undefined`, `""`, or a non-date string |

| Expected | Value |
| --- | --- |
| Return value | `"—"` (em-dash, consistent with `formatCurrency` null handling) |
| Note | Date fields such as `GrantDate`, `RegistrationDate`, and `LastChangedDate` may be absent on some payment records |

---

## Out of Scope / Not For This Story

- Building any user interface — this story is infrastructure only.
- Server-side API proxying or Next.js middleware rewrite rules (explicitly excluded by NFR5).
- Handling authentication on the backend — the backend does not enforce authorization for this POC.
- Client-side pagination logic (covered by Epic 2 and 3 stories that consume the endpoint functions).
- Agency filtering, park/unpark UI interactions — covered by Epic 2 and 3 stories.
- The `getPaymentById` and `getPaymentBatchById` single-record endpoint functions are listed in the endpoint table but have no AC and are not tested in this story; they may be created for completeness but are not verified here.
- Date range filtering via the `ClaimDate` query parameter (the API supports it, but it is out of scope for the UI per the FRS).
- Error handling and toast notifications for API failures — those behaviors are tested in the stories that display the UI.
