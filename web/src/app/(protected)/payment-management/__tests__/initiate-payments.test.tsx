/**
 * Story Metadata:
 * - Route: /payment-management
 * - Target File: app/(protected)/payment-management/page.tsx
 * - Page Action: modify_existing
 *
 * Integration tests for Epic 3, Story 3: Initiate Payments Button and Batch Creation.
 *
 * Scope: Initiate Payments button ONLY — enable-state derivation, payload construction
 * (READY-only IDs for selected agency + LastChangedUser header), success/failure flows,
 * in-flight guard (BA-2), and unauthenticated fallback (AC-9).
 * NOT grid render (Story 3.1), NOT Park/Unpark (Story 3.2).
 *
 * Render scope: component — the full page is rendered with mocked API calls.
 * The page exists as a stub; these tests WILL FAIL until the feature is implemented
 * (TDD red phase — that is the point).
 *
 * Mocking strategy:
 * - `useSession` from next-auth/react → mocked to return authenticated session
 * - `signIn` from next-auth/react → mocked to assert redirect on missing session username
 * - `@/lib/api/endpoints` → mocked; `getPayments`, `createPaymentBatch` controlled per test
 * - `sonner` toast → mocked to capture toast calls without a real Toaster
 * - `next/navigation` → mocked to suppress router errors in jsdom
 *
 * Locked BA decision strings:
 *   BA-1  FAILURE_TOAST_TEXT = "Failed to initiate payment batch. Please try again."
 *   BA-2  In-flight guard: button disabled + loading indicator during API call
 *
 * Testability classification (from test-handoff):
 *   Unit-testable (RTL): Examples 1–6, 8, Edge Examples 1–4
 *   Data-contract:       Example 7 (success flow re-fetch chain)
 *   Runtime-only:        AC-19, AC-20 keyboard focus ring (covered by Playwright)
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

// ---------------------------------------------------------------------------
// Hoist mocks — vi.hoisted ensures these run before vi.mock factory hoisting
// ---------------------------------------------------------------------------

const { mockSignIn } = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks — declared before any production imports
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => '/payment-management'),
  useSearchParams: vi.fn(() => ({ get: vi.fn(() => null) })),
}));

// Mock next-auth/react: useSession + signIn
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signIn: mockSignIn,
}));

// Mock all endpoint functions — only the ones relevant to this story are controlled
vi.mock('@/lib/api/endpoints', () => ({
  getPayments: vi.fn(),
  createPaymentBatch: vi.fn(),
  // Stubs for functions used by other stories in the same page
  parkPayments: vi.fn(),
  unparkPayments: vi.fn(),
}));

// Mock Sonner toast so we can assert toast text without a real Toaster
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  Toaster: () => null,
}));

// ---------------------------------------------------------------------------
// Production imports — WILL fail with "Cannot find module" until implemented (TDD red)
// ---------------------------------------------------------------------------
import PaymentManagementPage from '@/app/(protected)/payment-management/page';
import { useSession } from 'next-auth/react';
import { getPayments, createPaymentBatch } from '@/lib/api/endpoints';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Shared mock data factories
// ---------------------------------------------------------------------------
import {
  SUCCESS_TOAST_TEXT,
  FAILURE_TOAST_TEXT,
  AGENCY_CAPE_HOMES,
  AGENCY_METRO_REALTY,
  AGENCY_SUNRIDGE_PROPERTIES,
  STORY3_ALL_AGENCIES_LIST,
  STORY3_METRO_REALTY_ALL_MANPAY,
  STORY3_CAPE_HOMES_MIXED,
  STORY3_SUNRIDGE_MIXED,
  STORY3_CAPE_HOMES_TWO_REG,
  STORY3_CAPE_HOMES_POST_BATCH,
  STORY3_CAPE_HOMES_ONE_REG,
} from '../../../../__tests__/helpers/epic-3-mock-data';

// ---------------------------------------------------------------------------
// Typed mock helpers
// ---------------------------------------------------------------------------
const mockUseSession = useSession as ReturnType<typeof vi.fn>;
const mockGetPayments = getPayments as ReturnType<typeof vi.fn>;
const mockCreatePaymentBatch = createPaymentBatch as ReturnType<typeof vi.fn>;
const mockToastSuccess = toast.success as ReturnType<typeof vi.fn>;
const mockToastError = toast.error as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Returns a standard authenticated session for most tests */
function withAuthenticatedSession(name = 'Admin User') {
  mockUseSession.mockReturnValue({
    data: { user: { name, email: 'admin@example.com' } },
    status: 'authenticated',
  });
}

/**
 * Render the page and wait for it to finish the initial getPayments fetch.
 * We wait for the "Initiate Payments" button to appear in the DOM.
 */
async function renderAndWait() {
  render(<PaymentManagementPage />);
  await waitFor(() => {
    expect(
      screen.getByRole('button', { name: /initiate payments/i }),
    ).toBeInTheDocument();
  });
}

/**
 * Select a specific agency from the filter dropdown.
 * Assumes the page is already rendered and the dropdown is visible.
 */
async function selectAgency(agencyName: string) {
  const user = userEvent.setup();
  const dropdown = screen.getByRole('combobox');
  await user.click(dropdown);
  const option = await screen.findByRole('option', { name: agencyName });
  await user.click(option);
}

beforeEach(() => {
  vi.clearAllMocks();
  withAuthenticatedSession();
});

// ===========================================================================
// Example 1 — Button disabled when "All Agencies" is selected (AC-1, AC-18)
// ===========================================================================

describe('Initiate Payments button — disabled when "All Agencies" selected', () => {
  // AC-1, AC-18
  it('button is disabled and has aria-disabled when All Agencies is the active filter', async () => {
    mockGetPayments.mockResolvedValue(STORY3_ALL_AGENCIES_LIST);
    await renderAndWait();

    const button = screen.getByRole('button', { name: /initiate payments/i });
    // Native disabled or aria-disabled must be present
    const isDisabled =
      button.hasAttribute('disabled') ||
      button.getAttribute('aria-disabled') === 'true';
    expect(isDisabled).toBe(true);
  });
});

// ===========================================================================
// Example 2 — Button disabled when selected agency has no REG payments (AC-2, AC-18)
// ===========================================================================

describe('Initiate Payments button — disabled when agency has no READY payments', () => {
  // AC-2, AC-18
  it('button is disabled when selected agency has only PARKED payments', async () => {
    mockGetPayments.mockResolvedValue(STORY3_METRO_REALTY_ALL_MANPAY);
    await renderAndWait();

    await selectAgency(AGENCY_METRO_REALTY);

    const button = screen.getByRole('button', { name: /initiate payments/i });
    const isDisabled =
      button.hasAttribute('disabled') ||
      button.getAttribute('aria-disabled') === 'true';
    expect(isDisabled).toBe(true);
  });
});

// ===========================================================================
// Example 3 — Button enabled when agency with REG payments is selected (AC-3)
// ===========================================================================

describe('Initiate Payments button — enabled when agency has READY payments', () => {
  // AC-3
  it('button becomes enabled when Cape Homes (which has a READY payment) is selected', async () => {
    mockGetPayments.mockResolvedValue(STORY3_CAPE_HOMES_MIXED);
    await renderAndWait();

    await selectAgency(AGENCY_CAPE_HOMES);

    const button = screen.getByRole('button', { name: /initiate payments/i });
    expect(button).not.toBeDisabled();
    expect(button.getAttribute('aria-disabled')).not.toBe('true');
  });
});

// ===========================================================================
// Example 4 — Correct request: only READY IDs + LastChangedUser + in-flight guard
// (AC-4, AC-5, AC-6, AC-8, AC-21)
// ===========================================================================

describe('Clicking Initiate Payments sends the correct request', () => {
  // AC-4, AC-5, AC-6, AC-8
  it('calls createPaymentBatch with only Cape Homes READY payment ID (201) and session username', async () => {
    mockGetPayments
      .mockResolvedValueOnce(STORY3_CAPE_HOMES_MIXED)
      .mockResolvedValue(STORY3_CAPE_HOMES_POST_BATCH);
    mockCreatePaymentBatch.mockResolvedValue({
      Id: 1,
      MessageType: 'OK',
      Messages: [],
    });

    render(<PaymentManagementPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /initiate payments/i }),
      ).toBeInTheDocument();
    });

    await selectAgency(AGENCY_CAPE_HOMES);

    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: /initiate payments/i });
    await user.click(button);

    await waitFor(() => {
      expect(mockCreatePaymentBatch).toHaveBeenCalledTimes(1);
    });

    // PaymentIds must contain ONLY ID 201 (REG) — NOT 202 (MAN-PAY) or 301 (other agency REG)
    const [paymentIds, lastChangedUser] = mockCreatePaymentBatch.mock.calls[0];
    expect(paymentIds).toEqual([201]);
    // AC-8: lastChangedUser is the session username
    expect(lastChangedUser).toBe('Admin User');
  });

  // AC-21, BA-2 — In-flight guard: button is disabled during the API call
  it('button is disabled while the batch creation call is in flight', async () => {
    mockGetPayments.mockResolvedValue(STORY3_CAPE_HOMES_MIXED);

    let resolveCreate!: (val: unknown) => void;
    // Return a promise that we control — call won't settle until we resolve it
    mockCreatePaymentBatch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );

    render(<PaymentManagementPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /initiate payments/i }),
      ).toBeInTheDocument();
    });

    await selectAgency(AGENCY_CAPE_HOMES);

    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: /initiate payments/i });

    // Click to start the in-flight call
    await user.click(button);

    // While the call is in flight, the button must be disabled
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /initiate payments/i });
      const isDisabled =
        btn.hasAttribute('disabled') ||
        btn.getAttribute('aria-disabled') === 'true';
      expect(isDisabled).toBe(true);
    });

    // Settle the call
    await act(async () => {
      resolveCreate({ Id: 1, MessageType: 'OK', Messages: [] });
    });
  });
});

// ===========================================================================
// Example 5 — PaymentIds contains only READY payments for the selected agency
// (AC-5, AC-6, AC-7)
// ===========================================================================

describe('PaymentIds filtering across statuses and agencies', () => {
  // AC-5, AC-6, AC-7
  it('PaymentIds contains only IDs 101 and 102 — MAN-PAY and other-agency REG excluded', async () => {
    mockGetPayments
      .mockResolvedValueOnce(STORY3_SUNRIDGE_MIXED)
      .mockResolvedValue(STORY3_SUNRIDGE_MIXED);
    mockCreatePaymentBatch.mockResolvedValue({
      Id: 2,
      MessageType: 'OK',
      Messages: [],
    });

    render(<PaymentManagementPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /initiate payments/i }),
      ).toBeInTheDocument();
    });

    await selectAgency(AGENCY_SUNRIDGE_PROPERTIES);

    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: /initiate payments/i }),
    );

    await waitFor(() => {
      expect(mockCreatePaymentBatch).toHaveBeenCalledTimes(1);
    });

    const [paymentIds] = mockCreatePaymentBatch.mock.calls[0];
    // Only IDs 101 and 102 belong to Sunridge Properties with READY status
    expect(paymentIds).toEqual(expect.arrayContaining([101, 102]));
    expect(paymentIds).toHaveLength(2);
    // ID 103 (PARKED) and 201, 202 (other agencies) must NOT be included
    expect(paymentIds).not.toContain(103);
    expect(paymentIds).not.toContain(201);
    expect(paymentIds).not.toContain(202);
  });
});

// ===========================================================================
// Example 6 — Missing session username blocks API call and redirects (AC-9)
// ===========================================================================

describe('Session username guard', () => {
  // AC-9
  it('calls signIn (not createPaymentBatch) when session username is null', async () => {
    // Session with no username
    mockUseSession.mockReturnValue({
      data: { user: { name: null, email: 'admin@example.com' } },
      status: 'authenticated',
    });
    mockGetPayments.mockResolvedValue(STORY3_CAPE_HOMES_MIXED);

    render(<PaymentManagementPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /initiate payments/i }),
      ).toBeInTheDocument();
    });

    await selectAgency(AGENCY_CAPE_HOMES);

    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: /initiate payments/i }),
    );

    await waitFor(() => {
      // signIn should be called to redirect to sign-in page
      expect(mockSignIn).toHaveBeenCalled();
    });

    // No API call for batch creation
    expect(mockCreatePaymentBatch).not.toHaveBeenCalled();
    // No toast shown
    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(mockToastError).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Example 7 — Success flow: toast, re-fetch, stay on page (AC-10, AC-11, AC-12, AC-22)
// Data-contract: full chain verified during QA manual testing
// ===========================================================================

describe('Success flow — toast, re-fetch, stay on /payment-management', () => {
  // AC-10, AC-12
  // Data-contract: full chain verified during QA manual testing
  it('shows success toast and does not navigate away after a successful batch creation', async () => {
    mockGetPayments
      .mockResolvedValueOnce(STORY3_CAPE_HOMES_TWO_REG)
      .mockResolvedValue(STORY3_CAPE_HOMES_POST_BATCH);
    mockCreatePaymentBatch.mockResolvedValue({
      Id: 3,
      MessageType: 'OK',
      Messages: [],
    });

    render(<PaymentManagementPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /initiate payments/i }),
      ).toBeInTheDocument();
    });

    await selectAgency(AGENCY_CAPE_HOMES);

    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: /initiate payments/i }),
    );

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(SUCCESS_TOAST_TEXT);
    });

    // Page stays at /payment-management — no navigation mock should have been called
    const { useRouter } = await import('next/navigation');
    const mockRouter = vi.mocked(useRouter)();
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  // AC-11
  // Data-contract: full chain verified during QA manual testing
  it('triggers a getPayments re-fetch after a successful batch creation', async () => {
    mockGetPayments
      .mockResolvedValueOnce(STORY3_CAPE_HOMES_TWO_REG)
      .mockResolvedValue(STORY3_CAPE_HOMES_POST_BATCH);
    mockCreatePaymentBatch.mockResolvedValue({
      Id: 3,
      MessageType: 'OK',
      Messages: [],
    });

    render(<PaymentManagementPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /initiate payments/i }),
      ).toBeInTheDocument();
    });

    await selectAgency(AGENCY_CAPE_HOMES);

    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: /initiate payments/i }),
    );

    // getPayments should be called at least twice: once on mount, once after success
    await waitFor(() => {
      expect(mockGetPayments).toHaveBeenCalledTimes(2);
    });
  });

  // AC-22 — Button returns to appropriate state after success
  it('button returns to disabled state (no more READY payments) after a successful batch', async () => {
    mockGetPayments
      .mockResolvedValueOnce(STORY3_CAPE_HOMES_TWO_REG)
      .mockResolvedValue(STORY3_CAPE_HOMES_POST_BATCH);
    mockCreatePaymentBatch.mockResolvedValue({
      Id: 3,
      MessageType: 'OK',
      Messages: [],
    });

    render(<PaymentManagementPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /initiate payments/i }),
      ).toBeInTheDocument();
    });

    await selectAgency(AGENCY_CAPE_HOMES);

    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: /initiate payments/i }),
    );

    // After success + re-fetch (all payments now PARKED), button must be disabled again
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /initiate payments/i });
      const isDisabled =
        button.hasAttribute('disabled') ||
        button.getAttribute('aria-disabled') === 'true';
      expect(isDisabled).toBe(true);
    });
  });
});

// ===========================================================================
// Example 8 — Failure flow: error toast + button recovers (AC-13, AC-14, AC-22)
// ===========================================================================

describe('Failure flow — error toast and button recovers', () => {
  // AC-13, BA-1 (exact failure toast text)
  it('shows the exact BA-1 failure toast when createPaymentBatch rejects', async () => {
    mockGetPayments.mockResolvedValue(STORY3_CAPE_HOMES_ONE_REG);
    mockCreatePaymentBatch.mockRejectedValue(
      new Error('Internal Server Error'),
    );

    render(<PaymentManagementPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /initiate payments/i }),
      ).toBeInTheDocument();
    });

    await selectAgency(AGENCY_CAPE_HOMES);

    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: /initiate payments/i }),
    );

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(FAILURE_TOAST_TEXT);
    });

    // Success toast must NOT be shown
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  // AC-14, AC-22 — Button returns to enabled after failure (agency still selected, REG exists)
  it('button re-enables after a failed batch creation (agency still has READY payments)', async () => {
    mockGetPayments.mockResolvedValue(STORY3_CAPE_HOMES_ONE_REG);
    mockCreatePaymentBatch.mockRejectedValue(
      new Error('Internal Server Error'),
    );

    render(<PaymentManagementPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /initiate payments/i }),
      ).toBeInTheDocument();
    });

    await selectAgency(AGENCY_CAPE_HOMES);

    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: /initiate payments/i }),
    );

    // After failure, button must re-enable (canInitiate is still true)
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /initiate payments/i });
      expect(button).not.toBeDisabled();
      expect(button.getAttribute('aria-disabled')).not.toBe('true');
    });
  });

  // AC-14 — getPayments is NOT re-fetched after a failure
  it('does not call getPayments again after a failed batch creation', async () => {
    mockGetPayments.mockResolvedValue(STORY3_CAPE_HOMES_ONE_REG);
    mockCreatePaymentBatch.mockRejectedValue(
      new Error('Internal Server Error'),
    );

    render(<PaymentManagementPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /initiate payments/i }),
      ).toBeInTheDocument();
    });

    await selectAgency(AGENCY_CAPE_HOMES);

    const initialCallCount = mockGetPayments.mock.calls.length;

    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: /initiate payments/i }),
    );

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });

    // getPayments call count must not increase after failure
    expect(mockGetPayments).toHaveBeenCalledTimes(initialCallCount);
  });
});

// ===========================================================================
// Edge Example 1 — Toast auto-dismiss + manual dismiss (AC-15, AC-16)
// ===========================================================================

describe('Toast dismissal (AC-15, AC-16)', () => {
  // AC-15 — Sonner's global <Toaster duration={5000} /> in app/layout.tsx handles auto-dismiss
  // at runtime. With toast.success mocked, the 5-second timer cannot fire in jsdom — but
  // invoking toast.success is the application-side contract this test verifies. The global
  // Toaster configuration (duration={5000}) provides the auto-dismiss at runtime.
  it('success toast is invoked so the global 5-second auto-dismiss applies', async () => {
    // AC-15
    mockGetPayments
      .mockResolvedValueOnce(STORY3_CAPE_HOMES_ONE_REG)
      .mockResolvedValue(STORY3_CAPE_HOMES_POST_BATCH);
    mockCreatePaymentBatch.mockResolvedValue({
      Id: 5,
      MessageType: 'OK',
      Messages: [],
    });

    render(<PaymentManagementPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /initiate payments/i }),
      ).toBeInTheDocument();
    });

    await selectAgency(AGENCY_CAPE_HOMES);

    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: /initiate payments/i }),
    );

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledTimes(1);
    });
  });

  // AC-16 — Sonner's built-in dismiss button (the X on the toast) is library behavior, not
  // application code. Asserting on it would be testing third-party library internals, which
  // violates the project testing guidelines. Manual dismiss is therefore verified via the
  // manual QA checklist (see story acceptance criteria).
});

// ===========================================================================
// Edge Example 2 — Disabled button click produces no side effects (AC-17, AC-18)
// ===========================================================================

describe('Edge Example 2: Disabled button produces no side effects', () => {
  // AC-17, AC-18
  it('clicking the disabled button does not call createPaymentBatch or show a toast', async () => {
    // "All Agencies" selected by default — button is disabled
    mockGetPayments.mockResolvedValue(STORY3_ALL_AGENCIES_LIST);
    await renderAndWait();

    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: /initiate payments/i });

    // Verify it is disabled
    const isDisabled =
      button.hasAttribute('disabled') ||
      button.getAttribute('aria-disabled') === 'true';
    expect(isDisabled).toBe(true);

    // Attempt to click the disabled button
    await user.click(button);

    // No API call, no toast
    expect(mockCreatePaymentBatch).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(mockToastError).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Edge Example 3 — Keyboard activation (AC-20) — Enter key triggers action
// ===========================================================================

describe('Edge Example 3: Keyboard activation via Enter key', () => {
  // AC-20
  it('pressing Enter on a focused enabled button triggers createPaymentBatch', async () => {
    mockGetPayments
      .mockResolvedValueOnce(STORY3_CAPE_HOMES_ONE_REG)
      .mockResolvedValue(STORY3_CAPE_HOMES_POST_BATCH);
    mockCreatePaymentBatch.mockResolvedValue({
      Id: 4,
      MessageType: 'OK',
      Messages: [],
    });

    render(<PaymentManagementPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /initiate payments/i }),
      ).toBeInTheDocument();
    });

    await selectAgency(AGENCY_CAPE_HOMES);

    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: /initiate payments/i });
    button.focus();

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockCreatePaymentBatch).toHaveBeenCalledTimes(1);
    });
  });
});

// ===========================================================================
// Edge Example 4 — Agency change re-evaluates button state (AC-2, AC-3)
// ===========================================================================

describe('Edge Example 4: Agency change re-evaluates button state', () => {
  // AC-2, AC-3
  it('button changes from enabled to disabled when user switches to an agency with no READY payments', async () => {
    // Cape Homes has a READY payment; Metro Realty has only PARKED
    const mixedList = [
      ...STORY3_CAPE_HOMES_MIXED,
      ...STORY3_METRO_REALTY_ALL_MANPAY,
    ];
    mockGetPayments.mockResolvedValue(mixedList);

    render(<PaymentManagementPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /initiate payments/i }),
      ).toBeInTheDocument();
    });

    // Select Cape Homes — button becomes enabled
    await selectAgency(AGENCY_CAPE_HOMES);
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /initiate payments/i });
      expect(button).not.toBeDisabled();
    });

    // Switch to Metro Realty — button must become disabled
    await selectAgency(AGENCY_METRO_REALTY);
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /initiate payments/i });
      const isDisabled =
        button.hasAttribute('disabled') ||
        button.getAttribute('aria-disabled') === 'true';
      expect(isDisabled).toBe(true);
    });

    // No API call was triggered just by changing the agency filter
    expect(mockCreatePaymentBatch).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Accessibility — axe scan (AC-18, AC-19)
// ===========================================================================

describe('Accessibility', () => {
  // AC-18, AC-19
  it('has no axe violations when the Initiate Payments button is rendered (disabled state)', async () => {
    mockGetPayments.mockResolvedValue(STORY3_ALL_AGENCIES_LIST);
    const { container } = render(<PaymentManagementPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /initiate payments/i }),
      ).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
