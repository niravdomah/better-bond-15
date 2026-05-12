# Requirements Traceability Matrix

Generated: 2026-05-12 | Feature: BetterBond Commission Payments POC | Epics scoped: 1/4

## Coverage Summary
- **Functional Requirements:** 4/27 covered (15%)
- **Business Rules:** 0/10 covered (0%)
- **Non-Functional:** 5/6 covered (83%)
- **Compliance:** 0/0 covered (100%)
- **Pending (claimed by future epics):** R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14, R15, R16, R17, R18, R19, R20, R21, R22, R23, BR1, BR2, BR3, BR4, BR5, BR6, BR7, BR8, BR9, BR10, NFR6

## Functional Requirements

| Req ID | Description | Covered By |
|--------|-------------|------------|
| R1 | When the user loads the Dashboard page, the frontend calls `GET /v1/payments/... | Pending: Epic 2 |
| R2 | The Dashboard displays a Payment Status grid showing all `PaymentStatusReport... | Pending: Epic 2 |
| R3 | The Dashboard displays a Parked Payments Aging grid showing all `ParkedPaymen... | Pending: Epic 2 |
| R4 | Both dashboard grids share a single AgencyName filter dropdown. Selecting an ... | Pending: Epic 2 |
| R5 | The Dashboard metric card for "Payments Made (Last 14 Days)" displays both th... | Pending: Epic 2 |
| R6 | When the dashboard API call fails, the page displays a toast notification wit... | Pending: Epic 2 |
| R7 | The Payment Management page displays a grid of all payment records fetched fr... | Pending: Epic 3 |
| R8 | The Payment Management grid supports client-side pagination. The API returns ... | Pending: Epic 3 |
| R9 | The Payment Management page provides a client-side filter by AgencyName via a... | Pending: Epic 3 |
| R10 | Each row in the Payment Management grid has a checkbox for individual selecti... | Pending: Epic 3 |
| R11 | The user can bulk-park selected payments by clicking a "Park" button. Clickin... | Pending: Epic 3 |
| R12 | The user can bulk-unpark selected payments by clicking an "Unpark" button. Cl... | Pending: Epic 3 |
| R13 | The user can initiate payments for the currently selected agency by clicking ... | Pending: Epic 3 |
| R14 | After a successful "Initiate Payments" call, the frontend displays a success ... | Pending: Epic 3 |
| R15 | When the Payment Management grid has no records matching the current filter (... | Pending: Epic 3 |
| R16 | When a Park, Unpark, or Initiate Payments mutation call fails, the frontend d... | Pending: Epic 3 |
| R17 | The Payments Made page displays a list of all payment batches fetched from `G... | Pending: Epic 4 |
| R18 | The Payments Made page supports client-side pagination. Page size is 20 rows ... | Pending: Epic 4 |
| R19 | Each payment batch row has a "Download PDF" button. Clicking it calls `POST /... | Pending: Epic 4 |
| R20 | When a PDF download call fails, the frontend displays a toast notification: "... | Pending: Epic 4 |
| R21 | When the batch list is empty, the page displays the message: "No payment batc... | Pending: Epic 4 |
| R22 | The Payments Made page includes a "Reset Demo Data" button. Clicking it calls... | Pending: Epic 4 |
| R23 | When the "Reset Demo Data" call fails, the frontend displays a toast notifica... | Pending: Epic 4 |
| R24 | The application uses next-auth with a credentials provider for frontend-only ... | [Story 1: MortgageMax Branding and Sign-In Page](epic-1-foundation/story-1-branding-and-signin.md) |
| R25 | The authenticated user's username (from the next-auth session) is included as... | [Story 1: MortgageMax Branding and Sign-In Page](epic-1-foundation/story-1-branding-and-signin.md), [Story 3: API Client Configuration and Utilities](epic-1-foundation/story-3-api-client-and-utilities.md) |
| R26 | The application has a top navigation bar with links to: Dashboard, Payment Ma... | [Story 2: Top Navigation Bar and App Shell](epic-1-foundation/story-2-top-nav-and-app-shell.md) |
| R27 | The navigation bar displays MortgageMax branding (navy #1A3A6E primary color,... | [Story 1: MortgageMax Branding and Sign-In Page](epic-1-foundation/story-1-branding-and-signin.md), [Story 2: Top Navigation Bar and App Shell](epic-1-foundation/story-2-top-nav-and-app-shell.md) |

## Business Rules

| Rule ID | Description | Covered By |
|--------|-------------|------------|
| BR1 | The "Park" button is disabled when no payment rows are selected. Attempting t... | Pending: Epic 3 |
| BR2 | The "Unpark" button is disabled when no payment rows are selected. Attempting... | Pending: Epic 3 |
| BR3 | The "Initiate Payments" button is disabled when no AgencyName filter is selec... | Pending: Epic 3 |
| BR4 | Payments with `StatusCode` `REG` are treated as "ready to pay" (regular payme... | Pending: Epic 3 |
| BR5 | The `POST /v1/payment-batches` request body must contain only the IDs of paym... | Pending: Epic 3 |
| BR6 | After any mutation (Park, Unpark, Initiate Payments), the Payment Management ... | Pending: Epic 3 |
| BR7 | After a successful "Initiate Payments" action, the user is not automatically ... | Pending: Epic 3 |
| BR8 | The `LastChangedUser` header value sent to `POST /v1/payment-batches` is the ... | Pending: Epic 3 |
| BR9 | Currency values are displayed in the format `R 1,234,567.89` — US-style thous... | Pending: Epic 2 |
| BR10 | The "Reset Demo Data" button triggers a full data reset on the backend via `P... | Pending: Epic 4 |

## Non-Functional Requirements

| Req ID | Description | Covered By |
|--------|-------------|------------|
| NFR1 | All pages must be usable on desktop screens (1280px wide minimum) and on mobi... | [Story 2: Top Navigation Bar and App Shell](epic-1-foundation/story-2-top-nav-and-app-shell.md) |
| NFR2 | All interactive elements (buttons, checkboxes, dropdowns, pagination controls... | [Story 1: MortgageMax Branding and Sign-In Page](epic-1-foundation/story-1-branding-and-signin.md), [Story 2: Top Navigation Bar and App Shell](epic-1-foundation/story-2-top-nav-and-app-shell.md) |
| NFR3 | The application is light mode only. MortgageMax branding must be applied cons... | [Story 1: MortgageMax Branding and Sign-In Page](epic-1-foundation/story-1-branding-and-signin.md), [Story 2: Top Navigation Bar and App Shell](epic-1-foundation/story-2-top-nav-and-app-shell.md) |
| NFR4 | No specific performance targets (e.g., page load time, API latency SLA) are d... | [Story 3: API Client Configuration and Utilities](epic-1-foundation/story-3-api-client-and-utilities.md) |
| NFR5 | Backend CORS is handled server-side. The frontend must not include a Next.js ... | [Story 3: API Client Configuration and Utilities](epic-1-foundation/story-3-api-client-and-utilities.md) |
| NFR6 | Toast notifications for all mutation success and failure states must be dismi... | Pending: Epic 2 |
