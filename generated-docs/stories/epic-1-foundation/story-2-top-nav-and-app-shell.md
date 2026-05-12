# Story: Top Navigation Bar and App Shell

**Epic:** Foundation — Auth, Branding, Navigation, and API Setup | **Story:** 2 of 3 | **Wireframe:** `generated-docs/specs/wireframes/`

**Role:** All Roles (single authenticated role per FRS)

**Requirements:** [R26](../../specs/feature-requirements.md#navigation), [R27](../../specs/feature-requirements.md#navigation), [NFR1](../../specs/feature-requirements.md#non-functional-requirements), [NFR2](../../specs/feature-requirements.md#non-functional-requirements), [NFR3](../../specs/feature-requirements.md#non-functional-requirements)

## Story Metadata

| Field | Value |
|-------|-------|
| **Route** | `N/A` (component only — integrated via protected layout) |
| **Target File** | `app/(protected)/layout.tsx`, `components/nav/TopNav.tsx` (new) |
| **Page Action** | `modify_existing` (layout), `create_new` (component) |
| **Routable** | No — verified via stub pages added in this story |

## User Story

**As a** payment administrator **I want** a persistent top navigation bar on every authenticated page **So that** I can move between Dashboard, Payment Management, and Payments Made without losing context, and I can immediately identify this as a MortgageMax application.

## Acceptance Criteria

### Navigation Links

- [ ] AC-1: Given I am signed in and on any protected page, when the page loads, then I see a top navigation bar containing three links: "Dashboard", "Payment Management", and "Payments Made".
- [ ] AC-2: Given I am signed in and on the Dashboard stub page (`/`), when the page loads, then the "Dashboard" navigation link is visually highlighted as the active route (e.g., different color, underline, or background) and the other two links are not highlighted.
- [ ] AC-3: Given I am signed in and on the Payment Management stub page (`/payment-management`), when the page loads, then the "Payment Management" navigation link is visually highlighted and the other two are not.
- [ ] AC-4: Given I am signed in and on the Payments Made stub page (`/payments-made`), when the page loads, then the "Payments Made" navigation link is visually highlighted and the other two are not.
- [ ] AC-5: Given I am on the Dashboard stub page, when I click the "Payment Management" link, then I navigate to `/payment-management`.
- [ ] AC-6: Given I am on the Dashboard stub page, when I click the "Payments Made" link, then I navigate to `/payments-made`.

### MortgageMax Branding

- [ ] AC-7: Given I am signed in and on any protected page, when the page loads, then the navigation bar displays MortgageMax branding — the nav background or top accent uses navy `#1A3A6E` and the application is light mode only (no dark mode classes active).
- [ ] AC-8: Given I am signed in, when the page loads, then the MortgageMax logo or wordmark is visible in the top navigation bar.

### Toast Notifications (Shadcn Sonner)

- [ ] AC-9: Given the application is running, when I inspect the layout, then toast notifications are powered by Shadcn Sonner (`<Toaster />` from `sonner`) — the custom `Toast.tsx` / `ToastContainer.tsx` / `ToastContext` from the template are removed.
- [ ] AC-10: Given a toast notification is triggered (e.g., by a test action), when the toast appears, then it is visible on screen, auto-dismisses after approximately 5 seconds, and can be manually dismissed by clicking it.

### Responsive Layout

- [ ] AC-11: Given I am on a desktop screen (1280px wide), when the page loads, then the navigation bar shows all three links in a horizontal row.
- [ ] AC-12: Given I am on a mobile screen (375px wide), when the page loads, then the navigation bar collapses to a mobile-friendly layout (e.g., hamburger menu or stacked links) — the links remain accessible and functional.

### Accessibility

- [ ] AC-13: Given I am on any protected page, when I navigate using the keyboard (Tab key), then I can reach each navigation link in logical order and each link has a visible focus indicator.
- [ ] AC-14: Given I am on any protected page, when a screen reader reads the navigation, then the nav landmark is identified (uses `<nav>` element or `role="navigation"`) and the active link is indicated (e.g., `aria-current="page"`).

## API Endpoints

No API calls in this story. The navigation bar is purely client-side.

## Implementation Notes

### Non-Routable Story — Playwright Spec

This story has no dedicated route. The Playwright spec at `web/e2e/epic-1-story-2-top-nav-and-app-shell.spec.ts` must be wrapped in `test.fixme()`:

```typescript
// Story 1.2 is component-only (no dedicated route). Navigation is verified
// end-to-end in Epic 2 (Story 2.1) once the Dashboard page is routable.
test.fixme('top nav and app shell', () => { ... });
```

When Epic 2 Story 2.1 (Dashboard) is implemented, that story's Playwright spec should also verify that the nav bar renders correctly on the Dashboard route, making the fixme redundant.

### FRS-Over-Template: Custom Toast Context Replacement

The template ships with a hand-rolled toast system (`components/toast/Toast.tsx`, `ToastContainer.tsx`, and a `ToastContext`). The FRS requires Shadcn Sonner for toast notifications (NFR6: auto-dismissible, user-dismissible). Replace entirely:

1. Remove `web/src/components/toast/Toast.tsx`, `ToastContainer.tsx`, and any `ToastContext` / `useToast` hook that wraps the custom implementation.
2. Install Shadcn Sonner via MCP (`mcp__shadcn__add_component` → `sonner`).
3. Add `<Toaster />` to the root layout (`web/src/app/layout.tsx`) or the protected layout — make it available on all pages.
4. In stories 1.3 and beyond, use `import { toast } from 'sonner'` directly in client components. No custom context wrapper is needed.

### Stub Pages

To verify the nav bar's active-route highlighting without real feature pages, create lightweight stub pages:

- `web/src/app/(protected)/payment-management/page.tsx` — stub: renders `<h1>Payment Management</h1>` (will be replaced in Epic 3)
- `web/src/app/(protected)/payments-made/page.tsx` — stub: renders `<h1>Payments Made</h1>` (will be replaced in Epic 4)
- `web/src/app/page.tsx` — update placeholder to render `<h1>Dashboard</h1>` stub (will be replaced in Epic 2)

These stubs enable: (a) nav-link routing to work, (b) active-route highlighting to be verifiable, (c) the `(protected)` layout to wrap all three routes.

### TopNav Component

Create `web/src/components/nav/TopNav.tsx` as a client component (`"use client"`):

- Uses `usePathname()` from `next/navigation` to detect the active route.
- Renders Shadcn `<Button variant="ghost">` or plain `<Link>` elements for each nav item.
- Active route detected by exact path match: `/` → Dashboard, `/payment-management` → Payment Management, `/payments-made` → Payments Made.
- Apply `aria-current="page"` to the active link.
- MortgageMax branding: nav bar background `bg-[#1A3A6E]` (navy), link text `text-white`, active link uses teal accent highlight or a contrasting background.

### Protected Layout Update

Update `web/src/app/(protected)/layout.tsx` to import and render `<TopNav />` above `{children}`. The layout already calls `requireAuth()` — keep that in place.

### Responsive Nav

For mobile (below 768px), implement a hamburger menu using Shadcn `<Sheet>` component or a simple toggle. All three navigation links must be reachable on mobile (NFR1 requirement).

### Design Tokens

Refer to `generated-docs/specs/design-tokens.css` and `generated-docs/specs/design-tokens.md` for the full palette. Key values:
- Primary: `#1A3A6E` (navy)
- Accent: teal (check design tokens file for exact hex)
- Light mode only — no `dark:` Tailwind variants
