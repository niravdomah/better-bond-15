# Manual Verification Checklist
## Epic 3, Story 1: Payment Management Grid with Filtering and Pagination

**Route:** `/payment-management`
**Target File:** `web/src/app/(protected)/payment-management/page.tsx`

This checklist covers runtime-only and data-contract scenarios that automated tests cannot fully verify. Work through these items after the Playwright E2E suite has passed.

---

## Runtime-Only Items

These require the real Next.js routing stack or a real browser. Automated tests cannot exercise them in jsdom or with mocked handlers.

### Auth / Routing (AC-1)

- [ ] **Unauthenticated redirect** — Open a fresh browser window (or incognito tab) with no session and navigate directly to `http://localhost:3000/payment-management`. Confirm the browser redirects to `/auth/signin` and the payment grid is not visible.
- [ ] **Authenticated pass-through** — Sign in with `alice.admin@betterbond.example` / `Admin123!`, then navigate to `/payment-management`. Confirm the grid loads without a second sign-in prompt (verifies the auth middleware passes the session correctly).

### Keyboard Accessibility (AC-27)

- [ ] **AgencyName dropdown reachable via Tab** — With the page loaded, click an area above the page content to ensure focus starts at the top, then press Tab repeatedly. Confirm the AgencyName dropdown receives visible focus (a focus ring is visible around the dropdown trigger).
- [ ] **Previous / Next buttons reachable via Tab** — Continue tabbing from the dropdown and confirm both the Previous and Next pagination buttons receive visible focus indicators.
- [ ] **Dropdown operable with keyboard** — When the AgencyName dropdown is focused, press Enter (or Space) to open it. Use arrow keys to navigate to a specific agency, then press Enter to select. Confirm the grid updates to show only that agency's rows.

---

## Data-Contract Items

These items verify the component → API → display chain end-to-end. The automated Vitest tests mock `getPayments()`, so they cannot verify that the real API client → handler → response chain is wired correctly.

### Filter Chain (AC-17, AC-18, AC-19)

- [ ] **Agency filter shows correct rows** — With real API data loaded (use the running backend at `http://localhost:8042`), select a specific agency from the AgencyName dropdown. Confirm that only rows where `AgencyName` matches the selected agency are shown in the grid.
- [ ] **Filter clears correctly** — With an agency selected, select "All Agencies" from the dropdown. Confirm all rows from the API response are shown again (no leftover filtering).
- [ ] **Pagination resets on filter change** — Navigate to page 2 using the Next button, then change the agency filter. Confirm the grid returns to page 1 (first row visible, Previous button disabled).
- [ ] **Paginated filtered set** — Select an agency that has fewer than 20 payments. Confirm the Next button is disabled and the row count in the grid matches that agency's total payment count.

### Pagination + Boundary (AC-11, AC-12, AC-13 — BA-2)

- [ ] **Next disabled on last page** — With real data, navigate to the last page using the Next button. Confirm the Next button is disabled.
- [ ] **Exactly-20 records scenario (BA-2: Option B)** — If the backend returns exactly 20 records (after filtering or by resetting demo data to that state), confirm that both the Previous and Next buttons are visible but disabled (not hidden).

### Empty State via Real API (AC-22 — BA-1)

- [ ] **Empty list scenario (BA-1: Option C)** — If a reset-demo flow is available that returns an empty payment list, reset to that state and visit `/payment-management`. Confirm:
  - The grid body shows the message "No payments ready for processing."
  - The AgencyName dropdown is still visible and is enabled (not hidden or grayed out) — it shows only "All Agencies".

### Currency and Date Display with Real Data (AC-6, AC-7)

- [ ] **Monetary formatting** — In the grid, locate a row with a non-zero BondAmount. Confirm it is displayed as `R 1,234,567.89` (R prefix, comma thousand separator, period decimal, two decimal places). Check CommissionAmount and VAT for the same format.
- [ ] **Zero VAT display (BA-3: Option A)** — Locate a payment row where VAT is zero. Confirm the VAT cell displays `R 0.00` (not a dash or blank).
- [ ] **Date formatting** — Locate a row with a non-null ClaimDate, GrantDate, and RegistrationDate. Confirm each is displayed in `DD MMM YYYY` format (e.g., `15 Mar 2024`).
- [ ] **Null date display** — If a row has a null or missing GrantDate or RegistrationDate, confirm the cell shows `—` (em-dash), not blank or an error.

---

## Notes

- Keyboard focus indicator styling is a visual check — the automated axe scan covers color contrast requirements but not the precise visual appearance of focus rings.
- The data-contract filter assertions above correspond to the "Data-contract" classification in `generated-docs/test-design/epic-3-payment-management/story-1-payment-grid-filter-pagination-test-handoff.md`.
- This checklist is generated by the WRITE-TESTS agent. It will be incorporated into the QA phase's unified verification document.
