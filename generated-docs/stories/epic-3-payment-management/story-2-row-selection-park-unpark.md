---
dependsOn: [1]
---

# Story: Row Selection, Park/Unpark Bulk Actions, and Post-Mutation Refresh

**Epic:** Payment Management | **Story:** 2 of 3 | **Wireframe:** `generated-docs/specs/wireframes/`

**Role:** All Roles (single authenticated role per FRS)

**Requirements:** [R10](../../specs/feature-requirements.md#payment-management), [R11](../../specs/feature-requirements.md#payment-management), [R12](../../specs/feature-requirements.md#payment-management), [R16](../../specs/feature-requirements.md#payment-management), [BR1](../../specs/feature-requirements.md#business-rules), [BR2](../../specs/feature-requirements.md#business-rules), [BR6](../../specs/feature-requirements.md#business-rules), [NFR2](../../specs/feature-requirements.md#non-functional-requirements), [NFR6](../../specs/feature-requirements.md#non-functional-requirements)

## Story Metadata

| Field | Value |
|-------|-------|
| **Route** | `/payment-management` |
| **Target File** | `app/(protected)/payment-management/page.tsx` |
| **Page Action** | `modify_existing` |
| **Routable** | Yes |

## User Story

**As a** payment administrator **I want** to select individual or all payments on a page and bulk-park or bulk-unpark them **So that** I can hold or release payments for processing in bulk without affecting other payments.

## Acceptance Criteria

### Row Checkboxes

- [ ] AC-1: Given the payment grid is rendered with rows, when I view each row, then I see a checkbox at the start of that row that I can tick or untick.
- [ ] AC-2: Given the payment grid is rendered, when I view the table header, then I see a header checkbox that selects or deselects all rows on the current page.
- [ ] AC-3: Given no rows are selected, when I tick the header checkbox, then all rows on the current page become selected (their row checkboxes are checked).
- [ ] AC-4: Given all rows on the current page are selected, when I untick the header checkbox, then all row checkboxes on the current page become unchecked (all rows deselected).
- [ ] AC-5: Given some but not all rows on the current page are selected, when I view the header checkbox, then it shows an indeterminate state (partially filled / mixed indicator).
- [ ] AC-6: Given I am on page 1 with some rows selected, when I navigate to page 2, then the page-2 rows start with no rows pre-selected.
- [ ] AC-7: Given I select rows and then change the AgencyName filter, when the grid updates, then all row selections are cleared.

### Park Button — Enabled State

- [ ] AC-8: Given one or more rows are selected, when I view the toolbar above the grid, then the "Park" button is enabled.
- [ ] AC-9: Given one or more rows are selected, when I click the "Park" button, then the frontend calls `PUT /v1/payments/park` with the body `{ "PaymentIds": [<selected row IDs>] }`.
- [ ] AC-10: Given the park call succeeds, when the response is received, then a success toast is shown (e.g., "Payments parked successfully."), all row selections are cleared, and the payment list is re-fetched from `GET /v1/payments` and the grid re-renders with the refreshed data.

### Park Button — Disabled State

- [ ] AC-11: Given no rows are selected, when I view the toolbar, then the "Park" button is visibly disabled.
- [ ] AC-12: Given the "Park" button is disabled, when I click on it, then no API call is made and no toast appears.

### Unpark Button — Enabled State

- [ ] AC-13: Given one or more rows are selected, when I view the toolbar, then the "Unpark" button is enabled.
- [ ] AC-14: Given one or more rows are selected, when I click the "Unpark" button, then the frontend calls `PUT /v1/payments/unpark` with the body `{ "PaymentIds": [<selected row IDs>] }`.
- [ ] AC-15: Given the unpark call succeeds, when the response is received, then a success toast is shown (e.g., "Payments unparked successfully."), all row selections are cleared, and the payment list is re-fetched from `GET /v1/payments` and the grid re-renders with the refreshed data.

### Unpark Button — Disabled State

- [ ] AC-16: Given no rows are selected, when I view the toolbar, then the "Unpark" button is visibly disabled.
- [ ] AC-17: Given the "Unpark" button is disabled, when I click on it, then no API call is made and no toast appears.

### Post-Mutation Refresh (BR6)

- [ ] AC-18: Given a Park or Unpark call succeeds, when the re-fetch completes, then the grid displays the updated payment statuses from the refreshed API response (the previously selected rows may now show a different Status value).
- [ ] AC-19: Given a Park or Unpark call succeeds, when the re-fetch is in-flight, then a loading indicator is shown (e.g., the action button shows a spinner or the grid shows a loading state) so the user knows the refresh is occurring.

### Failure Toast — Park/Unpark

- [ ] AC-20: Given a Park call fails (network error or non-2xx response), when the error is received, then a toast notification is displayed with a descriptive failure message (e.g., "Failed to park payments. Please try again.").
- [ ] AC-21: Given an Unpark call fails (network error or non-2xx response), when the error is received, then a toast notification is displayed with a descriptive failure message (e.g., "Failed to unpark payments. Please try again.").
- [ ] AC-22: Given a Park or Unpark call fails, when I view the grid, then the row selections are preserved (not cleared) so the user can retry without re-selecting.

### Toast Behaviour

- [ ] AC-23: Given a success or failure toast is displayed, when 5 seconds pass, then the toast auto-dismisses.
- [ ] AC-24: Given a toast is displayed, when I click the dismiss control on the toast, then the toast is removed immediately.

### Accessibility

- [ ] AC-25: Given I am on the Payment Management page, when I navigate using the Tab key, then I can reach the row checkboxes, the header checkbox, and the Park and Unpark buttons and each has a visible focus indicator.
- [ ] AC-26: Given the Park or Unpark button is disabled, when I inspect it, then it has `aria-disabled="true"` or the native disabled attribute so screen readers announce the disabled state.

## Requirements Traceability

| Requirement | Acceptance Criteria |
|-------------|---------------------|
| [R10](../../specs/feature-requirements.md#payment-management) — Per-row checkbox; header checkbox selects/deselects current page | AC-1, AC-2, AC-3, AC-4, AC-5, AC-6 |
| [R11](../../specs/feature-requirements.md#payment-management) — Park button calls `PUT /v1/payments/park`, then refreshes | AC-8, AC-9, AC-10 |
| [R12](../../specs/feature-requirements.md#payment-management) — Unpark button calls `PUT /v1/payments/unpark`, then refreshes | AC-13, AC-14, AC-15 |
| [R16](../../specs/feature-requirements.md#payment-management) — Mutation failure: descriptive toast | AC-20, AC-21 |
| [BR1](../../specs/feature-requirements.md#business-rules) — Park button disabled when no rows selected | AC-11, AC-12 |
| [BR2](../../specs/feature-requirements.md#business-rules) — Unpark button disabled when no rows selected | AC-16, AC-17 |
| [BR6](../../specs/feature-requirements.md#business-rules) — After mutation: clear selections, re-fetch before re-rendering | AC-10, AC-15, AC-18, AC-19 |
| [NFR2](../../specs/feature-requirements.md#non-functional-requirements) — Shadcn UI components | (architectural — verified by code review) |
| [NFR6](../../specs/feature-requirements.md#non-functional-requirements) — Accessible keyboard navigation | AC-25, AC-26 |

## API Endpoints (from OpenAPI spec)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PUT | `/v1/payments/park` | Bulk-park selected payments by ID |
| PUT | `/v1/payments/unpark` | Bulk-unpark selected payments by ID |
| GET | `/v1/payments` | Re-fetch payment list after mutation (post-mutation refresh) |

### Request Body (both park and unpark)

```typescript
interface BulkActionRequest {
  PaymentIds: number[];   // Array of Payment.Id values for selected rows
}
```

No endpoints are missing — `PUT /v1/payments/park` and `PUT /v1/payments/unpark` are both defined in the OpenAPI spec.

## Implementation Notes

### Selection State

Track selected payment IDs in a `Set<number>` in component state (or a `Record<number, boolean>` map). Store IDs, not row indices, so selections survive re-sorts and remain correct on re-fetch. Clear the selection set:
- After a successful Park or Unpark call (BR6)
- When the AgencyName filter changes (AC-7)
- When the user navigates between pages (AC-6 — page-scoped selection: only current-page rows are selectable; switching pages clears the selection for the new page's rows)

### Header Checkbox Indeterminate State

The Shadcn `Checkbox` component supports `checked={true | false | "indeterminate"}`. Compute:
- All selected → `checked={true}`
- None selected → `checked={false}`
- Some selected → `checked="indeterminate"`

### Park/Unpark API Calls

Use `parkPayments(ids)` and `unparkPayments(ids)` from `@/lib/api/endpoints` — these are already implemented and wrap `PUT /v1/payments/park` and `PUT /v1/payments/unpark` respectively. Do not call `put()` directly from `@/lib/api/client`. Both endpoints return `200` on success with no meaningful body. On non-2xx, display the failure toast (R16, BR6 does not apply on failure — keep selections so the user can retry).

### Shared Utilities

Any column rendering touched by this story uses `formatCurrency` / `formatDate` from `@/lib/utils/format` (consistent with Story 3.1).

### Data Types

`getPayments()` from `@/lib/api/endpoints` returns `NormalisedPaymentRead[]`, where `Status` is `{ StatusCode: string }` (not a plain string — see BA-4 normalisation in `endpoints.ts`). Use `payment.Status?.StatusCode` when reading the status value.

### Post-Mutation Refresh

After a successful park or unpark:
1. Clear the selection set
2. Set a loading state on the grid (or the action button spinner)
3. Re-fetch `GET /v1/payments`
4. Update the payments state with the fresh list
5. Reset pagination to page 1 (the data has changed so the current page index may be stale). Use `PAGINATION.DEFAULT_PAGE_SIZE` from `@/lib/utils/constants` for any page-size calculations, consistent with Story 3.1.

### Shadcn Components to Use

- `Checkbox` — per-row and header checkboxes (supports indeterminate)
- `Button` — Park and Unpark action buttons (use `disabled` prop when no rows selected)
- Sonner `toast` — success and failure notifications

The `<Toaster duration={5000} />` is already registered globally in `app/layout.tsx`, so the 5-second auto-dismiss in AC-23 is satisfied without passing `duration` on each `toast.success()` / `toast.error()` call. For differentiated durations, use `TOAST_SETTINGS.SUCCESS_DURATION` (3000ms) or `TOAST_SETTINGS.ERROR_DURATION` (7000ms) from `@/lib/utils/constants` as an explicit `{ duration: ... }` override.

Install any missing Shadcn components via MCP before use.

### Test Notes

This story is routable (`/payment-management`) — a Playwright spec must be created at `web/e2e/epic-3-story-2-row-selection-park-unpark.spec.ts`. The spec should cover:
- Select rows: tick individual and header checkboxes, assert button states.
- Park happy path: select rows, click Park, assert success toast, assert selections cleared, assert grid re-renders.
- Unpark happy path: select rows, click Unpark, assert success toast.
- Disabled state: load page with no selections, assert Park and Unpark buttons are disabled.
- Failure: mock park call failure, assert error toast, assert selections preserved.
