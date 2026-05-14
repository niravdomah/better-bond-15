# Test Design: Row Selection, Park/Unpark Bulk Actions, and Post-Mutation Refresh

## Story Summary

**Epic:** 3 — Payment Management
**Story:** 2 of 3
**As a** payment administrator
**I want to** select individual or all payments on a page and bulk-park or bulk-unpark them
**So that** I can hold or release payments for processing in bulk without affecting other payments.

## Review Purpose

This document presents concrete business examples for BA review before executable tests are written.

Its purpose is to:
- surface missing business decisions
- let the BA review behavior using examples and expected outcomes
- provide an approved source for downstream test generation

## Business Behaviors Identified

- Each row in the payment grid displays a checkbox the administrator can tick or untick individually.
- A header checkbox at the top of the checkbox column selects or deselects all rows on the current page in one click.
- When some but not all rows on the current page are ticked, the header checkbox shows a mixed/indeterminate indicator (neither fully checked nor fully unchecked).
- Selection is scoped to the current page only: navigating to another page starts with a clean (empty) selection.
- Changing the AgencyName filter clears all current row selections.
- The Park button is enabled only when at least one row is selected; it is visibly disabled when the selection is empty.
- The Unpark button follows the same enabled/disabled rule as the Park button.
- Clicking a disabled Park or Unpark button has no effect — no API call is made and no toast appears.
- Clicking Park with a non-empty selection sends those payment IDs to the backend via `PUT /v1/payments/park`.
- On a successful Park response: a success toast appears, all selections are cleared, and the payment list is re-fetched and the grid re-renders from the fresh data. The grid resets to page 1.
- On a failed Park response: an error toast appears and all selections are preserved so the administrator can retry without re-selecting.
- Unpark mirrors the Park behavior exactly, using `PUT /v1/payments/unpark`.
- While the post-mutation re-fetch is in progress, a loading indicator is shown so the administrator knows the grid is refreshing.
- Toast notifications auto-dismiss after 5 seconds. The administrator can also dismiss a toast manually before that.
- All interactive elements — row checkboxes, header checkbox, Park button, Unpark button — are reachable by keyboard (Tab key) and have visible focus indicators.
- The disabled Park and Unpark buttons expose their disabled state to screen readers via the appropriate ARIA attribute or native disabled attribute.

## Key Decisions Surfaced by AI

- **Toast message wording:** The story gives example text ("e.g., Payments parked successfully.") but does not lock in the exact strings. If the final wording must match a specific UI copy standard, that should be confirmed before tests are generated with hard-coded assertions.
- **Loading indicator location:** The story notes either the action button or the grid could show the loading state during the post-mutation re-fetch. The choice affects which element test assertions target and what the user sees.
- **Parking already-parked rows / Unparking already-unparked rows:** The story and the API spec do not restrict which rows can be parked or unparked. An administrator could select rows that are already parked and click Park again. The current design treats this as a normal API call; the backend is responsible for any validation. This should be confirmed.
- **Pagination reset after mutation:** The story specifies resetting to page 1 after a successful mutation. This document designs around that rule, but if the preferred behavior is to stay on the current page, examples 9 and post-mutation behavior need revision.

## Test Scenarios / Review Examples

### 1. Row checkboxes appear on each row

Confirms that every payment row exposes a ticking mechanism.

| Setup | Value |
| --- | --- |
| Authenticated as | payment administrator |
| Grid loaded with | 5 payments (IDs 101, 102, 103, 104, 105) from ABC Realty |

| Expected | Value |
| --- | --- |
| Checkbox presence | A checkbox is visible at the start of each of the 5 rows |
| Initial state | All 5 row checkboxes are unchecked |
| Header checkbox | A header checkbox is visible in the column header row |
| Header checkbox initial state | Unchecked (no rows selected) |

---

### 2. Ticking the header checkbox selects all rows on the current page

| Setup | Value |
| --- | --- |
| Authenticated as | payment administrator |
| Page 1 loaded with | 20 payment rows |
| Current selection | None (all unchecked) |

| Input | Value |
| --- | --- |
| Action | Tick the header checkbox |

| Expected | Value |
| --- | --- |
| Row checkboxes | All 20 row checkboxes are now checked |
| Header checkbox | Appears as fully checked |
| Park button | Enabled |
| Unpark button | Enabled |

---

### 3. Unticking the header checkbox deselects all rows on the current page

| Setup | Value |
| --- | --- |
| Authenticated as | payment administrator |
| Page 1 loaded with | 20 payment rows |
| Current selection | All 20 rows selected (header checkbox fully checked) |

| Input | Value |
| --- | --- |
| Action | Untick the header checkbox |

| Expected | Value |
| --- | --- |
| Row checkboxes | All 20 row checkboxes are now unchecked |
| Header checkbox | Appears as unchecked |
| Park button | Disabled |
| Unpark button | Disabled |

---

### 4. Header checkbox shows indeterminate state when only some rows are selected

| Setup | Value |
| --- | --- |
| Authenticated as | payment administrator |
| Page 1 loaded with | 5 payment rows (IDs 101–105) |
| Current selection | Rows 101 and 103 are ticked; 102, 104, 105 are unticked |

| Expected | Value |
| --- | --- |
| Header checkbox appearance | Mixed / indeterminate indicator (partially filled) — neither fully checked nor fully unchecked |
| Park button | Enabled |
| Unpark button | Enabled |

---

### 5. Park and Unpark buttons are disabled when no rows are selected, and clicking them has no effect

| Setup | Value |
| --- | --- |
| Authenticated as | payment administrator |
| Page loaded with | 10 payment rows |
| Current selection | None |

| Expected | Value |
| --- | --- |
| Park button appearance | Visibly disabled |
| Unpark button appearance | Visibly disabled |
| Park button accessibility | Not reachable by Tab (native disabled attribute removes button from Tab order); screen readers skip it entirely |
| Unpark button accessibility | Not reachable by Tab (native disabled attribute removes button from Tab order); screen readers skip it entirely |

| Input | Value |
| --- | --- |
| Action | Click the disabled Park button |

| Expected | Value |
| --- | --- |
| API calls made | None |
| Toast displayed | None |

| Input | Value |
| --- | --- |
| Action | Click the disabled Unpark button |

| Expected | Value |
| --- | --- |
| API calls made | None |
| Toast displayed | None |

---

### 6. Park action — happy path (one or more rows selected)

| Setup | Value |
| --- | --- |
| Authenticated as | payment administrator |
| Page 1 loaded with | 5 payments: IDs 201, 202, 203, 204, 205 |
| Selected rows | IDs 201 and 203 |
| API mock — park | `PUT /v1/payments/park` returns HTTP 200 |
| API mock — refresh | `GET /v1/payments` returns updated list (IDs 201 and 203 now show StatusCode "MAN-PAY") |

| Input | Value |
| --- | --- |
| Action | Click the enabled Park button |

| Expected | Value |
| --- | --- |
| API call made | `PUT /v1/payments/park` with body `{ "PaymentIds": [201, 203] }` |
| Success toast | A success message appears (e.g., "Payments parked successfully.") |
| Row selections | All selections cleared — all row checkboxes unchecked |
| Header checkbox | Returns to unchecked state |
| Re-fetch triggered | `GET /v1/payments` is called to reload the payment list |
| Grid rendered | Grid re-renders with refreshed data; page resets to page 1 |

---

### 7. Unpark button — enabled when rows are selected, disabled when none are selected

| Setup | Value |
| --- | --- |
| Authenticated as | payment administrator |
| Page 1 loaded with | 4 payments: IDs 301, 302, 303, 304 |

| Scenario A — No selection | |
| --- | --- |
| Selected rows | None |
| Expected | Unpark button is visibly disabled; clicking it makes no API call |

| Scenario B — With selection | |
| --- | --- |
| Input: select rows | Tick IDs 301 and 304 |
| Expected | Unpark button becomes enabled |

---

### 8. Unpark action — happy path

| Setup | Value |
| --- | --- |
| Authenticated as | payment administrator |
| Page 1 loaded with | 4 payments: IDs 301, 302, 303, 304 |
| Selected rows | IDs 302 and 303 |
| API mock — unpark | `PUT /v1/payments/unpark` returns HTTP 200 |
| API mock — refresh | `GET /v1/payments` returns updated list (IDs 302, 303 now show StatusCode "REG") |

| Input | Value |
| --- | --- |
| Action | Click the enabled Unpark button |

| Expected | Value |
| --- | --- |
| API call made | `PUT /v1/payments/unpark` with body `{ "PaymentIds": [302, 303] }` |
| Success toast | A success message appears (e.g., "Payments unparked successfully.") |
| Row selections | All selections cleared — all row checkboxes unchecked |
| Re-fetch triggered | `GET /v1/payments` is called to reload the payment list |
| Grid rendered | Grid re-renders with refreshed data; page resets to page 1 |

---

### 9. Post-mutation refresh — grid shows updated statuses and loading state

| Setup | Value |
| --- | --- |
| Authenticated as | payment administrator |
| Selected rows | IDs 401 and 402 (both showing StatusCode "REG" before the action) |
| API mock — park | `PUT /v1/payments/park` returns HTTP 200 |
| API mock — refresh | `GET /v1/payments` returns list where IDs 401 and 402 now show StatusCode "MAN-PAY" |

| Expected during re-fetch | Value |
| --- | --- |
| Loading indicator | The grid body shows a loading overlay or skeleton while the re-fetch is in progress |

| Expected after re-fetch | Value |
| --- | --- |
| Row 401 Status column | Shows updated status (reflecting the new StatusCode from the API response) |
| Row 402 Status column | Shows updated status (reflecting the new StatusCode from the API response) |
| Page position | Grid resets to page 1 |

> **BA decision resolved — Option B (BA-1):** Where should the loading indicator appear during the post-mutation re-fetch?
>
> Options:
> - Option A: The Park or Unpark button that was clicked shows a spinner (the button itself enters a loading/spinning state) while the re-fetch is in progress.
> - Option B: The entire grid body shows a loading overlay or skeleton while the re-fetch is in progress.
> - Option C: Both — the button shows a spinner AND the grid dims or shows a skeleton.
> Resolution: Option B approved 2026-05-14 by user.

---

### 10. Park action — failure path (network error or non-2xx response)

| Setup | Value |
| --- | --- |
| Authenticated as | payment administrator |
| Selected rows | IDs 501 and 502 |
| API mock — park | `PUT /v1/payments/park` returns HTTP 500 (or network timeout) |

| Input | Value |
| --- | --- |
| Action | Click the enabled Park button |

| Expected | Value |
| --- | --- |
| Error toast | A descriptive failure message appears (e.g., "Failed to park payments. Please try again.") |
| Row selections | IDs 501 and 502 remain selected — selections are NOT cleared |
| API re-fetch | `GET /v1/payments` is NOT called (no refresh on failure) |
| Grid state | Grid remains unchanged; no rows are removed or re-ordered |

---

### 11. Unpark action — failure path (network error or non-2xx response)

| Setup | Value |
| --- | --- |
| Authenticated as | payment administrator |
| Selected rows | IDs 601 and 602 |
| API mock — unpark | `PUT /v1/payments/unpark` returns HTTP 500 (or network timeout) |

| Input | Value |
| --- | --- |
| Action | Click the enabled Unpark button |

| Expected | Value |
| --- | --- |
| Error toast | A descriptive failure message appears (e.g., "Failed to unpark payments. Please try again.") |
| Row selections | IDs 601 and 602 remain selected — selections are NOT cleared |
| API re-fetch | `GET /v1/payments` is NOT called |
| Grid state | Grid remains unchanged |

## Edge and Alternate Examples

### Edge 1. Navigating to another page clears the current page selection

| Setup | Value |
| --- | --- |
| Authenticated as | payment administrator |
| Page 1 | 20 payment rows; IDs 101, 103, 105 are selected |

| Input | Value |
| --- | --- |
| Action | Click "Next" pagination control to go to page 2 |

| Expected | Value |
| --- | --- |
| Page 2 row checkboxes | All unchecked (no pre-selected rows) |
| Header checkbox | Unchecked |
| Park button | Disabled |
| Unpark button | Disabled |

---

### Edge 2. Changing the AgencyName filter clears all current row selections

| Setup | Value |
| --- | --- |
| Authenticated as | payment administrator |
| Active filter | "All Agencies" |
| Selected rows | IDs 201 and 204 are ticked |

| Input | Value |
| --- | --- |
| Action | Select "ABC Realty" from the AgencyName filter dropdown |

| Expected | Value |
| --- | --- |
| Row selections | All selections cleared — grid refreshes to show only ABC Realty rows, all unchecked |
| Park button | Disabled |
| Unpark button | Disabled |

---

### Edge 3. Toast auto-dismisses after 5 seconds; administrator can dismiss manually

| Setup | Value |
| --- | --- |
| Scenario | A success or failure toast is currently displayed on screen |

| Scenario A — Auto-dismiss | |
| --- | --- |
| Expected | After 5 seconds, the toast disappears from the screen automatically |

| Scenario B — Manual dismiss | |
| --- | --- |
| Input | Administrator clicks the dismiss control (X) on the toast before 5 seconds |
| Expected | Toast is removed from the screen immediately |

---

### Edge 4. Keyboard navigation reaches all interactive elements

| Setup | Value |
| --- | --- |
| Authenticated as | payment administrator |
| Payment grid | Loaded with at least one row |
| Input device | Keyboard only (no mouse) |

| Expected | Value |
| --- | --- |
| Tab order includes | Header checkbox, each row's checkbox, Park button, Unpark button |
| Focus indicator | Each element shows a visible focus ring when focused via Tab |
| Park/Unpark when disabled | Disabled buttons are NOT reachable by Tab — the native disabled attribute removes them from the Tab order entirely; screen reader users skip them |

> **BA decision resolved — Option A (BA-2):** Should disabled buttons be included in the Tab order?
>
> Options:
> - Option A: Disabled buttons are removed from the Tab order (using `tabIndex="-1"` or the native `disabled` attribute which removes focus). Screen reader users skip them entirely.
> - Option B: Disabled buttons remain in the Tab order so screen readers can announce their label and disabled state when the user tabs to them.
>
> WCAG 2.1 AA permits either approach. Option A is the more common pattern for Shadcn Button with the `disabled` prop.
> Resolution: Option A approved 2026-05-14 by user.

---

### Edge 5. Selecting all rows on a single-row page

| Setup | Value |
| --- | --- |
| Authenticated as | payment administrator |
| Grid loaded with | Only 1 payment row (the full dataset has 1 record) |

| Input | Value |
| --- | --- |
| Action | Tick the header checkbox |

| Expected | Value |
| --- | --- |
| Header checkbox | Appears fully checked (not indeterminate) |
| Single row checkbox | Checked |
| Park button | Enabled |
| Unpark button | Enabled |

## Out of Scope / Not For This Story

- Rendering the payment grid columns, column formatting, and initial data fetch (covered by Story 3.1).
- Client-side pagination controls rendering and page-navigation behavior beyond the selection-clearing rule (covered by Story 3.1).
- The AgencyName filter dropdown rendering and filter logic beyond the selection-clearing side-effect (covered by Story 3.1).
- The "Initiate Payments" button — its enabled/disabled rules, API call, and success/failure behavior (covered by Story 3.3).
- Restricting Park or Unpark to rows of a specific status (e.g., preventing parking of already-parked rows). The story and API spec do not define this constraint; the backend handles any such validation.
- Confirmation dialogs before Park or Unpark — none are defined in the FRS.
- Partial success responses — the API returns either HTTP 200 (success) or a non-2xx error; there is no partial-success contract in the spec.
