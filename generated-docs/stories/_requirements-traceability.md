# Requirements Traceability Matrix

Generated: 2026-05-14 | Feature: BetterBond Commission Payments POC | Epics scoped: 3/4

## Coverage Summary
- **Functional Requirements:** 20/27 covered (74%)
- **Business Rules:** 9/10 covered (90%)
- **Non-Functional:** 6/6 covered (100%)
- **Compliance:** 0/0 covered (100%)
- **Pending (claimed by future epics):** R17, R18, R19, R20, R21, R22, R23, BR10

## Functional Requirements

| Req ID | Description | Covered By |
|--------|-------------|------------|
| R1 | When the user loads the Dashboard page, the frontend calls `GET /v1/payments/... | [Story 1: Dashboard Page with Metric Cards and Report Grids](epic-2-dashboard/story-1-dashboard-page.md) |
| R2 | The Dashboard displays a Payment Status grid showing all `PaymentStatusReport... | [Story 1: Dashboard Page with Metric Cards and Report Grids](epic-2-dashboard/story-1-dashboard-page.md) |
| R3 | The Dashboard displays a Parked Payments Aging grid showing all `ParkedPaymen... | [Story 1: Dashboard Page with Metric Cards and Report Grids](epic-2-dashboard/story-1-dashboard-page.md) |
| R4 | Both dashboard grids share a single AgencyName filter dropdown. Selecting an ... | [Story 1: Dashboard Page with Metric Cards and Report Grids](epic-2-dashboard/story-1-dashboard-page.md) |
| R5 | The Dashboard metric card for "Payments Made (Last 14 Days)" displays both th... | [Story 1: Dashboard Page with Metric Cards and Report Grids](epic-2-dashboard/story-1-dashboard-page.md) |
| R6 | When the dashboard API call fails, the page displays a toast notification wit... | [Story 1: Dashboard Page with Metric Cards and Report Grids](epic-2-dashboard/story-1-dashboard-page.md) |
| R7 | The Payment Management page displays a grid of all payment records fetched fr... | [Story 1: Payment Management Grid with Filtering and Pagination](epic-3-payment-management/story-1-payment-grid-filter-pagination.md) |
| R8 | The Payment Management grid supports client-side pagination. The API returns ... | [Story 1: Payment Management Grid with Filtering and Pagination](epic-3-payment-management/story-1-payment-grid-filter-pagination.md) |
| R9 | The Payment Management page provides a client-side filter by AgencyName via a... | [Story 1: Payment Management Grid with Filtering and Pagination](epic-3-payment-management/story-1-payment-grid-filter-pagination.md) |
| R10 | Each row in the Payment Management grid has a checkbox for individual selecti... | [Story 2: Row Selection, Park/Unpark Bulk Actions, and Post-Mutation Refresh](epic-3-payment-management/story-2-row-selection-park-unpark.md) |
| R11 | The user can bulk-park selected payments by clicking a "Park" button. Clickin... | [Story 2: Row Selection, Park/Unpark Bulk Actions, and Post-Mutation Refresh](epic-3-payment-management/story-2-row-selection-park-unpark.md) |
| R12 | The user can bulk-unpark selected payments by clicking an "Unpark" button. Cl... | [Story 2: Row Selection, Park/Unpark Bulk Actions, and Post-Mutation Refresh](epic-3-payment-management/story-2-row-selection-park-unpark.md) |
| R13 | The user can initiate payments for the currently selected agency by clicking ... | [Story 3: Initiate Payments Button and Batch Creation](epic-3-payment-management/story-3-initiate-payments.md) |
| R14 | After a successful "Initiate Payments" call, the frontend displays a success ... | [Story 3: Initiate Payments Button and Batch Creation](epic-3-payment-management/story-3-initiate-payments.md) |
| R15 | When the Payment Management grid has no records matching the current filter (... | [Story 1: Payment Management Grid with Filtering and Pagination](epic-3-payment-management/story-1-payment-grid-filter-pagination.md) |
| R16 | When a Park, Unpark, or Initiate Payments mutation call fails, the frontend d... | [Story 2: Row Selection, Park/Unpark Bulk Actions, and Post-Mutation Refresh](epic-3-payment-management/story-2-row-selection-park-unpark.md), [Story 3: Initiate Payments Button and Batch Creation](epic-3-payment-management/story-3-initiate-payments.md) |
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
| BR1 | The "Park" button is disabled when no payment rows are selected. Attempting t... | [Story 2: Row Selection, Park/Unpark Bulk Actions, and Post-Mutation Refresh](epic-3-payment-management/story-2-row-selection-park-unpark.md) |
| BR2 | The "Unpark" button is disabled when no payment rows are selected. Attempting... | [Story 2: Row Selection, Park/Unpark Bulk Actions, and Post-Mutation Refresh](epic-3-payment-management/story-2-row-selection-park-unpark.md) |
| BR3 | The "Initiate Payments" button is disabled when no AgencyName filter is selec... | [Story 3: Initiate Payments Button and Batch Creation](epic-3-payment-management/story-3-initiate-payments.md) |
| BR4 | Payments with `StatusCode` `REG` are treated as "ready to pay" (regular payme... | [Story 3: Initiate Payments Button and Batch Creation](epic-3-payment-management/story-3-initiate-payments.md) |
| BR5 | The `POST /v1/payment-batches` request body must contain only the IDs of paym... | [Story 3: Initiate Payments Button and Batch Creation](epic-3-payment-management/story-3-initiate-payments.md) |
| BR6 | After any mutation (Park, Unpark, Initiate Payments), the Payment Management ... | [Story 2: Row Selection, Park/Unpark Bulk Actions, and Post-Mutation Refresh](epic-3-payment-management/story-2-row-selection-park-unpark.md) |
| BR7 | After a successful "Initiate Payments" action, the user is not automatically ... | [Story 3: Initiate Payments Button and Batch Creation](epic-3-payment-management/story-3-initiate-payments.md) |
| BR8 | The `LastChangedUser` header value sent to `POST /v1/payment-batches` is the ... | [Story 3: Initiate Payments Button and Batch Creation](epic-3-payment-management/story-3-initiate-payments.md) |
| BR9 | Currency values are displayed in the format `R 1,234,567.89` — US-style thous... | [Story 1: Dashboard Page with Metric Cards and Report Grids](epic-2-dashboard/story-1-dashboard-page.md), [Story 3: Initiate Payments Button and Batch Creation](epic-3-payment-management/story-3-initiate-payments.md) |
| BR10 | The "Reset Demo Data" button triggers a full data reset on the backend via `P... | Pending: Epic 4 |

## Non-Functional Requirements

| Req ID | Description | Covered By |
|--------|-------------|------------|
| NFR1 | All pages must be usable on desktop screens (1280px wide minimum) and on mobi... | [Story 2: Top Navigation Bar and App Shell](epic-1-foundation/story-2-top-nav-and-app-shell.md), [Story 1: Dashboard Page with Metric Cards and Report Grids](epic-2-dashboard/story-1-dashboard-page.md), [Story 1: Payment Management Grid with Filtering and Pagination](epic-3-payment-management/story-1-payment-grid-filter-pagination.md) |
| NFR2 | All interactive elements (buttons, checkboxes, dropdowns, pagination controls... | [Story 1: MortgageMax Branding and Sign-In Page](epic-1-foundation/story-1-branding-and-signin.md), [Story 2: Top Navigation Bar and App Shell](epic-1-foundation/story-2-top-nav-and-app-shell.md), [Story 1: Dashboard Page with Metric Cards and Report Grids](epic-2-dashboard/story-1-dashboard-page.md), [Story 1: Payment Management Grid with Filtering and Pagination](epic-3-payment-management/story-1-payment-grid-filter-pagination.md), [Story 2: Row Selection, Park/Unpark Bulk Actions, and Post-Mutation Refresh](epic-3-payment-management/story-2-row-selection-park-unpark.md) |
| NFR3 | The application is light mode only. MortgageMax branding must be applied cons... | [Story 1: MortgageMax Branding and Sign-In Page](epic-1-foundation/story-1-branding-and-signin.md), [Story 2: Top Navigation Bar and App Shell](epic-1-foundation/story-2-top-nav-and-app-shell.md) |
| NFR4 | No specific performance targets (e.g., page load time, API latency SLA) are d... | [Story 3: API Client Configuration and Utilities](epic-1-foundation/story-3-api-client-and-utilities.md), [Story 1: Dashboard Page with Metric Cards and Report Grids](epic-2-dashboard/story-1-dashboard-page.md), [Story 1: Payment Management Grid with Filtering and Pagination](epic-3-payment-management/story-1-payment-grid-filter-pagination.md) |
| NFR5 | Backend CORS is handled server-side. The frontend must not include a Next.js ... | [Story 3: API Client Configuration and Utilities](epic-1-foundation/story-3-api-client-and-utilities.md) |
| NFR6 | Toast notifications for all mutation success and failure states must be dismi... | [Story 1: Dashboard Page with Metric Cards and Report Grids](epic-2-dashboard/story-1-dashboard-page.md), [Story 2: Row Selection, Park/Unpark Bulk Actions, and Post-Mutation Refresh](epic-3-payment-management/story-2-row-selection-park-unpark.md), [Story 3: Initiate Payments Button and Batch Creation](epic-3-payment-management/story-3-initiate-payments.md) |
