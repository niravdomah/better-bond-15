# Test Handoff: Top Navigation Bar and App Shell

> Engineering document for downstream agents. Not reviewed by the BA.

**Source:** [story-2-top-nav-and-app-shell-test-design.md](./story-2-top-nav-and-app-shell-test-design.md)
**Epic:** 1 | **Story:** 2

## Coverage for WRITE-TESTS

All BA decisions are resolved. No `test.todo` placeholders remain for BA decisions — all scenarios are now fully specified.

- AC-1: Three navigation links present on every authenticated page → Example 1
- AC-2: "Dashboard" link highlighted as active on the Dashboard page → Example 2, Edge Example 2
- AC-3: "Payment Management" link highlighted as active on the Payment Management page → Example 3, Edge Example 1
- AC-4: "Payments Made" link highlighted as active on the Payments Made page → Example 4
- AC-5: Clicking "Payment Management" link navigates to `/payment-management` → Example 5
- AC-6: Clicking "Payments Made" link navigates to `/payments-made` → Example 5
- AC-7: Nav bar uses navy background; light mode only (no dark mode classes) → Example 6, Edge Example 2
- AC-8: MortgageMax logo visible in nav bar → Example 1, Example 6
- AC-9: Shadcn Sonner replaces custom toast system; `<Toaster duration={5000} />` present in layout → Example 7
- AC-10: Toast appears, auto-dismisses at exactly 5 seconds, manually dismissible → Example 8
- AC-11: Desktop (1280px): all three links and Sign Out button visible horizontally → Example 9
- AC-12: Mobile (375px): hamburger button shown; tapping opens Sheet drawer revealing links; tapping link closes drawer and navigates; closing drawer without link tap stays on current page → Example 10, Edge Example 3
- AC-13: Keyboard Tab reaches each link and Sign Out button in order with visible focus indicator → Example 12
- AC-14: Nav landmark and `aria-current="page"` for active link → Example 12
- Sign Out button present on right side of nav bar; clicking triggers sign-out and BFF redirect → Example 11

## Handoff Notes for WRITE-TESTS

- Only generate executable tests from examples in the test-design document. Do not invent behavior not represented there or explicitly approved.
- **Render scope:** `component` — render `<TopNav />` in isolation using Vitest + React Testing Library (jsdom). Do not attempt full Next.js routing stack in unit tests.
- **Stub the router:** Mock `next/navigation` (`usePathname`) to control which path is simulated as active. Use `mockReturnValue('/')` for Dashboard, `'/payment-management'` for Payment Management, `'/payments-made'` for Payments Made.
- **Playwright spec:** This story is non-routable. The Playwright spec at `web/e2e/epic-1-story-2-top-nav-and-app-shell.spec.ts` must be wrapped in `test.fixme()` with the comment: `// Story 1.2 is component-only (no dedicated route). Navigation is verified end-to-end in Epic 2 (Story 2.1) once the Dashboard page is routable.`
- **Active-link CSS assertions:** BA-2 is resolved — assert the specific Tailwind classes `border-b-2` and `border-secondary` on the active link element, and assert that teal text color class (mapped from design token `secondary`) is applied. Do not hard-code the hex value in tests; use the class name.
- **Sign Out button (BA-3 resolved):** The nav bar now has four sections: logo (left), three nav links (center), Sign Out button (right). Assert presence of a "Sign Out" button via `getByRole('button', { name: /sign out/i })`. For the sign-out action, mock the BFF sign-out redirect and assert it is called on click. Do not assert internal session implementation details.
- **Toast duration (BA-4 resolved):** The Sonner `<Toaster />` must receive `duration={5000}`. Assert this prop is set when rendering the layout wrapper. For the auto-dismiss behavior, trigger `toast('Test message')` and assert the message is visible; use `vi.useFakeTimers()` and advance by 5000ms to assert the toast is removed.
- **Mobile Sheet drawer (BA-1 resolved):** Assert that on initial render the three navigation links are not visible (they are inside the Sheet). Assert that after clicking/firing the hamburger button trigger, the Sheet content becomes visible containing all three links. Assert that clicking a link closes the Sheet. Viewport-level CSS breakpoint behavior (links hidden vs visible based on screen width) is runtime-only.
- **Suggested primary assertions:**
  - `getByRole('navigation')` — nav landmark present
  - `getByRole('img', { name: /mortgagemax/i })` — logo present
  - `getByRole('link', { name: 'Dashboard' })` — presence
  - `getByRole('link', { name: 'Payment Management' })` — presence
  - `getByRole('link', { name: 'Payments Made' })` — presence
  - `getByRole('button', { name: /sign out/i })` — Sign Out button present
  - `getByRole('link', { name: 'Dashboard' })` has `aria-current="page"` when pathname is `/`
  - `getByRole('link', { name: 'Payment Management' })` has `aria-current="page"` when pathname is `/payment-management`
  - `getByRole('link', { name: 'Payments Made' })` has `aria-current="page"` when pathname is `/payments-made`
  - Active link element has classes `border-b-2` and `border-secondary` (BA-2 specification)
  - Exactly one link carries `aria-current="page"` for any given pathname
  - Sonner `<Toaster duration={5000} />` present in the layout DOM
  - After triggering `toast('Test message')`: message text visible; after advancing 5000ms, message gone
- **AC-9 (Sonner replacement):** Assert `<Toaster />` from sonner is rendered with `duration={5000}`. Assert that the old custom Toast/ToastContainer/ToastContext files are absent from the import graph (enforce via code-review gate or a test that verifies no import of the removed modules).
- **Important ambiguity flags:**
  - All BA decisions are resolved — no pending ambiguity flags remain.
  - Sign-out redirect target is the BFF sign-in URL. Confirm the exact redirect URL from Story 1.1 implementation (`/api/auth/signin` or similar BFF endpoint) before writing the sign-out click assertion.

## Testability Classification

| Scenario | Category | Reason |
| --- | --- | --- |
| Example 1 — Four nav bar sections present | Unit-testable (RTL) | Component renders logo, three links, and Sign Out button from static config; fully exercisable in jsdom with mocked `usePathname` |
| Example 2 — Dashboard active link (teal + border) | Unit-testable (RTL) | `usePathname` returns `/`; assert `aria-current="page"` and classes `border-b-2 border-secondary` on Dashboard link |
| Example 3 — Payment Management active link | Unit-testable (RTL) | `usePathname` returns `/payment-management`; assert `aria-current="page"` and active classes on correct link |
| Example 4 — Payments Made active link | Unit-testable (RTL) | `usePathname` returns `/payments-made`; assert `aria-current="page"` and active classes on correct link |
| Example 5 — Click link navigates | Runtime-only | Actual URL navigation and route transitions require the real Next.js routing stack; jsdom cannot verify real navigation. Covered by Epic 2 Dashboard Playwright spec. |
| Example 6 — MortgageMax branding | Unit-testable (RTL) | Assert logo `<img>` alt text and `getByRole('navigation')`; CSS color class correctness is a runtime/visual concern |
| Example 7 — Sonner replaces custom toast; `duration={5000}` prop set | Unit-testable (RTL) | Render the layout; assert Sonner `<Toaster duration={5000} />` is present with the correct prop. Absence of old files is a code-review gate. |
| Example 8 — Toast visible + auto-dismisses at 5s + manual dismiss | Unit-testable (RTL) | Trigger `toast('Test message')`; assert visible. Use `vi.useFakeTimers()` and advance 5000ms to assert gone. Click-to-dismiss also testable in RTL. |
| Example 9 — Desktop horizontal layout | Runtime-only | CSS layout and visual breakpoint behavior (flex/grid display) cannot be meaningfully verified in jsdom. Verified via runtime checklist. |
| Example 10 — Mobile hamburger + Sheet drawer | Unit-testable (RTL) + Runtime-only | Sheet open/close logic and link visibility inside drawer is unit-testable (click hamburger button, assert Sheet content appears). CSS breakpoint hiding (hamburger visible only on mobile) is runtime-only. |
| Example 11 — Sign Out triggers sign-out and BFF redirect | Unit-testable (RTL) | Mock the BFF sign-out call; assert it is invoked on "Sign Out" button click. Full redirect verification requires Playwright (runtime-only). |
| Example 12 — Keyboard + screen reader accessibility | Unit-testable (RTL) | `getByRole('navigation')` asserts landmark; `aria-current="page"` asserts active link; Tab-order partially validated with `userEvent.tab()`. Full screen reader announcement requires manual testing (checklist). |
| Edge Example 1 — Active style does not bleed | Unit-testable (RTL) | Assert exactly one link has `aria-current="page"` and active CSS classes for each pathname scenario |
| Edge Example 2 — Active-link exact style guide treatment | Unit-testable (RTL) | Assert `aria-current="page"`, `border-b-2`, `border-secondary` present on active link; assert no background-highlight class on any link |
| Edge Example 3 — Mobile: closing drawer without navigating stays on page | Unit-testable (RTL) | Fire Sheet close action (not a link click); assert no navigation mock was called |

## Runtime Verification Checklist

_These items cannot be verified by automated tests and must be checked during QA manual verification._

### Navigation and routing (verified during Epic 2 QA when Dashboard route is live)

- [ ] Clicking the "Dashboard" navigation link from the Payment Management page navigates to `/` and shows the Dashboard content.
- [ ] Clicking the "Payment Management" link from the Dashboard page navigates to `/payment-management`.
- [ ] Clicking the "Payments Made" link from the Dashboard page navigates to `/payments-made`.
- [ ] After clicking between pages, the active-link highlight (teal text + bottom border) always matches the current URL — it does not "stick" to a previous link.

### Branding and visual layout

- [ ] The navigation bar background is navy (`#1A3A6E`) — not black, not dark blue, not a Tailwind default.
- [ ] The MortgageMax logo is visible on the left side of the nav bar at normal zoom.
- [ ] The active navigation link has teal text and a visible bottom border — no background fill is present on any link.
- [ ] Inactive navigation links have white text with no bottom border and no background fill.
- [ ] The Sign Out button is visible on the right side of the nav bar on desktop.
- [ ] No dark mode styling is present — the application remains in light mode at all viewport sizes and system preferences.
- [ ] On a 1280px viewport, all three navigation links and the Sign Out button are displayed side by side in a single horizontal row without wrapping or truncation.

### Mobile layout (hamburger + Sheet drawer — BA-1 approved)

- [ ] On a 375px viewport, the hamburger button is visible in the nav bar.
- [ ] The three navigation links are NOT visible in the nav bar on initial load at 375px (they are hidden behind the hamburger).
- [ ] Tapping the hamburger button opens the Shadcn Sheet drawer, revealing all three navigation links.
- [ ] Tapping a link inside the drawer closes the drawer and navigates to the correct page.
- [ ] Closing the drawer without tapping a link (swipe dismiss or sheet close button) leaves the user on the current page and closes the drawer.
- [ ] All three navigation links are reachable on a 375px viewport without horizontal scrolling.

### Sign Out

- [ ] Clicking the "Sign Out" button signs the user out and redirects to the BFF sign-in page.
- [ ] After sign-out, attempting to navigate back to a protected page redirects to sign-in (session is cleared).

### Toast notifications

- [ ] Triggering a toast causes the toast message to appear on screen immediately.
- [ ] The toast auto-dismisses after exactly 5 seconds with no user interaction (time with a stopwatch — must be approximately 5 seconds, not 4 seconds).
- [ ] Clicking the toast dismisses it immediately before the auto-dismiss timer expires.

### Keyboard and screen reader

- [ ] Pressing Tab from the top of any authenticated page reaches all three navigation links and the Sign Out button without requiring a mouse.
- [ ] Each navigation link and the Sign Out button show a visible focus ring when focused via keyboard — the outline is not suppressed.
- [ ] Using a screen reader (VoiceOver or NVDA), the nav bar is announced as a navigation landmark.
- [ ] The active navigation link is announced as "current page" by the screen reader (`aria-current="page"`).

### Deferred — Sonner on real mutations (Epics 3–4)

- [ ] When a park/unpark/initiate payments action succeeds or fails, the Sonner toast appears with the correct message and auto-dismisses after 5 seconds. (Verify during Epic 3 Payment Management QA.)
