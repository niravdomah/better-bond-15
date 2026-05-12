# Screen: Payments Made (Batch List)

## Purpose
Displays all payment batches that have been created, with per-row PDF download and a demo data reset control. Sourced from `GET /v1/payment-batches`.

## Wireframe

```
+================================================================================+
|  [Navy] [MortgageMax logo]   Dashboard  Payment Management  Payments Made      |
|                              (inactive) (inactive)          ───────────────── |
|                                                             (teal, active)     |
+================================================================================+
|                                                                                |
|  Payments Made                                          [Reset Demo Data]      |
|  ──────────────────────────────────────────────────────────────────────────── |
|                                                                                |
|  +─────────────+─────────────+──────────+──────────+─────────────+───────────+|
|  | Reference   | CreatedDate | AgencyNm | Status   | PaymentCount| TotalComm.||
|  +─────────────+─────────────+──────────+──────────+─────────────+───────────+|
|  | BATCH-00001 | 12 May 2026 | Agency A | [PAID]   |     12      |R 102,000.0||
|  | BATCH-00002 | 10 May 2026 | Agency B | [PAID]   |      8      | R 68,500.0||
|  | BATCH-00003 | 05 May 2026 | Agency A | [PAID]   |     20      |R 189,250.0||
|  | ...         | ...         | ...      | ...      | ...         | ...        ||
|  +─────────────+─────────────+──────────+──────────+─────────────+───────────+|
|                                                                                |
|  (continued — same row, remaining columns + action button)                     |
|                                                                                |
|  +────────────+──────────────────+────────────────────+                       |
|  | TotalVat   | LastChangedUser  |                    |                       |
|  +────────────+──────────────────+────────────────────+                       |
|  | R 15,300.00| admin            | [Download PDF]     |                       |
|  | R 10,275.00| admin            | [Download PDF]     |                       |
|  | R 28,387.50| admin            | [Download PDF]     |                       |
|  +────────────+──────────────────+────────────────────+                       |
|                                                                                |
|  ─────────────────────────────────────────────────────────────────────────── |
|                              [< Prev]  Page 1 of 2  [Next >]                  |
|                                                                                |
+================================================================================+
```

### Combined View (all 9 columns + action in one conceptual table)

```
+================================================================================+
|  Payments Made                                          [Reset Demo Data]      |
|                                                                                |
|  +───+─────────────+───────────+──────────+──────────+──────+────────────────+|
|  |Ref| CreatedDate | AgencyName| Status   |PmtCount  |Total | TotalVat       ||
|  |   |             |           |          |          | Comm.|                ||
|  +───+─────────────+───────────+──────────+──────────+──────+────────────────+|
|  |...|     ...     |    ...    |   ...    |   ...    |  ... |       ...      ||
|  +───+─────────────+───────────+──────────+──────────+──────+────────────────+|
|                                                                                |
|  +──────────────────+──────────────────────────────+                          |
|  | LastChangedUser  | Action                       |                          |
|  +──────────────────+──────────────────────────────+                          |
|  | admin            | [Download PDF]               |                          |
|  +──────────────────+──────────────────────────────+                          |
|                                                                                |
|                      [< Prev]  Page 1 of 2  [Next >]                          |
+================================================================================+
```

### Empty State

```
|  Payments Made                                          [Reset Demo Data]      |
|                                                                                |
|  +──────────────────────────────────────────────────────────────────────────+|
|  | Reference | CreatedDate | AgencyName | Status | ... (column headers)     ||
|  +──────────────────────────────────────────────────────────────────────────+|
|  |                                                                          ||
|  |              No payment batches found.                                   ||
|  |                                                                          ||
|  +──────────────────────────────────────────────────────────────────────────+|
```

## Elements

| Element | Type | Description |
|---------|------|-------------|
| Nav bar | Navigation | Navy background; "Payments Made" active (teal underline) |
| Page title | h1 | "Payments Made" |
| Reset Demo Data button | Button (destructive) | Label: "Reset Demo Data"; right-aligned above table; calls `POST /demo/reset-demo` immediately — no confirmation dialog (BR10); on success: refreshes batch list + toast "Demo data has been reset." |
| Batch table | Table | 8 data columns (R17 verbatim): Reference, CreatedDate, AgencyName, Status, PaymentCount, TotalCommissionAmount, TotalVat, LastChangedUser |
| Download PDF button | Button (ghost, small) | Label: "Download PDF"; one per row; calls `POST /v1/payment-batches/{Id}/download-invoice-pdf`; triggers browser file download as `batch-{Reference}.pdf` |
| Empty state | Table body text | "No payment batches found." — centered, muted; shown when API returns empty list (R21) |
| Pagination | Button pair | "< Prev" / "Next >" with "Page X of Y" label; client-side; 20 rows per page (R18) |
| Success toasts | Toast | "Demo data has been reset." (R22); auto-dismiss 5s |
| Failure toasts | Toast | "Failed to download PDF. Please try again." (R20); "Failed to reset demo data. Please try again." (R23); auto-dismiss 5s |

## User Actions

- Click "Reset Demo Data": calls `POST /demo/reset-demo` immediately (no confirmation); on success, batch list re-fetches and toast "Demo data has been reset." appears; on failure, toast error (R22–R23).
- Click "Download PDF" on a row: calls `POST /v1/payment-batches/{Id}/download-invoice-pdf`; browser downloads the response binary as `batch-{Reference}.pdf`; on failure, toast error (R19–R20).
- Click "< Prev" / "Next >": navigate between pages of the in-memory paginated batch list (20 rows per page).

## Navigation

- **From:** Top nav "Payments Made" link from any authenticated page; no automatic navigation from other pages.
- **To:** Dashboard or Payment Management via nav links.

## Data Mapping

| UI Column | API Field | Source |
|-----------|-----------|--------|
| Reference | `Reference` | `PaymentBatchRead` |
| CreatedDate | `CreatedDate` | `PaymentBatchRead` |
| AgencyName | `AgencyName` | `PaymentBatchRead` |
| Status | `Status` | `PaymentBatchRead` |
| PaymentCount | `PaymentCount` | `PaymentBatchRead` |
| TotalCommissionAmount | `TotalCommissionAmount` | `PaymentBatchRead` |
| TotalVat | `TotalVat` | `PaymentBatchRead` |
| LastChangedUser | `LastChangedUser` | `PaymentBatchRead` |
| (row ID, not displayed) | `Id` | Used in `POST /v1/payment-batches/{Id}/download-invoice-pdf` |

## States

| State | Visual |
|-------|--------|
| Loading | Skeleton rows in table body; Reset Demo Data button visible and enabled |
| Loaded | All columns populated; Download PDF button on each row |
| Empty | Table header visible; body shows "No payment batches found." |
| Download in-flight | Download PDF button for that row shows loading state / disabled |
| Reset in-flight | Reset Demo Data button shows loading state / disabled during API call |
