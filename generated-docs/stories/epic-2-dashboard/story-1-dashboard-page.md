# Story: Dashboard Page with Metric Cards and Report Grids

**Epic:** Dashboard | **Story:** 1 of 1 | **Wireframe:** `generated-docs/specs/wireframes/`

**Role:** All Roles (single authenticated role per FRS)

**Requirements:** [R1](../../specs/feature-requirements.md#dashboard), [R2](../../specs/feature-requirements.md#dashboard), [R3](../../specs/feature-requirements.md#dashboard), [R4](../../specs/feature-requirements.md#dashboard), [R5](../../specs/feature-requirements.md#dashboard), [R6](../../specs/feature-requirements.md#dashboard), [BR9](../../specs/feature-requirements.md#business-rules), [NFR1](../../specs/feature-requirements.md#non-functional-requirements), [NFR2](../../specs/feature-requirements.md#non-functional-requirements), [NFR4](../../specs/feature-requirements.md#non-functional-requirements), [NFR6](../../specs/feature-requirements.md#non-functional-requirements)

## Story Metadata

| Field | Value |
|-------|-------|
| **Route** | `/` |
| **Target File** | `app/(protected)/page.tsx` |
| **Page Action** | `modify_existing` |
| **Routable** | Yes |

## User Story

**As a** payment administrator **I want** to see a dashboard with key payment metric cards and filterable report grids **So that** I can quickly review the payment status across all agencies and drill into agency-level data.

## Acceptance Criteria

Every acceptance criterion is prefixed with a sequential AC-N identifier. Format: `- [ ] AC-N: Given [precondition], when [action], then [what user sees]`.

### Auth Redirect

- [ ] AC-1: Given I am not authenticated, when I visit `/`, then I am redirected to `/auth/signin` and must sign in before seeing the dashboard.

### Data Fetch — Happy Path

- [ ] AC-2: Given I am authenticated, when the dashboard page loads, then the frontend calls `GET /v1/payments/dashboard` exactly once on mount and displays the returned data.
- [ ] AC-3: Given the API responds with data, when the dashboard renders, then all three metric cards, the Payment Status Report grid, and the Parked Payments Aging Report grid are visible on the page.

### Loading State

- [ ] AC-4: Given I am on the dashboard page, when the `GET /v1/payments/dashboard` fetch is in-flight, then skeleton placeholder elements are visible in place of each metric card value and in place of each grid's rows.
- [ ] AC-5: Given the data fetch completes, when the response is received, then the skeleton placeholders are replaced by the real metric card values and grid rows.

### Metric Card — Ready to Pay

- [ ] AC-6: Given the API has returned data, when I view the "Ready to Pay" metric card, then I see the total count of payments that have a `REG` status across all `PaymentStatusReport` rows (i.e., the sum of `PaymentCount` for all `PaymentStatusReportItem` rows where `Status` contains "REG").
- [ ] AC-7: Given the API has returned data, when I view the "Ready to Pay" metric card, then the count is a plain integer (no currency formatting — this is a count, not a value).

### Metric Card — Payments Made (Last 14 Days)

- [ ] AC-8: Given the API has returned data, when I view the "Payments Made (Last 14 Days)" metric card, then I see the count from `TotalPaymentCountInLast14Days` displayed as a plain integer.
- [ ] AC-9: Given the API has returned data, when I view the "Payments Made (Last 14 Days)" metric card, then I also see the total monetary value, which is the sum of `TotalCommissionCount` across all `PaymentsByAgency` rows, formatted as `R 1,234,567.89` (R prefix, comma thousand separator, period decimal separator, two decimal places) per BR9.
- [ ] AC-10: Given the `PaymentsByAgency` array is empty or absent, when I view the "Payments Made" total value, then it displays `R 0.00`.

### Metric Card — Parked

- [ ] AC-11: Given the API has returned data, when I view the "Parked" metric card, then I see the total count of payments that have a `PARKED` status across all `PaymentStatusReport` rows (i.e., the sum of `PaymentCount` for all `PaymentStatusReportItem` rows where `Status` contains "PARKED").
- [ ] AC-12: Given the API has returned data, when I view the "Parked" metric card, then the count is a plain integer (no currency formatting).

### Metric Cards — Agency Filter Does NOT Apply

- [ ] AC-13: Given I have selected a specific agency from the AgencyName dropdown, when I view the three metric cards (Ready to Pay, Payments Made, Parked), then the metric card values do NOT change — they always reflect the full dataset regardless of the selected agency filter.

### Payment Status Report Grid

- [ ] AC-14: Given the API has returned data, when I view the Payment Status Report grid, then I see a column for each of: Status, PaymentCount, TotalPaymentAmount, CommissionType, AgencyName — in that order.
- [ ] AC-15: Given the API has returned data, when I view the Payment Status Report grid, then each row shows the values from a `PaymentStatusReportItem` record bound to the correct columns.
- [ ] AC-16: Given the Payment Status Report grid is rendered, when I view the `TotalPaymentAmount` column, then monetary values are formatted as `R 1,234,567.89` using `formatCurrency` from the Epic 1 utilities (R prefix, comma thousand separator, period decimal separator, two decimal places).
- [ ] AC-17: Given the Payment Status Report grid is rendered, when I view the `PaymentCount` column, then numbers use `tabular-nums` font styling so columns align visually.

### Parked Payments Aging Report Grid

- [ ] AC-18: Given the API has returned data, when I view the Parked Payments Aging Report grid, then I see a column for each of: Range, AgencyName, PaymentCount — in that order.
- [ ] AC-19: Given the API has returned data, when I view the Parked Payments Aging Report grid, then each row shows the values from a `ParkedPaymentsAgingReportItem` record bound to the correct columns.
- [ ] AC-20: Given the Parked Payments Aging Report grid is rendered, when I view the `PaymentCount` column, then numbers use `tabular-nums` font styling so columns align visually.

### AgencyName Filter Dropdown

- [ ] AC-21: Given the API has returned data, when I view the AgencyName dropdown, then it is populated with the distinct union of `AgencyName` values drawn from both the `PaymentStatusReport` and `ParkedPaymentsAgingReport` arrays (deduped, sorted alphabetically).
- [ ] AC-22: Given the AgencyName dropdown is rendered, when I open it, then the first option is "All Agencies" which represents no filter applied.
- [ ] AC-23: Given "All Agencies" is selected (the default), when I view both grids, then all rows from the API response are shown in each grid without any filtering.
- [ ] AC-24: Given I select a specific agency from the dropdown, when both grids re-render, then the Payment Status Report grid shows only rows where `AgencyName` matches the selected agency, and the Parked Payments Aging Report grid shows only rows where `AgencyName` matches the selected agency.
- [ ] AC-25: Given a specific agency is selected and filtering is active, when I select "All Agencies" from the dropdown, then both grids revert to showing all rows from the API response.
- [ ] AC-26: Given a specific agency is selected and filtering is active, when there are zero matching rows in the Payment Status Report grid, then that grid displays an empty-state message (e.g., "No data for selected agency") instead of an empty table body.
- [ ] AC-27: Given a specific agency is selected and filtering is active, when there are zero matching rows in the Parked Payments Aging Report grid, then that grid displays an empty-state message (e.g., "No data for selected agency") instead of an empty table body.

### Error State — Toast Only (R6 / User Decision)

> **Decision recorded:** On `getDashboard()` failure the error display is a toast notification only. No persistent inline `<Alert />` banner is rendered on the page. This overrides the wireframe's inline Alert design. The metric cards show an error placeholder value in place of their numbers. The grids are not rendered when the fetch fails.

- [ ] AC-28: Given the `GET /v1/payments/dashboard` call fails (network error or non-2xx response), when the error is received, then a toast notification is displayed with the message "Failed to load dashboard data. Please try again." (or equivalent wording matching R6).
- [ ] AC-29: Given the API call fails, when I view the metric card areas, then each card shows a placeholder (e.g., "— error loading —" or similar) in place of the numeric value — no blank/empty space.
- [ ] AC-30: Given the API call fails, when I look at the page, then neither the Payment Status Report grid nor the Parked Payments Aging Report grid is rendered — they are hidden or replaced.
- [ ] AC-31: Given the API call fails, when I inspect the page, then there is NO inline `<Alert />` component visible — only the toast notification communicates the error.

### Accessibility

- [ ] AC-32: Given I am on the dashboard page, when I navigate using the Tab key, then I can reach the AgencyName dropdown and it has a visible focus indicator.
- [ ] AC-33: Given I am on the dashboard page, when I use keyboard navigation to open the AgencyName dropdown and select an option, then the grids update with the filter applied — the dropdown is fully operable via keyboard.
- [ ] AC-34: Given I am on the dashboard page, when I inspect the report grids, then they use semantic `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, and `<td>` markup so screen readers can announce column headers with each cell.

## Requirements Traceability

| Requirement | Acceptance Criteria |
|-------------|---------------------|
| [R1](../../specs/feature-requirements.md#dashboard) — Calls `GET /v1/payments/dashboard`, renders 3 metric cards | AC-2, AC-3, AC-6, AC-8, AC-11 |
| [R2](../../specs/feature-requirements.md#dashboard) — Payment Status Report grid (Status, PaymentCount, TotalPaymentAmount, CommissionType, AgencyName), filterable by AgencyName | AC-14, AC-15, AC-16, AC-24 |
| [R3](../../specs/feature-requirements.md#dashboard) — Parked Payments Aging Report grid (Range, AgencyName, PaymentCount), filterable by same dropdown | AC-18, AC-19, AC-24 |
| [R4](../../specs/feature-requirements.md#dashboard) — Single shared AgencyName dropdown, "All Agencies" option | AC-21, AC-22, AC-23, AC-24, AC-25 |
| [R5](../../specs/feature-requirements.md#dashboard) — "Payments Made" card shows count + total value in `R 1,234,567.89` format | AC-8, AC-9, AC-10 |
| [R6](../../specs/feature-requirements.md#dashboard) — API failure: toast notification + metric card error state | AC-28, AC-29, AC-30, AC-31 |
| [BR9](../../specs/feature-requirements.md#business-rules) — Currency format `R 1,234,567.89` throughout UI | AC-9, AC-16 |
| [NFR1](../../specs/feature-requirements.md#non-functional-requirements) — Next.js 16 + React 19 + TypeScript 5 | (architectural — verified by build) |
| [NFR2](../../specs/feature-requirements.md#non-functional-requirements) — Shadcn UI components | (architectural — verified by code review) |
| [NFR4](../../specs/feature-requirements.md#non-functional-requirements) — Loading states | AC-4, AC-5 |
| [NFR6](../../specs/feature-requirements.md#non-functional-requirements) — Accessible keyboard navigation and semantic HTML | AC-32, AC-33, AC-34 |

## API Endpoints (from OpenAPI spec)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/v1/payments/dashboard` | Fetch all dashboard metric data — returns `PaymentsDashboardRead` |

### Response Type: `PaymentsDashboardRead`

```typescript
interface PaymentsDashboardRead {
  PaymentStatusReport: PaymentStatusReportItem[];
  ParkedPaymentsAgingReport: ParkedPaymentsAgingReportItem[];
  TotalPaymentCountInLast14Days: number;
  PaymentsByAgency: PaymentsByAgencyReportItem[];
}

interface PaymentStatusReportItem {
  Status: string;
  PaymentCount: number;
  TotalPaymentAmount: number;
  CommissionType: string;
  AgencyName: string;
}

interface ParkedPaymentsAgingReportItem {
  Range: string;
  AgencyName: string;
  PaymentCount: number;
}

interface PaymentsByAgencyReportItem {
  AgencyName: string;
  PaymentCount: number;
  TotalCommissionCount: number;
  Vat: number;
}
```

No endpoints are missing — `GET /v1/payments/dashboard` is the only call required for this story.

## Implementation Notes

### FRS-Over-Template: Replace the Placeholder Page

**The existing `app/(protected)/page.tsx` is a template welcome placeholder. It must be REPLACED entirely — do NOT preserve any template welcome text, headings, or demo content.** The FRS and this story's acceptance criteria are the source of truth. The file must be rewritten as the Dashboard page.

### Metric Card Derivation Logic

The three metric cards are derived from the `PaymentsDashboardRead` response as follows:

1. **Ready to Pay count** — Sum of `PaymentCount` from all `PaymentStatusReport` rows where `Status` contains `"REG"` (case-insensitive match recommended). Example: `paymentStatusReport.filter(r => r.Status.includes('REG')).reduce((sum, r) => sum + r.PaymentCount, 0)`.

2. **Payments Made (Last 14 Days) — count** — Direct value from `TotalPaymentCountInLast14Days`.

3. **Payments Made (Last 14 Days) — total value** — Sum of `TotalCommissionCount` from all `PaymentsByAgency` rows. Format with `formatCurrency` from Epic 1 (`lib/utils/currency.ts` or equivalent path). Example: `paymentsByAgency.reduce((sum, r) => sum + r.TotalCommissionCount, 0)`.

4. **Parked count** — Sum of `PaymentCount` from all `PaymentStatusReport` rows where `Status` contains `"PARKED"`.

### AgencyName Dropdown Population

The dropdown options are the distinct union of `AgencyName` values from both `PaymentStatusReport` and `ParkedPaymentsAgingReport`, deduplicated and sorted alphabetically. "All Agencies" is prepended as the first option and is the default selected value. The filter is client-side only — no query parameter is sent to the API on filter change.

### Error Display Decision (Resolved — Do Not Reopen)

This decision was made by the user during story approval. On `getDashboard()` failure:
- Display a **Shadcn Sonner toast** with the failure message.
- Show an error placeholder in each metric card (e.g., the string `"— error loading —"` or a dash).
- Do **NOT** render the grids when the fetch fails.
- Do **NOT** add an `<Alert />` component anywhere on this page.

The wireframe's inline Alert design is overridden by this decision. Test-design and implementation phases must not re-surface this as an open question.

### Currency Formatting

Use the `formatCurrency` utility established in Story 1.3 (Epic 1). The expected format is `R 1,234,567.89` — R prefix, space after R, comma thousand separator, period decimal separator, two decimal places. Import from `@/lib/utils/currency` (or wherever Story 1.3 placed it — check the Epic 1 implementation before writing a new function).

### Tabular-Nums for Numeric Columns

Apply Tailwind class `tabular-nums` (i.e., `font-variant-numeric: tabular-nums`) to cells in numeric columns (`PaymentCount`, `TotalPaymentAmount`) so digit columns align vertically across rows.

### Shadcn Components to Use

- `Card` / `CardHeader` / `CardContent` — metric cards
- `Table` / `TableHeader` / `TableBody` / `TableRow` / `TableHead` / `TableCell` — report grids
- `Select` — AgencyName dropdown (ensures keyboard accessibility)
- `Skeleton` — loading placeholders
- Sonner `toast` — error notification (already installed in Epic 1)

Install any missing Shadcn components via MCP before use.

### Test Notes

This story is routable (`/`) — a Playwright spec must be created at `web/e2e/epic-2-story-1-dashboard-page.spec.ts`. The spec should cover:
- Auth redirect: visit `/` unauthenticated, assert redirect to `/auth/signin`.
- Happy path: sign in, assert metric cards and both grids are visible.
- Agency filter: select an agency, assert grid rows change.
- Error state: mock API failure, assert toast appears and grids are hidden.
