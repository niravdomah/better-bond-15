/**
 * Story Metadata:
 * - Route: /auth/signin
 * - Target File: app/auth/signin/page.tsx
 * - Page Action: modify_existing
 *
 * Integration tests for Epic 1, Story 1: MortgageMax Branding and Sign-In Page.
 *
 * Render scope: full page (app/auth/signin/page.tsx) — per test-handoff renderScope: page.
 *
 * FRS-Over-Template: tests assert FRS-required behavior (single role, one demo user,
 * MortgageMax branding, "Invalid credentials" error, "MortgageMax Payments" card title).
 * The existing template code does NOT yet satisfy these — tests are intentionally failing (TDD red).
 *
 * Testability classification (from test-handoff):
 * - Runtime-only scenarios (Examples 1, 4, 9): NOT covered here — covered in Playwright spec.
 * - Unit-testable scenarios (Examples 2, 3, 5, 6, 7, 8, 10, Edge 1, 2, 3): covered below.
 *
 * vitest-axe matchers are extended globally in vitest.setup.ts — no local expect.extend needed.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

// These mocks must be declared before any module under test is imported.

// Mock next/navigation (used inside the sign-in page via useRouter / useSearchParams)
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
  useSearchParams: vi.fn(() => ({ get: vi.fn(() => null) })),
}));

// Mock next-auth core
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
}));

// Mock next-auth/react session utilities
vi.mock('next-auth/react', () => ({
  __esModule: true,
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock @/lib/auth/auth-client — the thin wrapper around next-auth/react that the page imports.
// The signIn export from this module is the seam we control in tests.
vi.mock('@/lib/auth/auth-client', () => ({
  signIn: vi.fn(),
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
}));

// Imports after mocks
import SignInPage from '@/app/auth/signin/page';
import { signIn } from '@/lib/auth/auth-client';
import { useRouter } from 'next/navigation';

const mockSignIn = signIn as ReturnType<typeof vi.fn>;
const mockUseRouter = useRouter as ReturnType<typeof vi.fn>;
const mockPush = vi.fn();
const mockRefresh = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockUseRouter.mockReturnValue({ push: mockPush, refresh: mockRefresh });
});

// ---------------------------------------------------------------------------
// Example 2 — MortgageMax branding visible on sign-in page (AC-2)
// ---------------------------------------------------------------------------
describe('MortgageMax branding', () => {
  // AC-2
  it('displays the "MortgageMax Payments" card title as a heading', () => {
    render(<SignInPage />);
    expect(
      screen.getByRole('heading', { name: /MortgageMax Payments/i }),
    ).toBeInTheDocument();
  });

  // AC-2, AC-10
  it('does not render a "Sign up" or "Register" link', () => {
    render(<SignInPage />);
    expect(
      screen.queryByRole('link', { name: /sign up/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /register/i }),
    ).not.toBeInTheDocument();
  });

  // AC-2 — Light mode only: no dark-mode Tailwind classes on the page wrapper.
  // The template uses "dark:bg-black" which must be removed per the MortgageMax
  // light-mode-only requirement. This test fails until that class is removed.
  it('page wrapper does not contain dark-mode Tailwind classes (light mode only)', () => {
    const { container } = render(<SignInPage />);
    // The outermost rendered div must not contain any "dark:" prefixed Tailwind utility.
    const html = container.innerHTML;
    expect(html).not.toMatch(/dark:/);
  });
});

// ---------------------------------------------------------------------------
// Example 3 (partial) — Email and password inputs present (AC-3)
// The redirect assertion on successful sign-in is deferred to Epic 2 (BA-3).
// ---------------------------------------------------------------------------
describe('Sign-in form inputs', () => {
  // AC-3
  it('renders an email input with the required attribute', () => {
    render(<SignInPage />);
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('required');
  });

  // AC-3
  it('renders a password input with type="password" and required attribute', () => {
    render(<SignInPage />);
    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('required');
  });

  // AC-3
  it('renders a Sign In submit button', () => {
    render(<SignInPage />);
    expect(
      screen.getByRole('button', { name: /sign in/i }),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Example 5 — Wrong credentials → "Invalid credentials" error message (AC-6)
// ---------------------------------------------------------------------------
describe('Failed sign-in', () => {
  // AC-6
  it('shows "Invalid credentials" when signIn resolves with an error', async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: 'Invalid credentials' });
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'WrongPassword1!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Invalid credentials',
      );
    });
  });

  // AC-6
  it('does not navigate away (router.push not called) after a failed sign-in', async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: 'Invalid credentials' });
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'WrongPassword1!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Example 6 — Empty email prevents form submission (AC-7)
// ---------------------------------------------------------------------------
describe('Empty email validation', () => {
  // AC-7
  it('does not call signIn when the email field is left empty', async () => {
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.type(screen.getByLabelText(/password/i), 'Admin123!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // HTML required attribute prevents submission — signIn must not be called
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Example 7 — Empty password prevents form submission (AC-8)
// ---------------------------------------------------------------------------
describe('Empty password validation', () => {
  // AC-8
  it('does not call signIn when the password field is left empty', async () => {
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // HTML required attribute prevents submission — signIn must not be called
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Example 8 — Single demo user; no role field in the user object (AC-9, AC-11)
// Verified by importing auth.config.ts directly (unit assertion, not via UI).
// Data-contract: full chain verified during QA manual testing.
// ---------------------------------------------------------------------------
describe('Auth config — single demo user and no role field', () => {
  // AC-9
  it('auth config authorize resolves to a non-null user for admin@example.com / Admin123!', async () => {
    // This test WILL FAIL until the template 4-user list is replaced with one user
    // AND the authorize function no longer returns null for this credential in the test env.
    // Data-contract: full chain verified during QA manual testing.
    const { authConfig } = await import('@/lib/auth/auth.config');
    const credentialsProvider = authConfig.providers?.[0] as {
      authorize?: (
        credentials: Record<string, unknown>,
      ) => Promise<{ id: string; email: string; name: string } | null>;
    };

    const result = await credentialsProvider.authorize?.({
      email: 'admin@example.com',
      password: 'Admin123!', // scan-secrets-ignore
    });

    expect(result).not.toBeNull();
    expect(result?.email).toBe('admin@example.com');
  });

  // AC-9
  it('auth config authorize returns null for a removed template user (power@example.com)', async () => {
    // Data-contract: full chain verified during QA manual testing.
    // After implementation, power@example.com must no longer exist in demoUsers.
    const { authConfig } = await import('@/lib/auth/auth.config');
    const credentialsProvider = authConfig.providers?.[0] as {
      authorize?: (
        credentials: Record<string, unknown>,
      ) => Promise<{ id: string; email: string; name: string } | null>;
    };

    const result = await credentialsProvider.authorize?.({
      email: 'power@example.com',
      password: 'Power123!', // scan-secrets-ignore
    });

    expect(result).toBeNull();
  });

  // AC-11
  it('auth config authorize result contains no role field (single-role POC)', async () => {
    // Data-contract: full chain verified during QA manual testing.
    const { authConfig } = await import('@/lib/auth/auth.config');
    const credentialsProvider = authConfig.providers?.[0] as {
      authorize?: (
        credentials: Record<string, unknown>,
      ) => Promise<Record<string, unknown> | null>;
    };

    const result = await credentialsProvider.authorize?.({
      email: 'admin@example.com',
      password: 'Admin123!', // scan-secrets-ignore
    });

    expect(result).not.toBeNull();
    // FRS single-role POC (AC-11): no role field in the authorized user object
    expect(result).not.toHaveProperty('role');
  });
});

// ---------------------------------------------------------------------------
// Example 10 — Keyboard navigation reaches all sign-in fields in order (AC-12)
// ---------------------------------------------------------------------------
describe('Keyboard navigation', () => {
  // AC-12
  it('Tab key cycles through email input, password input, and Sign In button in order', async () => {
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.tab();
    expect(screen.getByLabelText(/email/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText(/password/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: /sign in/i })).toHaveFocus();
  });
});

// ---------------------------------------------------------------------------
// Edge Example 1 — Unknown email shows same "Invalid credentials" error (AC-6)
// (User enumeration prevention — no distinction between wrong email and wrong password)
// ---------------------------------------------------------------------------
describe('Unknown email shows the same error (user enumeration prevention)', () => {
  // AC-6
  it('shows "Invalid credentials" for an unknown email — identical to wrong password message', async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: 'Invalid credentials' });
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.type(screen.getByLabelText(/email/i), 'unknown@other.com');
    await user.type(screen.getByLabelText(/password/i), 'Admin123!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Invalid credentials',
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Edge Example 2 — Error message has role="alert" for screen reader announcement (AC-13)
// ---------------------------------------------------------------------------
describe('Error message ARIA accessibility', () => {
  // AC-13
  it('error message element carries role="alert" so assistive technologies announce it', async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: 'Invalid credentials' });
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'WrongPassword1!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      // getByRole('alert') asserts that the element has role="alert"
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Invalid credentials');
    });
  });
});

// ---------------------------------------------------------------------------
// Accessibility — axe scans (AC-12, AC-13)
// ---------------------------------------------------------------------------
describe('Axe accessibility', () => {
  // AC-12, AC-13
  it('sign-in page has no axe violations in the unauthenticated (empty form) state', async () => {
    const { container } = render(<SignInPage />);

    // Wait for the Suspense boundary to resolve
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /sign in/i }),
      ).toBeInTheDocument();
    });

    const results = await axe(container);
    // toHaveNoViolations is extended globally by vitest.setup.ts
    expect(results).toHaveNoViolations();
  });

  // AC-13
  it('sign-in page has no axe violations when the "Invalid credentials" alert is visible', async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: 'Invalid credentials' });
    const user = userEvent.setup();

    const { container } = render(<SignInPage />);

    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
