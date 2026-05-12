# Epic 1 (Foundation) -- Manual Verification Checklist

Use the running dev server at http://localhost:3000. Sign in with demo credentials admin@example.com / Admin123!.

---

## Story 1.1 -- MortgageMax Branding and Sign-In Page

Visit http://localhost:3000/auth/signin (or http://localhost:3000 while signed out -- you should be redirected).

### Verifiable today

- [ ] (AC-1) When you open http://localhost:3000 without being signed in, your browser is sent to /auth/signin.
- [ ] (AC-2) The sign-in page shows MortgageMax navy branding (#1A3A6E), not grey or zinc.
- [ ] (AC-3) The sign-in page has an email field and a password field.
- [ ] (AC-4) Entering admin@example.com and Admin123! and clicking Sign In redirects you to /.
- [ ] (AC-5) While signed in, visiting /auth/signin redirects you to / without re-showing the form.
- [ ] (AC-6) Wrong credentials show an "Invalid credentials" error; you stay on the sign-in page.
- [ ] (AC-7) Submitting with an empty email field prevents submission; email field is highlighted.
- [ ] (AC-8) Submitting with an empty password field prevents submission; password field is highlighted.
- [ ] (AC-9) Only one demo account: admin@example.com. Old template accounts are gone.
- [ ] (AC-11) No multi-role UI. Session carries a single user identity with no 4-role enum.
- [ ] (AC-12) Tab key reaches email, password, and Sign In button in order; each has a visible focus ring.
- [ ] (AC-13) After a failed sign-in, the error message is announced by screen readers (role=alert).
- [ ] The Sign In button is visually navy in the browser (not grey).
- [ ] The MortgageMax logo or wordmark is visible on the sign-in page.
- [ ] The sign-in card title reads "MortgageMax Payments".

### Possibly deferred (heuristic -- please use judgment)

These items test paths that should return 404 -- testable by visiting each URL directly.

- (AC-10) Visiting /auth/signup, /auth/signout, and /auth/forbidden each return a 404 page.
  - Heuristic: no page files exist for these paths -- that is the intended result.
  - To verify: type each URL in your browser and confirm you see Next.js 404.

### Runtime verification items

These go beyond what automated tests can check:

- Open http://localhost:3000 while signed out -- you should land at /auth/signin.
- Sign in, then visit /auth/signin -- you should be sent to / without seeing the form.
- Visit /auth/signup -- expect a 404 page.
- Visit /auth/signout -- expect a 404 page.
- Visit /auth/forbidden -- expect a 404 page.

Deferred to Epic 2: Post-sign-in redirect to / is confirmed in Epic 2 when the Dashboard page is built.

---

## Story 1.2 -- Top Navigation Bar and App Shell

Sign in first, then visit http://localhost:3000. The nav bar should appear on every protected page.

### Verifiable today

- [ ] (AC-1) On every page after signing in, you see a nav bar with three links: Dashboard, Payment Management, and Payments Made.
- [ ] (AC-2) On the Dashboard page (/), the Dashboard link is visually highlighted (teal text + bottom border); the other two are not.
- [ ] (AC-3) On the Payment Management page (/payment-management), the Payment Management link is highlighted; the other two are not.
- [ ] (AC-4) On the Payments Made page (/payments-made), the Payments Made link is highlighted; the other two are not.
- [ ] (AC-5) Clicking the Payment Management link takes you to /payment-management.
- [ ] (AC-6) Clicking the Payments Made link takes you to /payments-made.
- [ ] (AC-7) The nav bar background is navy (#1A3A6E) -- not black or a Tailwind default. The app is light mode only.
- [ ] (AC-8) The MortgageMax logo or wordmark is visible on the left side of the nav bar.
- [ ] (AC-9) Toast notifications are powered by Sonner -- no old custom Toast component is visible or active.
- [ ] (AC-10) A toast notification appears on screen, auto-dismisses after approximately 5 seconds, and can be dismissed early by clicking it.
- [ ] (AC-11) On a 1280px-wide viewport, all three navigation links and the Sign Out button appear in a single horizontal row without wrapping.
- [ ] (AC-12) On a 375px-wide viewport, the nav bar collapses to a hamburger button. Tapping opens a sheet drawer with all three links. Tapping a link closes the drawer and navigates. Closing the drawer without tapping a link stays on the current page.
- [ ] (AC-13) Tab key on any protected page reaches each navigation link and Sign Out in order; each has a visible focus ring.
- [ ] (AC-14) A screen reader announces the nav bar as a navigation landmark and the active link as "current page".

### Runtime verification items

These items go beyond what automated tests can check:

- Navigate between pages using the nav links and confirm the active-link highlight always matches the current URL.
- Clicking the Sign Out button signs you out and redirects you to the sign-in page.
- After signing out, visiting a protected page (e.g., /) redirects you back to the sign-in page.
- On a 375px viewport: the three navigation links are NOT visible initially (hidden behind the hamburger).
- Triggering a toast: it appears immediately, auto-dismisses after approximately 5 seconds (not 4), and clicking it dismisses it early.
- Inactive navigation links have white text with no bottom border -- no background fill on any link.
- The Sign Out button is on the right side of the nav bar on desktop -- no active-link styling.

### Deferred to Epic 2 -- verify there

- Clicking Dashboard from the Payment Management page navigates to / and shows Dashboard content.
- After clicking between pages, the active-link highlight always matches the current URL.

### Deferred to Epics 3-4

- When a park/unpark/initiate payments action succeeds or fails, the Sonner toast appears with the correct message and auto-dismisses after 5 seconds. (Verify during Epic 3 Payment Management QA.)

---

## Story 1.3 -- API Client Configuration and Shared Utilities

All acceptance criteria for this story are verified via automated Vitest tests (94/94 passing). No manual browser verification is required.

The API client is infrastructure only -- it is not directly visible in the UI. End-to-end verification of API calls will happen naturally in Epics 2-4 when the pages that use the client are built.

**All ACs verified via Vitest; no manual verification required.**