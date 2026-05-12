# Feature: BetterBond Commission Payments POC

## Problem Statement

BetterBond processes commission payments to real estate agencies and their agents following bond registrations in South Africa. The existing workflow lacks a centralized UI, making it difficult for payment administrators to review pending payments, park (hold) or release payments, and initiate bulk payment batches per agency. This POC delivers a web-based payment management interface that surfaces payment status, supports bulk park/unpark operations, and enables batch payment initiation with a downloadable invoice PDF per batch.

## User Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| User | Payment administrator authenticated via next-auth credentials provider | View dashboard metrics; view, filter, park, unpark, and initiate payments; view payment batches; download batch invoice PDFs; reset demo data |

> Single role — all authenticated users share identical permissions. Authentication is frontend-only via next-auth credentials provider. The backend does not enforce authorization (401 responses are possible but not required for this POC).

## Functional Requirements

### Dashboard

- **R1:** When the user loads the Dashboard page, the frontend calls `GET /v1/payments/dashboard` and renders three metric cards: (1) count of ready-to-pay payments, (2) count and total monetary value of payments made in the last 14 days, and (3) count of parked payments.
- **R2:** The Dashboard displays a Payment Status grid showing all `PaymentStatusReportItem` records (Status, PaymentCount, TotalPaymentAmount, CommissionType, AgencyName), filterable by AgencyName via a client-side dropdown. The dropdown is populated from the distinct AgencyName values present in the response.
- **R3:** The Dashboard displays a Parked Payments Aging grid showing all `ParkedPaymentsAgingReportItem` records (Range, AgencyName, PaymentCount), filterable by the same AgencyName client-side dropdown.
- **R4:** Both dashboard grids share a single AgencyName filter dropdown. Selecting an agency filters both grids simultaneously. An "All Agencies" option clears the filter.
- **R5:** The Dashboard metric card for "Payments Made (Last 14 Days)" displays both the count (`TotalPaymentCountInLast14Days`) and the total monetary value (`TotalCommissionCount` summed across `PaymentsByAgency` rows for the last 14 days). Currency is displayed in South African Rand format: `R 1,234,567.89` (comma thousand separator, period decimal separator, "R" prefix).
- **R6:** When the dashboard API call fails, the page displays a toast notification with the message "Failed to load dashboard data. Please try again." and the metric cards show a loading error state.

### Payment Management

- **R7:** The Payment Management page displays a grid of all payment records fetched from `GET /v1/payments` (no query parameters on initial load). Each row shows: Reference, AgencyName, AgentName, AgentSurname, ClaimDate, BondAmount, CommissionType, CommissionAmount, VAT, Status, GrantDate, RegistrationDate, Bank. The `CommissionPercent` field is not displayed.
- **R8:** The Payment Management grid supports client-side pagination. The API returns all records; the frontend paginates the results. Page size is 20 rows per page with previous/next controls.
- **R9:** The Payment Management page provides a client-side filter by AgencyName via a dropdown populated from distinct agency names in the fetched payment list.
- **R10:** Each row in the Payment Management grid has a checkbox for individual selection. A header checkbox selects or deselects all rows on the current page.
- **R11:** The user can bulk-park selected payments by clicking a "Park" button. Clicking "Park" with one or more payments selected calls `PUT /v1/payments/park` with the selected payment IDs in the request body, then refreshes the payment list.
- **R12:** The user can bulk-unpark selected payments by clicking an "Unpark" button. Clicking "Unpark" with one or more payments selected calls `PUT /v1/payments/unpark` with the selected payment IDs in the request body, then refreshes the payment list.
- **R13:** The user can initiate payments for the currently selected agency by clicking an "Initiate Payments" button. Clicking this button calls `POST /v1/payment-batches` with the IDs of all payments that have `StatusCode` `REG` (regular/ready-to-pay) for the selected agency, along with the `LastChangedUser` header set to the authenticated next-auth session username.
- **R14:** After a successful "Initiate Payments" call, the frontend displays a success toast ("Payment batch created successfully.") and refreshes the payment list.
- **R15:** When the Payment Management grid has no records matching the current filter (or the API returns an empty list), the grid body displays an empty state message: "No payments ready for processing."
- **R16:** When a Park, Unpark, or Initiate Payments mutation call fails, the frontend displays a toast notification describing the failure (e.g., "Failed to park payments. Please try again.").

### Payments Made (Batch List)

- **R17:** The Payments Made page displays a list of all payment batches fetched from `GET /v1/payment-batches`. Each batch card/row shows: Reference, CreatedDate, AgencyName, Status, PaymentCount, TotalCommissionAmount, TotalVat, LastChangedUser.
- **R18:** The Payments Made page supports client-side pagination. Page size is 20 rows per page with previous/next controls.
- **R19:** Each payment batch row has a "Download PDF" button. Clicking it calls `POST /v1/payment-batches/{Id}/download-invoice-pdf` and triggers a browser file download of the returned binary PDF. The suggested filename is `batch-{Reference}.pdf`.
- **R20:** When a PDF download call fails, the frontend displays a toast notification: "Failed to download PDF. Please try again."
- **R21:** When the batch list is empty, the page displays the message: "No payment batches found."
- **R22:** The Payments Made page includes a "Reset Demo Data" button. Clicking it calls `POST /demo/reset-demo`, then refreshes the batch list and displays a toast: "Demo data has been reset." This button is visible to all authenticated users and is intended for demonstration purposes only.
- **R23:** When the "Reset Demo Data" call fails, the frontend displays a toast notification: "Failed to reset demo data. Please try again."

### Authentication

- **R24:** The application uses next-auth with a credentials provider for frontend-only authentication. Unauthenticated users are redirected to a sign-in page. Successful sign-in redirects to the Dashboard page.
- **R25:** The authenticated user's username (from the next-auth session) is included as the `LastChangedUser` HTTP header on all `POST /v1/payment-batches` calls.

### Navigation

- **R26:** The application has a top navigation bar with links to: Dashboard, Payment Management, and Payments Made. The active route is visually highlighted.
- **R27:** The navigation bar displays MortgageMax branding (navy #1A3A6E primary color, teal accent) in light mode only.

## Business Rules

- **BR1:** The "Park" button is disabled when no payment rows are selected. Attempting to click it while disabled has no effect.
- **BR2:** The "Unpark" button is disabled when no payment rows are selected. Attempting to click it while disabled has no effect.
- **BR3:** The "Initiate Payments" button is disabled when no AgencyName filter is selected (i.e., "All Agencies" is active) or when there are no REG-status payments for the selected agency. The button becomes enabled only when an agency is selected and at least one payment in the current filtered list has `StatusCode` `REG`.
- **BR4:** Payments with `StatusCode` `REG` are treated as "ready to pay" (regular payments) and are eligible for batch initiation. Payments with `StatusCode` `MAN-PAY` are treated as "manually paid" and are excluded from batch initiation.
- **BR5:** The `POST /v1/payment-batches` request body must contain only the IDs of payments with `StatusCode` `REG` belonging to the currently selected agency. Payments belonging to other agencies or with a non-REG status must not be included.
- **BR6:** After any mutation (Park, Unpark, Initiate Payments), the Payment Management grid clears all row selections and re-fetches the payment list from the API before re-rendering.
- **BR7:** After a successful "Initiate Payments" action, the user is not automatically navigated away from the Payment Management page.
- **BR8:** The `LastChangedUser` header value sent to `POST /v1/payment-batches` is the username string from the next-auth session. If the session username is not available at the time of the call, the call must not be made and the user must be redirected to sign-in.
- **BR9:** Currency values are displayed in the format `R 1,234,567.89` — US-style thousand/decimal separators with an "R" prefix — throughout the application. The dataset's en-ZA locale notation (space thousand separator, comma decimal) is not used in the UI.
- **BR10:** The "Reset Demo Data" button triggers a full data reset on the backend via `POST /demo/reset-demo`. This action has no confirmation dialog — it executes immediately on click. It is intended for demonstration purposes only and does not represent a production workflow.

## Data Model

| Entity | Key Fields | Relationships |
|--------|-----------|---------------|
| Payment | Id, Reference, AgencyName, AgentName, AgentSurname, ClaimDate, BondAmount, CommissionType, CommissionAmount, VAT, Status (contains StatusCode e.g. REG / MAN-PAY), GrantDate, RegistrationDate, Bank, LastChangedUser, LastChangedDate, BatchId | Belongs to one Agency (by name); optionally associated with one PaymentBatch (via BatchId) |
| PaymentBatch | Id, Reference, CreatedDate, Status, AgencyName, PaymentCount, TotalCommissionAmount, TotalVat, LastChangedUser | Has many Payments |
| PaymentStatusReportItem | Status, PaymentCount, TotalPaymentAmount, CommissionType, AgencyName | Aggregated view — no direct FK; grouped by status and agency |
| ParkedPaymentsAgingReportItem | Range, AgencyName, PaymentCount | Aggregated view — grouped by aging range and agency |
| PaymentsDashboard | PaymentStatusReport (array), ParkedPaymentsAgingReport (array), TotalPaymentCountInLast14Days (integer), PaymentsByAgency (array of PaymentsByAgencyReportItem) | Composite read model returned by `GET /v1/payments/dashboard` |
| PaymentsByAgencyReportItem | AgencyName, PaymentCount, TotalCommissionCount, Vat | Sub-component of PaymentsDashboard |

> Note: `CommissionPercent` is not present in the API schema and must not be displayed in the UI.

## Backend Integration

| Aspect | Value |
|--------|-------|
| Base URL | `http://localhost:8042` |
| Auth scheme | none |
| Auth header | N/A |
| Auth value format | N/A |
| Credential env vars | None required |
| Smoke-test endpoint | `GET /v1/payments/dashboard` |
| Smoke-test status | 200 — verified during INTAKE (2026-05-12) |
| CORS / proxy notes | User confirmed backend sends proper `Access-Control-Allow-Origin` headers. No Next.js rewrite proxy required. Browser (localhost:3000) can call backend (localhost:8042) directly. |

### API Endpoint Inventory

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/payments/dashboard` | GET | Fetch all dashboard metric data |
| `/v1/payments` | GET | Fetch all payment records (supports optional `ClaimDate`, `AgencyName`, `Status` query params) |
| `/v1/payments/{Id}` | GET | Fetch single payment by ID |
| `/v1/payments/park` | PUT | Bulk-park payments by ID array |
| `/v1/payments/unpark` | PUT | Bulk-unpark payments by ID array |
| `/v1/payment-batches` | GET | Fetch all payment batches (supports optional `Reference`, `AgencyName` query params) |
| `/v1/payment-batches` | POST | Create a payment batch — requires `LastChangedUser` header and `PaymentIds` array body |
| `/v1/payment-batches/{Id}` | GET | Fetch single payment batch by ID |
| `/v1/payment-batches/{Id}/download-invoice-pdf` | POST | Download invoice PDF for a batch — returns `application/octet-stream` |
| `/demo/reset-demo` | POST | Reset all demo data to initial state |

## Key Workflows

### 1. View Dashboard

1. User navigates to the Dashboard page.
2. Frontend calls `GET /v1/payments/dashboard`.
3. On success, three metric cards render: ready-to-pay count, payments-made count + total value (last 14 days), parked count.
4. Two grids render: Payment Status Report and Parked Payments Aging Report.
5. User selects an agency from the AgencyName dropdown — both grids filter to that agency.
6. User selects "All Agencies" — both grids show all records again.
7. On API failure, toast notification appears and cards display error state.

### 2. Park / Unpark Payments

1. User navigates to the Payment Management page.
2. Frontend calls `GET /v1/payments` and renders the full payment list with pagination.
3. User optionally selects an agency from the filter dropdown.
4. User selects one or more payment rows using checkboxes.
5. User clicks "Park" — frontend calls `PUT /v1/payments/park` with selected IDs.
6. On success, grid selections are cleared and the payment list re-fetches.
7. On failure, a toast notification appears ("Failed to park payments. Please try again.").
8. Same flow applies for "Unpark" with `PUT /v1/payments/unpark`.

### 3. Initiate Payment Batch

1. User navigates to the Payment Management page.
2. User selects an agency from the AgencyName dropdown filter.
3. The "Initiate Payments" button becomes enabled when at least one REG-status payment exists for the selected agency.
4. User clicks "Initiate Payments."
5. Frontend collects the IDs of all REG-status payments for the selected agency (from the in-memory payment list).
6. Frontend calls `POST /v1/payment-batches` with: header `LastChangedUser: <session username>`, body `{ "PaymentIds": [<ids>] }`.
7. On success, toast "Payment batch created successfully." appears and the payment list re-fetches.
8. On failure, toast "Failed to initiate payment batch. Please try again." appears.

### 4. Download Invoice PDF

1. User navigates to the Payments Made page.
2. Frontend calls `GET /v1/payment-batches` and renders the batch list with pagination.
3. User clicks "Download PDF" on a batch row.
4. Frontend calls `POST /v1/payment-batches/{Id}/download-invoice-pdf`.
5. On success, the browser downloads the binary response as `batch-{Reference}.pdf`.
6. On failure, toast "Failed to download PDF. Please try again." appears.

### 5. Reset Demo Data

1. User navigates to the Payments Made page.
2. User clicks "Reset Demo Data."
3. Frontend calls `POST /demo/reset-demo` immediately (no confirmation dialog).
4. On success, batch list re-fetches and toast "Demo data has been reset." appears.
5. On failure, toast "Failed to reset demo data. Please try again." appears.

### 6. Sign In

1. Unauthenticated user accesses any page.
2. next-auth middleware redirects user to the sign-in page.
3. User enters credentials into the next-auth credentials provider form.
4. On success, user is redirected to the Dashboard page.
5. On failure, sign-in page displays an error message.

## Compliance & Regulatory Requirements

No compliance domains were identified during intake screening. This is a POC application that does not handle card data, personal health data, or regulated financial transactions. The commission payment values displayed are internal business figures, not consumer payment data requiring PCI-DSS or GDPR controls.

## Non-Functional Requirements

- **NFR1:** All pages must be usable on desktop screens (1280px wide minimum) and on mobile screens (375px minimum). Navigation collapses to a mobile-friendly layout on screens below 768px.
- **NFR2:** All interactive elements (buttons, checkboxes, dropdowns, pagination controls, form inputs) must be operable via keyboard navigation and must have accessible labels or ARIA attributes meeting WCAG 2.1 AA baseline.
- **NFR3:** The application is light mode only. MortgageMax branding must be applied consistently: primary navy `#1A3A6E`, teal accent. No dark mode toggle is required.
- **NFR4:** No specific performance targets (e.g., page load time, API latency SLA) are defined for this POC. The application should not make unnecessary API calls (e.g., no polling).
- **NFR5:** Backend CORS is handled server-side. The frontend must not include a Next.js rewrite proxy for API calls to `http://localhost:8042`. Direct browser-to-backend calls are the expected pattern.
- **NFR6:** Toast notifications for all mutation success and failure states must be dismissible by the user and must auto-dismiss after a reasonable timeout (suggested: 5 seconds).

## Out of Scope

- Creating new payment records or editing existing payment record fields via the UI.
- Deleting payment records or payment batches.
- Email or SMS notifications to agencies or agents when payments are initiated or batches are created.
- Multi-user authentication, role differentiation, or per-agency access restrictions. All authenticated users see and can act on all data.
- Real payment gateway integration (e.g., bank EFT submission, SWIFT). The "Initiate Payments" action creates a batch record only.
- Audit log or change history UI.
- Search or free-text filtering beyond the AgencyName dropdown on Payment Management and Dashboard.
- Date range filtering on the Payment Management grid (the `ClaimDate` query parameter exists on the API but is not exposed in the UI).
- The "Reset Demo Data" feature is a demonstration tool only and is not a production requirement. It must not be deployed to a production environment.
- Approval workflows or multi-step authorization for payment initiation.
- Batch editing or merging of payment batches.

---

## Source Traceability

| ID | Source | Reference |
|----|--------|-----------|
| R1 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Dashboard section — metric cards requirement |
| R2 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Dashboard — Payment Status Report grid |
| R3 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Dashboard — Parked Payments Aging Report grid |
| R4 | User input | Clarifying question: "Does the agency filter apply to both dashboard grids simultaneously?" |
| R5 | User input | Clarifying question: "Dashboard 'Total Value of Payments Made (Last 14 Days)' — count only or count + monetary value?" Answer: show both; currency format confirmed as R 1,234,567.89 |
| R6 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Error handling section; user input confirmed toast pattern |
| R7 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Payment Management grid columns; user input: CommissionPercent omitted |
| R8 | User input | Clarifying question: "Pagination — server-side or client-side?" Answer: client-side, API returns all records |
| R9 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Payment Management filtering requirement |
| R10 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Bulk selection checkboxes |
| R11 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Park payments action; `documentation/Api Definition.yaml` `PUT /v1/payments/park` |
| R12 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Unpark payments action; `documentation/Api Definition.yaml` `PUT /v1/payments/unpark` |
| R13 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Initiate Payments action; user input: use REG StatusCode, use session username for LastChangedUser |
| R14 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Post-initiation feedback; user input confirmed toast pattern |
| R15 | User input | Clarifying question: "Empty state message?" Answer: "No payments ready for processing." |
| R16 | User input | Clarifying question: "Error handling for mutations?" Answer: toast notifications |
| R17 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Payments Made — batch list and fields; `documentation/Api Definition.yaml` `PaymentBatchRead` schema |
| R18 | User input | Clarifying question: "Pagination on batch list?" Answer: client-side, 20 rows per page |
| R19 | `documentation/BetterBond-Commission-Payments-POC-002.md` | PDF download button; `documentation/Api Definition.yaml` `POST /v1/payment-batches/{Id}/download-invoice-pdf` |
| R20 | User input | Clarifying question: "PDF download error handling?" Answer: toast notification |
| R21 | User input | Clarifying question: "Empty state for batch list?" Answer: "No payment batches found." |
| R22 | User input | Clarifying question: "Demo reset — expose in UI?" Answer: yes, "Reset Demo Data" button on Payments Made page |
| R23 | User input | Clarifying question: "Reset Demo Data error handling?" Answer: toast notification |
| R24 | `generated-docs/context/intake-manifest.json` | `context.authMethod: "frontend-only"`, `context.customAuthNotes` — next-auth credentials provider |
| R25 | `documentation/Api Definition.yaml` | `POST /v1/payment-batches` — `LastChangedUser` header (required); user input: use next-auth session username |
| R26 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Navigation / screen inventory section |
| R27 | `generated-docs/context/intake-manifest.json` | `context.stylingNotes` — MortgageMax branding, navy #1A3A6E, teal accent, light mode only |
| BR1 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Park disabled state requirement |
| BR2 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Unpark disabled state requirement |
| BR3 | User input | Clarifying question: "When is Initiate Payments enabled?" Answer: agency selected + REG payments exist |
| BR4 | User input | Clarifying question: "Payment states — READY/PARKED vs StatusCode?" Answer: use StatusCode REG (ready) / MAN-PAY (manually paid) |
| BR5 | User input | Clarifying question: "Which payments are included in a batch POST?" Answer: REG-status payments for selected agency only |
| BR6 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Post-mutation refresh behavior |
| BR7 | `documentation/BetterBond-Commission-Payments-POC-002.md` | No auto-navigation after batch initiation |
| BR8 | `documentation/Api Definition.yaml` | `LastChangedUser` header is required on `POST /v1/payment-batches`; user input confirmed session username source |
| BR9 | User input | Clarifying question: "Currency format?" Answer: R 1,234,567.89 (US-style separators, not en-ZA locale) |
| BR10 | User input | Clarifying question: "Reset Demo Data — confirmation dialog?" Answer: no confirmation, executes immediately |
| NFR1 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Responsive design requirement |
| NFR2 | `documentation/BetterBond-Commission-Payments-POC-002.md` | Accessibility requirement |
| NFR3 | `generated-docs/context/intake-manifest.json` | `context.stylingNotes` — light mode only, MortgageMax branding |
| NFR4 | User input | Clarifying question: "Performance targets?" Answer: none defined for POC |
| NFR5 | User input | Clarifying question: "CORS handling?" Answer: backend sends proper CORS headers, no proxy needed |
| NFR6 | User input | Clarifying question: "Toast auto-dismiss?" (inferred from standard UX practice; user confirmed toast pattern) |
