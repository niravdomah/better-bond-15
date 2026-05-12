# Story: MortgageMax Branding and Sign-In Page

**Epic:** Foundation — Auth, Branding, Navigation, and API Setup | **Story:** 1 of 3 | **Wireframe:** `generated-docs/specs/wireframes/`

**Role:** All Roles (single authenticated role per FRS)

**Requirements:** [R24](../../specs/feature-requirements.md#authentication), [R25](../../specs/feature-requirements.md#authentication), [R27](../../specs/feature-requirements.md#navigation), [NFR2](../../specs/feature-requirements.md#non-functional-requirements), [NFR3](../../specs/feature-requirements.md#non-functional-requirements)

## Story Metadata

| Field | Value |
|-------|-------|
| **Route** | `/auth/signin` |
| **Target File** | `app/auth/signin/page.tsx` |
| **Page Action** | `modify_existing` |
| **Routable** | Yes |

## User Story

**As a** payment administrator **I want** to sign in with my credentials on a MortgageMax-branded page **So that** I can access the commission payments application and be redirected to the dashboard.

## Acceptance Criteria

### Happy Path — Sign-In

- [x] AC-1: Given I visit the application as an unauthenticated user, when the page loads, then I am redirected to the sign-in page at `/auth/signin`.
- [x] AC-2: Given I am on the sign-in page, when the page loads, then I see MortgageMax branding — the page uses the navy primary color (`#1A3A6E`) as the dominant brand color (e.g., heading, button, or accent) and not the generic template grey or zinc palette.
- [x] AC-3: Given I am on the sign-in page, when the page loads, then I see a username/email input field and a password input field.
- [x] AC-4: Given I am on the sign-in page, when I enter the demo credentials (`admin@example.com` / `Admin123!`) and click the Sign In button, then I am redirected to the dashboard (home page `/`).
- [x] AC-5: Given I am signed in and on a protected page, when I visit `/auth/signin`, then I am redirected to the dashboard (already authenticated — no re-login required).

### Error Handling

- [x] AC-6: Given I am on the sign-in page, when I submit with an incorrect username or password, then I see an error message on the page (e.g., "Invalid credentials") and I remain on the sign-in page.
- [x] AC-7: Given I am on the sign-in page, when I submit with the email field empty, then the form prevents submission and the email field is highlighted as required.
- [x] AC-8: Given I am on the sign-in page, when I submit with the password field empty, then the form prevents submission and the password field is highlighted as required.

### FRS-Over-Template Replacements

- [x] AC-9: Given the application is running, when I inspect the next-auth credentials configuration, then there is exactly one demo user: `admin@example.com` with password `Admin123!` — the four template demo users (admin, power, standard, read-only) are removed.
- [x] AC-10: Given the application is running, when I navigate to `/auth/signup`, `/auth/signout`, or `/auth/forbidden`, then I receive a 404 — these routes are removed as they are out of scope for the POC.
- [x] AC-11: Given the application is running, when I inspect `types/roles.ts` and `lib/auth/auth.config.ts`, then the multi-role `UserRole` enum is replaced with a single `USER` role (or the role field is removed entirely from the session token) — the template 4-role model does not apply to this POC.

### Accessibility

- [x] AC-12: Given I am on the sign-in page, when I navigate using the keyboard (Tab key), then I can reach the email field, password field, and Sign In button in logical order, and each has a visible focus indicator.
- [x] AC-13: Given I am on the sign-in page, when an error message appears, then it is announced to screen readers (uses `role="alert"` or `aria-live="polite"`).

## API Endpoints

No backend API calls in this story. Authentication is handled entirely by next-auth credentials provider (frontend-only, as per the FRS).

## Implementation Notes

### FRS-Over-Template: What Must Be Replaced

The template ships with next-auth configured for four demo roles (`ADMIN`, `POWER_USER`, `STANDARD_USER`, `READ_ONLY`). The FRS specifies a single-role POC. The following replacements are required — do NOT extend the template; replace it:

1. **`web/src/lib/auth/auth.config.ts`** — Remove all four `demoUsers` entries. Add a single demo user: `{ id: '1', email: 'admin@example.com', name: 'Admin User', password: <bcrypt hash of Admin123!> }`. Remove the `role` field from the user object and from the JWT/session callbacks (single-role POC has no role-based access control).
2. **`web/src/types/roles.ts`** — Replace the `UserRole` enum (ADMIN / POWER_USER / STANDARD_USER / READ_ONLY) with a single `USER = 'user'` value, or remove the file entirely if no component references it after the change. The `RoleGate` component and `requireMinimumRole` / `requireExactRole` auth helpers are unused in this POC — remove or stub them.
3. **Auth routes to remove:** `/auth/signup`, `/auth/signout`, `/auth/forbidden`, `/auth/logged-out` — delete the corresponding directories under `web/src/app/auth/`. These are template placeholders with no place in the POC.
4. **`web/src/app/auth/signin/page.tsx`** — Keep the sign-in form structure (Shadcn Card + Input + Button) but apply MortgageMax branding: navy `#1A3A6E` primary color for the Sign In button and accent elements, remove the "Don't have an account? Sign up" link, update the card title to reflect "BetterBond Commission Payments" or "MortgageMax Payments".

### MortgageMax Branding

- Apply the design tokens from `generated-docs/specs/design-tokens.css` and `generated-docs/specs/design-tokens.md`.
- Primary color: `#1A3A6E` (navy). Use for button backgrounds, heading text, or brand accent.
- Light mode only — do not add `dark:` Tailwind variants. Remove any `dark:bg-black` or `dark:` classes from the sign-in page.
- The MortgageMax logo image is at `documentation/morgagemaxlogo.png`. Copy it to `web/public/` and reference it in the sign-in page header.

### next-auth Session Shape

After simplification, the session should carry: `{ user: { id, email, name } }`. No `role` field is needed. The `LastChangedUser` header (R25, BR8) will read `session.user.name` or `session.user.email` — the exact field used must be documented in the implementation notes for Story 1.3 so that Epic 3 uses the same field.

### Redirect Behavior

- Unauthenticated → `/auth/signin` (handled by next-auth middleware and the `(protected)` layout's `requireAuth()` call — keep these as-is)
- Successful sign-in → `/` (dashboard home page, added in Epic 2). For Story 1.1 this means the redirect lands on the current `app/page.tsx` placeholder — that is acceptable.
- The `callbackUrl` query-param redirect guard (open-redirect prevention) in the existing sign-in page should be retained.

### Test Notes

This story is routable (`/auth/signin`) — a Playwright spec must be created at `web/e2e/epic-1-story-1-branding-and-signin.spec.ts`. The spec should cover:
- Happy path: enter demo credentials, assert redirect to `/`.
- Error path: enter wrong password, assert error message visible on the sign-in page.
- Unauthenticated redirect: visit a protected route, assert redirect to `/auth/signin`.
