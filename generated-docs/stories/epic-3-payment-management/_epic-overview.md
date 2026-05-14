# Epic 3: Payment Management

## Description

Implement the Payment Management page at `/payment-management`. Fetches all payment records from `GET /v1/payments` and renders a paginated data grid (20 rows per page) with a client-side AgencyName filter, per-row and header checkboxes for bulk selection, Park and Unpark action buttons (disabled when nothing is selected), and an Initiate Payments button (enabled only when an agency is selected and REG-status payments exist for that agency). Mutations call the corresponding park/unpark/create-batch APIs and trigger a full grid refresh on success. All outcomes communicate to the user via Shadcn Sonner toasts.

## Stories

| Story | Title | File | Status |
|-------|-------|------|--------|
| 3.1 | Payment Management Grid with Filtering and Pagination | `story-1-payment-grid-filter-pagination.md` | Pending |
| 3.2 | Row Selection, Park/Unpark Bulk Actions, and Post-Mutation Refresh | `story-2-row-selection-park-unpark.md` | Pending |
| 3.3 | Initiate Payments Button and Batch Creation | `story-3-initiate-payments.md` | Pending |

## Story Dependencies (DAG)

- Story 3.1: no dependencies — can start immediately
- Story 3.2: depends on Story 3.1 (extends the grid with checkbox column and action buttons)
- Story 3.3: depends on Stories 3.1 and 3.2 (extends the page with the Initiate Payments button and session-aware API call)

## Requirements Coverage

| Story | Requirements |
|-------|-------------|
| 3.1 — Payment Grid with Filtering and Pagination | [R7](../../specs/feature-requirements.md#payment-management), [R8](../../specs/feature-requirements.md#payment-management), [R9](../../specs/feature-requirements.md#payment-management), [R15](../../specs/feature-requirements.md#payment-management), [NFR1](../../specs/feature-requirements.md#non-functional-requirements), [NFR2](../../specs/feature-requirements.md#non-functional-requirements), [NFR4](../../specs/feature-requirements.md#non-functional-requirements) |
| 3.2 — Row Selection, Park/Unpark, Post-Mutation Refresh | [R10](../../specs/feature-requirements.md#payment-management), [R11](../../specs/feature-requirements.md#payment-management), [R12](../../specs/feature-requirements.md#payment-management), [R16](../../specs/feature-requirements.md#payment-management), [BR1](../../specs/feature-requirements.md#business-rules), [BR2](../../specs/feature-requirements.md#business-rules), [BR6](../../specs/feature-requirements.md#business-rules), [NFR2](../../specs/feature-requirements.md#non-functional-requirements), [NFR6](../../specs/feature-requirements.md#non-functional-requirements) |
| 3.3 — Initiate Payments Button and Batch Creation | [R13](../../specs/feature-requirements.md#payment-management), [R14](../../specs/feature-requirements.md#payment-management), [R16](../../specs/feature-requirements.md#payment-management), [BR3](../../specs/feature-requirements.md#business-rules), [BR4](../../specs/feature-requirements.md#business-rules), [BR5](../../specs/feature-requirements.md#business-rules), [BR7](../../specs/feature-requirements.md#business-rules), [BR8](../../specs/feature-requirements.md#business-rules), [BR9](../../specs/feature-requirements.md#business-rules), [NFR6](../../specs/feature-requirements.md#non-functional-requirements) |

## API Endpoints Used

| Method | Endpoint | Story |
|--------|----------|-------|
| GET | `/v1/payments` | 3.1 (initial fetch), 3.2 (post-mutation refresh), 3.3 (post-mutation refresh) |
| PUT | `/v1/payments/park` | 3.2 |
| PUT | `/v1/payments/unpark` | 3.2 |
| POST | `/v1/payment-batches` | 3.3 |
