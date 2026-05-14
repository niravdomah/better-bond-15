---
dependsOn: [1, 2]
---

# Story: Initiate Payments Button and Batch Creation

**Epic:** Payment Management | **Story:** 3 of 3 | **Wireframe:** `generated-docs/specs/wireframes/`

**Role:** All Roles (single authenticated role per FRS)

**Requirements:** [R13](../../specs/feature-requirements.md#payment-management), [R14](../../specs/feature-requirements.md#payment-management), [R16](../../specs/feature-requirements.md#payment-management), [BR3](../../specs/feature-requirements.md#business-rules), [BR4](../../specs/feature-requirements.md#business-rules), [BR5](../../specs/feature-requirements.md#business-rules), [BR7](../../specs/feature-requirements.md#business-rules), [BR8](../../specs/feature-requirements.md#business-rules), [BR9](../../specs/feature-requirements.md#business-rules), [NFR6](../../specs/feature-requirements.md#non-functional-requirements)

## Story Metadata

| Field | Value |
|-------|-------|
| **Route** | `/payment-management` |
| **Target File** | `app/(protected)/payment-management/page.tsx` |
| **Page Action** | `modify_existing` |
| **Routable** | Yes |

## User Story

**As a** payment administrator **I want** to initiate a payment batch for the currently selected agency **So that** all REG-status payments for that agency are submitted for processing in a single batch action.

## Acceptance Criteria

### Initiate Payments Button — Enabled Conditions (BR3)

- [ ] AC-1: Given "All Agencies" is selected in the AgencyName filter, when I view the toolbar, then the "Initiate Payments" button is visibly disabled.
- [ ] AC-2: Given a specific agency is selected but no payments in the filtered list have `StatusCode === "REG"`, when I view the toolbar, then the "Initiate Payments" button is visibly disabled.
- [ ] AC-3: Given a specific agency is selected AND at least one payment in the filtered list has `StatusCode === "REG"`, when I view the toolbar, then the "Initiate Payments" button is enabled.

### Initiate Payments Button — What Gets Submitted (BR4, BR5)

- [ ] AC-4: Given the "Initiate Payments" button is enabled, when I click it, then the frontend calls `POST /v1/payment-batches` with the body `{ "PaymentIds": [<IDs of all REG-status payments for the selected agency>] }`.
- [ ] AC-5: Given the "Initiate Payments" button is clicked, when the API call is made, then the `PaymentIds` list contains ONLY payments where `StatusCode === "REG"` AND `AgencyName` matches the currently selected agency — no other payments are included.
- [ ] AC-6: Given the "Initiate Payments" button is clicked, when the API call is made, then payments with `StatusCode === "MAN-PAY"` are excluded from the `PaymentIds` list, even if they belong to the selected agency.
- [ ] AC-7: Given the "Initiate Payments" button is clicked, when the API call is made, then payments belonging to other agencies are excluded from the `PaymentIds` list, even if they have `StatusCode === "REG"`.

### LastChangedUser Header (R13, R25, BR8)

- [ ] AC-8: Given I click "Initiate Payments" while authenticated, when the `POST /v1/payment-batches` call is made, then the request includes the HTTP header `LastChangedUser: <session username>`.
- [ ] AC-9: Given the session username is not available at the time of the click, when I click "Initiate Payments", then no API call is made and I am redirected to `/auth/signin`.

### Success Flow (R14, BR7)

- [ ] AC-10: Given the `POST /v1/payment-batches` call succeeds, when the response is received, then a success toast is displayed with the message "Payment batch created successfully."
- [ ] AC-11: Given the `POST /v1/payment-batches` call succeeds, when the toast appears, then the payment list is re-fetched from `GET /v1/payments` and the grid re-renders with the refreshed data and all row selections are cleared.
- [ ] AC-12: Given the `POST /v1/payment-batches` call succeeds, when the page settles after the refresh, then I remain on the Payment Management page at `/payment-management` — I am NOT automatically navigated to another page.

### Failure Toast (R16)

- [ ] AC-13: Given the `POST /v1/payment-batches` call fails (network error or non-2xx response), when the error is received, then a toast notification is displayed with a descriptive failure message (e.g., "Failed to initiate payments. Please try again.").
- [ ] AC-14: Given the call fails, when I view the toolbar, then the "Initiate Payments" button returns to its pre-click enabled/disabled state so the user can retry.

### Toast Behaviour

- [ ] AC-15: Given a success or failure toast is displayed, when 5 seconds pass, then the toast auto-dismisses.
- [ ] AC-16: Given a toast is displayed, when I click the dismiss control on the toast, then the toast is removed immediately.

### Disabled Button Behaviour

- [ ] AC-17: Given the "Initiate Payments" button is disabled, when I click on it, then no API call is made and no toast appears.
- [ ] AC-18: Given the "Initiate Payments" button is disabled, when I inspect it, then it has `aria-disabled="true"` or the native disabled attribute so screen readers announce the disabled state.

### Accessibility

- [ ] AC-19: Given I am on the Payment Management page, when I navigate using the Tab key, then I can reach the "Initiate Payments" button and it has a visible focus indicator.
- [ ] AC-20: Given the button is enabled, when I focus it and press Enter or Space, then it triggers the same action as clicking it.

## Requirements Traceability

| Requirement | Acceptance Criteria |
|-------------|---------------------|
| [R13](../../specs/feature-requirements.md#payment-management) — Initiate Payments calls `POST /v1/payment-batches` with REG IDs + `LastChangedUser` header | AC-4, AC-5, AC-8 |
| [R14](../../specs/feature-requirements.md#payment-management) — Success: toast "Payment batch created successfully." + refresh | AC-10, AC-11 |
| [R16](../../specs/feature-requirements.md#payment-management) — Mutation failure: descriptive toast | AC-13 |
| [BR3](../../specs/feature-requirements.md#business-rules) — Button disabled when no agency selected or no REG payments exist for agency | AC-1, AC-2, AC-3 |
| [BR4](../../specs/feature-requirements.md#business-rules) — REG = ready to pay; MAN-PAY excluded from batch | AC-5, AC-6 |
| [BR5](../../specs/feature-requirements.md#business-rules) — Only REG payments for the selected agency in `PaymentIds` | AC-5, AC-7 |
| [BR7](../../specs/feature-requirements.md#business-rules) — User stays on Payment Management after success | AC-12 |
| [BR8](../../specs/feature-requirements.md#business-rules) — `LastChangedUser` header = session username; if unavailable, redirect to sign-in | AC-8, AC-9 |
| [BR9](../../specs/feature-requirements.md#business-rules) — Currency format `R 1,234,567.89` throughout UI | (already established in Story 3.1 — no new currency display in this story) |
| [NFR6](../../specs/feature-requirements.md#non-functional-requirements) — Accessible keyboard navigation | AC-19, AC-20 |

## API Endpoints (from OpenAPI spec)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/v1/payment-batches` | Create a payment batch — requires `LastChangedUser` header + `PaymentIds` body |
| GET | `/v1/payments` | Re-fetch payment list after successful batch creation |

### Request

```typescript
// POST /v1/payment-batches
// Header: LastChangedUser: string   (required — session username)
// Body:
interface CreatePaymentBatchRequest {
  PaymentIds: number[];   // IDs of REG-status payments for the selected agency only
}
```

### Response

```typescript
// 200 OK — DefaultResponse
interface DefaultResponse {
  Id: number;
  MessageType: string;
  Messages: string[];
}
```

No endpoints are missing — `POST /v1/payment-batches` is defined in the OpenAPI spec with the `LastChangedUser` header and `PaymentIds` body.

## Implementation Notes

### Enabled State Derivation (BR3)

The "Initiate Payments" button enabled state is a derived value computed from two conditions:
1. `selectedAgency` is not `""` / `"ALL"` (a specific agency is selected)
2. `filteredList.some(p => p.Status === "REG")` is true (at least one REG payment in filtered view)

Both conditions must be true for the button to be enabled. Compute this as a memoized value to avoid recalculation on every render.

Note: `StatusCode` is embedded in the `Status` string field of `PaymentRead` (the API schema does not expose a separate `StatusCode` field). Inspect actual API response data to determine the exact value format (e.g., the string `"REG"` vs a nested object). Based on the FRS data model (`StatusCode e.g. REG / MAN-PAY`), the `Status` field value IS the status code string. Use exact string equality: `p.Status === "REG"`.

### Building the PaymentIds List (BR5)

When the user clicks "Initiate Payments":
```typescript
const regPaymentIds = filteredList
  .filter(p => p.AgencyName === selectedAgency && p.Status === "REG")
  .map(p => p.Id);
```

`filteredList` already filters by `selectedAgency`, so the double-check on `AgencyName` is a safety guard. Always filter to avoid including payments from a stale state.

### LastChangedUser Header (BR8, R25)

Read the session username from the next-auth session using `useSession()`. The field to use is `session.user.name` or `session.user.email` — consult the implementation notes in Story 1.1 (Epic 1) for the exact field that was documented there. Use the same field consistently across the entire application.

If `session?.user?.name` (or whichever field) is falsy at call time, do NOT call the API. Instead, call `signIn()` (from `next-auth/react`) to redirect the user to `/auth/signin`.

Pass the header via the API client:
```typescript
import { post } from '@/lib/api/client';
await post('/v1/payment-batches', { PaymentIds: regPaymentIds }, {
  headers: { LastChangedUser: session.user.name }
});
```

Check that `lib/api/client.ts` accepts a custom headers option — if it does not currently support per-request headers, extend it in this story.

### Post-Mutation Refresh

After a successful batch creation (same pattern as Park/Unpark in Story 3.2):
1. Show success toast
2. Clear row selections
3. Re-fetch `GET /v1/payments`
4. Update payments state with fresh list
5. Reset pagination to page 1

### Shadcn Components to Use

- `Button` — "Initiate Payments" button (use `disabled` prop when conditions not met)
- Sonner `toast` — success and failure notifications (`duration: 5000` for auto-dismiss)

### Test Notes

This story is routable (`/payment-management`) — a Playwright spec must be created at `web/e2e/epic-3-story-3-initiate-payments.spec.ts`. The spec should cover:
- Disabled state: load page with "All Agencies" selected, assert button is disabled.
- Disabled state: select agency with no REG payments, assert button is disabled.
- Enabled state: select agency with at least one REG payment, assert button is enabled.
- Happy path: click "Initiate Payments", assert success toast, assert user stays on payment management page, assert grid refreshes.
- Failure: mock `POST /v1/payment-batches` failure, assert error toast.
- Session guard: mock missing session, assert no API call and redirect to sign-in.
