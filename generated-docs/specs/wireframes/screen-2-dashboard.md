# Screen: Dashboard

## Purpose
Landing page after sign-in. Displays three high-level metric cards and two filterable report grids (Payment Status Report and Parked Payments Aging Report) sourced from `GET /v1/payments/dashboard`.

## Wireframe

```
+================================================================================+
|  [Navy] [MortgageMax logo]   Dashboard  Payment Management  Payments Made      |
|                              ─────────  (active underline   (inactive)         |
|                              (teal)      on active route)                      |
+================================================================================+
|                                                                                |
|  Dashboard                                                                     |
|  ──────────────────────────────────────────────────────────────────────────── |
|                                                                                |
|  +------------------------+  +------------------------+  +------------------+ |
|  | Ready to Pay           |  | Payments Made          |  | Parked           | |
|  |                        |  | (Last 14 Days)         |  |                  | |
|  |   42                   |  |   18 payments          |  |   7              | |
|  |   payments             |  |   R 234,567.89 total   |  |   payments       | |
|  +------------------------+  +------------------------+  +------------------+ |
|                                                                                |
|  Agency  [All Agencies          v]    (shared filter — applies to both grids) |
|                                                                                |
|  Payment Status                                                                |
|  ──────────────────────────────────────────────────────────────────────────── |
|  +------+---------------+---------------------+----------------+------------+ |
|  |Status|  PaymentCount | TotalPaymentAmount   | CommissionType | AgencyName | |
|  +------+---------------+---------------------+----------------+------------+ |
|  | REG  |      24       |     R 456,789.00     | Standard       | Agency A   | |
|  | REG  |      18       |     R 234,567.89     | Standard       | Agency B   | |
|  |PARKED|       7       |     R  89,123.45     | Standard       | Agency A   | |
|  |MAN-PAY|     12       |     R 112,000.00     | Standard       | Agency C   | |
|  | ...  |      ...      |          ...         |      ...       |    ...     | |
|  +------+---------------+---------------------+----------------+------------+ |
|                                                                                |
|  Parked Payments Aging                                                         |
|  ──────────────────────────────────────────────────────────────────────────── |
|  +---------------------+------------------+-------------------+               |
|  | Range               | AgencyName       | PaymentCount      |               |
|  +---------------------+------------------+-------------------+               |
|  | 0–30 days           | Agency A         |         3         |               |
|  | 31–60 days          | Agency A         |         2         |               |
|  | 61–90 days          | Agency B         |         1         |               |
|  | 90+ days            | Agency C         |         1         |               |
|  +---------------------+------------------+-------------------+               |
|                                                                                |
+================================================================================+
```

### Error State (API call fails)

```
+================================================================================+
|  [Nav bar — unchanged]                                                         |
+================================================================================+
|                                                                                |
|  Dashboard                                                                     |
|                                                                                |
|  +-------------------------------------------------------------------+         |
|  | ⚠  Failed to load dashboard data. Please try again.              |         |
|  +-------------------------------------------------------------------+         |
|                                                                                |
|  +------------------------+  +------------------------+  +------------------+ |
|  | Ready to Pay           |  | Payments Made          |  | Parked           | |
|  |  — error loading —     |  | (Last 14 Days)         |  | — error loading —| |
|  |                        |  |  — error loading —     |  |                  | |
|  +------------------------+  +------------------------+  +------------------+ |
|                                                                                |
|  (grids not rendered; error inline Alert shown above cards)                   |
+================================================================================+
```

## Elements

| Element | Type | Description |
|---------|------|-------------|
| Nav bar | Navigation | Navy background; MortgageMax logo left; links: Dashboard (active, teal underline), Payment Management, Payments Made |
| Page title | h1 | "Dashboard" |
| Ready to Pay card | Card | Displays `TotalReadyToPayCount` (derived from PaymentStatusReport REG rows). Label: "Ready to Pay" |
| Payments Made (Last 14 Days) card | Card | Displays `TotalPaymentCountInLast14Days` count and sum of `TotalCommissionCount` across PaymentsByAgency rows. Label: "Payments Made (Last 14 Days)" |
| Parked card | Card | Displays count of PARKED-status payments (derived from PaymentStatusReport). Label: "Parked" |
| Agency filter dropdown | Select | Label: "Agency"; options: "All Agencies" + distinct AgencyName values from the dashboard response. Applies client-side to both grids simultaneously |
| Payment Status section title | h2 | "Payment Status" |
| Payment Status grid | Table | Columns (verbatim from R2/FRS): Status, PaymentCount, TotalPaymentAmount, CommissionType, AgencyName. Filtered by Agency dropdown |
| Parked Payments Aging section title | h2 | "Parked Payments Aging" |
| Parked Payments Aging grid | Table | Columns (verbatim from R3/FRS): Range, AgencyName, PaymentCount. Filtered by same Agency dropdown |
| Error Alert | Alert (destructive) | Shown page-level on API failure; text: "Failed to load dashboard data. Please try again." |

## User Actions

- Select agency from dropdown: both Payment Status grid and Parked Payments Aging grid filter to that agency client-side; selecting "All Agencies" clears the filter.
- Page load: frontend calls `GET /v1/payments/dashboard`; on success renders all cards and grids; on failure shows destructive Alert and error state on cards.

## Navigation

- **From:** Sign-in (on successful authentication); top nav "Dashboard" link from any other page.
- **To:** Payment Management (via nav); Payments Made (via nav).

## Data Mapping

| UI Element | API Field | Source |
|------------|-----------|--------|
| Ready to Pay count | Sum of `PaymentCount` where `Status` = "REG" | `PaymentsDashboardRead.PaymentStatusReport` |
| Payments Made count | `TotalPaymentCountInLast14Days` | `PaymentsDashboardRead` |
| Payments Made total value | Sum of `TotalCommissionCount` across `PaymentsByAgency` rows | `PaymentsDashboardRead.PaymentsByAgency` |
| Parked count | Sum of `PaymentCount` where `Status` = "PARKED" | `PaymentsDashboardRead.PaymentStatusReport` |
| Payment Status grid rows | `PaymentStatusReportItem[]` | `PaymentsDashboardRead.PaymentStatusReport` |
| Parked Payments Aging grid rows | `ParkedPaymentsAgingReportItem[]` | `PaymentsDashboardRead.ParkedPaymentsAgingReport` |
| Agency dropdown options | Distinct `AgencyName` values | Derived client-side from both report arrays |

## States

| State | Visual |
|-------|--------|
| Loading | Skeleton placeholders in all three metric cards; table rows show skeleton rows |
| Loaded | All cards and both grids populated |
| Error | Destructive Alert above cards; cards show "— error loading —" placeholder text; grids not rendered |
| Agency filtered | Both grids show only rows matching the selected AgencyName |
