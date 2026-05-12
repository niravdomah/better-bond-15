/**
 * Shared mock data factories for Epic 1 — Foundation: Auth, Branding, Navigation, and API Setup.
 *
 * Import from this file in all Epic 1 test files.
 * Do NOT duplicate these factories — extend this file for new entities instead.
 *
 * FRS single-role model: session carries { user: { id, email, name } } with NO role field.
 */

export interface MockUser {
  id: string;
  email: string;
  name: string;
}

export interface MockSession {
  user: MockUser;
  expires: string;
}

/**
 * Creates a mock next-auth session for the single demo admin user.
 * The session shape follows FRS/AC-11: no `role` field.
 */
export const createMockAdminSession = (
  overrides: Partial<MockUser> = {},
): MockSession => ({
  user: {
    id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    ...overrides,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
});

/**
 * Demo credentials matching the FRS single demo user (AC-9).
 * Password is for test assertions only — never hard-code in UI under test.
 */
export const DEMO_CREDENTIALS = {
  email: 'admin@example.com',
  // scan-secrets-ignore - documented POC seed credential (matches auth.config.ts)
  password: 'Admin123!', // scan-secrets-ignore
} as const;

/**
 * Removed template user emails — signing in with these must fail (AC-9).
 */
export const REMOVED_TEMPLATE_EMAILS = [
  'admin@mortgagemax.com',
  'power@mortgagemax.com',
  'power@example.com',
  'user@example.com',
  'readonly@example.com',
] as const;
