# Manual Verification Checklist: Story 3.2 — Row Selection, Park/Unpark Bulk Actions, Post-Mutation Refresh

**Route:** `/payment-management`
**Epic:** 3 | **Story:** 2 of 3
**BA decisions verified:**
- BA-1: Loading indicator is a grid overlay/skeleton (not a button spinner)
- BA-2: Disabled buttons use native `disabled` attribute (removed from Tab order)

---

## Pre-conditions

- [ ] The application is running at `http://localhost:3000`
- [ ] The backend API is running at `http://localhost:8042`
- [ ] You are signed in as `admin@example.com` (or the seeded demo credential)
- [ ] You are on the `/payment-management` page
- [ ] Payment rows are visible in the grid

---

## Row Checkbox Behavior (AC-1, AC-2)

- [ ] AC-1: Each payment row has a checkbox at the start of the row that is initially unchecked
- [ ] AC-2: A header checkbox is visible in the table header row

---

## Header Checkbox — Select All / Deselect All (AC-3, AC-4, AC-5)

- [ ] AC-3: Ticking the header checkbox checks all row checkboxes on the current page; Park and Unpark buttons become enabled
- [ ] AC-4: Unticking the header checkbox (when all rows are selected) unchecks all row checkboxes; Park and Unpark buttons become disabled
- [ ] AC-5: With some but not all rows selected, the header checkbox shows an indeterminate state (mixed/partially filled indicator — neither fully checked nor fully unchecked)

---

## Park Button — Enabled / Disabled (AC-8, AC-11)

- [ ] AC-8: Selecting at least one row enables the Park button
- [ ] AC-11: With no rows selected, the Park button is visibly disabled (grayed out or clearly inactive)

---

## Park — Happy Path (AC-9, AC-10, AC-18, AC-19)

1. Select two or more rows
2. Click the Park button

- [ ] AC-9: Network DevTools shows a `PUT /v1/payments/park` request with body `{ "PaymentIds": [<selected IDs>] }`
- [ ] AC-10: A success toast appears (e.g., "Payments parked successfully.")
- [ ] AC-10: All row checkboxes are cleared after the success toast appears
- [ ] AC-10: The payment grid refreshes — the grid re-renders with updated data from a new `GET /v1/payments` call
- [ ] AC-18: The previously selected payments now show an updated Status column value (e.g., "MAN-PAY" or "PARKED") after the refresh
- [ ] AC-19, BA-1: While the re-fetch is in progress, the **grid body** shows a loading overlay or skeleton (not a spinner on the Park button itself — this is the BA-1 resolution)
- [ ] AC-10: After the re-fetch completes, the grid resets to page 1 (if previously on a later page)

---

## Unpark Button — Enabled / Disabled (AC-13, AC-16)

- [ ] AC-13: Selecting at least one row enables the Unpark button
- [ ] AC-16: With no rows selected, the Unpark button is visibly disabled

---

## Unpark — Happy Path (AC-14, AC-15, AC-18, AC-19)

1. Select two or more parked rows (rows showing "PARKED" or similar status)
2. Click the Unpark button

- [ ] AC-14: Network DevTools shows a `PUT /v1/payments/unpark` request with body `{ "PaymentIds": [<selected IDs>] }`
- [ ] AC-15: A success toast appears (e.g., "Payments unparked successfully.")
- [ ] AC-15: All row checkboxes are cleared after the success toast
- [ ] AC-15: The grid refreshes with updated data from a new `GET /v1/payments` call
- [ ] AC-18: The previously selected payments now show a different Status value after the refresh
- [ ] AC-19, BA-1: Grid body loading overlay or skeleton appears during the re-fetch (not a button spinner)

---

## Park Failure — Error Toast, Selections Preserved (AC-20, AC-22)

To simulate: use browser DevTools → Network tab → block the `/v1/payments/park` request, or temporarily disconnect the backend.

1. Select one or more rows
2. Click Park with the backend returning an error

- [ ] AC-20: An error toast appears with a descriptive failure message (e.g., "Failed to park payments. Please try again.")
- [ ] AC-22: The selected rows remain checked (selections are preserved so the administrator can retry without re-selecting)
- [ ] AC-22: The grid is NOT refreshed (no new `GET /v1/payments` call fires after the failure)

---

## Unpark Failure — Error Toast, Selections Preserved (AC-21, AC-22)

- [ ] AC-21: An error toast appears with a descriptive failure message (e.g., "Failed to unpark payments. Please try again.")
- [ ] AC-22: Row selections are preserved after unpark failure

---

## Data-contract: Page Navigation Clears Selection (AC-6)

- [ ] AC-6: On page 1 with some rows selected, click "Next" to navigate to page 2. All page-2 row checkboxes start unchecked, and Park/Unpark buttons become disabled.

---

## Data-contract: Filter Change Clears Selection (AC-7)

- [ ] AC-7: Select some rows, then change the AgencyName filter to a specific agency. The grid updates and all row checkboxes are unchecked (selections cleared). Park and Unpark become disabled.

---

## Toast Behavior (AC-23, AC-24)

- [ ] AC-23: A success or failure toast auto-dismisses after approximately 5 seconds without any user interaction
- [ ] AC-24: Clicking the dismiss (X) control on a toast removes it immediately before the 5-second timer expires

---

## Keyboard Accessibility (AC-25, AC-26, BA-2)

- [ ] AC-25: Tab through the page; verify the header checkbox, each row's checkbox, the Park button (when enabled), and the Unpark button (when enabled) are all reachable in sequence and each shows a visible focus ring when focused
- [ ] AC-26, BA-2: With no rows selected, Park and Unpark are disabled. Tab repeatedly through the page and confirm neither the Park button nor the Unpark button ever receives focus (native `disabled` removes them from the Tab order entirely — screen readers skip disabled buttons)

---

## Regression: Story 3.1 Features Unaffected

- [ ] The payment grid still loads correctly with all expected columns (Reference, AgencyName, etc.)
- [ ] AgencyName filter still narrows grid rows
- [ ] Pagination controls still work (Next/Prev page navigation)
- [ ] Column currency and date formatting still displays correctly

---

## Sign-off

| Item | Result | Notes |
|------|--------|-------|
| All automated Playwright tests pass | | |
| All manual checklist items verified | | |
| BA-1 loading indicator confirmed as grid overlay | | |
| BA-2 disabled buttons confirmed removed from Tab order | | |
| Date of verification | | |
| Verified by | | |
