# Test Handoff: Row Selection, Park/Unpark Bulk Actions, and Post-Mutation Refresh

> Engineering document for downstream agents. Not reviewed by the BA.

**Source:** [story-2-row-selection-park-unpark-test-design.md](./story-2-row-selection-park-unpark-test-design.md)
**Epic:** 3 | **Story:** 2

## Coverage for WRITE-TESTS

Every AC from the story maps to at least one example. Format: `- AC-N: [description] → Example N, Example M`

- AC-1: Per-row checkbox visible and initially unchecked → Example 1
- AC-2: Header checkbox visible in table header → Example 1, Example 2
- AC-3: Ticking header checkbox selects all current-page rows → Example 2
- AC-4: Unticking header checkbox deselects all current-page rows → Example 3
- AC-5: Header checkbox shows indeterminate state for partial selection → Example 4
- AC-6: Navigating to a new page starts with empty selection → Edge Example 1
- AC-7: Changing AgencyName filter clears selections → Edge Example 2
- AC-8: Park button is enabled when one or more rows are selected → Example 5, Example 6
- AC-9: Park button calls `PUT /v1/payments/park` with selected IDs → Example 6
- AC-10: Park success — success toast, clear selections, re-fetch, re-render → Example 6
- AC-11: Park button is visibly disabled when no rows are selected → Example 5
- AC-12: Clicking disabled Park makes no API call and shows no toast → Example 5
- AC-13: Unpark button is enabled when one or more rows are selected → Example 7, Example 8
- AC-14: Unpark button calls `PUT /v1/payments/unpark` with selected IDs → Example 8
- AC-15: Unpark success — success toast, clear selections, re-fetch, re-render → Example 8
- AC-16: Unpark button is visibly disabled when no rows are selected → Example 7
- AC-17: Clicking disabled Unpark makes no API call and shows no toast → Example 7
- AC-18: After successful mutation, grid shows updated statuses from re-fetched data → Example 9
- AC-19: Loading indicator shown during post-mutation re-fetch → Example 9
- AC-20: Park failure — error toast with descriptive message → Example 10
- AC-21: Unpark failure — error toast with descriptive message → Example 11
- AC-22: Selections preserved on mutation failure (so user can retry) → Example 10, Example 11
- AC-23: Toast auto-dismisses after 5 seconds → Edge Example 3
- AC-24: Toast dismissed immediately when user clicks dismiss control → Edge Example 3
- AC-25: All interactive elements reachable via Tab with visible focus indicators → Edge Example 4
- AC-26: Disabled Park/Unpark buttons expose disabled state to screen readers → Example 5

## Implementation Targets

Required machine-readable contract for the IMPLEMENT phase. Every file the developer agent will create or modify.

- `web/src/app/(protected)/payment-management/page.tsx → modify` — add `selectedIds: Set<number>` state; wire up header and row `Checkbox` components; add `handlePark` and `handleUnpark` async handlers that call `parkPayments` / `unparkPayments`, manage loading state, clear selections on success, preserve selections on failure, and trigger `GET /v1/payments` re-fetch; add `isParking` / `isUnparking` loading flags; pass selection state and handlers to the grid/toolbar; reset pagination to page 1 after successful mutation; clear selection on page change and on filter change.
- `web/src/app/(protected)/payment-management/page.tsx → modify` — add Park and Unpark `Button` components to the toolbar above the grid, with `disabled={selectedIds.size === 0}` (native disabled attribute — removes buttons from Tab order per BA-2 resolution); add a grid loading overlay or skeleton visible during the post-mutation re-fetch per BA-1 resolution.
- `web/e2e/epic-3-story-2-row-selection-park-unpark.spec.ts → create` — Playwright spec covering: select rows and verify button states; Park happy path (mock `PUT /v1/payments/park` → 200, assert toast + cleared selections + re-fetched grid); Unpark happy path; disabled state (no selection → buttons disabled); Park failure (mock 500 → assert error toast and preserved selections).

Note: No new utility files, API endpoint files, or Shadcn component installations are expected for this story. `parkPayments` and `unparkPayments` are already implemented in `web/src/lib/api/endpoints.ts`. `Checkbox` and `Button` from Shadcn and `toast` from Sonner are already available. `TOAST_SETTINGS.SUCCESS_DURATION` / `ERROR_DURATION` constants are available in `web/src/lib/utils/constants.ts`.

## Handoff Notes for WRITE-TESTS

- Only generate executable tests from examples in the test-design document.
- Do not invent behavior not represented there or explicitly approved by the BA.
- **renderScope (machine-readable):** `component` — this story modifies an existing page introduced in Story 3.1 (target file: `web/src/app/(protected)/payment-management/page.tsx`). API endpoints in scope: `parkPayments(ids)` and `unparkPayments(ids)` from `@/lib/api/endpoints`. The route `/payment-management` already has a Playwright spec from Story 3.1. The Vitest tests for this story target the selection state and mutation behavior at component level; the Playwright spec is a NEW file for this story covering the E2E flow.
- **MSW handlers required:**
  - `PUT /v1/payments/park` → 200 (success) and 500 (failure)
  - `PUT /v1/payments/unpark` → 200 (success) and 500 (failure)
  - `GET /v1/payments` → standard list response (used for both initial load and post-mutation re-fetch; chain `mockResolvedValueOnce` if the second call should return a modified dataset)
- **Preferred primary assertions (Vitest/RTL):**
  - `getByRole('checkbox', { name: /select all/i })` for the header checkbox
  - `getByRole('checkbox', { name: /select payment/i })` or row-level checkboxes for per-row selection
  - `getByRole('button', { name: /park/i })` and `getByRole('button', { name: /unpark/i })` for button state assertions
  - `expect(button).toBeDisabled()` for disabled state
  - `getByText(/payments parked successfully/i)` for success toast
  - `getByText(/failed to park/i)` for error toast
  - Assert that `parkPayments` mock was called with `[201, 203]` (exact ID array)
  - Assert that `getPayments` mock was called a second time after a successful mutation
- **Ambiguity flags:**
  - **BA-1 (loading indicator location — resolved):** The grid body shows a loading overlay or skeleton during the re-fetch (Option B approved). Assert that a grid-level loading indicator is visible immediately after the mutation call is made and before the re-fetch resolves. Use `getByRole('status')` or `data-testid="grid-loading"` as the target element.
  - **BA-2 (disabled buttons in Tab order — resolved):** Disabled Park/Unpark buttons use the native `disabled` attribute (Option A approved). Tests should assert `expect(button).toBeDisabled()`. Do not assert `tabIndex` or `aria-disabled` — the native attribute is the source of truth and the Shadcn Button default.
  - **Toast message exact text:** The story gives example strings (e.g., "Payments parked successfully."). Until the BA confirms exact wording, use case-insensitive partial match assertions (`/parked successfully/i`, `/failed to park/i`, `/unparked successfully/i`, `/failed to unpark/i`).
  - **Indeterminate checkbox assertion in RTL:** The Shadcn Checkbox passes `aria-checked="mixed"` for the indeterminate state. Assert `expect(headerCheckbox).toHaveAttribute('aria-checked', 'mixed')`.
  - **Post-mutation page reset:** Tests should verify that after a successful mutation the displayed page number resets to 1 (if a page indicator element is rendered). If no page indicator is rendered, assert that the first-page rows are visible.

## Testability Classification

| Scenario | Category | Reason |
| --- | --- | --- |
| Example 1 — Row checkboxes appear on each row | Unit-testable (RTL) | Component renders checkbox elements based on the payment data array; fully exercisable in jsdom |
| Example 2 — Ticking header checkbox selects all rows | Unit-testable (RTL) | Checkbox state and selection logic is pure component state; no Next.js routing layer involved |
| Example 3 — Unticking header checkbox deselects all rows | Unit-testable (RTL) | Mirrors Example 2; pure state transition |
| Example 4 — Indeterminate state for partial selection | Unit-testable (RTL) | `aria-checked="mixed"` is driven by computed selection count; assertable in jsdom |
| Example 5 — Buttons disabled when no selection; clicking disabled button has no effect | Unit-testable (RTL) | Button disabled state is purely derived from `selectedIds.size === 0`; assertable without real routing |
| Example 6 — Park happy path | Unit-testable (RTL) | Mocking `parkPayments` and `getPayments` via MSW/vi.mock covers the full interaction chain in jsdom; toast, cleared selection, and re-render are all assertable |
| Example 7 — Unpark button enabled/disabled | Unit-testable (RTL) | Same pattern as Example 5 |
| Example 8 — Unpark happy path | Unit-testable (RTL) | Same pattern as Example 6 with `unparkPayments` mock |
| Example 9 — Post-mutation refresh (updated statuses + loading indicator) | Unit-testable (RTL) | Updated row content and loading indicator can be asserted in RTL with a delayed mock response; loading state is component-local |
| Example 10 — Park failure path | Unit-testable (RTL) | Error toast and preserved selections are component-level behaviors; MSW can simulate 500 response |
| Example 11 — Unpark failure path | Unit-testable (RTL) | Same pattern as Example 10 |
| Edge 1 — Page navigation clears selection | Data-contract | Selection-clearing on page change is driven by component state, but the page-navigation control is wired to the paginated dataset. The interaction between page controls and selection state should be verified in a running browser to confirm the wiring is correct end-to-end |
| Edge 2 — Filter change clears selection | Data-contract | Filter-change → selection-clear depends on the AgencyName filter driving both the visible rows and the selection reset; the full chain benefits from browser verification |
| Edge 3 — Toast auto-dismiss and manual dismiss | Unit-testable (RTL) | Sonner toast with 5-second duration is testable via `vi.useFakeTimers()`; manual dismiss via click is a standard RTL interaction |
| Edge 4 — Keyboard navigation | Runtime-only | Verified by Playwright spec (keyboard Tab navigation in a real browser) and by visual inspection; jsdom focus simulation is unreliable for multi-element Tab-order verification |
| Edge 5 — Single-row page select-all | Unit-testable (RTL) | Edge case of the same header-checkbox logic; assertable in jsdom with a one-item dataset |

## Runtime Verification Checklist

These items cannot be fully verified by automated tests and must be checked during QA manual verification.

**Data-contract items (verify in browser with real API):**

- [ ] On page 1, select rows 101 and 103. Click "Next" to go to page 2. Verify all page-2 checkboxes are unchecked and the Park and Unpark buttons are disabled.
- [ ] Select several rows on page 1. Change the AgencyName filter to a specific agency. Verify the filter updates the grid and all checkboxes are unchecked after the filter change.

**Runtime-only items (Playwright + keyboard testing):**

- [ ] With the payment grid loaded, press Tab repeatedly. Verify that the header checkbox, each row's checkbox, and the Park and Unpark buttons are all reachable in sequence and each shows a visible focus ring when focused.
- [ ] With no rows selected, Tab to the disabled Park button. Verify that the screen reader (or browser accessibility inspection) announces the button as disabled.
- [ ] Select rows, click Park, and while the re-fetch is in progress verify that the grid body shows a loading overlay or skeleton (not a spinner on the button). After the re-fetch completes, verify the overlay disappears and the grid shows updated statuses.
