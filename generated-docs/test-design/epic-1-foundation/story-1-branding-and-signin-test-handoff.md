# Test Handoff: MortgageMax Branding and Sign-In Page

> Engineering document for downstream agents. Not reviewed by the BA.

**Source:** [story-1-branding-and-signin-test-design.md](./story-1-branding-and-signin-test-design.md)
**Epic:** 1 | **Story:** 1
**Render scope:** page (`/auth/signin` — routable page, `app/auth/signin/page.tsx`)

## Coverage for WRITE-TESTS

Every AC from the story is mapped below. All must be covered before WRITE-TESTS is considered complete.

- AC-1: Unauthenticated user redirected to `/auth/signin` → Example 1
- AC-2: MortgageMax branding (navy primary color) visible on sign-in page → Example 2
- AC-3: Email input and password input are present → Example 2, Example 3
- AC-4: Demo credentials (`admin@example.com` / `Admin123!`) sign-in → redirect to `/` → Example 3 (Playwright redirect assertion deferred to Epic 2 per BA-3)
- AC-5: Already-authenticated user visiting `/auth/signin` is redirected to `/` → Example 4
- AC-6: Incorrect credentials show error message; user stays on sign-in page → Example 5, Edge Example 1
- AC-7: Empty email field prevents submission; email field highlighted → Example 6
- AC-8: Empty password field prevents submission; password field highlighted → Example 7
- AC-9: Only one demo user (`admin@example.com`); template users removed → Example 8
- AC-10: Removed routes (`/auth/signup`, `/auth/signout`, `/auth/forbidden`) return 404 → Example 9
- AC-11: Multi-role enum replaced; session carries no `role` field → Example 8
- AC-12: Keyboard navigation in logical order; visible focus indicators → Example 10
- AC-13: Error message announced to screen readers (role="alert" or aria-live) → Edge Example 2

## Handoff Notes for WRITE-TESTS

- Only generate executable tests from examples in the test-design document.
- Do not invent behavior not represented there or explicitly approved.
- **Render scope:** `page` — tests exercise the full `/auth/signin` page component. The page uses the `(protected)` layout group — tests may need to mock or bypass the auth middleware to render the sign-in page in isolation (jsdom cannot execute real Next.js middleware).
- **Playwright spec required:** This is a routable story. Create `web/e2e/epic-1-story-1-branding-and-signin.spec.ts`. Playwright handles the real routing, redirect, and authentication flows (Examples 1, 4, 9). The post-sign-in redirect assertion (Example 3 → arrival at `/`) is deferred to Epic 2 — add a comment in the spec: `// Redirect target verified in Epic 2 (Story 2.1 Dashboard)`. Do NOT assert the destination URL of a successful sign-in in Story 1.1's Playwright spec.
- **Preferred render scope for Vitest tests:** Isolated rendering of `app/auth/signin/page.tsx` with next-auth session mocked. Cover Examples 2, 5, 6, 7, and Edge Examples 2 and 3 in Vitest.

### Resolved BA decisions — use these exact values

- **BA-1 (error message wording) — RESOLVED:** Use `"Invalid credentials"` as the exact expected string in all error-message assertions (Example 5 and Edge Example 1).
- **BA-2 (sign-in card title) — RESOLVED:** Use `"MortgageMax Payments"` as the exact expected string in all heading/title assertions (Example 2). Assert with `getByRole('heading', { name: /MortgageMax Payments/i })`.
- **BA-3 (redirect assertion scope) — RESOLVED:** Defer the Playwright assertion for post-sign-in redirect to Epic 2. Story 1.1's Playwright spec tests only form rendering, error display, and accessibility. Add `// Deferred to Epic 2 (Story 2.1 Dashboard)` comment where the redirect scenario would appear.

### Suggested primary assertions

- Sign In button: `getByRole('button', { name: /sign in/i })` — verify it is present and has navy color token applied (via class or data-attribute, not raw hex).
- Email input: `getByLabelText(/email/i)` — verify required attribute.
- Password input: `getByLabelText(/password/i)` — verify required attribute and `type="password"`.
- Error message after failed sign-in: `getByRole('alert')` — verify text content is exactly `"Invalid credentials"`.
- Sign-in card title: `getByRole('heading', { name: /MortgageMax Payments/i })`.
- No "Sign up" link: `queryByRole('link', { name: /sign up/i })` should be null.
- No dark-mode classes: assert no `dark:` Tailwind class on the page-level wrapper element.

### Mock strategy

- **next-auth session:** Use `vi.mock('next-auth')` / mock the `auth()` server function. For the unauthenticated state, return `null`; for authenticated state, return `{ user: { id: '1', email: 'admin@example.com', name: 'Admin User' } }`.
- **next-auth credentials `authorize()`:** For AC-9 and Example 8, verify the auth config directly by importing `auth.config.ts` and inspecting the credentials object — do not call `authorize()` via UI in Vitest.
- **Redirects and middleware:** All redirect scenarios (AC-1, AC-5, Example 4, Example 9) must be tested in Playwright — jsdom cannot execute Next.js middleware or App Router redirect logic. The successful sign-in redirect (Example 3) is deferred to Epic 2; do not attempt to test it in Vitest or Story 1.1's Playwright spec.

### Remaining ambiguity flags

- **Whitespace-only input (Edge Example 3):** The story does not specify whether custom trim validation is required. Use the HTML `required` attribute behavior as the baseline. If a custom Zod schema is added, assert the trimming behavior explicitly. Flag this if behavior differs from the HTML default.
- **AC-9 credential verification approach:** AC-9 asks to verify the auth config, not UI behavior. This is a configuration/structural check. Implement as a unit test that imports `auth.config.ts` and asserts exactly one user entry with email `admin@example.com`. The bcrypt-hashed password must not be asserted (hash is non-deterministic); instead assert that `authorize({ email: 'admin@example.com', password: 'Admin123!' })` resolves to a non-null user, and that `authorize({ email: 'oldadmin@mortgagemax.com', password: 'Admin123!' })` resolves to null.

## Testability Classification

| Scenario | Category | Reason |
| --- | --- | --- |
| Example 1 — Unauthenticated redirect to `/auth/signin` | Runtime-only | Requires real Next.js middleware (`auth` middleware) to execute the redirect — jsdom cannot run middleware |
| Example 2 — MortgageMax branding visible | Unit-testable (RTL) | Component rendering and CSS class assertions in jsdom; no routing or auth layer needed |
| Example 3 — Demo credentials sign-in form submission | Unit-testable (RTL) | Vitest covers form submission + mocked `signIn()` response; the redirect assertion (browser arrives at `/`) is deferred to Epic 2 per BA-3 — no Playwright coverage in Story 1.1 |
| Example 4 — Already-authenticated → redirect away from `/auth/signin` | Runtime-only | Session-based redirect on page load requires real Next.js session middleware — not exercisable in jsdom |
| Example 5 — Wrong credentials → error message stays on page | Unit-testable (RTL) | Error state triggered by mocked `signIn()` response; component renders `"Invalid credentials"` inline — verifiable in RTL |
| Example 6 — Empty email prevents submission | Unit-testable (RTL) | HTML `required` attribute validation; form does not submit — verifiable in RTL without network calls |
| Example 7 — Empty password prevents submission | Unit-testable (RTL) | Same as Example 6 |
| Example 8 — Single demo user; no role field in session | Unit-testable (RTL) | Auth config import + unit assertion; session shape assertion via mocked `useSession` |
| Example 9 — Removed routes return 404 | Runtime-only | Requires real Next.js file-system routing to confirm route absence — jsdom cannot verify 404 for missing page files |
| Example 10 — Keyboard navigation order | Unit-testable (RTL) | Tab order and focus management verifiable in RTL via `userEvent.tab()` |
| Edge Example 1 — Unknown email shows same error | Unit-testable (RTL) | Same error-state rendering path as Example 5; mocked `signIn()` returns error; asserts `"Invalid credentials"` |
| Edge Example 2 — Error has role="alert" | Unit-testable (RTL) | ARIA attribute assertion on rendered error element — verifiable in RTL |
| Edge Example 3 — Whitespace-only email treated as empty | Unit-testable (RTL) | HTML `required` attribute trims whitespace by default — verifiable in RTL with `userEvent.type` |

## Runtime Verification Checklist

These items cannot be verified by automated unit tests and must be checked during QA manual verification (and by Playwright where noted).

- [ ] Visiting any protected route (e.g., `/`) while signed out redirects the browser to `/auth/signin`. (Playwright — Example 1)
- [ ] Visiting `/auth/signin` while already signed in as `admin@example.com` redirects to `/` without displaying the sign-in form. (Playwright — Example 4)
- [ ] Visiting `/auth/signup` returns a 404 page — no sign-up form or redirect to sign-in. (Playwright — Example 9)
- [ ] Visiting `/auth/signout` returns a 404 page. (Playwright — Example 9)
- [ ] Visiting `/auth/forbidden` returns a 404 page. (Playwright — Example 9)
- [ ] The Sign In button is visually navy (not grey or zinc) on the rendered page in Chromium. (Manual visual check — Example 2)
- [ ] The MortgageMax logo appears on the sign-in page in the browser. (Manual visual check — Example 2)
- [ ] The sign-in card title reads "MortgageMax Payments" in the browser. (Manual visual check — Example 2)
- [ ] **Deferred to Epic 2:** After entering `admin@example.com` / `Admin123!` and clicking Sign In, the browser redirects to `/` and the user is authenticated. (Playwright — Example 3, deferred per BA-3)
