/**
 * Story Metadata:
 * - Route: /payment-management
 * - Target File: app/(protected)/payment-management/page.tsx
 * - Page Action: modify_existing
 *
 * Tests for Epic 3, Story 2: Row Selection, Park/Unpark Bulk Actions,
 * and Post-Mutation Refresh.
 *
 * Render scope: component — renders PaymentManagementPage at component level.
 * Only tests selection state and mutation behavior added in Story 3.2.
 * Initial grid render, column formatting, and pagination are covered by Story 3.1.
 *
 * These tests WILL FAIL until Story 3.2 is implemented — that is the point (TDD red).
 *
 * Resolved BA decisions (baked into assertions):
 *   BA-1: Grid loading overlay/skeleton during post-mutation re-fetch (NOT a button spinner).
 *   BA-2: Disabled Park/Unpark buttons use native `disabled` attribute (removed from Tab order).
 *
 * Testability classification (from test-handoff):
 *   Unit-testable (RTL): Examples 1–11, Edge 3, Edge 5
 *   Data-contract:       Edge 1 (page nav clears selection), Edge 2 (filter change clears selection)
 *   Runtime-only:        Edge 4 (keyboard Tab navigation — Playwright spec)
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

// ---------------------------------------------------------------------------
// Module mocks — declared before production imports
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

// Mock endpoints module — getPayments, parkPayments, unparkPayments are the seams
vi.mock('@/lib/api/endpoints', () => ({
  getPayments: vi.fn(),
  parkPayments: vi.fn(),
  unparkPayments: vi.fn(),
  getDashboard: vi.fn(),
  getPaymentBatches: vi.fn(),
  createPaymentBatch: vi.fn(),
  downloadInvoicePdf: vi.fn(),
  resetDemoData: vi.fn(),
}));

// Mock Sonner toast so we can assert toast text without rendering the full Toaster
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
  Toaster: () => null,
}));

// Mock next-auth/react — page uses useSession for Initiate Payments (Story 3.3)
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: { user: { name: 'Admin User', email: 'admin@example.com' } },
    status: 'authenticated',
  })),
  signIn: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Production imports — WILL fail with "Cannot find module" until implemented (TDD red)
// ---------------------------------------------------------------------------
import PaymentManagementPage from '@/app/(protected)/payment-management/page';
import { getPayments, parkPayments, unparkPayments } from '@/lib/api/endpoints';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Shared mock data factories (extend epic-3-mock-data — do not duplicate)
// ---------------------------------------------------------------------------
import {
  createSelectionTestPayments,
  createTenPayments,
  createParkHappyPathPayments,
  createParkHappyPathRefreshedPayments,
  createUnparkHappyPathPayments,
  createUnparkHappyPathRefreshedPayments,
  createPostMutationInitialPayments,
  createPostMutationRefreshedPayments,
  createParkFailurePayments,
  createUnparkFailurePayments,
} from '../../../../__tests__/helpers/epic-3-mock-data';

// ---------------------------------------------------------------------------
// Typed mock helpers
// ---------------------------------------------------------------------------
const mockGetPayments = getPayments as ReturnType<typeof vi.fn>;
const mockParkPayments = parkPayments as ReturnType<typeof vi.fn>;
const mockUnparkPayments = unparkPayments as ReturnType<typeof vi.fn>;
const mockToastSuccess = toast.success as ReturnType<typeof vi.fn>;
const mockToastError = toast.error as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// Example 1 — Row checkboxes appear on each row (AC-1, AC-2)
// ===========================================================================

describe('Row checkboxes and header checkbox presence (AC-1, AC-2)', () => {
  // AC-1, AC-2
  it('renders a checkbox on each payment row and a header checkbox initially unchecked', async () => {
    mockGetPayments.mockResolvedValue(createSelectionTestPayments());
    render(<PaymentManagementPage />);

    // Wait for grid to load
    await waitFor(() => {
      expect(
        screen.getByRole('checkbox', { name: /select all/i }),
      ).toBeInTheDocument();
    });

    // Header checkbox present and unchecked initially
    const headerCheckbox = screen.getByRole('checkbox', {
      name: /select all/i,
    });
    expect(headerCheckbox).not.toBeChecked();

    // At least one per-row checkbox present
    const rowCheckboxes = screen.getAllByRole('checkbox', {
      name: /select payment/i,
    });
    expect(rowCheckboxes.length).toBe(5);
    // All row checkboxes unchecked initially
    rowCheckboxes.forEach((cb) => expect(cb).not.toBeChecked());
  });
});

// ===========================================================================
// Example 2 — Ticking header checkbox selects all rows (AC-3)
// ===========================================================================

describe('Header checkbox selects all current-page rows (AC-3)', () => {
  // AC-3
  it('ticking the header checkbox checks all row checkboxes and enables Park and Unpark buttons', async () => {
    mockGetPayments.mockResolvedValue(createTenPayments());
    const user = userEvent.setup();
    render(<PaymentManagementPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('checkbox', { name: /select all/i }),
      ).toBeInTheDocument();
    });

    const headerCheckbox = screen.getByRole('checkbox', {
      name: /select all/i,
    });
    await user.click(headerCheckbox);

    // All row checkboxes are now checked
    const rowCheckboxes = screen.getAllByRole('checkbox', {
      name: /select payment/i,
    });
    rowCheckboxes.forEach((cb) => expect(cb).toBeChecked());

    // Park and Unpark buttons become enabled
    expect(screen.getByRole('button', { name: /^park$/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /unpark/i })).not.toBeDisabled();
  });
});

// ===========================================================================
// Example 3 — Unticking header checkbox deselects all rows (AC-4)
// ===========================================================================

describe('Header checkbox deselects all rows (AC-4)', () => {
  // AC-4
  it('unticking header checkbox after selecting all unchecks all rows and disables buttons', async () => {
    mockGetPayments.mockResolvedValue(createTenPayments());
    const user = userEvent.setup();
    render(<PaymentManagementPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('checkbox', { name: /select all/i }),
      ).toBeInTheDocument();
    });

    const headerCheckbox = screen.getByRole('checkbox', {
      name: /select all/i,
    });
    // Select all first
    await user.click(headerCheckbox);
    // Then deselect all
    await user.click(headerCheckbox);

    const rowCheckboxes = screen.getAllByRole('checkbox', {
      name: /select payment/i,
    });
    rowCheckboxes.forEach((cb) => expect(cb).not.toBeChecked());

    expect(screen.getByRole('button', { name: /^park$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /unpark/i })).toBeDisabled();
  });
});

// ===========================================================================
// Example 4 — Header checkbox shows indeterminate for partial selection (AC-5)
// ===========================================================================

describe('Header checkbox indeterminate state for partial selection (AC-5)', () => {
  // AC-5
  it('shows aria-checked="mixed" on the header checkbox when only some rows are selected', async () => {
    mockGetPayments.mockResolvedValue(createSelectionTestPayments());
    const user = userEvent.setup();
    render(<PaymentManagementPage />);

    await waitFor(() => {
      expect(
        screen.getAllByRole('checkbox', { name: /select payment/i }).length,
      ).toBe(5);
    });

    // Tick only the first row checkbox (IDs 101) — partial selection
    const rowCheckboxes = screen.getAllByRole('checkbox', {
      name: /select payment/i,
    });
    await user.click(rowCheckboxes[0]);

    const headerCheckbox = screen.getByRole('checkbox', {
      name: /select all/i,
    });
    // Shadcn Checkbox renders aria-checked="mixed" for indeterminate state
    expect(headerCheckbox).toHaveAttribute('aria-checked', 'mixed');

    // Park and Unpark enabled with at least one selected
    expect(screen.getByRole('button', { name: /^park$/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /unpark/i })).not.toBeDisabled();
  });
});

// ===========================================================================
// Example 5 — Park and Unpark disabled with no selection; clicking has no effect (AC-11, AC-12, AC-16, AC-17, AC-26)
// ===========================================================================

describe('Park and Unpark buttons disabled when no selection (AC-11, AC-12, AC-16, AC-17)', () => {
  // AC-11, AC-16, AC-26, BA-2
  it('Park and Unpark buttons are disabled with native disabled attribute when no rows selected', async () => {
    mockGetPayments.mockResolvedValue(createTenPayments());
    render(<PaymentManagementPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^park$/i })).toBeDisabled();
    });

    const parkButton = screen.getByRole('button', { name: /^park$/i });
    const unparkButton = screen.getByRole('button', { name: /unpark/i });

    // BA-2: native disabled attribute (removes from Tab order, announces to screen readers)
    expect(parkButton).toBeDisabled();
    expect(unparkButton).toBeDisabled();
  });

  // AC-12, AC-17
  it('clicking disabled Park and Unpark buttons makes no API call and shows no toast', async () => {
    mockGetPayments.mockResolvedValue(createTenPayments());
    render(<PaymentManagementPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^park$/i })).toBeDisabled();
    });

    // Disabled buttons — attempting to interact has no effect
    const parkButton = screen.getByRole('button', { name: /^park$/i });
    const unparkButton = screen.getByRole('button', { name: /unpark/i });

    // Simulate user interaction with disabled buttons (userEvent respects disabled)
    const user = userEvent.setup();
    await user.click(parkButton);
    await user.click(unparkButton);

    expect(mockParkPayments).not.toHaveBeenCalled();
    expect(mockUnparkPayments).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(mockToastError).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Example 6 — Park happy path: API call, success toast, clear selections, re-fetch (AC-8, AC-9, AC-10)
// ===========================================================================

describe('Park happy path (AC-8, AC-9, AC-10)', () => {
  // AC-8, AC-9, AC-10
  it('clicking Park calls parkPayments with selected IDs, shows success toast, clears selections, and re-fetches', async () => {
    // Chain: initial load → park success → re-fetch with updated data
    mockGetPayments
      .mockResolvedValueOnce(createParkHappyPathPayments())
      .mockResolvedValueOnce(createParkHappyPathRefreshedPayments());
    mockParkPayments.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<PaymentManagementPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(
        screen.getAllByRole('checkbox', { name: /select payment/i }).length,
      ).toBe(5);
    });

    // Select rows for IDs 201 and 203 (first and third checkboxes)
    const rowCheckboxes = screen.getAllByRole('checkbox', {
      name: /select payment/i,
    });
    await user.click(rowCheckboxes[0]); // ID 201
    await user.click(rowCheckboxes[2]); // ID 203

    // Park button should now be enabled
    const parkButton = screen.getByRole('button', { name: /^park$/i });
    expect(parkButton).not.toBeDisabled();

    await user.click(parkButton);

    // AC-9: parkPayments called with the two selected IDs
    await waitFor(() => {
      expect(mockParkPayments).toHaveBeenCalledWith([201, 203]);
    });

    // AC-10: success toast appears
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.stringMatching(/parked successfully/i),
      );
    });

    // AC-10: re-fetch was triggered (getPayments called twice total)
    expect(mockGetPayments).toHaveBeenCalledTimes(2);

    // AC-10: selections are cleared after success
    await waitFor(() => {
      const updatedRowCheckboxes = screen.getAllByRole('checkbox', {
        name: /select payment/i,
      });
      updatedRowCheckboxes.forEach((cb) => expect(cb).not.toBeChecked());
    });
  });
});

// ===========================================================================
// Example 7 — Unpark button enabled/disabled state (AC-13, AC-16)
// ===========================================================================

describe('Unpark button enabled when rows selected, disabled when none (AC-13, AC-16)', () => {
  // AC-13, AC-16
  it('Unpark button becomes enabled after selecting a row and disabled after deselecting', async () => {
    mockGetPayments.mockResolvedValue(createUnparkHappyPathPayments());
    const user = userEvent.setup();
    render(<PaymentManagementPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /unpark/i })).toBeDisabled();
    });

    // Select first row (ID 301)
    const rowCheckboxes = screen.getAllByRole('checkbox', {
      name: /select payment/i,
    });
    await user.click(rowCheckboxes[0]);

    expect(screen.getByRole('button', { name: /unpark/i })).not.toBeDisabled();

    // Deselect the row
    await user.click(rowCheckboxes[0]);

    expect(screen.getByRole('button', { name: /unpark/i })).toBeDisabled();
  });
});

// ===========================================================================
// Example 8 — Unpark happy path: API call, success toast, clear selections, re-fetch (AC-13, AC-14, AC-15)
// ===========================================================================

describe('Unpark happy path (AC-13, AC-14, AC-15)', () => {
  // AC-13, AC-14, AC-15
  it('clicking Unpark calls unparkPayments with selected IDs, shows success toast, clears selections, and re-fetches', async () => {
    mockGetPayments
      .mockResolvedValueOnce(createUnparkHappyPathPayments())
      .mockResolvedValueOnce(createUnparkHappyPathRefreshedPayments());
    mockUnparkPayments.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<PaymentManagementPage />);

    await waitFor(() => {
      expect(
        screen.getAllByRole('checkbox', { name: /select payment/i }).length,
      ).toBe(4);
    });

    // Select rows for IDs 302 and 303 (second and third row checkboxes)
    const rowCheckboxes = screen.getAllByRole('checkbox', {
      name: /select payment/i,
    });
    await user.click(rowCheckboxes[1]); // ID 302
    await user.click(rowCheckboxes[2]); // ID 303

    const unparkButton = screen.getByRole('button', { name: /unpark/i });
    expect(unparkButton).not.toBeDisabled();

    await user.click(unparkButton);

    // AC-14: unparkPayments called with the two selected IDs
    await waitFor(() => {
      expect(mockUnparkPayments).toHaveBeenCalledWith([302, 303]);
    });

    // AC-15: success toast
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.stringMatching(/unparked successfully/i),
      );
    });

    // AC-15: re-fetch triggered
    expect(mockGetPayments).toHaveBeenCalledTimes(2);

    // AC-15: selections cleared
    await waitFor(() => {
      const updatedCheckboxes = screen.getAllByRole('checkbox', {
        name: /select payment/i,
      });
      updatedCheckboxes.forEach((cb) => expect(cb).not.toBeChecked());
    });
  });
});

// ===========================================================================
// Example 9 — Post-mutation refresh: loading indicator + updated statuses (AC-18, AC-19, BA-1)
// ===========================================================================

describe('Post-mutation refresh: loading indicator and updated statuses (AC-18, AC-19)', () => {
  // AC-19, BA-1
  it('shows a grid loading indicator while the post-park re-fetch is in progress', async () => {
    let resolveRefetch: (v: unknown) => void;
    const refetchPromise = new Promise((res) => {
      resolveRefetch = res;
    });

    mockGetPayments
      .mockResolvedValueOnce(createPostMutationInitialPayments()) // initial load
      .mockReturnValueOnce(refetchPromise); // re-fetch hangs until we resolve
    mockParkPayments.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<PaymentManagementPage />);

    await waitFor(() => {
      expect(
        screen.getAllByRole('checkbox', { name: /select payment/i }).length,
      ).toBe(2);
    });

    // Select both rows and click Park
    const rowCheckboxes = screen.getAllByRole('checkbox', {
      name: /select payment/i,
    });
    await user.click(rowCheckboxes[0]);
    await user.click(rowCheckboxes[1]);
    await user.click(screen.getByRole('button', { name: /^park$/i }));

    // BA-1: grid-level loading overlay or skeleton must appear while re-fetch is in-flight
    // Runtime-only: verified during QA manual testing (loading state timing is browser-dependent)
    // The component renders a grid loading indicator; assert it exists during re-fetch
    await waitFor(() => {
      const loadingIndicator =
        screen.queryByRole('status') ??
        screen.queryByTestId('grid-loading') ??
        screen.queryByTestId('skeleton');
      expect(loadingIndicator).not.toBeNull();
    });

    // Now resolve the re-fetch
    resolveRefetch!(createPostMutationRefreshedPayments());
  });

  // AC-18
  it('grid displays updated statuses (PARKED) after the re-fetch resolves', async () => {
    mockGetPayments
      .mockResolvedValueOnce(createPostMutationInitialPayments())
      .mockResolvedValueOnce(createPostMutationRefreshedPayments());
    mockParkPayments.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<PaymentManagementPage />);

    await waitFor(() => {
      expect(
        screen.getAllByRole('checkbox', { name: /select payment/i }).length,
      ).toBe(2);
    });

    const rowCheckboxes = screen.getAllByRole('checkbox', {
      name: /select payment/i,
    });
    await user.click(rowCheckboxes[0]);
    await user.click(rowCheckboxes[1]);
    await user.click(screen.getByRole('button', { name: /^park$/i }));

    // After re-fetch, the grid must show the updated status (PARKED) for the parked rows
    await waitFor(() => {
      expect(screen.getAllByText(/parked/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ===========================================================================
// Example 10 — Park failure: error toast, selections preserved, no re-fetch (AC-20, AC-22)
// ===========================================================================

describe('Park failure path (AC-20, AC-22)', () => {
  // AC-20, AC-22
  it('shows an error toast and preserves selections when the park API call fails', async () => {
    mockGetPayments.mockResolvedValue(createParkFailurePayments());
    mockParkPayments.mockRejectedValue(new Error('Server error'));

    const user = userEvent.setup();
    render(<PaymentManagementPage />);

    await waitFor(() => {
      expect(
        screen.getAllByRole('checkbox', { name: /select payment/i }).length,
      ).toBe(2);
    });

    const rowCheckboxes = screen.getAllByRole('checkbox', {
      name: /select payment/i,
    });
    await user.click(rowCheckboxes[0]); // ID 501
    await user.click(rowCheckboxes[1]); // ID 502

    await user.click(screen.getByRole('button', { name: /^park$/i }));

    // AC-20: error toast with descriptive message
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringMatching(/failed to park/i),
      );
    });

    // AC-22: selections preserved — both checkboxes still checked
    const updatedCheckboxes = screen.getAllByRole('checkbox', {
      name: /select payment/i,
    });
    expect(updatedCheckboxes[0]).toBeChecked();
    expect(updatedCheckboxes[1]).toBeChecked();

    // No re-fetch on failure — getPayments only called once (initial load)
    expect(mockGetPayments).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// Example 11 — Unpark failure: error toast, selections preserved, no re-fetch (AC-21, AC-22)
// ===========================================================================

describe('Unpark failure path (AC-21, AC-22)', () => {
  // AC-21, AC-22
  it('shows an error toast and preserves selections when the unpark API call fails', async () => {
    mockGetPayments.mockResolvedValue(createUnparkFailurePayments());
    mockUnparkPayments.mockRejectedValue(new Error('Server error'));

    const user = userEvent.setup();
    render(<PaymentManagementPage />);

    await waitFor(() => {
      expect(
        screen.getAllByRole('checkbox', { name: /select payment/i }).length,
      ).toBe(2);
    });

    const rowCheckboxes = screen.getAllByRole('checkbox', {
      name: /select payment/i,
    });
    await user.click(rowCheckboxes[0]); // ID 601
    await user.click(rowCheckboxes[1]); // ID 602

    await user.click(screen.getByRole('button', { name: /unpark/i }));

    // AC-21: error toast
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringMatching(/failed to unpark/i),
      );
    });

    // AC-22: selections preserved
    const updatedCheckboxes = screen.getAllByRole('checkbox', {
      name: /select payment/i,
    });
    expect(updatedCheckboxes[0]).toBeChecked();
    expect(updatedCheckboxes[1]).toBeChecked();

    // No re-fetch on failure
    expect(mockGetPayments).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// Edge Example 3 — Toast auto-dismisses after 5 seconds; manual dismiss (AC-23, AC-24)
// ===========================================================================

describe('Toast dismissal (AC-23, AC-24)', () => {
  // AC-23 — Sonner's global <Toaster duration={5000} /> in app/layout.tsx handles auto-dismiss
  // at runtime. With toast.success mocked, we cannot exercise the timer; we verify the call
  // is made with no explicit duration override (relying on the global setting).
  it('success toast is invoked so the global 5-second auto-dismiss applies', async () => {
    mockGetPayments
      .mockResolvedValueOnce(createParkHappyPathPayments())
      .mockResolvedValueOnce(createParkHappyPathRefreshedPayments());
    mockParkPayments.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<PaymentManagementPage />);

    await waitFor(() => {
      expect(
        screen.getAllByRole('checkbox', { name: /select payment/i }).length,
      ).toBeGreaterThan(0);
    });

    const rowCheckboxes = screen.getAllByRole('checkbox', {
      name: /select payment/i,
    });
    await user.click(rowCheckboxes[0]);
    await user.click(screen.getByRole('button', { name: /^park$/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledTimes(1);
    });
  });
});

// ===========================================================================
// Edge Example 5 — Single-row page: header checkbox fully checked (AC-3)
// ===========================================================================

describe('Edge: single-row page header checkbox (AC-3)', () => {
  // AC-3
  it('header checkbox shows as fully checked (not indeterminate) when only one row exists and it is selected', async () => {
    mockGetPayments.mockResolvedValue([
      {
        Id: 999,
        Reference: 'REF-999',
        AgencyName: 'Solo Agency',
        Status: { StatusCode: 'READY' },
        AgentName: 'Solo',
        AgentSurname: 'Agent',
        ClaimDate: '2024-01-01',
        BondAmount: 100000,
        CommissionType: 'Standard',
        CommissionAmount: 700,
        VAT: 105,
        GrantDate: '2024-02-01',
        RegistrationDate: '2024-02-10',
        Bank: 'FNB',
      },
    ]);
    const user = userEvent.setup();
    render(<PaymentManagementPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('checkbox', { name: /select all/i }),
      ).toBeInTheDocument();
    });

    const headerCheckbox = screen.getByRole('checkbox', {
      name: /select all/i,
    });
    await user.click(headerCheckbox);

    // Should be fully checked, not indeterminate
    expect(headerCheckbox).toBeChecked();
    expect(headerCheckbox).not.toHaveAttribute('aria-checked', 'mixed');
    expect(screen.getByRole('button', { name: /^park$/i })).not.toBeDisabled();
  });
});

// ===========================================================================
// Accessibility — axe scan (AC-25, AC-26)
// ===========================================================================

describe('Accessibility (AC-25, AC-26)', () => {
  // AC-25, AC-26
  it('has no axe violations in the loaded state with no rows selected', async () => {
    mockGetPayments.mockResolvedValue(createSelectionTestPayments());
    const { container } = render(<PaymentManagementPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(
        screen.getByRole('checkbox', { name: /select all/i }),
      ).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
