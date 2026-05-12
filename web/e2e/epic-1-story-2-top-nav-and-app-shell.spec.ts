/**
 * Story Metadata:
 * - Route: N/A (component only — integrated via protected layout)
 * - Target File: app/(protected)/layout.tsx, components/nav/TopNav.tsx (new)
 * - Page Action: modify_existing (layout), create_new (component)
 *
 * E2E spec for Epic 1, Story 2: Top Navigation Bar and App Shell.
 *
 * E2E: not generated — story is non-routable.
 * Reason: Story 1.2 is component-only (no dedicated route). Navigation is verified
 * end-to-end in Epic 2 (Story 2.1) once the Dashboard page is routable.
 */
import { test } from '@playwright/test';

// Story 1.2 is component-only (no dedicated route). Navigation is verified
// end-to-end in Epic 2 (Story 2.1) once the Dashboard page is routable.
test.fixme('Epic 1, Story 2: Top Navigation Bar and App Shell (deferred to Epic 2 Dashboard spec)', () => {
  // Intentionally empty — QA detects `test.fixme(` and auto-skips.
  //
  // When Epic 2 Story 2.1 (Dashboard) is implemented, its Playwright spec should
  // verify:
  //   - The nav bar renders on the authenticated Dashboard route
  //   - Clicking "Payment Management" navigates to /payment-management and highlights that link
  //   - Clicking "Payments Made" navigates to /payments-made and highlights that link
  //   - Sign Out button is visible; clicking it redirects to the BFF sign-in page
  //   - MortgageMax logo is visible on the left side of the nav bar
  //   - On a 375px viewport, the hamburger button is visible and nav links are initially hidden
  //   - Tapping the hamburger opens the Sheet drawer revealing all three links
  //   - Tapping a link inside the drawer closes the drawer and navigates correctly
});
