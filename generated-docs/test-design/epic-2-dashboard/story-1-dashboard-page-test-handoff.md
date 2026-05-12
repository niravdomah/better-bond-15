# Test Handoff: Dashboard Page with Metric Cards and Report Grids

> Engineering document for downstream agents. Not reviewed by the BA.

**Source:** [story-1-dashboard-page-test-design.md](./story-1-dashboard-page-test-design.md)
**Epic:** 2 | **Story:** 1

## Resolved BA Decisions (locked values for test generation)

All four BA decisions are resolved. Use these exact values — do not substitute alternatives or partial matches.

| Decision | Resolved value |
| --- | --- |
| BA-1 — Error placeholder in metric cards | Exact literal string `"— error loading —"` (em-dash + space + "error loading" + space + em-dash). Applies to all four value slots: Ready to Pay count, Payments Made count, Payments Made total value, Parked count. |
| BA-2 — Toast message on API failure | Exact verbatim string `"Failed to load dashboard data. Please try again."`. Assert with `getByText(...)` exact match, not `toContain`. |
| BA-3 — `TotalPaymentCountInLast14Days` zero vs absent | `0` (present, value zero) → display `"0"`. Absent / `null` / `undefined` → display `"—"` (single em-dash). These are two distinct branches — Edge 2 covers zero, Edge 2b covers absent/null. |
| BA-4 — Status "REG" match rule | Exact case-insensitive equality: `status.toLowerCase() === 'reg'`. Substring matches (e.g. "DEREGISTERED") do NOT count. Edge 4 includes a row with Status "DEREGISTERED" (PaymentCount 4) to prove it is excluded. |

## Coverage for WRITE-TESTS

Every AC from the story mapped to at least one example. AC identifiers are from the story file.

- AC-1: Unauthenticated user redirected to `/auth/signin` → Example 1
- AC-2: `getDashboard()` called exactly once on mount → Example 2
- AC-3: All three metric cards, Payment Status grid, and Parked Payments Aging grid visible after load → Example 6
- AC-4: Skeleton placeholders visible during in-flight fetch → Example 5
- AC-5: Skeletons replaced by real data on response received → Example 6
- AC-6: "Ready to Pay" count = sum of PaymentCount for rows where `status.toLowerCase() === 'reg'` (exact match) → Example 3, Edge 4
- AC-7: "Ready to Pay" count is a plain integer (no currency formatting) → Example 3
- AC-8: "Payments Made" count = `TotalPaymentCountInLast14Days` when present and non-zero → Example 3, Example 14; zero case → Edge 2; absent/null case → Edge 2b
- AC-9: "Payments Made" total value = sum of `TotalCommissionCount`, formatted `R 1,234,567.89` → Example 3
- AC-10: `PaymentsByAgency` empty → total shows `R 0.00` → Example 14
- AC-11: "Parked" count = sum of PaymentCount for PARKED-status rows → Example 3
- AC-12: "Parked" count is a plain integer → Example 3
- AC-13: Metric card values do not change when agency filter applied → Example 4, Example 10
- AC-14: Payment Status Report grid column order: Status, PaymentCount, TotalPaymentAmount, CommissionType, AgencyName → Example 7
- AC-15: Payment Status Report rows bound to `PaymentStatusReportItem` fields → Example 7
- AC-16: `TotalPaymentAmount` column formatted with `formatCurrency` → Example 7
- AC-17: Numeric columns use `tabular-nums` styling → Example 7 (structural assertion)
- AC-18: Parked Payments Aging grid column order: Range, AgencyName, PaymentCount → Example 8
- AC-19: Parked Payments Aging rows bound to `ParkedPaymentsAgingReportItem` fields → Example 8
- AC-20: `PaymentCount` column uses `tabular-nums` styling → Example 8 (structural assertion)
- AC-21: AgencyName dropdown populated from distinct union of both arrays, sorted alphabetically → Example 9
- AC-22: First dropdown option is "All Agencies" → Example 9
- AC-23: "All Agencies" selected → both grids show all rows → Example 9, Example 11
- AC-24: Agency selected → both grids show only rows matching that agency → Example 10
- AC-25: "All Agencies" re-selected → both grids revert to all rows → Example 11
- AC-26: Agency selected, zero Payment Status Report rows match → empty-state message shown → Example 12 (variant)
- AC-27: Agency selected, zero Parked Payments Aging rows match → empty-state message shown → Example 12 (variant), Edge 3
- AC-28: API failure → toast exact text `"Failed to load dashboard data. Please try again."` → Example 13
- AC-29: API failure → each metric card shows exact placeholder `"— error loading —"` → Example 13
- AC-30: API failure → both grids hidden/not rendered → Example 13
- AC-31: API failure → no `<Alert />` component visible → Example 13
- AC-32: Tab key reaches AgencyName dropdown; visible focus indicator → Edge 5
- AC-33: Keyboard-only dropdown selection filters grids → Edge 5
- AC-34: Report grids use semantic table markup (`<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`) → Example 7, Example 8

## Render Scope

> Advisory guidance for the WRITE-TESTS phase. The test-generator agent determines the final split.

**Primary Vitest + RTL scope:** Full page component render targeting `app/(protected)/page.tsx`. Mock `getDashboard` at the module level via `vi.mock('@/lib/api/endpoints', ...)`. This covers Examples 2–14 and Edges 1–4.

**Playwright spec:** Required — this story is routable (`/`). Create `web/e2e/epic-2-story-1-dashboard-page.spec.ts`. Suggested coverage:
- (a) Auth redirect: visit `/` unauthenticated, assert redirect to `/auth/signin` (Example 1)
- (b) Happy path: sign in, navigate to `/`, assert the three metric cards and both grids are visible with real values (Example 3, Example 6)
- (c) Agency filter: select an agency from the dropdown, assert both grids update (Example 10)
- (d) API failure: mock the backend to return 500, assert toast text and that grids are hidden (Example 13)

**Edge 5 (keyboard):** Route to Playwright — keyboard interaction on a real Select component requires a real browser for reliable focus-ring and aria-expanded behaviour.

## Handoff Notes for WRITE-TESTS

- Only generate executable tests from examples in the test-design document.
- Do not invent behavior not represented there or explicitly approved.
- The existing template welcome page content at `app/(protected)/page.tsx` must not appear in any assertion — it is replaced by this story's implementation.
- All BA decisions are fully resolved; do not use "working value" fallbacks — use the locked strings and rules in the "Resolved BA Decisions" table above.

### Locked assertion strings

```
ERROR_PLACEHOLDER  = "— error loading —"      // exact; em-dash U+2014
TOAST_TEXT         = "Failed to load dashboard data. Please try again."   // exact
ZERO_COUNT_DISPLAY = "0"                       // TotalPaymentCountInLast14Days === 0
ABSENT_COUNT_DISPLAY = "—"                     // TotalPaymentCountInLast14Days absent/null/undefined; single em-dash U+2014
REG_MATCH_RULE     = status.toLowerCase() === 'reg'   // exact equality, not includes
```

### Suggested primary assertions

- **Example 2:** `getDashboard` mock called exactly once after render (`expect(getDashboard).toHaveBeenCalledTimes(1)`).
- **Example 3:** `getByRole('heading', { name: /ready to pay/i })` + adjacent value element contains `42`. Similarly for Parked (`7`) and Payments Made count (`18`) and total (`R 234,567.89`). Assert `PARKED` and `MAN-PAY` row counts are NOT included in Ready to Pay.
- **Example 4:** After selecting agency, same value assertions as Example 3 still pass.
- **Example 5:** During loading (before mock resolves), assert `Skeleton` elements are present. Use a promise that does not resolve immediately in the mock.
- **Example 6:** After mock resolves, `Skeleton` elements gone; data values visible.
- **Example 7:** `getByRole('table')` for Payment Status grid; assert column headers in order via `getAllByRole('columnheader')`; assert first data row cells including `R 456,789.00`.
- **Example 8:** Same pattern for Parked Payments Aging grid.
- **Example 9:** `getByRole('combobox')` or `getByLabelText('Agency')` for dropdown; assert options list is "All Agencies", "Aardvark Realty", "BlueSky Bonds", "City Homes" in that exact order.
- **Example 10:** After selecting agency, assert row count in each grid table body.
- **Example 11:** After re-selecting "All Agencies", assert row count is back to full.
- **Example 12 variant:** After selecting an agency with no Parked rows, assert empty-state message text is present in the Parked grid area.
- **Example 13:** Mock `getDashboard` to reject. Assert toast text is exactly `"Failed to load dashboard data. Please try again."`. Assert `<table>` elements not in document. Assert no `role="alert"` from an `<Alert />` component. Assert all four metric card value slots each contain exactly `"— error loading —"`.
- **Example 14:** Mocked response with `PaymentsByAgency: []` and `TotalPaymentCountInLast14Days: 5`. Assert count shows `5` and total shows `R 0.00`.
- **Edge 2:** All-empty response with `TotalPaymentCountInLast14Days: 0`. Assert Payments Made count shows `"0"` (not `"—"`).
- **Edge 2b:** Response with `TotalPaymentCountInLast14Days` missing. Assert Payments Made count shows `"—"` (single em-dash).
- **Edge 4:** Dataset includes Status `"DEREGISTERED"` with PaymentCount 4. Assert Ready to Pay count does NOT include those 4. Only `"REG"` and `"reg"` exact matches count.
- **Edge 5:** Use Playwright for keyboard interaction (Tab + arrow key + Enter on the Select dropdown).

### Tabular-nums assertion

AC-17 and AC-20 require `tabular-nums` on numeric columns. Assert the Tailwind class is applied by checking the rendered `<td>` element's class list contains `tabular-nums`. This is a structural assertion (class presence) — acceptable here because the class directly drives a user-visible alignment behaviour required by the AC.

### `formatCurrency` in grid

AC-16 requires `TotalPaymentAmount` to be formatted via `formatCurrency`. Assert the rendered cell text equals `"R 456,789.00"` for the dataset value `456789.00`. Do not test `formatCurrency` internals here — those are covered by Story 1.3 tests.

### Important notes

- **BA-5 (unfiltered empty grid display):** No AC covers the case where both API arrays are empty and no filter is active. Working assumption: show table with headers and an empty body (no empty-state message), because AC-26/27 specify the empty-state message only for the filtered case. If implementation shows a message in the unfiltered-empty case too, this is acceptable — just do not assert the message's presence or absence in that specific scenario.
- **Playwright spec required:** This story is routable (`/`). Create `web/e2e/epic-2-story-1-dashboard-page.spec.ts`. See Render Scope section above for the four suggested Playwright scenarios. The QA phase halts if a routable story has no spec file.

## Testability Classification

| Scenario | Category | Reason |
| --- | --- | --- |
| Example 1 — Unauthenticated redirect to `/auth/signin` | Runtime-only | Middleware redirect requires the real Next.js routing stack; jsdom cannot exercise it |
| Example 2 — Single API call on mount | Unit-testable (RTL) | Component test asserting mock call count after render |
| Example 3 — Metric card derived values | Unit-testable (RTL) | Component renders derived counts/values from mocked API response; includes REG exact-match rule (BA-4) |
| Example 4 — Metric cards unchanged when filter applied | Unit-testable (RTL) | Component renders same card values after simulated dropdown interaction |
| Example 5 — Loading skeleton placeholders | Unit-testable (RTL) | Component test with unresolved promise mock; assert Skeleton elements present |
| Example 6 — Skeletons replaced by data | Unit-testable (RTL) | Extension of Example 5; assert Skeleton gone and data cells present after mock resolves |
| Example 7 — Payment Status Report grid columns and binding | Unit-testable (RTL) | Component renders table from mocked data; assert headers and first row cell values |
| Example 8 — Parked Payments Aging grid columns and binding | Unit-testable (RTL) | Same pattern as Example 7 |
| Example 9 — AgencyName dropdown populated and ordered | Data-contract | Dropdown options derived from live API response; dedup and sort logic must be verified in the running app to confirm the component → `getDashboard` → mock → dropdown chain is wired correctly |
| Example 10 — Agency filter: both grids filter simultaneously | Data-contract | Client-side filter on live API data; correct filtering behaviour requires the full component → data → filter → render chain to be intact |
| Example 11 — Clearing filter restores all rows | Data-contract | Same reasoning as Example 10 |
| Example 12 — Empty-state message on zero-match filter | Data-contract | Same reasoning as Example 10; empty-state logic depends on filtered row count |
| Example 13 — API failure: toast, error placeholders, grids hidden | Unit-testable (RTL) | Mock `getDashboard` to reject; assert exact toast string, exact placeholder string in all four card value slots, and table absence |
| Example 14 — `PaymentsByAgency` empty → `R 0.00` | Unit-testable (RTL) | Mocked response with empty array; assert card shows `R 0.00` |
| Edge 1 — `PaymentsByAgency` absent | Unit-testable (RTL) | Mocked response without the key; assert graceful `R 0.00` fallback |
| Edge 2 — Both report arrays empty, count present and zero | Unit-testable (RTL) | Mocked all-empty response with `TotalPaymentCountInLast14Days: 0`; assert Payments Made count shows `"0"` |
| Edge 2b — `TotalPaymentCountInLast14Days` absent/null | Unit-testable (RTL) | Mocked response with missing/null count field; assert Payments Made count shows `"—"` (single em-dash) |
| Edge 3 — Agency in one array only | Data-contract | Requires live API data shape to verify union dedup and per-grid filtering for an agency missing from one array |
| Edge 4 — Status exact match with "DEREGISTERED" probe row | Unit-testable (RTL) | Pure derivation logic; assert count excludes DEREGISTERED rows and includes only exact "REG" matches |
| Edge 5 — Keyboard-only dropdown selection | Runtime-only | Keyboard interaction on a real Select component requires a real browser; RTL keyboard simulation does not exercise focus management and aria-expanded reliably |

## Runtime Verification Checklist

These items cannot be fully verified by automated tests and must be checked during QA manual verification.

**Runtime-only (requires real Next.js routing):**

- [ ] Visit `/` in a browser without signing in; confirm the page redirects to `/auth/signin` with no flash of dashboard content.
- [ ] After signing in, confirm the browser URL is `/` and the dashboard page is fully rendered (no redirect back to sign-in).

**Data-contract (filter chain must be verified in the running app):**

- [ ] Open the AgencyName dropdown and confirm the list shows "All Agencies" followed by agency names in alphabetical order, with no duplicates, even when the same agency name appears in both the Payment Status Report and the Parked Payments Aging Report arrays.
- [ ] Select an agency from the dropdown and confirm both the Payment Status Report table and the Parked Payments Aging Report table immediately update to show only rows for that agency.
- [ ] Re-select "All Agencies" and confirm both tables revert to showing all rows.
- [ ] Select an agency that has no rows in the Parked Payments Aging Report; confirm that grid shows the empty-state message rather than a blank table body.
- [ ] Select an agency that appears in only one of the two report arrays; confirm the other grid shows the empty-state message.

**Keyboard accessibility (requires real browser for reliable focus management):**

- [ ] Tab through the dashboard; confirm the AgencyName dropdown receives a visible focus ring when reached.
- [ ] With the dropdown focused, press Space or Enter to open it; use arrow keys to navigate to an agency; press Enter to confirm; confirm both grids filter to that agency without using the mouse.
