# Test Design: Payment Management Grid with Filtering and Pagination

## Story Summary

**Epic:** 3 — Payment Management
**Story:** 1 of 3
**As a** payment administrator
**I want to** see a paginated, filterable grid of all commission payments
**So that** I can review payment details by agency and navigate through large volumes of records.

## Review Purpose

This document presents concrete business examples for BA review before executable tests are written.

Its purpose is to:
- surface missing business decisions
- let the BA review behavior using examples and expected outcomes
- provide an approved source for downstream test generation

## Business Behaviors Identified

- Unauthenticated users cannot reach the page and are redirected to sign-in
- The page fetches all payments from the API exactly once on load — no repeated calls, no filtering at the API level
- The grid displays exactly 13 named columns in a fixed order; the CommissionPercent field is never shown
- Monetary values (BondAmount, CommissionAmount, VAT) are rendered with an "R" prefix, comma thousand separator, and period decimal separator (e.g., "R 1,234,567.89"); zero is shown as "R 0.00", not as blank
- Date values (ClaimDate, GrantDate, RegistrationDate) are rendered in "DD MMM YYYY" format (e.g., "15 Mar 2024")
- The client paginates the full returned list at 20 rows per page; no additional API calls are made when the user changes pages
- An AgencyName dropdown filters the grid client-side from the in-memory list; the dropdown is populated with distinct agency names sorted alphabetically, with "All Agencies" as the first option
- Changing the agency filter resets the current page to page 1
- When the filtered result set is empty, the grid body shows "No payments ready for processing." instead of an empty table
- While the API call is in-flight, skeleton placeholder rows are visible in place of real data
- If the API call fails, a toast notification describes the error and the grid shows an empty/error state without crashing

## Key Decisions Surfaced by AI

- **Pagination controls visibility when total records <= 20 (resolved):** When exactly 20 records are returned, the pagination controls are visible but both Previous and Next buttons are disabled (Option B — approved 2026-05-14).

- **Currency formatting for zero VAT (resolved):** Zero-value VAT displays as "R 0.00" — consistent with the general currency rule. Zero is a real numeric value, not a missing one (Option A — approved 2026-05-14).

- **AgencyName dropdown with empty payment list (resolved):** When the API returns an empty PaymentList, the AgencyName dropdown is shown as enabled with only "All Agencies" selectable — consistent rendering regardless of data volume (Option C — approved 2026-05-14).

- **Pagination display text:** The story does not specify whether any "Page N of M" or "Showing rows X–Y of Z" label appears alongside the Previous/Next buttons. If present, the exact wording and placement must be confirmed before implementation.

- **Date field null/missing values:** The API schema marks date fields as optional strings. The formatting utility returns "—" (an em-dash) for null, empty, or unparseable dates. BA should confirm that "—" is acceptable for missing date values in grid cells.

- **Status column display:** The Status field is stored as a code (e.g., "REG", "MAN-PAY"). The story does not specify whether the Status column should display the raw code or a human-readable label (e.g., "Ready to Pay", "Manually Paid"). This display choice affects readability for administrators.

## Test Scenarios / Review Examples

### 1. Unauthenticated access is redirected

An unauthenticated user who navigates directly to the Payment Management page must not see any data and must be sent to the sign-in page.

| Input | Value |
| --- | --- |
| User authentication state | Not signed in |
| URL visited | `/payment-management` |

| Expected | Value |
| --- | --- |
| Browser destination | `/auth/signin` |
| Payment grid visible | No |

---

### 2. Payment grid loads and displays rows on page arrival

When an authenticated administrator arrives at the page, the frontend fetches all payments once and renders the grid with data.

| Setup | Value |
| --- | --- |
| User authentication state | Signed in |
| API response — PaymentList count | 45 records |

| Input | Value |
| --- | --- |
| Action | Navigate to `/payment-management` |

| Expected | Value |
| --- | --- |
| API call made | `GET /v1/payments` called exactly once |
| Grid visible | Yes |
| Grid rows shown | 20 (first page) |
| Pagination controls visible | Yes (Previous and Next buttons present) |

---

### 3. Grid shows exactly 13 columns in the required order

The grid header must contain these columns in this order, with CommissionPercent absent.

| Setup | Value |
| --- | --- |
| API response | Any non-empty PaymentList |

| Expected column order | Value |
| --- | --- |
| Column 1 | Reference |
| Column 2 | AgencyName |
| Column 3 | AgentName |
| Column 4 | AgentSurname |
| Column 5 | ClaimDate |
| Column 6 | BondAmount |
| Column 7 | CommissionType |
| Column 8 | CommissionAmount |
| Column 9 | VAT |
| Column 10 | Status |
| Column 11 | GrantDate |
| Column 12 | RegistrationDate |
| Column 13 | Bank |
| CommissionPercent column | Not present anywhere in the grid |

---

### 4. Monetary values are formatted with R prefix and comma separators

Currency columns must render values in the defined format regardless of value size.

| Setup | Value |
| --- | --- |
| Payment record | Reference: PMT-001, AgencyName: HomeFirst Realty |
| BondAmount raw value | 1250000 |
| CommissionAmount raw value | 8750.5 |
| VAT raw value | 1312.58 |

| Expected | Value |
| --- | --- |
| BondAmount displayed as | R 1,250,000.00 |
| CommissionAmount displayed as | R 8,750.50 |
| VAT displayed as | R 1,312.58 |

---

### 5. Date values are formatted in DD MMM YYYY format

Date columns must render ISO date strings as human-readable dates.

| Setup | Value |
| --- | --- |
| Payment record | Reference: PMT-002 |
| ClaimDate raw value | 2024-03-15 |
| GrantDate raw value | 2024-04-01 |
| RegistrationDate raw value | 2024-04-10 |

| Expected | Value |
| --- | --- |
| ClaimDate displayed as | 15 Mar 2024 |
| GrantDate displayed as | 1 Apr 2024 |
| RegistrationDate displayed as | 10 Apr 2024 |

---

### 6. Pagination: Next and Previous navigation

With 45 total records, the user navigates forward and back through pages.

| Setup | Value |
| --- | --- |
| API response — PaymentList count | 45 records |
| Initial state | Page 1 is shown (rows 1–20) |

| Input | Value |
| --- | --- |
| Action | Click "Next" button |

| Expected after clicking Next | Value |
| --- | --- |
| Grid rows shown | Rows 21–40 (second page) |
| "Previous" button state | Enabled |
| "Next" button state | Enabled |

| Input | Value |
| --- | --- |
| Action | Click "Next" again (now on page 2) |

| Expected after second Next | Value |
| --- | --- |
| Grid rows shown | Rows 41–45 (third and last page) |
| "Next" button state | Disabled |
| "Previous" button state | Enabled |

| Input | Value |
| --- | --- |
| Action | Click "Previous" |

| Expected after clicking Previous | Value |
| --- | --- |
| Grid rows shown | Rows 21–40 (second page) |
| "Previous" button state | Enabled |

---

### 7. First-page Previous button is disabled

On the very first page, the Previous button must not be clickable.

| Setup | Value |
| --- | --- |
| API response — PaymentList count | 45 records |
| Current page | 1 |

| Expected | Value |
| --- | --- |
| "Previous" button state | Disabled |
| "Next" button state | Enabled |

---

### 8. AgencyName filter dropdown is populated and sorted

The dropdown must list every distinct agency name from the API response, sorted alphabetically, with "All Agencies" first.

| Setup | Value |
| --- | --- |
| Distinct AgencyName values in API response | "Summit Bonds", "HomeFirst Realty", "Atlas Properties" |

| Expected | Value |
| --- | --- |
| Dropdown option 1 | All Agencies |
| Dropdown option 2 | Atlas Properties |
| Dropdown option 3 | HomeFirst Realty |
| Dropdown option 4 | Summit Bonds |

---

### 9. Selecting an agency filters the grid to matching rows only

When the administrator chooses a specific agency, only that agency's payments are shown.

| Setup | Value |
| --- | --- |
| API response | 45 payments: 20 for "HomeFirst Realty", 25 for "Atlas Properties" |
| Default filter | All Agencies selected |
| Grid shows | 20 rows (first page of all 45) |

| Input | Value |
| --- | --- |
| Action | Select "HomeFirst Realty" from the dropdown |

| Expected | Value |
| --- | --- |
| Grid rows shown | 20 rows (all HomeFirst Realty payments, first page) |
| All rows shown belong to | HomeFirst Realty only |
| Page number reset | Back to page 1 |

---

### 10. Selecting "All Agencies" restores the full list

After filtering to an agency, selecting "All Agencies" brings back all records.

| Setup | Value |
| --- | --- |
| Current filter | "HomeFirst Realty" selected |
| Grid showing | 20 HomeFirst Realty rows |

| Input | Value |
| --- | --- |
| Action | Select "All Agencies" from the dropdown |

| Expected | Value |
| --- | --- |
| Grid rows shown | 20 rows (first page of all 45) |
| Page number reset | Back to page 1 |

---

### 11. Loading state: skeleton placeholders appear during data fetch

While the API call is in-flight, the grid area shows placeholder rows rather than blank space or an error.

| Setup | Value |
| --- | --- |
| API call | In-flight (not yet resolved) |

| Expected | Value |
| --- | --- |
| Skeleton placeholders visible | Yes |
| Real data rows visible | No |

Once the fetch completes:

| Expected | Value |
| --- | --- |
| Skeleton placeholders visible | No |
| Real data rows visible | Yes |

---

### 12. Error state: toast notification on API failure

If the `GET /v1/payments` call fails (network error or server error), the administrator sees a toast and the page does not crash.

| Setup | Value |
| --- | --- |
| API response | Network failure or HTTP 500 |

| Expected | Value |
| --- | --- |
| Toast notification visible | Yes |
| Toast message | "Failed to load payments. Please try again." |
| Page crash | No |
| Grid area | Shows empty/error state |

---

### 13. Empty API response: "No payments ready for processing."

When the API returns an empty payment list, the grid body shows the defined empty-state message.

| Setup | Value |
| --- | --- |
| API response — PaymentList | Empty array (0 records) |

| Expected | Value |
| --- | --- |
| Grid rows shown | 0 |
| Empty state message | "No payments ready for processing." |
| AgencyName dropdown | Shown as enabled with only "All Agencies" selectable |

> **BA decision resolved — Option C (BA-1):** When the API returns an empty PaymentList, the AgencyName dropdown has no agency names to populate. Should the dropdown be hidden entirely, shown as disabled with only "All Agencies", or shown as enabled with only "All Agencies" as the sole option?
>
> Options:
> - Option A: Hide the dropdown entirely when there are no payments
> - Option B: Show the dropdown as disabled with only "All Agencies" visible
> - Option C: Show the dropdown as enabled with only "All Agencies" selectable (consistent rendering regardless of data)
> Resolution: Option C approved 2026-05-14 by user.

---

## Edge and Alternate Examples

### Edge 1. Exactly 20 records returned — single-page scenario

When the total record count equals the page size, the entire list fits on one page.

| Setup | Value |
| --- | --- |
| API response — PaymentList count | Exactly 20 records |

| Expected | Value |
| --- | --- |
| Grid rows shown | 20 |
| Pagination controls visible | Yes |
| "Previous" button state | Disabled |
| "Next" button state | Disabled |

> **BA decision resolved — Option B (BA-2):** When the API returns exactly 20 records (filling exactly one page with nothing left over), should the Previous and Next pagination controls be:
>
> Options:
> - Option A: Hidden entirely (no pagination UI rendered)
> - Option B: Visible but both Previous and Next buttons are disabled
> Resolution: Option B approved 2026-05-14 by user.

---

### Edge 2. Filtering narrows to zero results for the selected agency

When the administrator picks an agency that exists in the dropdown but the filter produces zero matching rows (e.g., all those payments were on a prior page and the filter is reapplied), the empty-state message appears.

| Setup | Value |
| --- | --- |
| API response | 10 payments for "HomeFirst Realty", 10 for "Atlas Properties" |
| Selected agency | "Summit Bonds" (a name that somehow reached the dropdown — see note) |

Note: In normal data flow, only agencies present in the returned list appear in the dropdown, so a true "no match" within the dropdown is only possible if the full list contains an agency name but all its payments were already filtered by another mechanism. The realistic trigger is: user selects an agency, then data refreshes and that agency no longer has any payments. The grid must show "No payments ready for processing." in that case.

| Expected | Value |
| --- | --- |
| Grid rows shown | 0 |
| Empty state message | "No payments ready for processing." |

---

### Edge 3. Missing or null date field in a payment record

A payment record arrives from the API with a null or empty GrantDate value.

| Setup | Value |
| --- | --- |
| Payment record | Reference: PMT-099, GrantDate: null |

| Expected | Value |
| --- | --- |
| GrantDate cell content | — (em-dash) |
| Other cells in the row | Unaffected, show their values normally |

---

### Edge 4. Zero-value currency field (e.g., VAT = 0)

A payment record has a VAT of exactly zero (a realistic scenario for certain commission types).

| Setup | Value |
| --- | --- |
| Payment record | Reference: PMT-050, VAT: 0 |

| Expected | Value |
| --- | --- |
| VAT cell content | R 0.00 |

> **BA decision resolved — Option A (BA-3):** The formatting rule specifies "R 0.00" for a numeric zero. Is this the correct display for a zero-VAT payment in the grid, or should zero be shown as "—" (em-dash) to visually indicate no VAT applies?
>
> Options:
> - Option A: Display "R 0.00" — consistent with the general currency rule (zero is a real value, not missing)
> - Option B: Display "—" — zero VAT is treated the same as absent/null for administrative clarity
> Resolution: Option A approved 2026-05-14 by user.

---

### Edge 5. Filter change resets pagination to page 1

If the user is on page 2 and then changes the agency filter, the page must snap back to page 1 to avoid showing an empty grid when the filtered set has fewer rows than the current page offset.

| Setup | Value |
| --- | --- |
| API response | 45 payments: 30 for "HomeFirst Realty", 15 for "Atlas Properties" |
| Current state | "All Agencies" selected, page 2 is active (showing rows 21–40) |

| Input | Value |
| --- | --- |
| Action | Select "Atlas Properties" from the dropdown |

| Expected | Value |
| --- | --- |
| Page displayed | Page 1 |
| Grid rows shown | 15 (all Atlas Properties records, fitting on one page) |
| "Next" button state | Disabled |

---

## Out of Scope / Not For This Story

- Park and Unpark buttons and checkbox row-selection (Story 3.2)
- Initiate Payments button and batch creation (Story 3.3)
- Server-side filtering by AgencyName, ClaimDate, or Status via API query parameters (the API supports these but the FRS specifies client-side filtering only)
- Free-text search across any column
- Sorting columns by clicking column headers
- Exporting the grid to CSV or Excel
- Date range filtering on ClaimDate
- Editing payment record fields
- Displaying CommissionPercent in any form
