# Test Design: MortgageMax Branding and Sign-In Page

## Story Summary

**Epic:** 1 — Foundation: Auth, Branding, Navigation, and API Setup
**Story:** 1 of 3
**As a** payment administrator
**I want to** sign in with my credentials on a MortgageMax-branded page
**So that** I can access the commission payments application and be redirected to the dashboard.

## Review Purpose

This document presents concrete business examples for BA review before executable tests are written.

Its purpose is to:
- surface missing business decisions
- let the BA review behavior using examples and expected outcomes
- provide an approved source for downstream test generation

## Business Behaviors Identified

- Unauthenticated users who access any page in the application are redirected to the sign-in page at `/auth/signin`.
- The sign-in page displays MortgageMax branding using navy (`#1A3A6E`) as the dominant color — buttons, headings, or accent elements use navy, not the template's grey/zinc palette.
- The sign-in page contains exactly one username/email input and one password input.
- Submitting the demo credentials (`admin@example.com` / `Admin123!`) signs the user in and redirects them to the home page (`/`).
- A user who is already signed in and navigates to `/auth/signin` is redirected to the home page without being shown the sign-in form again.
- Submitting wrong credentials shows an error message on the page and keeps the user on the sign-in page.
- Submitting with the email field empty prevents the form from being submitted and highlights the email field as required.
- Submitting with the password field empty prevents the form from being submitted and highlights the password field as required.
- The application has exactly one demo user (`admin@example.com`). The four template demo users (admin, power, standard, read-only) have been removed.
- The template-only routes `/auth/signup`, `/auth/signout`, and `/auth/forbidden` are removed. Visiting them returns a 404 page.
- The application's multi-role user model (ADMIN / POWER_USER / STANDARD_USER / READ_ONLY) is replaced with a single role (`USER`) or no role — the four-role model does not apply.
- All sign-in form fields can be reached in logical order using the keyboard Tab key, and each field shows a visible focus indicator.
- Error messages on the sign-in page are announced to assistive technologies (screen readers).

## Key Decisions Surfaced by AI

- ~~The FRS (AC-6) states the error message is "e.g., Invalid credentials" — the exact wording is not mandated. The BA must confirm the required string before tests are generated.~~ **Resolved:** Error message is `"Invalid credentials"` (BA-1, approved 2026-05-12).
- ~~The implementation notes offer two options for the sign-in card title: "BetterBond Commission Payments" or "MortgageMax Payments." The BA must pick one before tests can assert the exact text.~~ **Resolved:** Sign-in card title is `"MortgageMax Payments"` (BA-2, approved 2026-05-12).
- ~~After a successful sign-in, the redirect target is `/` (home). For this story, `/` is still a template placeholder. The BA must confirm whether the Playwright happy-path test is expected to assert arrival at `/` (placeholder) or whether this scenario is deferred until Epic 2 completes the Dashboard page.~~ **Resolved:** The Playwright redirect assertion (sign-in → `/`) is deferred to Epic 2. Story 1.1's Playwright spec tests only sign-in form behaviour (rendering, error display, accessibility) (BA-3, approved 2026-05-12).

## Test Scenarios / Review Examples

### 1. Unauthenticated user is redirected to the sign-in page

| Input | Value |
| --- | --- |
| User authentication state | Not signed in |
| URL visited | `/` (home page, a protected route) |

| Expected | Value |
| --- | --- |
| Browser location after redirect | `/auth/signin` |
| Page content shown | Sign-in form (not the dashboard or any protected page content) |

---

### 2. Sign-in page displays MortgageMax branding

| Input | Value |
| --- | --- |
| User authentication state | Not signed in |
| URL visited | `/auth/signin` |

| Expected | Value |
| --- | --- |
| Sign In button background color | Navy `#1A3A6E` (not grey or zinc) |
| Sign-in card title | `"MortgageMax Payments"` |
| MortgageMax logo | Visible in the sign-in card or page header |
| "Sign up" or "Register" link | Not present on the page |
| Dark-mode classes | None applied |

---

### 3. Sign-in with correct demo credentials redirects to the home page

| Input | Value |
| --- | --- |
| User authentication state | Not signed in |
| Email field | `admin@example.com` |
| Password field | `Admin123!` |
| Action | Click the Sign In button |

| Expected | Value |
| --- | --- |
| Browser location after sign-in | `/` |
| Sign-in form | No longer visible (user has left the sign-in page) |
| Auth session | Active — the user is now authenticated |

> **Note (BA-3 resolved):** The Playwright end-to-end assertion confirming that the browser arrives at `/` after sign-in is deferred to Epic 2, when the real Dashboard page exists. Story 1.1's Playwright spec covers form rendering, error display, and accessibility only. A `// Deferred to Epic 2` comment will mark the omitted Playwright scenario.

---

### 4. Already-authenticated user visiting `/auth/signin` is redirected away

| Setup | Value |
| --- | --- |
| User authentication state | Signed in as `admin@example.com` |

| Input | Value |
| --- | --- |
| URL visited | `/auth/signin` |

| Expected | Value |
| --- | --- |
| Browser location | `/` (redirected, not shown the sign-in form) |
| Sign-in form | Not visible |

---

### 5. Sign-in with incorrect credentials shows an error message

| Input | Value |
| --- | --- |
| User authentication state | Not signed in |
| Email field | `admin@example.com` |
| Password field | `WrongPassword1!` |
| Action | Click the Sign In button |

| Expected | Value |
| --- | --- |
| Browser location | `/auth/signin` (user remains on sign-in page) |
| Error message visible | Yes — an inline error message appears on the page |
| Error message wording | `"Invalid credentials"` |
| Auth session | Not created |

---

### 6. Submitting the form with the email field empty is prevented

| Input | Value |
| --- | --- |
| User authentication state | Not signed in |
| Email field | (empty) |
| Password field | `Admin123!` |
| Action | Click the Sign In button |

| Expected | Value |
| --- | --- |
| Form submitted to backend | No |
| Email field | Highlighted as required / shows a validation message |
| Browser location | `/auth/signin` (user stays on the page) |

---

### 7. Submitting the form with the password field empty is prevented

| Input | Value |
| --- | --- |
| User authentication state | Not signed in |
| Email field | `admin@example.com` |
| Password field | (empty) |
| Action | Click the Sign In button |

| Expected | Value |
| --- | --- |
| Form submitted to backend | No |
| Password field | Highlighted as required / shows a validation message |
| Browser location | `/auth/signin` (user stays on the page) |

---

### 8. Only one demo user exists — template users are removed

| Setup | Value |
| --- | --- |
| Application | Running with the updated credentials configuration |

| Input | Value |
| --- | --- |
| Sign-in attempt 1 — Email | `admin@mortgagemax.com` (a former template demo user) |
| Sign-in attempt 1 — Password | `Admin123!` |
| Sign-in attempt 2 — Email | `power@mortgagemax.com` (another former template demo user) |
| Sign-in attempt 2 — Password | `Power123!` |

| Expected | Value |
| --- | --- |
| Sign-in attempt 1 outcome | Error — credentials not recognised |
| Sign-in attempt 2 outcome | Error — credentials not recognised |
| Only working demo account | `admin@example.com` / `Admin123!` |
| Auth session shape | Contains `user.id`, `user.email`, `user.name` — no `role` field |

---

### 9. Removed template routes return 404

| Input | Value |
| --- | --- |
| URL visited | `/auth/signup` |

| Expected | Value |
| --- | --- |
| HTTP response | 404 Not Found |
| Page shown | Next.js not-found page (no sign-up form) |

| Input | Value |
| --- | --- |
| URL visited | `/auth/forbidden` |

| Expected | Value |
| --- | --- |
| HTTP response | 404 Not Found |

| Input | Value |
| --- | --- |
| URL visited | `/auth/signout` |

| Expected | Value |
| --- | --- |
| HTTP response | 404 Not Found |

---

### 10. Keyboard navigation reaches all sign-in fields in order

| Input | Value |
| --- | --- |
| User authentication state | Not signed in |
| URL visited | `/auth/signin` |
| Action | Press Tab repeatedly from the top of the page |

| Expected | Value |
| --- | --- |
| Tab stop 1 | Email input — receives focus, visible focus ring |
| Tab stop 2 | Password input — receives focus, visible focus ring |
| Tab stop 3 | Sign In button — receives focus, visible focus ring |
| Order | Logical top-to-bottom, no traps |

## Edge and Alternate Examples

### Sign-in with wrong email domain (non-existent account) still shows error

| Input | Value |
| --- | --- |
| Email field | `unknown@other.com` |
| Password field | `Admin123!` |
| Action | Click the Sign In button |

| Expected | Value |
| --- | --- |
| Browser location | `/auth/signin` (user stays on page) |
| Error message | `"Invalid credentials"` — same message as wrong password (no distinction between wrong email and wrong password) |
| Auth session | Not created |

Note: The error message must not distinguish between "wrong email" and "wrong password" (to avoid user enumeration). Both cases show the same generic error.

---

### Error message is announced to screen readers

| Setup | Value |
| --- | --- |
| Assistive technology | Screen reader active |

| Input | Value |
| --- | --- |
| Email field | `admin@example.com` |
| Password field | `WrongPassword1!` |
| Action | Click the Sign In button |

| Expected | Value |
| --- | --- |
| Error message element | Has `role="alert"` or `aria-live="polite"` attribute |
| Screen reader behavior | Announces the error message text without the user needing to navigate to it |

---

### Whitespace-only email or password is treated as empty

| Input | Value |
| --- | --- |
| Email field | `   ` (spaces only) |
| Password field | `Admin123!` |
| Action | Click the Sign In button |

| Expected | Value |
| --- | --- |
| Behavior | Same as empty email — form prevented from submitting, or treated as invalid credentials |

> Note: The story does not explicitly specify whether whitespace-only inputs are trimmed before validation or treated as-is. If the underlying HTML `required` attribute handles this natively (which most browsers do for trimmed whitespace), the behavior is automatic. If custom validation is used, trimming behavior should be confirmed.

## Out of Scope / Not For This Story

- Dashboard page content — the redirect to `/` lands on a placeholder for now; Dashboard content is built in Epic 2.
- Playwright assertion confirming the post-sign-in redirect destination — deferred to Epic 2 (BA-3 resolved).
- Navigation bar links (Dashboard, Payment Management, Payments Made) — built in Story 1.2.
- Sign-out functionality — the template sign-out route is removed per AC-10; a sign-out action is not part of this POC's UI.
- Role-based access control or per-route authorization rules — all authenticated users share identical permissions (single role, no role gating).
- Password reset or account recovery flows.
- Mobile-responsive layout of the sign-in page — while NFR1 applies to the whole application, responsive behavior testing is not specifically called out in this story's ACs.
