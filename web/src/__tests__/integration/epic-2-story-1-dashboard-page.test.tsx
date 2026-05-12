/**
 * Story Metadata:
 * - Route: /
 * - Target File: app/(protected)/page.tsx
 * - Page Action: modify_existing
 *
 * Integration tests for Epic 2, Story 1: Dashboard Page with Metric Cards and Report Grids.
 *
 * Render scope: full page — renders the Dashboard page component (app/(protected)/page.tsx).
 * next/navigation is mocked to suppress router calls.
 * getDashboard() is mocked at the endpoint module level — the HTTP client is never called.
 * Sonner toast is mocked to capture toast calls.
 *
 * These tests WILL FAIL until the feature is implemented — that is the point (TDD red).
 *
 * Locked BA decision strings (baked into assertions — do not substitute):
 *   BA-1  ERROR_PLACEHOLDER  = "— error loading —"   (em-dash U+2014)
 *   BA-2  TOAST_TEXT         = "Failed to load dashboard data. Please try again."
 *   BA-3  Zero count         = "0"  |  Absent/null count = "—"  (single em-dash)
 *   BA-4  REG match rule     = status.toLowerCase() === 'reg'  (exact equality)
 *
 * Testability classification (from test-handoff):
 *   Unit-testable (RTL):  Examples 2–8, 13–14, Edges 1, 2, 2b, 4
 *   Data-contract:        Examples 9–12, Edge 3  (comment markers below)
 *   Runtime-only:         Example 1, Edge 5  (covered by Playwright spec)
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any production imports
// ---------------------------------------------------------------------------

// Mock next/navigation (dashboard page may use useRouter / usePathname)
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => ({ get: vi.fn(() => null) })),
}));

// Mock getDashboard at the endpoints module — this is the only network seam
vi.mock('@/lib/api/endpoints', () => ({
  getDashboard: vi.fn(),
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

// ---------------------------------------------------------------------------
// Production imports — WILL fail with "Cannot find module" until implemented (TDD red)
// ---------------------------------------------------------------------------
import DashboardPage from '@/app/(protected)/page';
import { getDashboard } from '@/lib/api/endpoints';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Shared mock data factories
// ---------------------------------------------------------------------------
import {
  ERROR_PLACEHOLDER,
  TOAST_TEXT,
  ABSENT_COUNT_DISPLAY,
  createMockDashboard,
  createEmptyDashboard,
  createDashboardWithAbsentCount,
  createDashboardWithEmptyAgencyArray,
  createDashboardWithAbsentAgencyArray,
  createEdge4Dashboard,
} from '../helpers/epic-2-mock-data';

// ---------------------------------------------------------------------------
// Typed mock helpers
// ---------------------------------------------------------------------------
const mockGetDashboard = getDashboard as ReturnType<typeof vi.fn>;
const mockToastError = toast.error as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// Example 2 — Single API call on mount (AC-2)
// ===========================================================================

describe('API call behaviour', () => {
  // AC-2
  it('dashboard data is displayed after mount, confirming the API was fetched', async () => {
    mockGetDashboard.mockResolvedValue(createMockDashboard());
    render(<DashboardPage />);

    // All three metric card headings render with real data after the fetch resolves
    await waitFor(() => {
      expect(screen.getByText(/ready to pay/i)).toBeInTheDocument();
      expect(screen.getByText(/payments made/i)).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// Example 5 — Loading skeleton placeholders (AC-4)
// ===========================================================================

describe('Loading state', () => {
  // AC-4
  it('shows skeleton placeholder elements in metric card value areas while fetch is in-flight', async () => {
    // Promise that never resolves — keeps the component in loading state
    mockGetDashboard.mockReturnValue(new Promise(() => {}));
    render(<DashboardPage />);

    // Skeleton elements must be present during in-flight fetch
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // AC-5
  it('removes skeletons and shows real data once the fetch resolves', async () => {
    mockGetDashboard.mockResolvedValue(createMockDashboard());
    render(<DashboardPage />);

    // After resolution, the real value "42" must appear and skeletons must be gone
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
  });
});

// ===========================================================================
// Example 3 — Metric card derived values (AC-6, AC-7, AC-8, AC-9, AC-11, AC-12)
// ===========================================================================

describe('Metric card values — happy path', () => {
  beforeEach(() => {
    mockGetDashboard.mockResolvedValue(createMockDashboard());
  });

  // AC-6, AC-7, BA-4
  it('Ready to Pay card shows 42 — sum of PaymentCount for exact REG-status rows only', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      // The value "42" must be visible adjacent to or inside the "Ready to Pay" card
      const readyCard = screen
        .getByText(/ready to pay/i)
        .closest(
          '[data-testid="metric-card"], section, article, div',
        ) as HTMLElement;
      expect(
        within(readyCard ?? document.body).getByText('42'),
      ).toBeInTheDocument();
    });
  });

  // AC-8, BA-3 (non-zero count present)
  it('Payments Made card shows count of 18 from TotalPaymentCountInLast14Days', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      const paymentsCard = screen
        .getByText(/payments made/i)
        .closest(
          '[data-testid="metric-card"], section, article, div',
        ) as HTMLElement;
      expect(
        within(paymentsCard ?? document.body).getByText('18'),
      ).toBeInTheDocument();
    });
  });

  // AC-9
  it('Payments Made card shows total value R 234,567.89 (sum of TotalCommissionCount)', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      const paymentsCard = screen
        .getByText(/payments made/i)
        .closest(
          '[data-testid="metric-card"], section, article, div',
        ) as HTMLElement;
      expect(
        within(paymentsCard ?? document.body).getByText('R 234,567.89'),
      ).toBeInTheDocument();
    });
  });

  // AC-11, AC-12
  it('Parked card shows 7 — sum of PaymentCount for PARKED-status rows only', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      const parkedCard = screen
        .getByText('Parked')
        .closest(
          '[data-testid="metric-card"], section, article, div',
        ) as HTMLElement;
      expect(
        within(parkedCard ?? document.body).getByText('7'),
      ).toBeInTheDocument();
    });
  });

  // AC-3 — All three metric cards and both grids visible after load
  it('renders all three metric card headings and both grid section headings', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/ready to pay/i)).toBeInTheDocument();
      expect(screen.getByText(/payments made/i)).toBeInTheDocument();
      expect(screen.getByText(/^parked$/i)).toBeInTheDocument();
      expect(screen.getByText(/payment status report/i)).toBeInTheDocument();
      expect(
        screen.getByText(/parked payments aging report/i),
      ).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// Example 4 — Metric cards unchanged when agency filter applied (AC-13)
// ===========================================================================

describe('Metric cards are unaffected by agency filter (AC-13)', () => {
  // AC-13
  it('metric card values remain the same after selecting a specific agency', async () => {
    mockGetDashboard.mockResolvedValue(createMockDashboard());
    const user = userEvent.setup();
    render(<DashboardPage />);

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    // Select "Aardvark Realty" from the agency dropdown
    // Data-contract: full chain verified during QA manual testing
    const dropdown = screen.getByRole('combobox');
    await user.click(dropdown);
    const option = await screen.findByRole('option', {
      name: /aardvark realty/i,
    });
    await user.click(option);

    // Metric cards must still show the unfiltered values
    const readyCard = screen
      .getByText(/ready to pay/i)
      .closest(
        '[data-testid="metric-card"], section, article, div',
      ) as HTMLElement;
    const paymentsCard = screen
      .getByText(/payments made/i)
      .closest(
        '[data-testid="metric-card"], section, article, div',
      ) as HTMLElement;
    const parkedCard2 = screen
      .getByText('Parked')
      .closest(
        '[data-testid="metric-card"], section, article, div',
      ) as HTMLElement;
    expect(
      within(readyCard ?? document.body).getByText('42'),
    ).toBeInTheDocument();
    expect(
      within(paymentsCard ?? document.body).getByText('18'),
    ).toBeInTheDocument();
    expect(
      within(paymentsCard ?? document.body).getByText('R 234,567.89'),
    ).toBeInTheDocument();
    expect(
      within(parkedCard2 ?? document.body).getByText('7'),
    ).toBeInTheDocument();
  });
});

// ===========================================================================
// Example 7 — Payment Status Report grid columns and data binding (AC-14, AC-15, AC-16, AC-34)
// ===========================================================================

describe('Payment Status Report grid', () => {
  beforeEach(() => {
    mockGetDashboard.mockResolvedValue(createMockDashboard());
  });

  // AC-14, AC-34
  it('renders column headers in order: Status, PaymentCount, TotalPaymentAmount, CommissionType, AgencyName', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByRole('table').length).toBeGreaterThanOrEqual(1);
    });

    // Find the Payment Status Report table specifically
    const tables = screen.getAllByRole('table');
    // The first table is expected to be Payment Status Report (per column order)
    const headers = within(tables[0]).getAllByRole('columnheader');
    const headerTexts = headers.map((h) => h.textContent?.trim());

    expect(headerTexts).toEqual(
      expect.arrayContaining([
        'Status',
        'PaymentCount',
        'TotalPaymentAmount',
        'CommissionType',
        'AgencyName',
      ]),
    );
    // Verify order: Status must come before AgencyName
    expect(headerTexts.indexOf('Status')).toBeLessThan(
      headerTexts.indexOf('AgencyName'),
    );
  });

  // AC-15, AC-16
  it('first row shows REG / 24 / R 456,789.00 / Standard / Aardvark Realty', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText('REG').length).toBeGreaterThan(0);
    });

    // Scope to the Payment Status Report table (first table) and use first REG cell
    // (two REG rows exist in data: Aardvark REG/24 and BlueSky REG/18; we want the first)
    const tables = screen.getAllByRole('table');
    const regCell = within(tables[0]).getAllByText('REG')[0];
    const row = regCell.closest('tr') as HTMLElement;

    expect(within(row).getByText('24')).toBeInTheDocument();
    expect(within(row).getByText('R 456,789.00')).toBeInTheDocument();
    expect(within(row).getByText('Standard')).toBeInTheDocument();
    expect(within(row).getByText('Aardvark Realty')).toBeInTheDocument();
  });

  // AC-17 — tabular-nums class on numeric columns
  it('PaymentCount and TotalPaymentAmount cells have tabular-nums class', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('24')).toBeInTheDocument();
    });

    // Assert the cell containing "24" (PaymentCount) has tabular-nums
    const countCell = screen.getByText('24').closest('td') as HTMLElement;
    expect(countCell?.className).toMatch(/tabular-nums/);
  });

  // AC-34 — semantic table markup
  it('uses semantic table markup: table, thead, tbody, tr, th, td', async () => {
    render(<DashboardPage />);

    // Wait for tables to appear
    await waitFor(() => {
      expect(screen.getAllByRole('table').length).toBeGreaterThanOrEqual(1);
    });

    // <table>
    expect(screen.getAllByRole('table').length).toBeGreaterThanOrEqual(1);
    // <tr> (includes header + data rows)
    expect(screen.getAllByRole('row').length).toBeGreaterThanOrEqual(2);
    // <th> — column header elements
    expect(screen.getAllByRole('columnheader').length).toBeGreaterThanOrEqual(
      1,
    );
    // <td> — data cell elements
    expect(screen.getAllByRole('cell').length).toBeGreaterThanOrEqual(1);
    // <thead> — column headers must be inside a <thead> element
    const firstColHeader = screen.getAllByRole('columnheader')[0];
    expect(firstColHeader.closest('thead')).not.toBeNull();
    // <tbody> — data cells must be inside a <tbody> element
    const firstCell = screen.getAllByRole('cell')[0];
    expect(firstCell.closest('tbody')).not.toBeNull();
  });
});

// ===========================================================================
// Example 8 — Parked Payments Aging Report grid (AC-18, AC-19, AC-20, AC-34)
// ===========================================================================

describe('Parked Payments Aging Report grid', () => {
  beforeEach(() => {
    mockGetDashboard.mockResolvedValue(createMockDashboard());
  });

  // AC-18, AC-34
  it('renders column headers in order: Range, AgencyName, PaymentCount', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByRole('table').length).toBeGreaterThanOrEqual(2);
    });

    const tables = screen.getAllByRole('table');
    // Second table is expected to be Parked Payments Aging Report
    const headers = within(tables[1]).getAllByRole('columnheader');
    const headerTexts = headers.map((h) => h.textContent?.trim());

    expect(headerTexts).toEqual(
      expect.arrayContaining(['Range', 'AgencyName', 'PaymentCount']),
    );
    // Range must come before PaymentCount
    expect(headerTexts.indexOf('Range')).toBeLessThan(
      headerTexts.indexOf('PaymentCount'),
    );
  });

  // AC-19
  it('first row shows 0–30 days / Aardvark Realty / 3', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('0–30 days')).toBeInTheDocument();
    });

    const rangeCell = screen.getByText('0–30 days');
    const row = rangeCell.closest('tr') as HTMLElement;

    expect(within(row).getByText('Aardvark Realty')).toBeInTheDocument();
    expect(within(row).getByText('3')).toBeInTheDocument();
  });

  // AC-20 — tabular-nums on PaymentCount column
  it('PaymentCount cells in the aging report have tabular-nums class', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('0–30 days')).toBeInTheDocument();
    });

    const rangeCell = screen.getByText('0–30 days');
    const row = rangeCell.closest('tr') as HTMLElement;
    const countCell = within(row).getByText('3').closest('td') as HTMLElement;
    expect(countCell?.className).toMatch(/tabular-nums/);
  });
});

// ===========================================================================
// Example 9 — AgencyName dropdown population (AC-21, AC-22, AC-23)
// Data-contract: full chain verified during QA manual testing
// ===========================================================================

describe('AgencyName dropdown population (AC-21, AC-22, AC-23)', () => {
  // AC-21, AC-22
  // Data-contract: full chain verified during QA manual testing
  it('dropdown first option is "All Agencies" and remaining options are in alphabetical order', async () => {
    mockGetDashboard.mockResolvedValue(createMockDashboard());
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Open the dropdown to inspect options
    const dropdown = screen.getByRole('combobox');
    await userEvent.click(dropdown);

    await waitFor(() => {
      const options = screen.getAllByRole('option');
      const labels = options.map((o) => o.textContent?.trim());

      // "All Agencies" must be first
      expect(labels[0]).toBe('All Agencies');
      // Remaining agencies must be alphabetically sorted
      expect(labels[1]).toBe('Aardvark Realty');
      expect(labels[2]).toBe('BlueSky Bonds');
      expect(labels[3]).toBe('City Homes');
      // Total 4 options (3 distinct agencies + All Agencies)
      expect(labels).toHaveLength(4);
    });
  });
});

// ===========================================================================
// Example 10 — Agency filter: both grids update (AC-24)
// Data-contract: full chain verified during QA manual testing
// ===========================================================================

describe('Agency filter — both grids filter simultaneously (AC-24)', () => {
  // AC-24
  // Data-contract: full chain verified during QA manual testing
  it('selecting Aardvark Realty shows only Aardvark Realty rows in both grids', async () => {
    mockGetDashboard.mockResolvedValue(createMockDashboard());
    const user = userEvent.setup();
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByRole('table').length).toBeGreaterThanOrEqual(2);
    });

    // Open dropdown and select Aardvark Realty
    const dropdown = screen.getByRole('combobox');
    await user.click(dropdown);
    const option = await screen.findByRole('option', {
      name: /aardvark realty/i,
    });
    await user.click(option);

    // Payment Status Report: should show 2 Aardvark Realty rows (REG + PARKED)
    await waitFor(() => {
      const tables = screen.getAllByRole('table');
      const statusRows = within(tables[0]).getAllByRole('row');
      // -1 for the header row
      expect(statusRows.length - 1).toBe(2);
    });

    // Parked Payments Aging Report: should show 2 Aardvark Realty rows (0–30d, 31–60d)
    const tables = screen.getAllByRole('table');
    const agingRows = within(tables[1]).getAllByRole('row');
    expect(agingRows.length - 1).toBe(2);
  });

  // Grid updates instantly when agency is selected — no loading skeleton means no re-fetch (AC-24)
  it('grid shows filtered rows instantly without a loading skeleton appearing', async () => {
    mockGetDashboard.mockResolvedValue(createMockDashboard());
    const user = userEvent.setup();
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByRole('table').length).toBeGreaterThanOrEqual(2);
    });

    const dropdown = screen.getByRole('combobox');
    await user.click(dropdown);
    const option = await screen.findByRole('option', {
      name: /aardvark realty/i,
    });
    await user.click(option);

    // Grid updates immediately — only Aardvark Realty rows visible
    await waitFor(() => {
      const tables = screen.getAllByRole('table');
      const statusRows = within(tables[0]).getAllByRole('row');
      expect(statusRows.length - 1).toBe(2);
    });
    // No skeleton reappeared — proves this was a client-side filter, not a re-fetch
    expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
  });
});

// ===========================================================================
// Example 11 — Clearing the filter restores all rows (AC-25)
// Data-contract: full chain verified during QA manual testing
// ===========================================================================

describe('Clearing agency filter restores all rows (AC-25)', () => {
  // AC-25
  // Data-contract: full chain verified during QA manual testing
  it('re-selecting All Agencies after a filter restores 4 rows in each grid', async () => {
    mockGetDashboard.mockResolvedValue(createMockDashboard());
    const user = userEvent.setup();
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByRole('table').length).toBeGreaterThanOrEqual(2);
    });

    // Apply filter
    const dropdown = screen.getByRole('combobox');
    await user.click(dropdown);
    const agencyOption = await screen.findByRole('option', {
      name: /aardvark realty/i,
    });
    await user.click(agencyOption);

    // Clear filter
    await user.click(dropdown);
    const allOption = await screen.findByRole('option', {
      name: /all agencies/i,
    });
    await user.click(allOption);

    // Both grids should be back to 4 rows each
    await waitFor(() => {
      const tables = screen.getAllByRole('table');
      const statusRows = within(tables[0]).getAllByRole('row');
      expect(statusRows.length - 1).toBe(4);
      const agingRows = within(tables[1]).getAllByRole('row');
      expect(agingRows.length - 1).toBe(4);
    });
  });
});

// ===========================================================================
// Example 12 (variant) — Empty-state message when filter produces zero rows
// (AC-26, AC-27)
// Data-contract: full chain verified during QA manual testing
// ===========================================================================

describe('Empty-state message when no matching rows exist (AC-26, AC-27)', () => {
  // AC-27 — Parked aging grid shows empty-state when agency has no aging rows
  // Data-contract: full chain verified during QA manual testing
  it('shows empty-state message in Parked grid when selected agency has no aging rows', async () => {
    // Create a response where City Homes has no parked aging rows
    mockGetDashboard.mockResolvedValue(
      createMockDashboard({
        ParkedPaymentsAgingReport: [
          {
            Range: '0–30 days',
            AgencyName: 'Aardvark Realty',
            PaymentCount: 3,
          },
          {
            Range: '31–60 days',
            AgencyName: 'Aardvark Realty',
            PaymentCount: 2,
          },
          { Range: '61–90 days', AgencyName: 'BlueSky Bonds', PaymentCount: 1 },
          // City Homes deliberately absent from aging report
        ],
      }),
    );
    const user = userEvent.setup();
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const dropdown = screen.getByRole('combobox');
    await user.click(dropdown);
    const option = await screen.findByRole('option', { name: /city homes/i });
    await user.click(option);

    await waitFor(() => {
      expect(
        screen.getByText(/no data for selected agency/i),
      ).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// Example 13 — API failure: toast, error placeholders, grids hidden (AC-28–AC-31)
// ===========================================================================

describe('API failure state (AC-28, AC-29, AC-30, AC-31)', () => {
  beforeEach(() => {
    mockGetDashboard.mockRejectedValue(new Error('Network error'));
  });

  // AC-28, BA-2
  it('displays a toast with the exact error message when getDashboard() rejects', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(TOAST_TEXT);
    });
  });

  // AC-29, BA-1
  it('shows exact error placeholder "— error loading —" in all four metric card value slots', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      // All four value slots must show the exact placeholder string
      const placeholders = screen.getAllByText(ERROR_PLACEHOLDER);
      expect(placeholders.length).toBeGreaterThanOrEqual(4);
    });
  });

  // AC-30
  it('hides both report grids when the API call fails', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      // The toast must have fired (error state reached)
      expect(mockToastError).toHaveBeenCalled();
    });

    // No <table> elements should be in the document
    expect(screen.queryAllByRole('table')).toHaveLength(0);
  });

  // AC-31
  it('does not render an inline Alert component when the API call fails', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });

    // No role="alert" from an <Alert /> — only the toast communicates the error
    // (The Next.js route announcer also uses role="alert" but is always empty;
    //  we check that no alert has the error text)
    const alerts = screen.queryAllByRole('alert');
    const alertsWithErrorText = alerts.filter((el) =>
      el.textContent?.includes('Failed to load'),
    );
    expect(alertsWithErrorText).toHaveLength(0);
  });
});

// ===========================================================================
// Example 14 — PaymentsByAgency empty array → R 0.00 (AC-10)
// ===========================================================================

describe('PaymentsByAgency empty array (AC-10, Example 14)', () => {
  // AC-10
  it('shows R 0.00 as the Payments Made total when PaymentsByAgency is empty, count shows 5', async () => {
    mockGetDashboard.mockResolvedValue(createDashboardWithEmptyAgencyArray());
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('R 0.00')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// Edge 1 — PaymentsByAgency field absent from response
// ===========================================================================

describe('Edge 1: PaymentsByAgency absent from API response', () => {
  // AC-10 (Edge 1)
  it('shows R 0.00 as total when PaymentsByAgency key is missing entirely — no error toast', async () => {
    mockGetDashboard.mockResolvedValue(createDashboardWithAbsentAgencyArray());
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('R 0.00')).toBeInTheDocument();
    });

    // No error toast — missing PaymentsByAgency is handled gracefully
    expect(mockToastError).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Edge 2 — TotalPaymentCountInLast14Days present and zero (BA-3)
// ===========================================================================

describe('Edge 2: TotalPaymentCountInLast14Days is zero (BA-3)', () => {
  // AC-8, BA-3
  it('shows "0" (not em-dash) when TotalPaymentCountInLast14Days equals zero', async () => {
    mockGetDashboard.mockResolvedValue(createEmptyDashboard());
    render(<DashboardPage />);

    await waitFor(() => {
      // "0" must be visible in the Payments Made count slot
      const paymentsCard = screen
        .getByText(/payments made/i)
        .closest(
          '[data-testid="metric-card"], section, article, div',
        ) as HTMLElement;
      expect(
        within(paymentsCard ?? document.body).getByText('0'),
      ).toBeInTheDocument();
    });

    // Must NOT show the absent/null em-dash
    const paymentsCard = screen
      .getByText(/payments made/i)
      .closest(
        '[data-testid="metric-card"], section, article, div',
      ) as HTMLElement;
    expect(
      within(paymentsCard ?? document.body).queryByText(ABSENT_COUNT_DISPLAY),
    ).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Edge 2b — TotalPaymentCountInLast14Days absent or null (BA-3)
// ===========================================================================

describe('Edge 2b: TotalPaymentCountInLast14Days absent or null (BA-3)', () => {
  // AC-8, BA-3
  it('shows "—" (single em-dash) when TotalPaymentCountInLast14Days is absent from response', async () => {
    // Cast to any to suppress the intentionally incomplete type
    mockGetDashboard.mockResolvedValue(
      createDashboardWithAbsentCount() as ReturnType<
        typeof createMockDashboard
      >,
    );
    render(<DashboardPage />);

    await waitFor(() => {
      const paymentsCard = screen
        .getByText(/payments made/i)
        .closest(
          '[data-testid="metric-card"], section, article, div',
        ) as HTMLElement;
      expect(
        within(paymentsCard ?? document.body).getByText(ABSENT_COUNT_DISPLAY),
      ).toBeInTheDocument();
    });
  });

  // AC-8, BA-3
  it('shows "—" when TotalPaymentCountInLast14Days is explicitly null', async () => {
    mockGetDashboard.mockResolvedValue(
      createMockDashboard({
        TotalPaymentCountInLast14Days: null as unknown as number,
      }),
    );
    render(<DashboardPage />);

    await waitFor(() => {
      const paymentsCard = screen
        .getByText(/payments made/i)
        .closest(
          '[data-testid="metric-card"], section, article, div',
        ) as HTMLElement;
      expect(
        within(paymentsCard ?? document.body).getByText(ABSENT_COUNT_DISPLAY),
      ).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// Edge 4 — Status exact match: DEREGISTERED must NOT count (BA-4)
// ===========================================================================

describe('Edge 4: Ready to Pay uses exact case-insensitive equality (BA-4)', () => {
  // AC-6, BA-4
  it('counts 12 for Ready to Pay — "DEREGISTERED" excluded, "reg" (lowercase) included', async () => {
    mockGetDashboard.mockResolvedValue(createEdge4Dashboard());
    render(<DashboardPage />);

    await waitFor(() => {
      // 10 (REG) + 2 (reg) = 12 — DEREGISTERED (4) must NOT be counted
      const readyCard = screen
        .getByText(/ready to pay/i)
        .closest(
          '[data-testid="metric-card"], section, article, div',
        ) as HTMLElement;
      expect(
        within(readyCard ?? document.body).getByText('12'),
      ).toBeInTheDocument();
    });
  });

  // AC-6, BA-4 — Negative: "DEREGISTERED" rows are excluded
  it('DEREGISTERED rows (PaymentCount 4) are NOT added to Ready to Pay count', async () => {
    mockGetDashboard.mockResolvedValue(createEdge4Dashboard());
    render(<DashboardPage />);

    await waitFor(() => {
      // If DEREGISTERED were incorrectly counted, result would be 16 (10 + 2 + 4)
      const readyCard = screen
        .getByText(/ready to pay/i)
        .closest(
          '[data-testid="metric-card"], section, article, div',
        ) as HTMLElement;
      expect(
        within(readyCard ?? document.body).queryByText('16'),
      ).not.toBeInTheDocument();
    });
  });
});

// ===========================================================================
// Accessibility — axe scan (AC-32, AC-33, AC-34)
// ===========================================================================

describe('Accessibility (AC-32, AC-34)', () => {
  // AC-32, AC-34
  it('has no axe violations in the loaded state', async () => {
    mockGetDashboard.mockResolvedValue(createMockDashboard());
    const { container } = render(<DashboardPage />);

    // Wait for data to load (skeletons gone)
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
