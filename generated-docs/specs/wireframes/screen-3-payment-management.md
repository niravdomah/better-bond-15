# Screen: Payment Management

## Purpose
Operational workhorse page for payment administrators. Displays the full payment list with per-row selection, bulk Park/Unpark actions, and batch initiation for a selected agency. Sourced from `GET /v1/payments`.

## Wireframe

```
+================================================================================+
|  [Navy] [MortgageMax logo]   Dashboard  Payment Management  Payments Made      |
|                              (inactive) ───────────────────  (inactive)        |
|                                         (teal, active)                         |
+================================================================================+
|                                                                                |
|  Payment Management                                                            |
|  ──────────────────────────────────────────────────────────────────────────── |
|                                                                                |
|  Agency [All Agencies              v]        [Park]  [Unpark]  [Initiate      |
|         (client-side filter)                 (disabled when     Payments]      |
|                                               no rows selected) (disabled)     |
|                                                                                |
|  +-+----------+----------+-----------+----------+------------+----------------+
|  | |Reference |AgencyName|AgentName  |AgentSur..|ClaimDate   |BondAmount      |
|  +-+----------+----------+-----------+----------+------------+----------------+
|  | |CommType  |CommAmount|VAT        |Status    |GrantDate   |RegistrationDate|
|  | |          |          |           |          |            |Bank            |
|  +-+----------+----------+-----------+----------+------------+----------------+
```

> Note: The table is 14 columns wide. For legibility the wireframe shows columns across two conceptual rows; in the actual UI all 14 columns are in a single scrollable row per payment record.

### Full 14-Column Table Layout

```
+================================================================================+
|                                                                                |
|  Agency [All Agencies          v]              [Park]  [Unpark]  [Initiate    |
|                                                                   Payments]   |
|  (Park and Unpark disabled — 0 rows selected)  (Initiate Payments disabled — |
|                                                  no agency selected)          |
|  ─────────────────────────────────────────────────────────────────────────── |
|  +──+────────────+───────────+──────────+──────────+───────────+────────────+|
|  |[x]| Reference  | AgencyName| AgentName|AgentSur. | ClaimDate |  BondAmount||
|  +──+────────────+───────────+──────────+──────────+───────────+────────────+|
|  |[ ]| PAY-00001  | Agency A  | John     | Smith    |12 Jan 2026| R 850,000  ||
|  |[ ]| PAY-00002  | Agency A  | Jane     | Doe      |15 Jan 2026| R 1,200,000||
|  |[ ]| PAY-00003  | Agency B  | Tom      | Jones    |20 Jan 2026| R 650,000  ||
|  | ...                                                                        |
|  +──+────────────+───────────+──────────+──────────+───────────+────────────+|
|                                                                                |
|  (continued — same row, remaining 7 columns)                                   |
|                                                                                |
|  +──────────────+───────────────+─────────+────────────+──────────────+──────+|
|  | CommissionType|CommissionAmt | VAT     | Status     |GrantDate     | Reg. ||
|  |               |              |         |            |              | Date ||
|  +──────────────+───────────────+─────────+────────────+──────────────+──────+|
|  | Standard      | R 8,500.00   |R 1,275.0| [REG]      |18 Feb 2026   |12 Mar||
|  | Standard      | R 12,000.00  |R 1,800.0| [PARKED]   |20 Feb 2026   |15 Mar||
|  | Standard      | R 6,500.00   |R  975.0 | [MAN-PAY]  |25 Feb 2026   |20 Mar||
|  +──────────────+───────────────+─────────+────────────+──────────────+──────+|
|                                                                                |
|  (final column)                                                                |
|  +──────────────────────────────────────────────────────────────────────────+|
|  | Bank                                                                      ||
|  +──────────────────────────────────────────────────────────────────────────+|
|  | ABSA                                                                      ||
|  | FNB                                                                       ||
|  | Nedbank                                                                   ||
|  +──────────────────────────────────────────────────────────────────────────+|
|                                                                                |
|  ─────────────────────────────────────────────────────────────────────────── |
|                              [< Prev]  Page 1 of 4  [Next >]                  |
|                                                                                |
+================================================================================+
```

### State: Agency Selected + Rows Selected

```
|  Agency [Agency A              v]              [Park]  [Unpark]  [Initiate    |
|                                                                   Payments]   |
|  (Park and Unpark enabled — rows selected)     (enabled — Agency A has REG   |
|                                                  status payments)             |
|                                                                               |
|  +──+────────────+────────────+──── ... ──────────────────────────────────── |
|  |[x]| Reference  | AgencyName | ...  (header checkbox — all on page selected)|
|  +──+────────────+────────────+──── ...                                       |
|  |[x]| PAY-00001  | Agency A   | ...                                          |
|  |[x]| PAY-00002  | Agency A   | ...                                          |
|  |[ ]| PAY-00003  | Agency A   | ...                                          |
|  | ...                                                                        |
```

### Empty State

```
|  Agency [All Agencies          v]              [Park]  [Unpark]  [Initiate    |
|                                                (disabled)        Payments]    |
|                                                                  (disabled)   |
|  +──────────────────────────────────────────────────────────────────────────+|
|  |[x]| Reference | AgencyName | AgentName | ...  (column headers)            ||
|  +──────────────────────────────────────────────────────────────────────────+|
|  |                                                                           ||
|  |           No payments ready for processing.                               ||
|  |                                                                           ||
|  +──────────────────────────────────────────────────────────────────────────+|
```

## Elements

| Element | Type | Description |
|---------|------|-------------|
| Nav bar | Navigation | Navy background; "Payment Management" active (teal underline) |
| Page title | h1 | "Payment Management" |
| Agency filter dropdown | Select | "All Agencies" default + distinct AgencyName values from payment list; client-side filter |
| Park button | Button (outline / primary) | Label: "Park"; disabled when no rows are selected (BR1); calls `PUT /v1/payments/park` with selected IDs |
| Unpark button | Button (outline / primary) | Label: "Unpark"; disabled when no rows are selected (BR2); calls `PUT /v1/payments/unpark` with selected IDs |
| Initiate Payments button | Button (primary) | Label: "Initiate Payments"; disabled when no agency is selected OR no REG payments exist for selected agency (BR3); calls `POST /v1/payment-batches` |
| Header checkbox | Checkbox | Selects / deselects all rows on the current page; `aria-label="Select all payments on this page"` |
| Row checkboxes | Checkbox (per row) | Individual row selection; `aria-label="Select payment {Reference}"` |
| Payment table | Table | 14 columns (R7 verbatim): Reference, AgencyName, AgentName, AgentSurname, ClaimDate, BondAmount, CommissionType, CommissionAmount, VAT, Status, GrantDate, RegistrationDate, Bank. Note: CommissionPercent is NOT displayed |
| Status badge | Badge | REG = navy "Ready to Pay"; PARKED = amber "Parked"; MAN-PAY = grey "Manually Paid" |
| Empty state | Table body text | "No payments ready for processing." — centered, muted; shown when filtered list is empty |
| Pagination | Button pair | "< Prev" / "Next >" with "Page X of Y" label; client-side; 20 rows per page (R8) |
| Success toast | Toast | "Payment batch created successfully." — auto-dismiss 5s (R14) |
| Failure toasts | Toast | "Failed to park payments. Please try again." / "Failed to unpark payments. Please try again." / "Failed to initiate payment batch. Please try again." (R16) |

## User Actions

- Select agency from dropdown: table rows filter client-side to that agency; "Initiate Payments" becomes enabled if at least one REG-status row exists for that agency.
- Click row checkbox: that row is selected; Park and Unpark buttons become enabled.
- Click header checkbox: all rows on current page are selected; Park and Unpark buttons become enabled.
- Click "Park" (enabled): calls `PUT /v1/payments/park` with selected IDs; on success, selections clear and list re-fetches; on failure, toast error.
- Click "Unpark" (enabled): calls `PUT /v1/payments/unpark` with selected IDs; on success, selections clear and list re-fetches; on failure, toast error.
- Click "Initiate Payments" (enabled): frontend collects IDs of all REG-status payments for selected agency from the full in-memory list; calls `POST /v1/payment-batches` with header `LastChangedUser: <session username>` and body `{ "PaymentIds": [...] }`; on success, shows toast "Payment batch created successfully." and re-fetches list; user stays on this page (BR7); on failure, toast error.
- Click "< Prev" / "Next >": navigate between pages of the in-memory paginated list (20 rows per page).

## Navigation

- **From:** Top nav "Payment Management" link from any authenticated page.
- **To:** Dashboard or Payments Made via nav links; no automatic navigation after Initiate Payments (BR7).

## Business Rules Reflected

| Rule | Wire Detail |
|------|-------------|
| BR1 | Park button has `disabled` attribute when 0 rows selected |
| BR2 | Unpark button has `disabled` attribute when 0 rows selected |
| BR3 | Initiate Payments button has `disabled` attribute when no agency selected ("All Agencies") OR when selected agency has no REG-status payments |
| BR4 | Only REG payments are eligible for batch; status badges make this visible |
| BR5 | POST body contains only REG-status IDs for selected agency |
| BR6 | After any mutation: selections clear, list re-fetches before re-render |
| BR7 | No navigation away after Initiate Payments success |
| BR8 | If session unavailable at time of Initiate Payments click, redirect to sign-in |
| BR9 | Currency columns (BondAmount, CommissionAmount, VAT) use `R 1,234,567.89` format |

## Data Mapping

| UI Column | API Field | Source |
|-----------|-----------|--------|
| Reference | `Reference` | `PaymentRead` |
| AgencyName | `AgencyName` | `PaymentRead` |
| AgentName | `AgentName` | `PaymentRead` |
| AgentSurname | `AgentSurname` | `PaymentRead` |
| ClaimDate | `ClaimDate` | `PaymentRead` |
| BondAmount | `BondAmount` | `PaymentRead` |
| CommissionType | `CommissionType` | `PaymentRead` |
| CommissionAmount | `CommissionAmount` | `PaymentRead` |
| VAT | `VAT` | `PaymentRead` |
| Status | `Status` (contains StatusCode) | `PaymentRead` |
| GrantDate | `GrantDate` | `PaymentRead` |
| RegistrationDate | `RegistrationDate` | `PaymentRead` |
| Bank | `Bank` | `PaymentRead` |
| (row ID, not displayed) | `Id` | Used for Park/Unpark/Initiate request bodies |

## States

| State | Visual |
|-------|--------|
| Loading | Skeleton rows in table body |
| Loaded, no selection | All 14 columns populated; Park, Unpark, Initiate Payments all disabled |
| Row(s) selected | Park and Unpark enabled; Initiate Payments enabled only if agency selected + REG rows exist |
| Agency filtered | Only rows matching selected agency visible; Initiate Payments enablement evaluated against filtered REG rows |
| Empty | Table header visible; body shows "No payments ready for processing." |
| Mutation pending | Buttons disabled (loading state) during API call |
