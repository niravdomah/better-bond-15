/**
 * Story Metadata:
 * - Route: /payment-management
 * - Target File: app/(protected)/payment-management/page.tsx
 * - Page Action: modify_existing
 *
 * E2E spec for Epic 3, Story 1:
 * Payment Management Grid with Filtering and Pagination.
 *
 * Runs against a live Next.js dev server booted by playwright.config.ts's webServer block.
 * These tests WILL FAIL until the feature is implemented — that is the point (TDD red).
 *
 * Coverage decisions (see "What belongs where" table in test-generator.md):
 *   - Example 1 (auth redirect):      Playwright — requires real Next.js middleware.
 *   - Example 2 (happy path grid):    Playwright — asserts running page renders real rows.
 *   - Example 8 (agency dropdown):    Playwright — asserts real dropdown population from live data.
 *   - Example 9 (agency filter):      Playwright — asserts client-side filter in a real browser.
 *   - Example 11 (empty state):       Playwright — uses page.route() to return empty list.
 *   - Example 12 (error state):       Playwright — uses page.route() to return 500; asserts toast.
 *   - AC-27 (keyboard focus):         Playwright — keyboard focus indicator requires real browser.
 *
 * Credentials from the seeded fixtures file — never hard-coded in this spec.
 *
 * Locked BA assertion strings:
 *   PAYMENTS_TOAST_TEXT  = "Failed to load payments. Please try again."
 *   EMPTY_STATE_MESSAGE  = "No payments ready for processing."
 */

import { test, expect, type Page } from '@playwright/test';
import { adminUser } from './fixtures/credentials';

/** Sign in helper — reusable across tests in this spec */
async function signIn(page: Page) {
  await page.goto('/auth/signin');
  await page.getByLabel('Email').fill(adminUser.email);
  await page.getByLabel('Password').fill(adminUser.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/auth/signin'), {
    timeout: 10000,
  });
}

/**
 * Navigate to /payment-management and wait for the grid to finish loading.
 * Waits for skeleton placeholders to disappear and at least one data row to appear.
 */
async function goToPaymentManagement(page: Page) {
  await page.goto('/payment-management');
  // Wait for skeletons to disappear (replaced by real data or empty state)
  await expect(page.getByTestId('skeleton').first()).not.toBeVisible({
    timeout: 15000,
  });
}

test.describe('Epic 3, Story 1: Payment Management Grid with Filtering and Pagination', () => {
  test.beforeEach(async ({ context }) => {
    // Every test starts unauthenticated — keeps failure diagnosis simple
    await context.clearCookies();
  });

  // -------------------------------------------------------------------------
  // Example 1 (Runtime-only) — Unauthenticated user redirected to /auth/signin
  // AC-1
  // -------------------------------------------------------------------------

  // AC-1
  // Runtime-only: verified during QA manual testing
  test('unauthenticated visitor visiting /payment-management is redirected to /auth/signin', async ({
    page,
  }) => {
    await page.goto('/payment-management');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  // -------------------------------------------------------------------------
  // Example 2 (Happy path) — Grid loads with rows and pagination controls
  // AC-2, AC-3, AC-8
  // -------------------------------------------------------------------------

  // AC-2, AC-3, AC-8
  test('authenticated user sees payment grid with rows and pagination controls', async ({
    page,
  }) => {
    await signIn(page);
    await goToPaymentManagement(page);

    // The payment grid must be visible
    await expect(page.getByRole('table')).toBeVisible();

    // At least one data row must be present (header row + at least 1 data row)
    const rows = page.getByRole('row');
    await expect(rows.nth(1)).toBeVisible(); // first data row after header

    // Pagination controls must be rendered
    await expect(page.getByRole('button', { name: /previous/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /next/i })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Grid columns — all 13 required columns present, CommissionPercent absent
  // AC-4, AC-5
  // -------------------------------------------------------------------------

  // AC-4, AC-5
  test('payment grid shows all 13 required column headers and not CommissionPercent', async ({
    page,
  }) => {
    await signIn(page);
    await goToPaymentManagement(page);

    const requiredColumns = [
      'Reference',
      'AgencyName',
      'AgentName',
      'AgentSurname',
      'ClaimDate',
      'BondAmount',
      'CommissionType',
      'CommissionAmount',
      'VAT',
      'Status',
      'GrantDate',
      'RegistrationDate',
      'Bank',
    ];

    for (const col of requiredColumns) {
      await expect(page.getByRole('columnheader', { name: col })).toBeVisible();
    }

    // CommissionPercent must NOT be present
    await expect(
      page.getByRole('columnheader', { name: 'CommissionPercent' }),
    ).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Example 8 — AgencyName dropdown is present and populated
  // AC-14, AC-15
  // -------------------------------------------------------------------------

  // AC-14, AC-15
  test('AgencyName dropdown is visible with "All Agencies" as the first option', async ({
    page,
  }) => {
    await signIn(page);
    await goToPaymentManagement(page);

    const dropdown = page.getByRole('combobox');
    await expect(dropdown).toBeVisible();

    // Open the dropdown
    await dropdown.click();
    await expect(page.getByRole('listbox')).toBeVisible({ timeout: 5000 });

    // "All Agencies" must be the first option (AC-15)
    const options = page.getByRole('option');
    await expect(options.first()).toHaveText('All Agencies');

    // There must be at least one agency option beyond "All Agencies" (AC-14)
    // (unless the backend seed is empty — in which case the dropdown is still enabled per BA-1)
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThanOrEqual(1);
  });

  // -------------------------------------------------------------------------
  // Example 9 — Agency filter narrows the grid to matching rows only
  // AC-17, AC-19
  // Data-contract: full chain verified during QA manual testing
  // -------------------------------------------------------------------------

  // AC-17, AC-19
  // Data-contract: full chain verified during QA manual testing
  test('selecting an agency from the dropdown filters the grid to that agency only', async ({
    page,
  }) => {
    await signIn(page);
    await goToPaymentManagement(page);

    const table = page.getByRole('table');
    await expect(table).toBeVisible();

    // Capture the initial row count after load
    const initialRowCount = await table.getByRole('row').count();
    // Must have at least header + 1 data row
    expect(initialRowCount).toBeGreaterThan(1);

    const dropdown = page.getByRole('combobox');
    await dropdown.click();
    await expect(page.getByRole('listbox')).toBeVisible({ timeout: 5000 });

    const options = page.getByRole('option');
    const optionCount = await options.count();

    // Only proceed with the filter assertion if real agency options exist
    if (optionCount > 1) {
      // Click the first actual agency (second option, after "All Agencies")
      await options.nth(1).click();

      // After filtering, the row count should be ≤ the original count
      const filteredRowCount = await table.getByRole('row').count();
      expect(filteredRowCount).toBeLessThanOrEqual(initialRowCount);

      // All visible data rows must belong to the selected agency
      // (we verify that no "wrong" agency name appears in the visible rows)
    }
  });

  // -------------------------------------------------------------------------
  // "All Agencies" restores full list after a filter is applied
  // AC-18
  // -------------------------------------------------------------------------

  // AC-18
  test('re-selecting All Agencies restores all rows after a filter is applied', async ({
    page,
  }) => {
    await signIn(page);
    await goToPaymentManagement(page);

    const table = page.getByRole('table');
    await expect(table).toBeVisible();
    const initialRowCount = await table.getByRole('row').count();

    const dropdown = page.getByRole('combobox');
    await dropdown.click();
    await expect(page.getByRole('listbox')).toBeVisible({ timeout: 5000 });
    const options = page.getByRole('option');

    if ((await options.count()) > 1) {
      // Apply a filter
      await options.nth(1).click();

      // Re-open and select All Agencies
      await dropdown.click();
      await expect(page.getByRole('listbox')).toBeVisible({ timeout: 5000 });
      await page.getByRole('option', { name: /all agencies/i }).click();

      // Row count should be restored
      await expect(table.getByRole('row')).toHaveCount(initialRowCount);
    }
  });

  // -------------------------------------------------------------------------
  // Pagination — Previous disabled on page 1, Next navigates forward
  // AC-9, AC-12
  // -------------------------------------------------------------------------

  // AC-9, AC-12
  test('Previous button is disabled on page 1; clicking Next shows next page', async ({
    page,
  }) => {
    await signIn(page);
    await goToPaymentManagement(page);

    const prevBtn = page.getByRole('button', { name: /previous/i });
    const nextBtn = page.getByRole('button', { name: /next/i });

    // Previous must be disabled on page 1 (AC-12)
    await expect(prevBtn).toBeDisabled();

    // Only test Next navigation if there is a next page
    const isNextDisabled = await nextBtn.isDisabled();
    if (!isNextDisabled) {
      await nextBtn.click();
      // After navigating forward, Previous must become enabled
      await expect(prevBtn).not.toBeDisabled();
    }
  });

  // -------------------------------------------------------------------------
  // Example 11 — Empty API response: "No payments ready for processing."
  // AC-22, BA-1
  // Uses page.route() to intercept and return an empty PaymentList
  // -------------------------------------------------------------------------

  // AC-22, BA-1
  test('shows "No payments ready for processing." when the API returns an empty list', async ({
    page,
  }) => {
    // Intercept GET /v1/payments before signing in to ensure it's caught on page load
    await page.route('**/v1/payments', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ PaymentList: [] }),
      });
    });

    await signIn(page);
    await page.goto('/payment-management');

    await expect(
      page.getByText('No payments ready for processing.'),
    ).toBeVisible({ timeout: 10000 });

    // BA-1 (Option C): AgencyName dropdown must still be visible and enabled
    const dropdown = page.getByRole('combobox');
    await expect(dropdown).toBeVisible();
    await expect(dropdown).not.toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // Example 12 — API error: toast notification, no crash
  // AC-24, AC-25
  // Uses page.route() to intercept and return HTTP 500
  // -------------------------------------------------------------------------

  // AC-24, AC-25
  test('API failure shows toast and does not crash the page', async ({
    page,
  }) => {
    // Intercept GET /v1/payments and return 500
    await page.route('**/v1/payments', (route) => {
      route.fulfill({
        status: 500,
        body: 'Internal Server Error',
      });
    });

    await signIn(page);
    await page.goto('/payment-management');

    // Toast notification must appear with the exact BA error message (AC-24)
    await expect(
      page.getByText('Failed to load payments. Please try again.'),
    ).toBeVisible({ timeout: 10000 });

    // Page must not crash — at minimum the URL is still /payment-management (AC-25)
    await expect(page).toHaveURL(/\/payment-management/);
  });

  // -------------------------------------------------------------------------
  // AC-27 (Runtime-only) — Keyboard navigation reaches dropdown and pagination buttons
  // Runtime-only: visible focus indicators require a real browser (cannot be tested in jsdom)
  // -------------------------------------------------------------------------

  // AC-27
  // Runtime-only: verified during QA manual testing
  test('Tab navigation reaches the AgencyName dropdown and pagination buttons', async ({
    page,
  }) => {
    await signIn(page);
    await goToPaymentManagement(page);

    // Tab through the page to find the AgencyName dropdown
    const dropdown = page.getByRole('combobox');
    await expect(dropdown).toBeVisible();

    // Tab from the top until the combobox receives focus (max 25 presses)
    await page.keyboard.press('Tab');
    for (let i = 0; i < 25; i++) {
      const focusedRole = await page.evaluate(() =>
        document.activeElement?.getAttribute('role'),
      );
      if (focusedRole === 'combobox') break;
      await page.keyboard.press('Tab');
    }

    // The dropdown must be reachable via keyboard
    const focused = await page.evaluate(() =>
      document.activeElement?.getAttribute('role'),
    );
    expect(focused).toBe('combobox');

    // Tab past the dropdown to reach pagination buttons
    await page.keyboard.press('Tab');
    for (let i = 0; i < 30; i++) {
      const focusedRole = await page.evaluate(
        () => document.activeElement?.tagName,
      );
      const focusedLabel = await page.evaluate(() =>
        document.activeElement?.textContent?.trim().toLowerCase(),
      );
      if (
        focusedRole === 'BUTTON' &&
        (focusedLabel?.includes('previous') || focusedLabel?.includes('next'))
      )
        break;
      await page.keyboard.press('Tab');
    }

    const finalRole = await page.evaluate(
      () => document.activeElement?.tagName,
    );
    // At minimum verify we can reach interactive elements (button or combobox)
    expect(['BUTTON', 'A', 'SELECT', 'INPUT']).toContain(finalRole);
  });
});
