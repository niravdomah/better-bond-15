# Feature: BetterBond Commission Payments POC

## Summary

A web-based payment management interface for BetterBond payment administrators to review pending commission payments, park or release payments, initiate bulk payment batches per agency, and download batch invoice PDFs. Authenticated via next-auth credentials provider with MortgageMax branding (navy/teal, light mode only).

## Epics

1. **Epic 1: Foundation — Auth, Branding, Navigation, and API Setup** - Configure next-auth credentials provider, apply MortgageMax branding (navy #1A3A6E, teal accent, light mode), implement the top navigation bar with active-route highlighting, and wire the API client to the backend at `http://localhost:8042`. Replaces any template auth/demo code that conflicts with the FRS. | Status: In Progress | Dir: `epic-1-foundation/`
2. **Epic 2: Dashboard** - Implement the Dashboard home page: fetch from `GET /v1/payments/dashboard`, render three metric cards (ready-to-pay count, payments-made count + total value last 14 days in R format, parked count), Payment Status Report grid, and Parked Payments Aging Report grid with a shared AgencyName client-side filter dropdown. Full loading, error, and empty states. | Status: Pending | Dir: `epic-2-dashboard/`
3. **Epic 3: Payment Management** - Implement the Payment Management page: fetch from `GET /v1/payments`, render the paginated payment grid (20 rows/page) with AgencyName filter, per-row and header checkboxes, Park/Unpark bulk mutation buttons (disabled when nothing selected), and the Initiate Payments button (enabled only when an agency is selected and REG-status payments exist). Full post-mutation refresh, toast notifications for success and error, and empty state. | Status: Pending | Dir: `epic-3-payment-management/`
4. **Epic 4: Payments Made / Batch List** - Implement the Payments Made page: fetch from `GET /v1/payment-batches`, render the paginated batch list (20 rows/page) with per-row "Download PDF" button (`POST /v1/payment-batches/{Id}/download-invoice-pdf`), empty state, and Reset Demo Data button (`POST /demo/reset-demo`, no confirmation dialog). Full toast notifications for PDF download errors, reset success, and reset errors. | Status: Pending | Dir: `epic-4-payments-made/`

## Requirements Coverage

| Epic | Requirements |
|------|-------------|
| Epic 1: Foundation | [R24](../specs/feature-requirements.md#authentication), [R25](../specs/feature-requirements.md#authentication), [R26](../specs/feature-requirements.md#navigation), [R27](../specs/feature-requirements.md#navigation), [NFR1](../specs/feature-requirements.md#non-functional-requirements), [NFR2](../specs/feature-requirements.md#non-functional-requirements), [NFR3](../specs/feature-requirements.md#non-functional-requirements), [NFR5](../specs/feature-requirements.md#non-functional-requirements) |
| Epic 2: Dashboard | [R1](../specs/feature-requirements.md#dashboard), [R2](../specs/feature-requirements.md#dashboard), [R3](../specs/feature-requirements.md#dashboard), [R4](../specs/feature-requirements.md#dashboard), [R5](../specs/feature-requirements.md#dashboard), [R6](../specs/feature-requirements.md#dashboard), [BR9](../specs/feature-requirements.md#business-rules), [NFR1](../specs/feature-requirements.md#non-functional-requirements), [NFR2](../specs/feature-requirements.md#non-functional-requirements), [NFR4](../specs/feature-requirements.md#non-functional-requirements), [NFR6](../specs/feature-requirements.md#non-functional-requirements) |
| Epic 3: Payment Management | [R7](../specs/feature-requirements.md#payment-management), [R8](../specs/feature-requirements.md#payment-management), [R9](../specs/feature-requirements.md#payment-management), [R10](../specs/feature-requirements.md#payment-management), [R11](../specs/feature-requirements.md#payment-management), [R12](../specs/feature-requirements.md#payment-management), [R13](../specs/feature-requirements.md#payment-management), [R14](../specs/feature-requirements.md#payment-management), [R15](../specs/feature-requirements.md#payment-management), [R16](../specs/feature-requirements.md#payment-management), [BR1](../specs/feature-requirements.md#business-rules), [BR2](../specs/feature-requirements.md#business-rules), [BR3](../specs/feature-requirements.md#business-rules), [BR4](../specs/feature-requirements.md#business-rules), [BR5](../specs/feature-requirements.md#business-rules), [BR6](../specs/feature-requirements.md#business-rules), [BR7](../specs/feature-requirements.md#business-rules), [BR8](../specs/feature-requirements.md#business-rules), [BR9](../specs/feature-requirements.md#business-rules), [NFR1](../specs/feature-requirements.md#non-functional-requirements), [NFR2](../specs/feature-requirements.md#non-functional-requirements), [NFR4](../specs/feature-requirements.md#non-functional-requirements), [NFR6](../specs/feature-requirements.md#non-functional-requirements) |
| Epic 4: Payments Made | [R17](../specs/feature-requirements.md#payments-made-batch-list), [R18](../specs/feature-requirements.md#payments-made-batch-list), [R19](../specs/feature-requirements.md#payments-made-batch-list), [R20](../specs/feature-requirements.md#payments-made-batch-list), [R21](../specs/feature-requirements.md#payments-made-batch-list), [R22](../specs/feature-requirements.md#payments-made-batch-list), [R23](../specs/feature-requirements.md#payments-made-batch-list), [BR9](../specs/feature-requirements.md#business-rules), [BR10](../specs/feature-requirements.md#business-rules), [NFR1](../specs/feature-requirements.md#non-functional-requirements), [NFR2](../specs/feature-requirements.md#non-functional-requirements), [NFR4](../specs/feature-requirements.md#non-functional-requirements), [NFR6](../specs/feature-requirements.md#non-functional-requirements) |

## Epic Dependencies

- **Epic 1: Foundation** (no dependencies — must be first) — Establishes auth, branding, navigation shell, and API client configuration. All other epics depend on this.
- **Epic 2: Dashboard** (depends on Epic 1) — Requires auth middleware (redirect to sign-in), navigation bar, API client, and MortgageMax branding from Epic 1. Independent of Epics 3 and 4.
- **Epic 3: Payment Management** (depends on Epic 1) — Requires auth middleware, navigation bar, API client, and toast infrastructure from Epic 1. Independent of Epic 2 and 4, but recommended after Epic 2 for UX continuity.
- **Epic 4: Payments Made** (depends on Epic 1) — Requires auth middleware, navigation bar, API client, and toast infrastructure from Epic 1. Independent of Epics 2 and 3, but recommended last as it includes the Reset Demo Data feature which resets data used by Epics 2 and 3.

**Recommended implementation order: 1 → 2 → 3 → 4**

Epics 2, 3, and 4 can technically run in parallel after Epic 1 completes, but sequential order is recommended because: (a) Dashboard provides the home-page anchor that validates the auth redirect flow end-to-end, (b) Payment Management is the core workflow and should be verified before the batch list in Epic 4, and (c) the Reset Demo Data button in Epic 4 resets all data — running Epic 4 last avoids disrupting development of Epics 2 and 3.

## Epic 1 Stories

| Story | Title | File | Status |
|-------|-------|------|--------|
| 1.1 | MortgageMax Branding and Sign-In Page | `epic-1-foundation/story-1-branding-and-signin.md` | Pending |
| 1.2 | Top Navigation Bar and App Shell | `epic-1-foundation/story-2-top-nav-and-app-shell.md` | Pending |
| 1.3 | API Client Configuration and Utilities | `epic-1-foundation/story-3-api-client-and-utilities.md` | Pending |
