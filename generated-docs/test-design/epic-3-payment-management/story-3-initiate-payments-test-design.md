# Test Design: Initiate Payments Button and Batch Creation

## Story Summary

**Epic:** 3 — Payment Management
**Story:** 3 of 3
**As a** payment administrator
**I want to** initiate a payment batch for the currently selected agency
**So that** all REG-status payments for that agency are submitted for processing in a single batch action.

## Review Purpose

This document presents concrete business examples for BA review before executable tests are written.

Its purpose is to:
- surface missing business decisions
- let the BA review behavior using examples and expected outcomes
- provide an approved source for downstream test generation

## Business Behaviors Identified

- The "Initiate Payments" button has two independent enabling conditions: a specific agency must be selected (not "All Agencies") AND at least one payment in the filtered list must have status REG (ready-to-pay). Both conditions must be satisfied simultaneously.
- When the button is clicked, only REG-status payments belonging to the selected agency are included in the batch. Payments with MAN-PAY status and payments from other agencies are excluded even if they are currently visible in the grid.
- Every batch creation call must carry the authenticated user's name as the `LastChangedUser` request header. If no session username is available, the call is blocked and the user is redirected to sign-in.
- On success, the system shows a confirmation toast, refreshes the payment list, clears all row selections, and keeps the user on the Payment Management page.
- On failure, the system shows a descriptive error toast and restores the button to its pre-click state so the user can retry.
- While the batch creation call is in flight, the button is disabled and shows a loading indicator to prevent double-submission. When the call completes (success or failure), the button returns to its appropriate state.
- A disabled button does nothing when clicked — no API call, no toast.
- All toasts auto-dismiss after 5 seconds and can be dismissed manually.
- The button is keyboard-reachable and operable via Enter or Space when enabled.

## Key Decisions Surfaced by AI

- The story's AC-13 specifies the failure message as `"Failed to initiate payments. Please try again."` while the FRS workflow narrative (Section 3 — Initiate Payment Batch) states `"Failed to initiate payment batch. Please try again."` These two wordings differ by one word ("payments" vs "payment batch"). The exact message text should be confirmed before tests are written.
- The story does not describe what happens to the button while a batch creation call is in flight. A common UX pattern is to show a loading state and disable the button to prevent double-submission. If this pattern is desired, it needs to be specified and tested.

> **BA decision resolved — Option B (BA-1):** What is the exact failure toast message for a failed "Initiate Payments" call?
>
> The AC-13 and FRS workflow narrative differ:
> - Option A: `"Failed to initiate payments. Please try again."` (as written in AC-13)
> - Option B: `"Failed to initiate payment batch. Please try again."` (as written in the FRS workflow)
> Resolution: Option B approved 2026-05-14 by user. AC-13 has been updated to match.

> **BA decision resolved — Option A (BA-2):** Should the "Initiate Payments" button be disabled (or show a loading spinner) while the batch creation API call is in flight, to prevent double-submission?
>
> Options:
> - Option A: Button is disabled / shows loading state during the API call (prevents double-submission)
> - Option B: Button remains in its current enabled/disabled state during the call (no in-flight guard)
> Resolution: Option A approved 2026-05-14 by user.

## Test Scenarios / Review Examples

### 1. Button is disabled when "All Agencies" is selected

The toolbar is showing the "Initiate Payments" button. The agency filter is set to "All Agencies" (the default, meaning no specific agency is selected).

| Setup | Value |
| --- | --- |
| Agency filter | All Agencies (default — no specific agency selected) |
| Payments in grid | Mixed — some REG, some MAN-PAY, multiple agencies |

| Expected | Value |
| --- | --- |
| Button visible | Yes |
| Button state | Disabled |
| Tooltip or label | "Initiate Payments" |
| Aria disabled | `aria-disabled="true"` or native `disabled` attribute present |

---

### 2. Button is disabled when selected agency has no REG payments

The user has selected a specific agency from the dropdown, but all payments visible for that agency have MAN-PAY status (manually paid).

| Setup | Value |
| --- | --- |
| Agency filter | "Metro Realty" (a specific agency) |
| Payments visible for Metro Realty | 3 payments, all MAN-PAY status |

| Expected | Value |
| --- | --- |
| Button state | Disabled |
| Aria disabled | `aria-disabled="true"` or native `disabled` attribute present |

---

### 3. Button becomes enabled when a specific agency with REG payments is selected

The user selects an agency that has at least one payment in REG (ready-to-pay) status.

| Setup | Value |
| --- | --- |
| Agency filter | "Cape Homes" (a specific agency) |
| Payments visible for Cape Homes | Payment ID 201: REG; Payment ID 202: MAN-PAY |

| Expected | Value |
| --- | --- |
| Button state | Enabled (clickable) |
| Aria disabled | No `disabled` attribute |

---

### 4. Clicking "Initiate Payments" sends the correct request

The user has selected "Cape Homes" and the button is enabled. The user clicks the button.

| Setup | Value |
| --- | --- |
| Agency filter | "Cape Homes" |
| Session username | "Admin User" |
| Payments for Cape Homes | ID 201 (REG), ID 202 (MAN-PAY) |
| Payments for other agencies | ID 301 (REG — different agency) |

| Input | Value |
| --- | --- |
| User action | Click "Initiate Payments" button |

| Expected — in-flight state | Value |
| --- | --- |
| Button state during API call | Disabled with loading spinner |
| Double-click / second submission | Prevented — button is not clickable during the call |

| Expected — request sent | Value |
| --- | --- |
| API endpoint called | `POST /v1/payment-batches` |
| Request header | `LastChangedUser: Admin User` |
| Request body | `{ "PaymentIds": [201] }` |
| ID 202 (MAN-PAY) included | No — excluded |
| ID 301 (other agency REG) included | No — excluded |

---

### 5. PaymentIds contains only REG payments for the selected agency

This example verifies the filtering logic when the payment list contains a mix of statuses and agencies.

| Setup | Value |
| --- | --- |
| Agency filter | "Sunridge Properties" |
| Payments for Sunridge Properties | ID 101 (REG), ID 102 (REG), ID 103 (MAN-PAY) |
| Payments for other agencies | ID 201 (REG — "Metro Realty"); ID 202 (REG — "Cape Homes") |

| Input | Value |
| --- | --- |
| User action | Click "Initiate Payments" button |

| Expected | Value |
| --- | --- |
| PaymentIds in request body | `[101, 102]` — only the two REG payments for Sunridge Properties |
| ID 103 included | No — MAN-PAY excluded |
| IDs 201, 202 included | No — belong to other agencies |

---

### 6. No API call when session username is missing — user redirected to sign-in

The user clicks "Initiate Payments" but the session has expired or the username is unavailable.

| Setup | Value |
| --- | --- |
| Agency filter | "Cape Homes" |
| Session state | Authenticated session exists but `session.user.name` is missing/null |
| Payments for Cape Homes | ID 201 (REG) |

| Input | Value |
| --- | --- |
| User action | Click "Initiate Payments" button |

| Expected | Value |
| --- | --- |
| `POST /v1/payment-batches` called | No — call is blocked |
| User redirected to | `/auth/signin` (sign-in page) |
| Error toast shown | No |

---

### 7. Success flow — toast, grid refresh, stay on page

The batch creation call succeeds (HTTP 200 OK).

| Setup | Value |
| --- | --- |
| Agency filter | "Cape Homes" |
| Session username | "Admin User" |
| Payments for Cape Homes | ID 201 (REG), ID 202 (REG) |
| Selected rows before click | IDs 201 and 202 checked |

| Input | Value |
| --- | --- |
| User action | Click "Initiate Payments" button |
| API response | `POST /v1/payment-batches` → 200 OK |

| Expected — in-flight state | Value |
| --- | --- |
| Button state during API call | Disabled with loading spinner |

| Expected — after success | Value |
| --- | --- |
| Success toast shown | Yes — message: "Payment batch created successfully." |
| Toast auto-dismisses | Yes — after 5 seconds |
| Payment list re-fetched | Yes — `GET /v1/payments` called after success |
| Row selections cleared | Yes — all checkboxes unchecked after refresh |
| Button state after success | Returns to enabled/disabled based on refreshed payment data |
| Page after success | `/payment-management` — user remains on this page |
| Automatic navigation | None — no redirect or route change |

---

### 8. Failure flow — error toast and button recovers

The batch creation call fails (network error or non-2xx HTTP response).

| Setup | Value |
| --- | --- |
| Agency filter | "Cape Homes" |
| Session username | "Admin User" |
| Payments for Cape Homes | ID 201 (REG) |
| API response | `POST /v1/payment-batches` → 500 Internal Server Error |

| Input | Value |
| --- | --- |
| User action | Click "Initiate Payments" button |

| Expected — in-flight state | Value |
| --- | --- |
| Button state during API call | Disabled with loading spinner |

| Expected — after failure | Value |
| --- | --- |
| Error toast shown | Yes — message: `"Failed to initiate payment batch. Please try again."` |
| Toast auto-dismisses | Yes — after 5 seconds |
| Payment list re-fetched | No — no refresh on failure |
| Button state after failure | Returns to enabled (agency is still selected, REG payments still exist) |
| User can retry | Yes — clicking the button again is possible |

---

## Edge and Alternate Examples

### Edge Example 1. Toast auto-dismiss and manual dismiss

| Setup | Value |
| --- | --- |
| Toast displayed | Yes (either success or failure) |

| Expected — auto-dismiss | Value |
| --- | --- |
| Toast disappears after | 5 seconds without user interaction |

| Expected — manual dismiss | Value |
| --- | --- |
| Toast has dismiss control | Yes (close button or swipe gesture) |
| Toast removed on dismiss click | Immediately |

---

### Edge Example 2. Clicking a disabled button does nothing

| Setup | Value |
| --- | --- |
| Agency filter | "All Agencies" (or agency with no REG payments) |
| Button state | Disabled |

| Input | Value |
| --- | --- |
| User action | Click "Initiate Payments" button |

| Expected | Value |
| --- | --- |
| `POST /v1/payment-batches` called | No |
| Toast shown | No |
| Aria attribute | `aria-disabled="true"` or native `disabled` |

---

### Edge Example 3. Keyboard navigation and activation

| Setup | Value |
| --- | --- |
| Agency filter | "Cape Homes" (button is enabled) |
| Interaction mode | Keyboard only |

| Input | Value |
| --- | --- |
| User action | Press Tab until "Initiate Payments" button is focused; press Enter (or Space) |

| Expected | Value |
| --- | --- |
| Button is reachable via Tab | Yes |
| Visible focus indicator | Present (ring or outline) |
| Enter key triggers action | Yes — same behavior as a mouse click |
| Space key triggers action | Yes — same behavior as a mouse click |

---

### Edge Example 4. Agency is changed from one with REG to one without REG — button disables

| Setup | Value |
| --- | --- |
| Initial agency filter | "Cape Homes" (has REG payments — button enabled) |

| Input | Value |
| --- | --- |
| User action | Change agency dropdown to "Metro Realty" (all payments are MAN-PAY) |

| Expected | Value |
| --- | --- |
| Button state | Changes to disabled |
| No API call made | Correct — filter change alone does not trigger a batch |

---

## Out of Scope / Not For This Story

- Park and Unpark button behavior (covered in Story 3.2)
- Payment grid rendering, column display, and pagination (covered in Story 3.1)
- AgencyName filter dropdown population and behavior (covered in Story 3.1)
- Row checkbox selection mechanics (covered in Story 3.2)
- Real payment gateway or bank EFT submission — batch creation only creates a record
- Approval or multi-step confirmation dialogs before batch creation
- Confirmation dialog before clicking "Initiate Payments" (FRS BR10 pattern applies to Reset Demo Data only; batch creation has no confirmation requirement per the story)
- Downloading the resulting batch PDF (covered in Epic 4 — Payments Made)
- Currency formatting on the payment grid (established in Story 3.1)
