# Wireframes: BetterBond Commission Payments POC

## Summary
Four screens covering the complete payment-administrator workflow: credentials sign-in, a dashboard with metric cards and two filterable report grids, a payment management table with bulk park/unpark/initiate actions, and a payment batch list with per-row PDF download and demo data reset.

## Screens

| # | Screen | Description | File |
|---|--------|-------------|------|
| 1 | Sign In | next-auth credentials login form; error feedback; redirects to Dashboard on success | `screen-1-sign-in.md` |
| 2 | Dashboard | Three metric cards (ready-to-pay, payments made last 14 days, parked); shared agency filter; Payment Status Report grid; Parked Payments Aging Report grid | `screen-2-dashboard.md` |
| 3 | Payment Management | 14-column payment table; per-row checkbox selection; AgencyName filter; Park / Unpark / Initiate Payments actions; client-side pagination (20 rows/page) | `screen-3-payment-management.md` |
| 4 | Payments Made (Batch List) | Payment batch table (8 columns); per-row Download PDF button; Reset Demo Data button; client-side pagination (20 rows/page) | `screen-4-payments-made.md` |

## Screen Flow

```
[Unauthenticated] --> [Sign In] --> [Dashboard]
                                        |
                     +------------------+------------------+
                     |                                     |
              [Payment Management]               [Payments Made]
                     |                                     |
               (stays on page               [Download PDF] (inline)
                after Initiate              [Reset Demo Data] (inline)
                Payments — BR7)
```

Navigation between Dashboard, Payment Management, and Payments Made is always available via the top nav bar (accessible from any authenticated page).

## Design Notes

- **Navigation bar:** Full-width, navy `#1A3A6E` background. MortgageMax logo left. Links right: Dashboard, Payment Management, Payments Made. Active link shown with teal `#0D9488` underline (`border-b-2 border-secondary`). Inactive links white, hover teal.
- **Currency formatting:** All monetary values use `R 1,234,567.89` (US-style thousand/decimal separators, "R" prefix). `tabular-nums` applied to currency and count columns for vertical alignment (BR9).
- **Date formatting:** Displayed as `DD MMM YYYY` (e.g., "12 May 2026").
- **Status badges:** REG = navy "Ready to Pay"; PARKED = amber "Parked"; MAN-PAY = grey "Manually Paid"; batch statuses use outline badge.
- **Responsive:** Max content width `max-w-7xl` (1280px). Dashboard metric cards stack to full-width on mobile. Wide tables will need horizontal scroll on small viewports (NFR1).
- **No confirmation dialogs:** Reset Demo Data executes immediately on click — no `<Dialog>` (BR10).
- **No `<Tabs>` on Dashboard:** Both Payment Status and Parked Payments Aging grids are always visible simultaneously, both filtered by the shared Agency dropdown.
- **CommissionPercent:** Not displayed anywhere in the UI (R7).
- **Toast notifications:** All mutations (park, unpark, initiate, download, reset) produce success or error toasts; auto-dismiss 5s (NFR6).
