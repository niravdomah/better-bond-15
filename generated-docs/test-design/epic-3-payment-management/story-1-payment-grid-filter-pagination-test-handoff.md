# Test Handoff: Payment Management Grid with Filtering and Pagination

> Engineering document for downstream agents. Not reviewed by the BA.

**Source:** [story-1-payment-grid-filter-pagination-test-design.md](./story-1-payment-grid-filter-pagination-test-design.md)
**Epic:** 3 | **Story:** 1

## Coverage for WRITE-TESTS

Every AC from the story file is mapped to at least one example.

- AC-1: Unauthenticated user is redirected to `/auth/signin` → Example 1
- AC-2: Page calls `GET /v1/payments` exactly once on mount → Example 2
- AC-3: Grid is visible with rows populated from PaymentList → Example 2
- AC-4: Grid shows exactly 13 columns in the specified order → Example 3
- AC-5: CommissionPercent is NOT shown as a column → Example 3
- AC-6: Monetary columns formatted as `R 1,234,567.89` → Example 4, Edge Example 4
- AC-7: Date columns displayed in human-readable format (DD MMM YYYY) → Example 5, Edge Example 3
- AC-8: 45 records → first 20 shown, pagination controls visible → Example 2, Example 6
- AC-9: Clicking "Next" shows rows 21–40, Previous becomes enabled → Example 6
- AC-10: Clicking "Previous" shows previous 20 records → Example 6
- AC-11: On the last page, "Next" is disabled → Example 6
- AC-12: On page 1, "Previous" is disabled → Example 7
- AC-13: 20 or fewer records → pagination controls visible, both buttons disabled (BA-2 resolved: Option B) → Edge Example 1
- AC-14: AgencyName dropdown populated with distinct values sorted alphabetically → Example 8
- AC-15: First dropdown option is "All Agencies" → Example 8
- AC-16: "All Agencies" selected → all records shown (subject to pagination) → Example 10
- AC-17: Selecting a specific agency filters grid to matching rows only → Example 9
- AC-18: Selecting "All Agencies" after a filter restores all rows → Example 10
- AC-19: Changing agency filter resets pagination to page 1 → Example 9, Edge Example 5
- AC-20: During in-flight fetch, skeleton placeholders visible → Example 11
- AC-21: After fetch completes, skeletons replaced by real rows → Example 11
- AC-22: Empty PaymentList → "No payments ready for processing." message → Example 13
- AC-23: Agency selected, no matching rows → "No payments ready for processing." → Edge Example 2
- AC-24: API failure → toast notification with failure message → Example 12
- AC-25: API failure → page shows error/empty state, does not crash → Example 12
- AC-26: Grid uses semantic table markup (`<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`) → (structural assertion in RTL tests)
- AC-27: Tab navigation reaches dropdown and pagination buttons with visible focus indicators → (keyboard navigation test — runtime-only)

## Implementation Targets

Required machine-readable contract for the IMPLEMENT phase. Files the developer agent should create or modify for this story.

- `web/src/app/(protected)/payment-management/page.tsx → modify` — replace existing route stub entirely; primary export is the `PaymentManagementPage` client component; fetches via `getPayments()` from `@/lib/api/endpoints`; manages `paymentList`, `isLoading`, `error`, `selectedAgency`, and `currentPage` state; renders the filter dropdown, grid table, pagination controls, and Sonner toast on error; scoped to read-only grid + filter + pagination (Park/Unpark/Initiate are Stories 3.2 and 3.3)
- `web/src/lib/api/endpoints.ts → modify` — add `getPayments()` function that calls `GET /v1/payments`, unwraps the `PaymentReadList` envelope, and normalises each `Status` field from raw string to `{ StatusCode: string }`
- `web/src/types/api-generated.ts → modify PaymentRead.Status` — from `string` to `{ StatusCode: string }` per the normalisation requirement; add `BatchId?: number` if not already present
- `web/e2e/epic-3-story-1-payment-grid-filter-pagination.spec.ts → create` — Playwright spec covering auth redirect, happy-path grid render, agency filter, empty state, and error state

Note: `web/src/lib/utils/format.ts` and `web/src/lib/utils/constants.ts` are already implemented from Story 2.1 and must be imported as-is. Do not modify those files for this story.

## Handoff Notes for WRITE-TESTS

- Only generate executable tests from examples in the test-design document
- Do not invent behavior not represented there or explicitly approved
- **renderScope (machine-readable):** `page` — this is the first routable story for the `/payment-management` route; target file is `web/src/app/(protected)/payment-management/page.tsx` (modify existing — replace stub); shared utility imports from `@/lib/utils/format` and `@/lib/utils/constants`; API endpoint `getPayments()` from `@/lib/api/endpoints`; page is scoped to the read-only grid + filter + pagination only
- All three BA decisions are now resolved:
  - BA-1 (empty list dropdown): Option C — dropdown is shown as **enabled** with only "All Agencies" selectable; generate tests asserting the dropdown is present and not disabled when the API returns an empty list
  - BA-2 (exactly-20 pagination): Option B — pagination controls are **visible** but both Previous and Next buttons are **disabled**; generate tests asserting button presence and `disabled` attribute when record count equals page size
  - BA-3 (zero VAT display): Option A — VAT cell content is **"R 0.00"** for a numeric zero; generate tests asserting that value rather than "—"
- Preferred render scope: full page (the page component manages all state — filter, pagination, fetch)
- **Mock strategy:** Mock `@/lib/api/endpoints.getPayments` at the module level in Vitest tests. Return typed `PaymentRead[]` arrays. Do not mock `fetch` directly. For the Playwright spec, intercept `GET /v1/payments` at the network level via `page.route()`.
- Suggested primary assertions (Vitest/RTL):
  - `screen.getByRole('table')` — grid is present
  - Column headers: `screen.getByRole('columnheader', { name: 'Reference' })` etc. (all 13; verify CommissionPercent header absent)
  - `screen.getAllByRole('row')` length — accounts for header row + data rows
  - `screen.getByRole('combobox')` or `screen.getByRole('listbox')` — agency dropdown present and enabled (even when list is empty)
  - `screen.getByRole('button', { name: /previous/i })` and `/next/i` — pagination controls visible; check `disabled` attribute per BA-2
  - `screen.getByText('No payments ready for processing.')` — empty state message
  - Toast: use `screen.getByText(/failed to load payments/i)` (Sonner renders into a portal; ensure the test wraps the component in the Toaster provider or checks via `waitFor`)
- Important ambiguity flags:
  - AC-27 (keyboard focus indicator) is classified runtime-only; generate a note in the Playwright spec rather than a Vitest assertion
  - AC-26 (semantic markup) can be verified in RTL by querying `getByRole('table')`, `getAllByRole('columnheader')`, `getAllByRole('cell')` — no need for raw DOM queries

## Testability Classification

| Scenario | Category | Reason |
| --- | --- | --- |
| Example 1 — Auth redirect | Runtime-only | Next.js middleware redirect requires real routing stack; cannot be exercised in jsdom |
| Example 2 — Grid loads on mount (API call once, rows visible) | Unit-testable (RTL) | Mock `getPayments()`, render the page component, assert rows render and API called once |
| Example 3 — Exactly 13 columns, CommissionPercent absent | Unit-testable (RTL) | Assert all 13 column headers present and CommissionPercent header absent |
| Example 4 — Monetary formatting | Unit-testable (RTL) | Mock a payment with known numeric values; assert cell text matches "R 1,250,000.00" etc. |
| Example 5 — Date formatting | Unit-testable (RTL) | Mock a payment with known date strings; assert cell text matches "15 Mar 2024" etc. |
| Example 6 — Next/Previous pagination navigation | Unit-testable (RTL) | Mock 45 records; assert 20 rows, click Next (fireEvent/userEvent), assert new 20 rows and button states |
| Example 7 — Previous disabled on page 1 | Unit-testable (RTL) | Assert Previous button has `disabled` attribute on initial render |
| Example 8 — AgencyName dropdown options sorted alphabetically | Unit-testable (RTL) | Mock records with known agency names; assert dropdown options in order |
| Example 9 — Agency filter narrows grid rows | Data-contract | Filtering touches the component → mock data → UI chain; easy to mock but wiring from dropdown selection → filtered display is a full-stack concern |
| Example 10 — "All Agencies" restores full list | Data-contract | Same rationale as Example 9; filtering clear path involves full component state cycle |
| Example 11 — Loading skeleton during fetch | Unit-testable (RTL) | Use a never-resolving promise for `getPayments()`; assert skeleton rows visible |
| Example 12 — Error state: toast + no crash | Unit-testable (RTL) | Mock `getPayments()` to reject; assert toast text and empty/error state |
| Example 13 — Empty list empty state message | Unit-testable (RTL) | Mock `getPayments()` returning empty array; assert "No payments ready for processing." and dropdown enabled with only "All Agencies" (BA-1 resolved) |
| Edge 1 — Exactly 20 records, pagination controls visible and both buttons disabled | Unit-testable (RTL) | Mock 20 records; assert Next and Previous buttons are present and both carry `disabled` attribute (BA-2 resolved: Option B) |
| Edge 2 — Filter narrows to zero results | Data-contract | Selecting agency from dropdown → zero-result filtered list → empty-state message; component chain must wire correctly |
| Edge 3 — Null date renders as em-dash | Unit-testable (RTL) | Mock a payment with null GrantDate; assert "—" in the corresponding cell |
| Edge 4 — Zero VAT renders as "R 0.00" | Unit-testable (RTL) | Mock a payment with VAT: 0; assert "R 0.00" in the VAT cell (BA-3 resolved: Option A) |
| Edge 5 — Filter change resets pagination to page 1 | Data-contract | Page-reset on filter change requires real dropdown interaction + state update across two concerns |

## Runtime Verification Checklist

These items cannot be verified by automated tests and must be checked during QA manual verification.

**Runtime-only:**
- [ ] Visit `/payment-management` without signing in — browser should redirect to `/auth/signin` (middleware redirect; requires real Next.js routing)
- [ ] After signing in, visit `/payment-management` — grid should load without an additional sign-in prompt (verifies auth middleware passes the session correctly)
- [ ] Tab through the page and confirm focus indicator is visible on the AgencyName dropdown and on the Previous/Next buttons (keyboard accessibility — visual check)

**Data-contract (filter chain verification):**
- [ ] With real API data loaded, select an agency from the dropdown and confirm that only rows for that agency are shown in the grid (verifies component → dropdown state → filter logic → rendered rows chain)
- [ ] With an agency selected, select "All Agencies" and confirm all rows return (verifies filter-clear path)
- [ ] Navigate to page 2 using the Next button, then change the agency filter — confirm the grid snaps back to page 1 (verifies page-reset on filter change)
- [ ] Select an agency that has fewer than 20 payments — confirm the Next button is disabled and the row count matches the agency's payment count (verifies pagination boundary for filtered set)
- [ ] With real API data returning exactly 20 records, confirm both Previous and Next buttons are visible but disabled (BA-2: Option B)
- [ ] If a reset-demo flow is available, reset to a state where the API returns an empty list — confirm "No payments ready for processing." appears in the grid body and the AgencyName dropdown is still visible and enabled (BA-1: Option C)
