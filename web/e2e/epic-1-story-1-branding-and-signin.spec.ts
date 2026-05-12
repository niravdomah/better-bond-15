/**
 * Story Metadata:
 * - Route: /auth/signin
 * - Target File: app/auth/signin/page.tsx
 * - Page Action: modify_existing
 *
 * E2E spec for Epic 1, Story 1: MortgageMax Branding and Sign-In Page.
 *
 * Covers runtime-only scenarios (Examples 1, 4, 9 from test-design) that require
 * real Next.js middleware, file-system routing, and a running server.
 *
 * BA-3 (resolved): The post-sign-in redirect assertion (browser arrives at `/` after
 * successful sign-in) is deferred to Epic 2, Story 2.1 (Dashboard page).
 * // Deferred to Epic 2 (Story 2.1 Dashboard)
 *
 * NOTE on credentials fixture: The e2e/fixtures/credentials.ts file currently holds
 * template placeholder credentials. The IMPLEMENT phase will update it to:
 *   adminUser = { email: 'admin@example.com', password: 'Admin123!', role: 'admin' } // scan-secrets-ignore
 * Until then, these specs reference the FRS-required credential directly.
 *
 * These tests WILL FAIL until the feature is implemented — that is the point (TDD red).
 */
import { test, expect } from '@playwright/test';

// FRS single demo credential — scan-secrets-ignore - documented POC seed credential (matches auth.config.ts after Story 1.1 implementation)
const FRS_ADMIN_EMAIL = 'admin@example.com';
const FRS_ADMIN_PASSWORD = 'Admin123!'; // scan-secrets-ignore

test.describe('Epic 1, Story 1: MortgageMax Branding and Sign-In Page', () => {
  test.beforeEach(async ({ context }) => {
    // Start every test unauthenticated — keeps failure diagnosis simple
    await context.clearCookies();
  });

  // -------------------------------------------------------------------------
  // AC-1 (Runtime-only) — Unauthenticated user redirected to /auth/signin
  // -------------------------------------------------------------------------
  // AC-1
  test('unauthenticated visitor is redirected from a protected route to /auth/signin', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(
      page.getByRole('heading', { name: /MortgageMax Payments/i }),
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC-2 — MortgageMax branding visible in the browser (Playwright confirms
  // the real rendering; RTL covers this at unit level too)
  // -------------------------------------------------------------------------
  // AC-2
  test('sign-in page displays "MortgageMax Payments" as the card heading', async ({
    page,
  }) => {
    await page.goto('/auth/signin');
    await expect(
      page.getByRole('heading', { name: /MortgageMax Payments/i }),
    ).toBeVisible();
  });

  // AC-2, AC-10
  test('sign-in page does not contain a "Sign up" link', async ({ page }) => {
    await page.goto('/auth/signin');
    await expect(
      page.getByRole('link', { name: /sign up/i }),
    ).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC-5 (Runtime-only) — Already-authenticated user visiting /auth/signin
  // is redirected to the home page without seeing the sign-in form.
  // -------------------------------------------------------------------------
  // AC-5
  test('already-authenticated user visiting /auth/signin is redirected to /', async ({
    page,
  }) => {
    // Sign in first to establish a real session
    await page.goto('/auth/signin');
    await page.getByLabel('Email').fill(FRS_ADMIN_EMAIL);
    await page.getByLabel('Password').fill(FRS_ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for redirect away from sign-in (implementation redirects to /)
    // Deferred to Epic 2 (Story 2.1 Dashboard) for full URL assertion.
    // Here we only assert the sign-in form is no longer visible.
    await expect(
      page.getByRole('heading', { name: /MortgageMax Payments/i }),
    ).not.toBeVisible({ timeout: 5000 });

    // Now navigate back to /auth/signin — should be redirected away
    await page.goto('/auth/signin');
    await expect(
      page.getByRole('heading', { name: /MortgageMax Payments/i }),
    ).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC-6 — Wrong credentials show "Invalid credentials" error on the sign-in page
  // -------------------------------------------------------------------------
  // AC-6
  test('wrong password shows "Invalid credentials" error and user stays on sign-in page', async ({
    page,
  }) => {
    await page.goto('/auth/signin');
    await page.getByLabel('Email').fill(FRS_ADMIN_EMAIL);
    await page.getByLabel('Password').fill('WrongPassword1!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/auth\/signin/);
    // Filter the alert by text to avoid strict-mode clash with Next.js route announcer
    // (the route announcer also uses role="alert" but is always empty).
    // The ARIA spec defines "alert" accessible name from author attributes only,
    // so we use .filter({hasText}) instead of getByRole('alert', {name: ...}).
    await expect(
      page.getByRole('alert').filter({ hasText: /invalid credentials/i }),
    ).toBeVisible();
  });

  // AC-6
  test('unknown email shows "Invalid credentials" (no user-enumeration distinction)', async ({
    page,
  }) => {
    await page.goto('/auth/signin');
    await page.getByLabel('Email').fill('unknown@other.com');
    await page.getByLabel('Password').fill('Admin123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/auth\/signin/);
    // Filter the alert by text to avoid strict-mode clash with Next.js route announcer.
    await expect(
      page.getByRole('alert').filter({ hasText: /invalid credentials/i }),
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC-10 (Runtime-only) — Removed template routes return 404
  // -------------------------------------------------------------------------
  // AC-10
  test('/auth/signup returns 404 — route has been removed', async ({
    page,
  }) => {
    const response = await page.goto('/auth/signup');
    expect(response?.status()).toBe(404);
  });

  // AC-10
  test('/auth/signout returns 404 — route has been removed', async ({
    page,
  }) => {
    const response = await page.goto('/auth/signout');
    expect(response?.status()).toBe(404);
  });

  // AC-10
  test('/auth/forbidden returns 404 — route has been removed', async ({
    page,
  }) => {
    const response = await page.goto('/auth/forbidden');
    expect(response?.status()).toBe(404);
  });

  // -------------------------------------------------------------------------
  // Deferred — AC-4 post-sign-in redirect to Dashboard
  // Deferred to Epic 2 (Story 2.1 Dashboard) per BA-3 (resolved 2026-05-12)
  // -------------------------------------------------------------------------
  // AC-4 — Deferred to Epic 2 (Story 2.1 Dashboard)
  // test('demo credentials sign in and redirect to /', async ({ page }) => {
  //   await page.goto('/auth/signin');
  //   await page.getByLabel('Email').fill(FRS_ADMIN_EMAIL);
  //   await page.getByLabel('Password').fill(FRS_ADMIN_PASSWORD);
  //   await page.getByRole('button', { name: /sign in/i }).click();
  //   await expect(page).toHaveURL('/');
  // });
});
