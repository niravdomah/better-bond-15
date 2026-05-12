# Story 1.1 -- MortgageMax Branding and Sign-In Page -- Verification Checklist

Visit http://localhost:3000/auth/signin (or http://localhost:3000 while signed out).
Demo credentials: admin@example.com / Admin123!

## Verifiable today

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

## Possibly deferred (heuristic -- please use judgment)

These items test paths that the app is supposed to return 404 for -- testable by visiting each URL.

- (AC-10) Visiting /auth/signup, /auth/signout, and /auth/forbidden each return a 404 page.
  - Heuristic: no page files exist for these paths -- that is the intended result.
  - To verify: type each URL in your browser and confirm you see Next.js 404.

## Runtime verification items

These go beyond what automated tests can check -- they need a quick manual verify:

- Open http://localhost:3000 while signed out -- you should land at /auth/signin.
- Sign in, then visit /auth/signin -- you should be sent to / without seeing the form again.
- Visit /auth/signup -- expect a 404 page.
- Visit /auth/signout -- expect a 404 page.
- Visit /auth/forbidden -- expect a 404 page.

Deferred to Epic 2: Post-sign-in redirect to / is confirmed in Epic 2 when the Dashboard page is built.