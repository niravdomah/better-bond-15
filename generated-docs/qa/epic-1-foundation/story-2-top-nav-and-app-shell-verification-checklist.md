# Story 1.2 -- Top Navigation Bar and App Shell -- Verification Checklist

Sign in first (admin@example.com / Admin123!), then visit http://localhost:3000.
The nav bar should appear on every protected page.

## Verifiable today

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

## Runtime verification items

These items go beyond what automated tests can check -- they need a quick manual verify:

- Navigate between pages using the nav links and confirm the active-link highlight always matches the current URL.
- Clicking the Sign Out button signs you out and redirects you to the sign-in page.
- After signing out, visiting a protected page (e.g., /) redirects you back to the sign-in page.
- On a 375px viewport: the three navigation links are NOT visible initially (hidden behind the hamburger).
- Triggering a toast: it appears immediately, auto-dismisses after approximately 5 seconds (not 4), and clicking it dismisses it early.
- Inactive navigation links have white text with no bottom border -- no background fill on any link.
- The Sign Out button is visible on the right side of the nav bar on desktop -- no active-link styling.

## Deferred to Epic 2 -- verify there

These items are implemented but need Epic 2 Dashboard for full end-to-end verification:

- Clicking Dashboard from the Payment Management page navigates to / and shows the Dashboard content.
- After clicking between pages, the active-link highlight always matches the current URL.

## Deferred to Epics 3-4

- When a park/unpark/initiate payments action succeeds or fails, the Sonner toast appears with the correct message and auto-dismisses after 5 seconds. (Verify during Epic 3 Payment Management QA.)