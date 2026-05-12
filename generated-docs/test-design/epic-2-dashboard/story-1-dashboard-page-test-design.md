# Test Design: Dashboard Page with Metric Cards and Report Grids

## Story Summary

**Epic:** 2 — Dashboard
**Story:** 1 of 1
**As a** payment administrator
**I want to** see a dashboard with key payment metric cards and filterable report grids
**So that** I can quickly review the payment status across all agencies and drill into agency-level data.

## Review Purpose

This document presents concrete business examples for BA review before executable tests are written.

Its purpose is to:
- surface missing business decisions
- let the BA review behavior using examples and expected outcomes
- provide an approved source for downstream test generation

## Business Behaviors Identified

- An unauthenticated user visiting `/` is redirected to the sign-in page and cannot access the dashboard.
- On page load the frontend makes exactly one call to `GET /v1/payments/dashboard`; the response drives all three metric cards and both grids.
- While the call is in-flight, skeleton placeholders appear in each metric card value slot and in the rows of each grid table.
- The "Ready to Pay" card shows the total count of payments whose Status field is exactly "REG" (case-insensitive exact match — `status.toLowerCase() === 'reg'`), summed across all rows in the Payment Status Report.
- The "Payments Made (Last 14 Days)" card shows both a plain count (`TotalPaymentCountInLast14Days`) and a formatted total monetary value (sum of `TotalCommissionCount` across the `PaymentsByAgency` array, formatted as `R 1,234,567.89`).
- The "Parked" card shows the total count of payments whose Status field contains "PARKED", summed across all rows in the Payment Status Report.
- Metric card values are derived from the full dataset and do not change when an agency is selected in the dropdown filter.
- The Payment Status Report grid shows five columns in this order: Status, PaymentCount, TotalPaymentAmount, CommissionType, AgencyName.
- The Parked Payments Aging Report grid shows three columns in this order: Range, AgencyName, PaymentCount.
- Currency values in the `TotalPaymentAmount` column are formatted as `R 1,234,567.89`.
- Numeric columns use tabular number rendering so digits align vertically across rows.
- The AgencyName dropdown is populated with the distinct union of agency names from both report arrays, sorted alphabetically, with "All Agencies" as the first (default) option.
- Selecting an agency filters both grids simultaneously using client-side logic only — no new API call is made.
- Selecting "All Agencies" clears the filter and restores all rows.
- When a filter is active and a grid has no matching rows, that grid shows an empty-state message rather than a blank table body.
- When the API call fails, a toast notification appears with the exact message `"Failed to load dashboard data. Please try again."`, each metric card shows the exact error placeholder `"— error loading —"`, and both grids are hidden. No inline alert banner is shown.
- The grids use semantic HTML table markup so screen readers can announce column headers alongside each cell value.
- The AgencyName dropdown is fully keyboard-operable and has a visible focus indicator.

## Key Decisions Surfaced by AI

All decisions have been resolved by the BA. Resolved values are baked into the examples below.

- **Error placeholder text in metric cards (AC-29):** Resolved as BA-1 — exact literal string `"— error loading —"` (em-dash, space, "error loading", space, em-dash).
- **Toast message exact wording (AC-28):** Resolved as BA-2 — exact verbatim string `"Failed to load dashboard data. Please try again."`. Tests must match this exact string, not a partial/contains match.
- **`TotalPaymentCountInLast14Days` zero vs absent (AC-8):** Resolved as BA-3 — `0` displays as `"0"`; absent/null/undefined displays as `"—"` (single em-dash). The two cases are distinguished.
- **Status "REG" matching rule (AC-6):** Resolved as BA-4 — exact case-insensitive equality (`status.toLowerCase() === 'reg'`). A status of e.g. "DEREGISTERED" would NOT count toward Ready to Pay.

## Test Scenarios / Review Examples

### 1. Unauthenticated user is redirected to sign-in

| Input | Value |
| --- | --- |
| User state | Not signed in |
| URL visited | `/` |

| Expected | Value |
| --- | --- |
| Browser destination | `/auth/signin` |
| Dashboard content visible | No — redirect happens before the page renders |

---

### 2. Page loads and calls the dashboard API exactly once

| Setup | Value |
| --- | --- |
| User state | Authenticated |
| Mock API response | Valid `PaymentsDashboardRead` (see dataset below) |

| Input | Value |
| --- | --- |
| Action | Navigate to `/` |

| Expected | Value |
| --- | --- |
| API calls made | 1 call to `GET /v1/payments/dashboard` |
| Calls made on any subsequent render without navigation | 0 additional calls |

**Sample dataset used in all "happy path" examples:**

`PaymentStatusReport`:

| Status | PaymentCount | TotalPaymentAmount | CommissionType | AgencyName |
| --- | --- | --- | --- | --- |
| REG | 24 | 456789.00 | Standard | Aardvark Realty |
| REG | 18 | 234567.89 | Standard | BlueSky Bonds |
| PARKED | 7 | 89123.45 | Standard | Aardvark Realty |
| MAN-PAY | 12 | 112000.00 | Standard | City Homes |

`ParkedPaymentsAgingReport`:

| Range | AgencyName | PaymentCount |
| --- | --- | --- |
| 0–30 days | Aardvark Realty | 3 |
| 31–60 days | Aardvark Realty | 2 |
| 61–90 days | BlueSky Bonds | 1 |
| 90+ days | City Homes | 1 |

`TotalPaymentCountInLast14Days`: 18

`PaymentsByAgency`:

| AgencyName | PaymentCount | TotalCommissionCount | Vat |
| --- | --- | --- | --- |
| Aardvark Realty | 10 | 145000.00 | 21750.00 |
| BlueSky Bonds | 8 | 89567.89 | 13435.18 |

---

### 3. Metric cards show correct derived values from API response

> Resolved decision (BA-4): "Ready to Pay" uses exact case-insensitive match — `status.toLowerCase() === 'reg'`. Only rows where Status is exactly "REG" (any case) contribute to the count. Rows with Status "PARKED", "MAN-PAY", or any value that merely contains "reg" as a substring (e.g. "DEREGISTERED") do NOT count.

| Setup | Value |
| --- | --- |
| API response | Dataset from Example 2 |

| Expected — Ready to Pay card | Value |
| --- | --- |
| Value shown | `42` (24 + 18 — sum of PaymentCount where Status exactly equals "REG") |
| Format | Plain integer, no currency symbol |
| PARKED row contribution | `0` — not counted |
| MAN-PAY row contribution | `0` — not counted |

| Expected — Payments Made (Last 14 Days) card | Value |
| --- | --- |
| Count shown | `18` (direct value of `TotalPaymentCountInLast14Days`, which is present and non-zero) |
| Total value shown | `R 234,567.89` (145000.00 + 89567.89 = 234,567.89, formatted per BR9) |

| Expected — Parked card | Value |
| --- | --- |
| Value shown | `7` (sum of PaymentCount from PARKED rows only) |
| Format | Plain integer, no currency symbol |

---

### 4. Metric cards do not change when an agency is selected

| Setup | Value |
| --- | --- |
| API response | Dataset from Example 2 |
| Initial state | "All Agencies" selected |

| Input | Value |
| --- | --- |
| Action | Select "Aardvark Realty" from the AgencyName dropdown |

| Expected | Value |
| --- | --- |
| Ready to Pay card value | Still `42` — unchanged |
| Payments Made count | Still `18` — unchanged |
| Payments Made total value | Still `R 234,567.89` — unchanged |
| Parked card value | Still `7` — unchanged |

---

### 5. Loading skeleton placeholders are shown while the fetch is in-flight

| Setup | Value |
| --- | --- |
| User state | Authenticated |
| API response | Delayed (in-flight) |

| Expected | Value |
| --- | --- |
| Metric card value areas | Skeleton placeholder elements visible in each of the three card value slots |
| Payment Status Report grid rows | Skeleton rows visible in place of data rows |
| Parked Payments Aging Report grid rows | Skeleton rows visible in place of data rows |
| Cards or grid headers | Visible (only values/rows are skeletonised, not the overall layout) |

---

### 6. Skeletons are replaced by real data once the fetch completes

| Setup | Value |
| --- | --- |
| Prior state | Skeleton placeholders shown (Example 5) |
| API response | Dataset from Example 2 now received |

| Expected | Value |
| --- | --- |
| Metric card value areas | Skeleton elements gone; real numeric values visible |
| Payment Status Report grid | Real data rows visible |
| Parked Payments Aging Report grid | Real data rows visible |

---

### 7. Payment Status Report grid columns and data binding

| Setup | Value |
| --- | --- |
| API response | Dataset from Example 2 |
| Filter | All Agencies (no filter) |

| Expected | Value |
| --- | --- |
| Column order (left to right) | Status, PaymentCount, TotalPaymentAmount, CommissionType, AgencyName |
| Row count | 4 rows (one per `PaymentStatusReportItem`) |
| Row 1 — Status | `REG` |
| Row 1 — PaymentCount | `24` |
| Row 1 — TotalPaymentAmount | `R 456,789.00` (formatted with `formatCurrency`) |
| Row 1 — CommissionType | `Standard` |
| Row 1 — AgencyName | `Aardvark Realty` |
| Markup | Semantic `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>` (headers), `<td>` (cells) |

---

### 8. Parked Payments Aging Report grid columns and data binding

| Setup | Value |
| --- | --- |
| API response | Dataset from Example 2 |
| Filter | All Agencies (no filter) |

| Expected | Value |
| --- | --- |
| Column order (left to right) | Range, AgencyName, PaymentCount |
| Row count | 4 rows |
| Row 1 — Range | `0–30 days` |
| Row 1 — AgencyName | `Aardvark Realty` |
| Row 1 — PaymentCount | `3` |
| Markup | Semantic `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>` (headers), `<td>` (cells) |

---

### 9. AgencyName dropdown is populated with alphabetical union from both report arrays

| Setup | Value |
| --- | --- |
| API response | Dataset from Example 2 |
| Agency names in PaymentStatusReport | Aardvark Realty, BlueSky Bonds, City Homes |
| Agency names in ParkedPaymentsAgingReport | Aardvark Realty, BlueSky Bonds, City Homes |

| Expected | Value |
| --- | --- |
| First dropdown option | "All Agencies" |
| Remaining options (alphabetical) | Aardvark Realty, BlueSky Bonds, City Homes |
| Total options | 4 (All Agencies + 3 distinct agencies) |
| Duplicates | None — the same agency name appearing in both arrays is listed only once |
| Default selected | "All Agencies" |

---

### 10. Agency filter — both grids filter simultaneously, metric cards unchanged

| Setup | Value |
| --- | --- |
| API response | Dataset from Example 2 |
| Initial state | "All Agencies" selected; both grids showing all rows |

| Input | Value |
| --- | --- |
| Action | Select "Aardvark Realty" from dropdown |

| Expected — Payment Status Report grid | Value |
| --- | --- |
| Rows visible | 2 (REG/24/Aardvark Realty and PARKED/7/Aardvark Realty only) |
| Rows hidden | BlueSky Bonds row, City Homes row |

| Expected — Parked Payments Aging Report grid | Value |
| --- | --- |
| Rows visible | 2 (0–30 days/Aardvark Realty and 31–60 days/Aardvark Realty only) |
| Rows hidden | BlueSky Bonds and City Homes rows |

| Expected — Metric cards | Value |
| --- | --- |
| All three values | Unchanged from Example 3 |

| Expected — API behaviour | Value |
| --- | --- |
| New API calls triggered by filter change | 0 — filtering is client-side only |

---

### 11. Clearing the filter restores all rows

| Setup | Value |
| --- | --- |
| Prior state | "Aardvark Realty" selected; both grids filtered (Example 10) |

| Input | Value |
| --- | --- |
| Action | Select "All Agencies" from dropdown |

| Expected | Value |
| --- | --- |
| Payment Status Report grid row count | 4 (all rows restored) |
| Parked Payments Aging Report grid row count | 4 (all rows restored) |

---

### 12. Empty-state message when no matching rows exist for selected agency

| Setup | Value |
| --- | --- |
| API response | Dataset from Example 2 |

| Input | Value |
| --- | --- |
| Action | Select "City Homes" from dropdown |

| Expected — Payment Status Report grid | Value |
| --- | --- |
| Rows visible | 1 (City Homes MAN-PAY row) |

| Expected — Parked Payments Aging Report grid | Value |
| --- | --- |
| Rows visible | 1 (City Homes / 90+ days row) |

---

_(Variant: for a grid with zero matches)_

| Setup | Value |
| --- | --- |
| API response | Dataset from Example 2 but `ParkedPaymentsAgingReport` has no City Homes row |

| Input | Value |
| --- | --- |
| Action | Select "City Homes" from dropdown |

| Expected — Parked Payments Aging Report grid | Value |
| --- | --- |
| Table body content | Empty-state message (e.g., "No data for selected agency") — not an empty table body |
| Table header row | Still visible |

---

### 13. API failure — toast appears, metric card error placeholders shown, grids hidden

> Resolved decision (BA-1): Error placeholder in each metric card is the exact literal string `"— error loading —"` (em-dash, space, "error loading", space, em-dash). This applies to the Ready to Pay count, the Payments Made count, the Payments Made total value, and the Parked count — all four value slots.

> Resolved decision (BA-2): Toast message is the exact verbatim string `"Failed to load dashboard data. Please try again."`. Tests must assert this full string, not a partial/contains match.

| Setup | Value |
| --- | --- |
| User state | Authenticated |
| API response | Network error (connection refused to `http://localhost:8042`) |

| Expected | Value |
| --- | --- |
| Toast notification text | `"Failed to load dashboard data. Please try again."` (exact string — no variation permitted) |
| Toast behaviour | Auto-dismisses after ~5 seconds; user can also dismiss it manually |
| Ready to Pay card value | `"— error loading —"` (exact literal string) |
| Payments Made count | `"— error loading —"` (exact literal string) |
| Payments Made total value | `"— error loading —"` (exact literal string) |
| Parked card value | `"— error loading —"` (exact literal string) |
| Payment Status Report grid | Not rendered / hidden |
| Parked Payments Aging Report grid | Not rendered / hidden |
| Inline alert (`<Alert />`) banner | Not present anywhere on the page |

---

### 14. `PaymentsByAgency` empty array — Payments Made total shows `R 0.00`

| Setup | Value |
| --- | --- |
| API response | `PaymentsByAgency` is `[]` (empty array); `TotalPaymentCountInLast14Days` is `5` (present, non-zero) |

| Expected | Value |
| --- | --- |
| Payments Made count | `5` (field is present and equals 5) |
| Payments Made total value | `R 0.00` (sum of empty array is zero) |

---

## Edge and Alternate Examples

### Edge 1. `PaymentsByAgency` field absent from API response

| Setup | Value |
| --- | --- |
| API response | `PaymentsByAgency` key is missing entirely (not present, not null, not an empty array) |

| Expected | Value |
| --- | --- |
| Payments Made total value | `R 0.00` (treated as zero, not an error) |
| Toast notification | Not shown (the rest of the response is valid) |

---

### Edge 2. Both report arrays empty, `TotalPaymentCountInLast14Days` present and zero

> Resolved decision (BA-3): When `TotalPaymentCountInLast14Days` is exactly `0` (field present, value zero), the Payments Made count displays `"0"`. See Edge 2b for the absent/null case.

| Setup | Value |
| --- | --- |
| API response | `PaymentStatusReport: []`, `ParkedPaymentsAgingReport: []`, `TotalPaymentCountInLast14Days: 0`, `PaymentsByAgency: []` |

| Expected — Metric cards | Value |
| --- | --- |
| Ready to Pay | `0` |
| Payments Made count | `"0"` (field is present and equals zero — displays as zero, not em-dash) |
| Payments Made total value | `R 0.00` |
| Parked | `0` |

| Expected — Grids | Value |
| --- | --- |
| Agency dropdown options | "All Agencies" only (no agency rows to derive names from) |

---

### Edge 2b. `TotalPaymentCountInLast14Days` absent or null in API response

> Resolved decision (BA-3): When `TotalPaymentCountInLast14Days` is absent from the response object, or is explicitly `null` or `undefined`, the Payments Made count displays `"—"` (single em-dash). This is distinct from the zero case in Edge 2.

| Setup | Value |
| --- | --- |
| API response | Valid response but `TotalPaymentCountInLast14Days` key is missing (or value is `null`) |

| Expected — Payments Made count | Value |
| --- | --- |
| Value shown | `"—"` (single em-dash — field is absent/null, not zero) |
| Payments Made total value | Unaffected — still derived from `PaymentsByAgency` normally |
| Toast notification | Not shown (the rest of the response is valid) |

---

### Edge 3. Agency name appears in only one of the two report arrays

| Setup | Value |
| --- | --- |
| API response | "Coastal Brokers" appears in `PaymentStatusReport` but not in `ParkedPaymentsAgingReport` |

| Expected | Value |
| --- | --- |
| Agency dropdown includes "Coastal Brokers" | Yes — union includes it |
| Selecting "Coastal Brokers" — Payment Status Report grid | Shows Coastal Brokers rows |
| Selecting "Coastal Brokers" — Parked Payments Aging Report grid | Shows empty-state message (no matching rows) |

---

### Edge 4. Status exact match — non-"REG" statuses and substrings do not count

> Resolved decision (BA-4): The "Ready to Pay" count uses `status.toLowerCase() === 'reg'` — exact case-insensitive equality. A status of "DEREGISTERED" (which contains "reg" as a substring) does NOT count toward Ready to Pay.

| Setup | Value |
| --- | --- |
| `PaymentStatusReport` rows | Status `"REG"` (PaymentCount 10), Status `"PARKED"` (PaymentCount 5), Status `"MAN-PAY"` (PaymentCount 3), Status `"DEREGISTERED"` (PaymentCount 4), Status `"reg"` (PaymentCount 2) |

| Expected — Ready to Pay count | Value |
| --- | --- |
| Total | `12` (10 from "REG" + 2 from "reg" — both are exact matches case-insensitively) |
| "PARKED" rows counted | No |
| "MAN-PAY" rows counted | No |
| "DEREGISTERED" rows counted | No (contains "reg" but is not an exact match) |

---

### Edge 5. Keyboard-only use of the AgencyName dropdown

| Setup | Value |
| --- | --- |
| User state | Authenticated; dashboard loaded with data |

| Input | Value |
| --- | --- |
| Action | Tab to AgencyName dropdown; press Enter/Space to open; use arrow keys to select "BlueSky Bonds"; press Enter to confirm |

| Expected | Value |
| --- | --- |
| Dropdown receives visible focus indicator on Tab | Yes |
| Both grids filter to BlueSky Bonds rows | Yes |
| Mouse not used at any point | Correct — keyboard-only path works end-to-end |

---

## Out of Scope / Not For This Story

- Park, Unpark, or Initiate Payments actions — covered by Epic 3 (Payment Management page).
- PDF download — covered by Epic 4 (Payments Made / Batch List page).
- Date range filtering on the Payment Status grid — the API supports a `ClaimDate` parameter but the UI does not expose it.
- Free-text search across payment records.
- Agency-level drill-down to a detail page — the dashboard is a summary view only.
- Pagination of either grid — both grids display all returned rows (no pagination on the dashboard).
- Dark mode styling — this application is light mode only.
- Confirming backend API connectivity — that smoke test belongs to Epic 1 Story 3.
- Resetting demo data — that action is on the Payments Made page (Epic 4).
