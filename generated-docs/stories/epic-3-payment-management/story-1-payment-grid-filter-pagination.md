---
dependsOn: []
---

# Story: Payment Management Grid with Filtering and Pagination

**Epic:** Payment Management | **Story:** 1 of 3 | **Wireframe:** `generated-docs/specs/wireframes/`

**Role:** All Roles (single authenticated role per FRS)

**Requirements:** [R7](../../specs/feature-requirements.md#payment-management), [R8](../../specs/feature-requirements.md#payment-management), [R9](../../specs/feature-requirements.md#payment-management), [R15](../../specs/feature-requirements.md#payment-management), [NFR1](../../specs/feature-requirements.md#non-functional-requirements), [NFR2](../../specs/feature-requirements.md#non-functional-requirements), [NFR4](../../specs/feature-requirements.md#non-functional-requirements)

## Story Metadata

| Field | Value |
|-------|-------|
| **Route** | `/payment-management` |
| **Target File** | `app/(protected)/payment-management/page.tsx` |
| **Page Action** | `modify_existing` |
| **Routable** | Yes |

## User Story

**As a** payment administrator **I want** to see a paginated, filterable grid of all commission payments **So that** I can review payment details by agency and navigate through large volumes of records.

## Acceptance Criteria

### Auth Redirect

- [ ] AC-1: Given I am not authenticated, when I visit `/payment-management`, then I am redirected to `/auth/signin` and must sign in before seeing the page.

### Data Fetch — Happy Path

- [x] AC-2: Given I am authenticated, when the Payment Management page loads, then the frontend calls `GET /v1/payments` exactly once on mount and displays the returned data.
- [x] AC-3: Given the API responds with data, when the page renders, then the payment grid is visible with rows populated from the `PaymentList` array.

### Grid Columns

- [x] AC-4: Given the API has returned data, when I view the payment grid, then I see exactly these 13 columns in order: Reference, AgencyName, AgentName, AgentSurname, ClaimDate, BondAmount, CommissionType, CommissionAmount, VAT, Status, GrantDate, RegistrationDate, Bank.
- [x] AC-5: Given the API has returned data, when I view the payment grid, then the `CommissionPercent` field is NOT shown as a column anywhere in the grid.
- [x] AC-6: Given the API has returned data, when I view the grid rows, then monetary columns (BondAmount, CommissionAmount, VAT) are formatted as `R 1,234,567.89` (R prefix, comma thousand separator, period decimal separator, two decimal places) per BR9.
- [x] AC-7: Given the API has returned data, when I view the grid rows, then date columns (ClaimDate, GrantDate, RegistrationDate) are displayed in a human-readable format (e.g., `DD MMM YYYY` or `YYYY-MM-DD`).

### Client-Side Pagination

- [x] AC-8: Given the API has returned more than 20 payments, when the page renders, then only the first 20 records are shown in the grid and pagination controls (Previous and Next buttons) are visible.
- [x] AC-9: Given I am on page 1, when I click the "Next" button, then the grid shows the next 20 records (rows 21–40) and the "Previous" button becomes enabled.
- [x] AC-10: Given I am on any page after the first, when I click the "Previous" button, then the grid shows the previous 20 records and I move back one page.
- [x] AC-11: Given I am on the last page, when I view the pagination controls, then the "Next" button is disabled.
- [x] AC-12: Given I am on the first page, when I view the pagination controls, then the "Previous" button is disabled.
- [x] AC-13: Given the API returns 20 or fewer payments, when the page renders, then the pagination controls are either hidden or both Previous and Next are disabled.

### AgencyName Filter Dropdown

- [x] AC-14: Given the API has returned data, when I view the AgencyName filter dropdown, then it is populated with the distinct `AgencyName` values from the `PaymentList` array, sorted alphabetically.
- [x] AC-15: Given the AgencyName dropdown is rendered, when I open it, then the first option is "All Agencies" which represents no filter applied.
- [x] AC-16: Given "All Agencies" is selected (the default), when I view the grid, then all records from the API response are shown (subject to pagination).
- [x] AC-17: Given I select a specific agency from the dropdown, when the grid re-renders, then only rows where `AgencyName` matches the selected agency are shown.
- [x] AC-18: Given I select a specific agency and then select "All Agencies", when the grid re-renders, then all rows from the API response are shown again.
- [x] AC-19: Given I change the agency filter, when the grid updates, then the pagination resets to page 1.

### Loading State

- [x] AC-20: Given I am on the Payment Management page, when the `GET /v1/payments` fetch is in-flight, then skeleton placeholder elements are visible in place of the grid rows.
- [x] AC-21: Given the data fetch completes, when the response is received, then the skeleton placeholders are replaced by the real grid rows.

### Empty State

- [x] AC-22: Given the API returns an empty `PaymentList`, when the grid renders, then the grid body displays the message "No payments ready for processing." instead of an empty table body.
- [x] AC-23: Given a specific agency is selected and no payments match that agency, when the grid renders, then the grid body displays the message "No payments ready for processing."

### Error State

- [x] AC-24: Given the `GET /v1/payments` call fails (network error or non-2xx response), when the error is received, then a toast notification is displayed describing the failure (e.g., "Failed to load payments. Please try again.").
- [x] AC-25: Given the API call fails, when I view the page, then the grid area shows an error placeholder or empty state rather than crashing the page.

### Accessibility

- [x] AC-26: Given I am on the Payment Management page, when I inspect the grid, then it uses semantic `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, and `<td>` markup so screen readers can announce column headers with each cell.
- [ ] AC-27: Given I am on the Payment Management page, when I navigate using the Tab key, then I can reach the AgencyName dropdown and the pagination buttons and each has a visible focus indicator.

## Requirements Traceability

| Requirement | Acceptance Criteria |
|-------------|---------------------|
| [R7](../../specs/feature-requirements.md#payment-management) — Grid with 13 columns, CommissionPercent excluded | AC-4, AC-5, AC-6, AC-7 |
| [R8](../../specs/feature-requirements.md#payment-management) — Client-side pagination, 20 rows/page | AC-8, AC-9, AC-10, AC-11, AC-12, AC-13 |
| [R9](../../specs/feature-requirements.md#payment-management) — Client-side AgencyName filter dropdown | AC-14, AC-15, AC-16, AC-17, AC-18, AC-19 |
| [R15](../../specs/feature-requirements.md#payment-management) — Empty state: "No payments ready for processing." | AC-22, AC-23 |
| [NFR1](../../specs/feature-requirements.md#non-functional-requirements) — Next.js 16 + React 19 + TypeScript 5 | (architectural — verified by build) |
| [NFR2](../../specs/feature-requirements.md#non-functional-requirements) — Shadcn UI components | (architectural — verified by code review) |
| [NFR4](../../specs/feature-requirements.md#non-functional-requirements) — Loading states | AC-20, AC-21 |

## API Endpoints (from OpenAPI spec)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/v1/payments` | Fetch all payment records — returns `PaymentReadList` |

### Response Type: `PaymentReadList`

```typescript
interface PaymentReadList {
  PaymentList: PaymentRead[];
}

interface PaymentRead {
  Id: number;
  Reference: string;
  AgencyName: string;
  AgentName: string;
  AgentSurname: string;
  ClaimDate: string;
  BondAmount: number;
  CommissionType: string;
  CommissionAmount: number;
  VAT: number;
  Status: { StatusCode: string };  // Normalised by getPayments() — access via payment.Status?.StatusCode
  GrantDate: string;
  RegistrationDate: string;
  Bank: string;
  BatchId?: number;
  LastChangedUser: string;
  LastChangedDate: string;
}
```

No endpoints are missing — `GET /v1/payments` is the only call required for this story.

## Implementation Notes

### FRS-Over-Template: Replace the Stub Page

The existing `app/(protected)/payment-management/page.tsx` is a template stub. It must be REPLACED entirely — do NOT preserve any template placeholder text or demo content. The FRS and this story's acceptance criteria are the source of truth.

### Data Loading Pattern

Call `getPayments()` from `@/lib/api/endpoints` on component mount (do NOT call `get('/v1/payments')` directly). `getPayments()` unwraps the `{ PaymentList: [...] }` envelope and normalises each payment's `Status` to `{ StatusCode: string }` per BA-4. Access status via `payment.Status?.StatusCode` (e.g., `=== 'REG'`, `=== 'PARKED'`).

Store the full `PaymentList` array in component state. Pagination and filtering are applied client-side from this in-memory list — no additional API calls are made when the user changes the page or selects an agency filter.

### Pagination Logic

- Import `PAGINATION` from `@/lib/utils/constants` and use `PAGINATION.DEFAULT_PAGE_SIZE` (currently `20`) instead of hardcoding the number in implementation logic. (Leave the ACs' explicit "20 records" wording as-is — it is correct as spec.)
- Track current page index in component state (reset to 1 when filter changes)
- Derive `paginatedRows` as: `filteredList.slice((page - 1) * PAGINATION.DEFAULT_PAGE_SIZE, page * PAGINATION.DEFAULT_PAGE_SIZE)`
- Previous button disabled when `page === 1`
- Next button disabled when `page * PAGINATION.DEFAULT_PAGE_SIZE >= filteredList.length`

### AgencyName Filter Logic

- Derive distinct agency names: `[...new Set(paymentList.map(p => p.AgencyName))].sort()`
- Store selected agency in component state (default: `"ALL"` or `""`)
- `filteredList` = `selectedAgency ? paymentList.filter(p => p.AgencyName === selectedAgency) : paymentList`
- On filter change: reset page to 1 before re-rendering

### Currency and Date Formatting

- Monetary columns: use `formatCurrency` from `@/lib/utils/format` (e.g., `import { formatCurrency } from '@/lib/utils/format'`). The function returns `"R 1,234,567.89"` for a number, `"—"` for null/undefined.
- Date columns: use `formatDate` from `@/lib/utils/format` (e.g., `import { formatDate } from '@/lib/utils/format'`). Outputs `"DD MMM YYYY"` (e.g., `"15 Mar 2024"`). Returns `"—"` for null/undefined/empty/unparseable values. Do NOT use `toLocaleDateString` directly — it has a UTC-offset shift bug on date-only strings that `formatDate` already corrects.

### Shadcn Components to Use

- `Table` / `TableHeader` / `TableBody` / `TableRow` / `TableHead` / `TableCell` — payment grid
- `Select` — AgencyName filter dropdown
- `Button` — Previous / Next pagination buttons
- `Skeleton` — loading placeholders (one skeleton row per expected page row)
- Sonner `toast` — error notification (already installed in Epic 1)

Install any missing Shadcn components via MCP before use.

### Test Notes

This story is routable (`/payment-management`) — a Playwright spec must be created at `web/e2e/epic-3-story-1-payment-grid-filter-pagination.spec.ts`. The spec should cover:
- Auth redirect: visit `/payment-management` unauthenticated, assert redirect to `/auth/signin`.
- Happy path: sign in, assert grid is visible with rows and pagination controls.
- Agency filter: select an agency, assert grid shows only matching rows.
- Empty state: mock API returning empty list, assert "No payments ready for processing." message.
- Error state: mock API failure, assert toast appears.
