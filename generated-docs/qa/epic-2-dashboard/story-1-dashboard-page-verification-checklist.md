# Manual Verification Checklist — Epic 2, Story 1: Dashboard Page

**Route:** `/`
**Date:** 2026-05-13

## Verifiable today

Time for a quick manual check. Here is what to look for at http://localhost:3000:

### Auth redirect (AC-1)

- [ ] (AC-1) Open a fresh browser tab where you are not signed in and go to http://localhost:3000. You should land on the sign-in page at /auth/signin — the dashboard must not be visible at all before signing in.

### Dashboard loads with live data (AC-2, AC-3, AC-5)

- [ ] (AC-2, AC-3) Sign in and land on the dashboard at /. You should see three metric cards (Ready to Pay, Payments Made (Last 14 Days), and Parked) and two report tables (Payment Status Report and Parked Payments Aging Report).
- [ ] (AC-4, AC-5) On a slow connection or by throttling in DevTools, reload the dashboard. Brief grey placeholder bars should appear in each metric card and in both table row areas while data loads, then disappear once the numbers arrive.

### Metric cards show correct values (AC-6 to AC-12)

- [ ] (AC-6, AC-7) The Ready to Pay card shows a plain whole number — no currency symbol. This count is the total of all payments with a REG status from the backend.
- [ ] (AC-8, AC-9) The Payments Made (Last 14 Days) card shows a plain whole number above, and below it a total amount in the format R 1,234,567.89 (capital R, space, commas for thousands, period for decimals, two decimal places).
- [ ] (AC-11, AC-12) The Parked card shows a plain whole number — no currency symbol. This is the count of PARKED-status payments.

### Metric cards are unaffected by the agency filter (AC-13)

- [ ] (AC-13) Pick any agency from the Agency Name dropdown. After the grids update, look at the three metric cards — their numbers must not change. The cards always show totals across all agencies regardless of the filter.

### Payment Status Report grid (AC-14 to AC-17)

- [ ] (AC-14) The Payment Status Report grid has five columns in this exact order: Status, PaymentCount, TotalPaymentAmount, CommissionType, AgencyName.
- [ ] (AC-15) Each row in that grid shows the matching data from the backend for each field.
- [ ] (AC-16) The TotalPaymentAmount column shows amounts formatted as R 1,234,567.89 — not plain numbers.
- [ ] (AC-17) The numbers in the PaymentCount column align neatly on the right edge when values have different digit counts (tabular number spacing).

### Parked Payments Aging Report grid (AC-18 to AC-20)

- [ ] (AC-18) The Parked Payments Aging Report grid has three columns in this exact order: Range, AgencyName, PaymentCount.
- [ ] (AC-19) Each row shows the correct data from the backend.
- [ ] (AC-20) The PaymentCount numbers align neatly (tabular number spacing).

### Agency Name dropdown (AC-21 to AC-27)

- [ ] (AC-21, AC-22) Open the Agency Name dropdown. The very first option must be All Agencies. The remaining options are the agency names from the backend, listed in alphabetical order, with no duplicates even if an agency appears in both report arrays.
- [ ] (AC-23) With All Agencies selected (the default), both grids show every row from the backend.
- [ ] (AC-24) Select a specific agency — both grids must immediately show only rows matching that agency.
- [ ] (AC-25) With an agency selected, open the dropdown and choose All Agencies again — both grids must revert to showing all rows.
- [ ] (AC-26) Select an agency that has no rows in the Payment Status Report — that grid should show the message "No data for selected agency" instead of an empty table body.
- [ ] (AC-27) Select an agency that has no rows in the Parked Payments Aging Report — that grid should show "No data for selected agency".

### Error state (AC-28 to AC-31)

- [ ] (AC-28, AC-29, AC-30, AC-31) Open DevTools and block the request to /v1/payments/dashboard, then reload the page. A toast notification must appear with the exact message "Failed to load dashboard data. Please try again." Each metric card must show "— error loading —" in place of the number. Both report tables must not be visible at all. No other error banner or alert should appear on the page.

### Keyboard accessibility (AC-32, AC-33, AC-34)

- [ ] (AC-32) Press Tab repeatedly from the top of the page until you reach the Agency Name dropdown. It must get a visible outline or highlight to show it is focused.
- [ ] (AC-33) With the dropdown focused, press Space or Enter to open it, use the arrow keys to move to an agency, and press Enter to confirm. Both grids must filter without you touching the mouse.
- [ ] (AC-34) Right-click and inspect any table — the HTML should use table, thead, tbody, tr, th, and td elements (not divs styled as a table).

Also worth checking: no error messages on screen when data loads normally, loading indicators appear briefly while data arrives, and the layout looks right on your screen.

## Runtime verification items

These items go beyond what automated tests can check — they need a quick manual verify:

- Visit / without signing in — you should be sent to the sign-in page with no flash of dashboard content visible.
- After signing in, confirm the browser URL stays at / and the dashboard is fully rendered (not redirected back to sign-in).
- Open the Agency Name dropdown and confirm the list shows "All Agencies" first, then agency names in alphabetical order, with no duplicates even when the same agency name appears in both report arrays.
- Select an agency from the dropdown and confirm both the Payment Status Report table and the Parked Payments Aging Report table immediately update to show only rows for that agency.
- Re-select "All Agencies" and confirm both tables revert to showing all rows.
- Select an agency that has no rows in the Parked Payments Aging Report — confirm that grid shows "No data for selected agency" rather than a blank table body.
- Select an agency that appears in only one of the two report arrays — confirm the other grid shows "No data for selected agency".
- Tab through the dashboard; confirm the Agency Name dropdown receives a visible focus ring when reached.
- With the dropdown focused, press Space or Enter to open it; use arrow keys to navigate to an agency; press Enter to confirm; confirm both grids filter to that agency without using the mouse.
