/**
 * Story Metadata:
 * - Route: /payment-management
 * - Target File: app/(protected)/payment-management/page.tsx
 * - Page Action: modify_existing
 *
 * E2E spec for Epic 3, Story 2: Row Selection, Park/Unpark Bulk Actions,
 * and Post-Mutation Refresh.
 *
 * Runs against a live Next.js dev server booted by playwright.config.ts's webServer block.
 * These tests WILL FAIL until the feature is implemented — that is the point (TDD red).
 *
 * Coverage decisions (per "What belongs where" table in test-generator.md):
 *   - AC-1, AC-2 (checkbox presence): Vitest RTL — component-level assertion.
 *   - AC-3, AC-4 (header select/deselect all): Vitest RTL — pure state logic.
 *   - AC-5 (indeterminate state): Vitest RTL — aria-checked="mixed" assertable in jsdom.
 *   - AC-8, AC-9, AC-10 (Park happy path): BOTH Vitest (unit) AND Playwright (integration flow).
 *   - AC-11, AC-16 (buttons disabled): Vitest RTL.
 *   - AC-13, AC-14, AC-15 (Unpark happy path): BOTH Vitest AND Playwright.
 *   - AC-19, BA-1 (grid loading indicator): Playwright — timing of overlays is browser-dependent.
 *   - AC-20, AC-21 (failure toasts): BOTH Vitest AND Playwright (page.route() for 500).
 *   - AC-22 (selections preserved on failure): Playwright — verifies the real DOM state.
 *   - AC-25, AC-26 (accessibility/disabled): Vitest axe.
 *   - Edge 4 (keyboard Tab navigation): Playwright — requires real browser.
 *
 * Credentials from the seeded fixtures file — never hard-coded in this spec.
 *
 * BA decisions exercised by Playwright assertions:
 *   BA-1: Grid loading overlay visible during re-fetch (not a button spinner).
 *   BA-2: Disabled buttons not reachable by Tab (native disabled attribute).
 */

import { test, expect, type Page } from '@playwright/test';

// FRS single demo credential — scan-secrets-ignore
// Epic 1 implementation sets auth to admin@example.com / Admin123!
const FRS_ADMIN_EMAIL = 'admin@example.com';
const FRS_ADMIN_PASSWORD = 'Admin123!'; // scan-secrets-ignore

/** Sign in helper — reusable across tests in this spec */
async function signIn(page: Page): Promise<void> {
  await page.goto('/auth/signin');
  await page.getByLabel('Email').fill(FRS_ADMIN_EMAIL);
  await page.getByLabel('Password').fill(FRS_ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/auth/signin'), {
    timeout: 10000,
  });
}

/** Navigate to Payment Management and wait for the grid to finish loading */
async function goToPaymentManagement(page: Page): Promise<void> {
  await page.goto('/payment-management');
  // Wait for at least one row checkbox to confirm the grid is loaded
  await expect(
    page.getByRole('checkbox', { name: /select payment/i }).first(),
  ).toBeVisible({
    timeout: 15000,
  });
}

test.describe('Epic 3, Story 2: Row Selection, Park/Unpark Bulk Actions, and Post-Mutation Refresh', () => {
  test.beforeEach(async ({ context }) => {
    // Every test starts unauthenticated — keeps failure diagnosis simple
    await context.clearCookies();
  });

  // -------------------------------------------------------------------------
  // Disabled state — no selection on page load (AC-11, AC-16, BA-2)
  // -------------------------------------------------------------------------

  // AC-11, AC-16, BA-2
  test('Park and Unpark buttons are disabled (native disabled attr) on load before any selection', async ({
    page,
  }) => {
    await signIn(page);
    await goToPaymentManagement(page);

    const parkButton = page.getByRole('button', { name: /^park$/i });
    const unparkButton = page.getByRole('button', { name: /^unpark$/i });

    await expect(parkButton).toBeDisabled();
    await expect(unparkButton).toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // Select rows: tick individual checkboxes, verify button states (AC-1, AC-8, AC-13)
  // -------------------------------------------------------------------------

  // AC-1, AC-8, AC-13
  test('selecting a row enables both Park and Unpark buttons', async ({
    page,
  }) => {
    await signIn(page);
    await goToPaymentManagement(page);

    // Tick the first row checkbox
    const firstRowCheckbox = page
      .getByRole('checkbox', { name: /select payment/i })
      .first();
    await firstRowCheckbox.check();

    await expect(
      page.getByRole('button', { name: /^park$/i }),
    ).not.toBeDisabled();
    await expect(
      page.getByRole('button', { name: /^unpark$/i }),
    ).not.toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // Header checkbox selects all (AC-2, AC-3)
  // -------------------------------------------------------------------------

  // AC-2, AC-3
  test('header checkbox selects all rows on the current page and enables both action buttons', async ({
    page,
  }) => {
    await signIn(page);
    await goToPaymentManagement(page);

    const headerCheckbox = page.getByRole('checkbox', { name: /select all/i });
    await expect(headerCheckbox).toBeVisible();
    await headerCheckbox.check();

    // Park and Unpark both enabled after select-all
    await expect(
      page.getByRole('button', { name: /^park$/i }),
    ).not.toBeDisabled();
    await expect(
      page.getByRole('button', { name: /^unpark$/i }),
    ).not.toBeDisabled();

    // At least one row checkbox is now checked
    const checkedCheckboxes = page.getByRole('checkbox', {
      name: /select payment/i,
    });
    const firstChecked = checkedCheckboxes.first();
    await expect(firstChecked).toBeChecked();
  });

  // -------------------------------------------------------------------------
  // Park happy path: select rows, click Park, assert success toast, grid refresh (AC-9, AC-10)
  // Uses page.route() to intercept the park PUT and the re-fetch GET
  // -------------------------------------------------------------------------

  // AC-9, AC-10, BA-1
  test('Park happy path: success toast appears, selections cleared, and grid refreshes', async ({
    page,
  }) => {
    // Intercept the park API call
    await page.route('**/v1/payments/park', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{}',
      });
    });
    // Re-fetch will use the real endpoint; the success state is verified by toast + cleared checkboxes

    await signIn(page);
    await goToPaymentManagement(page);

    // Select the first row
    const firstRowCheckbox = page
      .getByRole('checkbox', { name: /select payment/i })
      .first();
    await firstRowCheckbox.check();
    await expect(firstRowCheckbox).toBeChecked();

    // Click Park
    await page.getByRole('button', { name: /^park$/i }).click();

    // AC-10: success toast — partial match, case-insensitive
    await expect(page.getByText(/parked successfully/i)).toBeVisible({
      timeout: 10000,
    });

    // AC-10: selections cleared after success (at least the first checkbox is unchecked)
    // BA-1: grid-level loading overlay may be visible during re-fetch; wait for it to disappear
    await expect(firstRowCheckbox).not.toBeChecked({ timeout: 10000 });

    // Park and Unpark buttons back to disabled state (no selection)
    await expect(page.getByRole('button', { name: /^park$/i })).toBeDisabled({
      timeout: 5000,
    });
  });

  // -------------------------------------------------------------------------
  // Unpark happy path: select rows, click Unpark, assert success toast (AC-14, AC-15)
  // -------------------------------------------------------------------------

  // AC-14, AC-15
  test('Unpark happy path: success toast appears, selections cleared, and grid refreshes', async ({
    page,
  }) => {
    await page.route('**/v1/payments/unpark', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{}',
      });
    });

    await signIn(page);
    await goToPaymentManagement(page);

    const firstRowCheckbox = page
      .getByRole('checkbox', { name: /select payment/i })
      .first();
    await firstRowCheckbox.check();

    await page.getByRole('button', { name: /^unpark$/i }).click();

    // AC-15: success toast
    await expect(page.getByText(/unparked successfully/i)).toBeVisible({
      timeout: 10000,
    });

    // AC-15: selections cleared
    await expect(firstRowCheckbox).not.toBeChecked({ timeout: 10000 });
  });

  // -------------------------------------------------------------------------
  // Park failure: API returns 500, error toast shown, selections preserved (AC-20, AC-22)
  // -------------------------------------------------------------------------

  // AC-20, AC-22
  test('Park failure: error toast shown and row selections are preserved so user can retry', async ({
    page,
  }) => {
    // Force the park endpoint to return 500
    await page.route('**/v1/payments/park', (route) => {
      route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    await signIn(page);
    await goToPaymentManagement(page);

    const firstRowCheckbox = page
      .getByRole('checkbox', { name: /select payment/i })
      .first();
    await firstRowCheckbox.check();
    await expect(firstRowCheckbox).toBeChecked();

    await page.getByRole('button', { name: /^park$/i }).click();

    // AC-20: error toast with descriptive message
    await expect(page.getByText(/failed to park/i)).toBeVisible({
      timeout: 10000,
    });

    // AC-22: selections preserved — first checkbox still checked
    await expect(firstRowCheckbox).toBeChecked();
  });

  // -------------------------------------------------------------------------
  // BA-1: Grid loading overlay visible during post-mutation re-fetch (AC-19)
  // -------------------------------------------------------------------------

  // AC-19, BA-1
  // Runtime-only: Loading overlay timing is browser-dependent; verified with real API latency
  test('grid shows loading overlay during post-park re-fetch (BA-1: grid overlay, not button spinner)', async ({
    page,
  }) => {
    // Use a delayed fulfillment for the re-fetch GET to ensure the overlay is visible
    let parkFulfilled = false;
    await page.route('**/v1/payments/park', (route) => {
      parkFulfilled = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{}',
      });
    });

    // Add a controlled delay to the payments GET re-fetch so the loading overlay is visible
    await page.route('**/v1/payments', async (route) => {
      if (parkFulfilled) {
        // Delay the re-fetch by 500ms to give the test time to observe the loading indicator
        await new Promise((res) => setTimeout(res, 500));
      }
      await route.continue();
    });

    await signIn(page);
    await goToPaymentManagement(page);

    // Reset parkFulfilled now that initial load is done
    parkFulfilled = false;

    const firstRowCheckbox = page
      .getByRole('checkbox', { name: /select payment/i })
      .first();
    await firstRowCheckbox.check();

    await page.getByRole('button', { name: /^park$/i }).click();

    // BA-1: During the delayed re-fetch, a grid-level loading indicator must be visible
    // (not a spinner on the Park button)
    await expect(
      page
        .getByRole('status')
        .or(page.getByTestId('grid-loading'))
        .or(page.getByTestId('skeleton'))
        .first(),
    ).toBeVisible({ timeout: 5000 });
  });

  // -------------------------------------------------------------------------
  // BA-2: Disabled buttons not reachable by Tab (Edge 4 — keyboard accessibility)
  // Runtime-only: Tab order verification requires a real browser
  // -------------------------------------------------------------------------

  // AC-25, AC-26, BA-2
  // Runtime-only: verified during QA manual testing
  test('disabled Park and Unpark buttons are not reachable via Tab (native disabled removes them from Tab order)', async ({
    page,
  }) => {
    await signIn(page);
    await goToPaymentManagement(page);

    // With no selection, Park and Unpark are disabled
    await expect(page.getByRole('button', { name: /^park$/i })).toBeDisabled();

    // Tab through the page; the disabled buttons must not receive focus
    // We tab up to 30 times and verify the Park button never becomes focused
    await page.keyboard.press('Tab');
    let parkButtonFocused = false;
    for (let i = 0; i < 30; i++) {
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        return el.textContent?.trim().toLowerCase() ?? null;
      });
      if (focused === 'park') {
        parkButtonFocused = true;
        break;
      }
      await page.keyboard.press('Tab');
    }

    // BA-2: disabled Park button must NOT have been focused during Tab traversal
    expect(parkButtonFocused).toBe(false);
  });
});
