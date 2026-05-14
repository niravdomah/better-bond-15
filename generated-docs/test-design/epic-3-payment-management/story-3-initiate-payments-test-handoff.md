# Test Handoff: Initiate Payments Button and Batch Creation

> Engineering document for downstream agents. Not reviewed by the BA.

**Source:** [story-3-initiate-payments-test-design.md](./story-3-initiate-payments-test-design.md)
**Epic:** 3 | **Story:** 3

## Coverage for WRITE-TESTS

- AC-1: Button disabled when "All Agencies" selected → Example 1
- AC-2: Button disabled when agency selected but no REG payments → Example 2
- AC-3: Button enabled when agency selected and at least one REG payment exists → Example 3
- AC-4: Click calls `POST /v1/payment-batches` with REG-only IDs → Example 4
- AC-5: PaymentIds contains only REG payments for selected agency → Example 4, Example 5
- AC-6: MAN-PAY payments excluded from PaymentIds → Example 5
- AC-7: Other-agency REG payments excluded from PaymentIds → Example 5
- AC-8: LastChangedUser header equals session username → Example 4
- AC-9: Missing session username blocks API call and redirects to sign-in → Example 6
- AC-10: Success shows toast "Payment batch created successfully." → Example 7
- AC-11: Success triggers GET /v1/payments re-fetch and clears row selections → Example 7
- AC-12: User stays on /payment-management after success → Example 7
- AC-13: Failure shows toast "Failed to initiate payment batch. Please try again." → Example 8
- AC-14: Button returns to pre-click enabled/disabled state on failure → Example 8
- AC-15: Toast auto-dismisses after 5 seconds → Edge Example 1
- AC-16: Toast dismissed immediately on manual dismiss click → Edge Example 1
- AC-17: Disabled button click produces no API call and no toast → Edge Example 2
- AC-18: Disabled button has `aria-disabled="true"` or native `disabled` → Edge Example 2
- AC-19: Button reachable by Tab with visible focus indicator → Edge Example 3
- AC-20: Enter/Space activates button when focused and enabled → Edge Example 3
- AC-21: Button disabled and shows loading indicator during in-flight API call → Example 4, Example 7, Example 8
- AC-22: Button returns to appropriate state after call completes (success or failure) → Example 7, Example 8

## Implementation Targets

- `web/src/app/(protected)/payment-management/page.tsx → modify` — add `isInitiating` boolean state; add `initiatePayments` handler using `useSession` for username; derive `canInitiate` boolean from `selectedAgency !== ""` and `filteredList.some(p => p.Status?.StatusCode === "REG")`; set button `disabled` to `!canInitiate || isInitiating`; show loading spinner on button when `isInitiating`; call `createPaymentBatch(regIds, session.user.name)` on click; show success toast "Payment batch created successfully." or failure toast "Failed to initiate payment batch. Please try again." via Sonner; re-fetch payments and clear selections on success; use `finally` to reset `isInitiating`
- `web/src/lib/api/endpoints.ts → modify` — verify `createPaymentBatch(ids: number[], lastChangedUser: string)` function exists and correctly calls `post('/v1/payment-batches', { PaymentIds: ids }, { lastChangedUser })` (function added during REALIGN; confirm it is present before writing additional code)
- `web/e2e/epic-3-story-3-initiate-payments.spec.ts → create` — Playwright spec covering: disabled state (all agencies), disabled state (no REG payments), enabled state, happy path with success toast + stay-on-page assertion, failure toast, session guard redirect

## Handoff Notes for WRITE-TESTS

- Only generate executable tests from examples in the test-design document
- Do not invent behavior not represented there or explicitly approved
- Preferred render scope: `component` — this story modifies the existing `/payment-management` page component; test the Initiate Payments button slice in isolation and as part of the page component; do not re-render the full page from scratch
- **renderScope (machine-readable):** `component`
- **Target file:** `web/src/app/(protected)/payment-management/page.tsx` — modify_existing, extends Stories 3.1 and 3.2; scope this story's tests to the Initiate Payments button only (NOT grid render, NOT Park/Unpark)
- **API function:** `createPaymentBatch(ids, username)` from `@/lib/api/endpoints` — MSW handlers in tests must intercept `POST http://localhost:8042/v1/payment-batches`
- **Session:** mock `useSession` from `next-auth/react` returning `{ data: { user: { name: "Admin User" } }, status: "authenticated" }` for happy-path tests; for the unauthenticated edge case (Example 6), mock `session.user.name` as `null`/`undefined` and assert `signIn` is called rather than `createPaymentBatch`
- **signIn import:** the component imports `signIn` from `next-auth/react` (NOT from `@/lib/auth/auth-client`); mock accordingly in tests
- **Status comparisons:** always use `p.Status?.StatusCode === "REG"` — never `p.Status === "REG"`; Status is normalised to `{ StatusCode: string }` by `getPayments()`
- **Exact failure toast text (BA-1 resolved):** `"Failed to initiate payment batch. Please try again."` — use this exact string in test assertions; do not use the old AC-13 placeholder wording
- **In-flight loading state (BA-2 resolved):** Tests for AC-21 and AC-22 must assert that the button is disabled and shows a loading indicator during the API call (use MSW delay or `mockImplementation` with a deferred promise to simulate in-flight state); assert button re-enables after the call settles
- **`canInitiate` re-evaluation:** the `canInitiate` boolean must be re-evaluated whenever `selectedAgency` or `filteredList` changes; tests for Examples 2 and 3 should verify this by simulating agency dropdown changes (Edge Example 4)

## Testability Classification

| Scenario | Category | Reason |
| --- | --- | --- |
| Example 1 — Button disabled when "All Agencies" selected | Unit-testable (RTL) | Derived boolean from props/state; verifiable in jsdom with mocked payment data |
| Example 2 — Button disabled when no REG payments for agency | Unit-testable (RTL) | Same derived boolean; mocked dataset with MAN-PAY only |
| Example 3 — Button enabled when REG payments exist | Unit-testable (RTL) | Same derived boolean; mocked dataset with one REG payment |
| Example 4 — Correct request: only REG IDs + LastChangedUser header + in-flight state | Unit-testable (RTL) | MSW intercept of POST /v1/payment-batches verifies request body and header; deferred MSW handler verifies disabled/loading state mid-call |
| Example 5 — PaymentIds filtering across statuses and agencies | Unit-testable (RTL) | Same MSW intercept with richer dataset; assertion on captured request body |
| Example 6 — Missing session blocks call and redirects to sign-in | Unit-testable (RTL) | Mock `useSession` with no username; assert `signIn()` called, `createPaymentBatch` not called |
| Example 7 — Success: toast + re-fetch + stay on page + button recovers | Data-contract | Success toast, loading state, and selection clear are RTL-testable; re-fetch (GET /v1/payments after POST) requires MSW handler chain to be wired correctly — manual browser check advised |
| Example 8 — Failure: error toast + button recovers from loading state | Unit-testable (RTL) | MSW returns 500; assert toast shows exact BA-1 text and button re-enables after failure |
| Edge Example 1 — Toast auto-dismiss (5 s) and manual dismiss | Unit-testable (RTL) | Use Vitest fake timers for auto-dismiss; simulate dismiss click for manual |
| Edge Example 2 — Disabled button click produces no side effects | Unit-testable (RTL) | Click event on disabled button; assert no MSW request fired |
| Edge Example 3 — Keyboard navigation and Enter/Space activation | Unit-testable (RTL) | `userEvent.keyboard` Tab + Enter/Space; assert focus indicator class present |
| Edge Example 4 — Agency change re-evaluates button state | Unit-testable (RTL) | Simulate dropdown change; assert button transitions from enabled to disabled |

## Runtime Verification Checklist

_Example 7 is classified as data-contract. The following items must be checked during QA manual verification._

- [ ] After clicking "Initiate Payments" for a specific agency on the live app, verify that the "Initiate Payments" button immediately enters a disabled/loading state while the request is in flight, then returns to enabled once the response arrives.
- [ ] After clicking "Initiate Payments", verify the payment list visibly refreshes (e.g., REG-status payments for that agency disappear or change status) and that the user remains on `/payment-management` — not redirected.
- [ ] Verify the `LastChangedUser` header is sent with the correct session username by inspecting the network tab in browser DevTools during a real "Initiate Payments" click.
- [ ] Verify that after a successful batch creation, all row checkboxes in the grid are unchecked.
