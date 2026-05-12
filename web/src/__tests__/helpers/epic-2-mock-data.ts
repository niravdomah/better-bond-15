/**
 * Shared mock data factories for Epic 2 — Dashboard.
 *
 * Import from this file in all Epic 2 test files.
 * Do NOT duplicate these factories — extend this file for new entities instead.
 *
 * Types are imported from @/types/api-generated (canonical source derived from OpenAPI spec).
 *
 * Locked BA decision strings (see story-1-dashboard-page-test-handoff.md):
 *   ERROR_PLACEHOLDER  = "— error loading —"    // em-dash U+2014
 *   TOAST_TEXT         = "Failed to load dashboard data. Please try again."
 *   ZERO_COUNT_DISPLAY = "0"                     // TotalPaymentCountInLast14Days === 0
 *   ABSENT_COUNT_DISPLAY = "—"                   // TotalPaymentCountInLast14Days absent/null
 */

import type {
  PaymentsDashboardRead,
  PaymentStatusReportItem,
  ParkedPaymentsAgingReportItem,
  PaymentsByAgencyReportItem,
} from '@/types/api-generated';

// ---------------------------------------------------------------------------
// Locked BA assertion strings
// ---------------------------------------------------------------------------

export const ERROR_PLACEHOLDER = '— error loading —' as const;
export const TOAST_TEXT =
  'Failed to load dashboard data. Please try again.' as const;
export const ABSENT_COUNT_DISPLAY = '—' as const;

// ---------------------------------------------------------------------------
// Standard "happy path" dataset (from Example 2 in the test-design document)
// Used across Examples 3, 4, 7, 8, 9, 10, 11, 12 and Edge 3.
// ---------------------------------------------------------------------------

export const HAPPY_PATH_PAYMENT_STATUS_REPORT: PaymentStatusReportItem[] = [
  {
    Status: 'REG',
    PaymentCount: 24,
    TotalPaymentAmount: 456789.0,
    CommissionType: 'Standard',
    AgencyName: 'Aardvark Realty',
  },
  {
    Status: 'REG',
    PaymentCount: 18,
    TotalPaymentAmount: 234567.89,
    CommissionType: 'Standard',
    AgencyName: 'BlueSky Bonds',
  },
  {
    Status: 'PARKED',
    PaymentCount: 7,
    TotalPaymentAmount: 89123.45,
    CommissionType: 'Standard',
    AgencyName: 'Aardvark Realty',
  },
  {
    Status: 'MAN-PAY',
    PaymentCount: 12,
    TotalPaymentAmount: 112000.0,
    CommissionType: 'Standard',
    AgencyName: 'City Homes',
  },
];

export const HAPPY_PATH_PARKED_AGING_REPORT: ParkedPaymentsAgingReportItem[] = [
  { Range: '0–30 days', AgencyName: 'Aardvark Realty', PaymentCount: 3 },
  {
    Range: '31–60 days',
    AgencyName: 'Aardvark Realty',
    PaymentCount: 2,
  },
  { Range: '61–90 days', AgencyName: 'BlueSky Bonds', PaymentCount: 1 },
  { Range: '90+ days', AgencyName: 'City Homes', PaymentCount: 1 },
];

export const HAPPY_PATH_PAYMENTS_BY_AGENCY: PaymentsByAgencyReportItem[] = [
  {
    AgencyName: 'Aardvark Realty',
    PaymentCount: 10,
    TotalCommissionCount: 145000.0,
    Vat: 21750.0,
  },
  {
    AgencyName: 'BlueSky Bonds',
    PaymentCount: 8,
    TotalCommissionCount: 89567.89,
    Vat: 13435.18,
  },
];

/**
 * The canonical happy-path dashboard response used in Examples 3–11, Edge 3.
 * Expected derived values:
 *   Ready to Pay count  = 42  (24 + 18 — REG rows only, exact case-insensitive match)
 *   Parked count        = 7   (PARKED row only)
 *   Payments Made count = 18  (TotalPaymentCountInLast14Days)
 *   Payments Made total = "R 234,567.89" (145000 + 89567.89)
 */
export const createMockDashboard = (
  overrides: Partial<PaymentsDashboardRead> = {},
): PaymentsDashboardRead => ({
  PaymentStatusReport: HAPPY_PATH_PAYMENT_STATUS_REPORT,
  ParkedPaymentsAgingReport: HAPPY_PATH_PARKED_AGING_REPORT,
  TotalPaymentCountInLast14Days: 18,
  PaymentsByAgency: HAPPY_PATH_PAYMENTS_BY_AGENCY,
  ...overrides,
});

/**
 * All-empty dashboard response (Edge 2).
 * TotalPaymentCountInLast14Days is 0 (present, value zero — BA-3: displays "0").
 */
export const createEmptyDashboard = (): PaymentsDashboardRead => ({
  PaymentStatusReport: [],
  ParkedPaymentsAgingReport: [],
  TotalPaymentCountInLast14Days: 0,
  PaymentsByAgency: [],
});

/**
 * Dashboard response with TotalPaymentCountInLast14Days missing (Edge 2b).
 * BA-3: absent/null → display "—" (single em-dash).
 */
export const createDashboardWithAbsentCount = (): Omit<
  PaymentsDashboardRead,
  'TotalPaymentCountInLast14Days'
> => ({
  PaymentStatusReport: [],
  ParkedPaymentsAgingReport: [],
  PaymentsByAgency: [],
});

/**
 * Dashboard response with PaymentsByAgency as empty array (Example 14).
 * Expected: Payments Made total = "R 0.00", count = TotalPaymentCountInLast14Days.
 */
export const createDashboardWithEmptyAgencyArray =
  (): PaymentsDashboardRead => ({
    PaymentStatusReport: HAPPY_PATH_PAYMENT_STATUS_REPORT,
    ParkedPaymentsAgingReport: HAPPY_PATH_PARKED_AGING_REPORT,
    TotalPaymentCountInLast14Days: 5,
    PaymentsByAgency: [],
  });

/**
 * Dashboard response with PaymentsByAgency key absent entirely (Edge 1).
 * Expected: Payments Made total = "R 0.00" (graceful fallback, no error).
 */
export const createDashboardWithAbsentAgencyArray =
  (): PaymentsDashboardRead => ({
    PaymentStatusReport: HAPPY_PATH_PAYMENT_STATUS_REPORT,
    ParkedPaymentsAgingReport: HAPPY_PATH_PARKED_AGING_REPORT,
    TotalPaymentCountInLast14Days: 18,
    // PaymentsByAgency intentionally omitted
  });

/**
 * Dataset for Edge 4: contains a "DEREGISTERED" row to prove it is NOT counted
 * toward Ready to Pay.
 * Expected Ready to Pay = 12 (10 from "REG" + 2 from "reg"; DEREGISTERED excluded).
 */
export const createEdge4Dashboard = (): PaymentsDashboardRead => ({
  PaymentStatusReport: [
    {
      Status: 'REG',
      PaymentCount: 10,
      TotalPaymentAmount: 100000,
      CommissionType: 'Standard',
      AgencyName: 'Agency A',
    },
    {
      Status: 'PARKED',
      PaymentCount: 5,
      TotalPaymentAmount: 50000,
      CommissionType: 'Standard',
      AgencyName: 'Agency B',
    },
    {
      Status: 'MAN-PAY',
      PaymentCount: 3,
      TotalPaymentAmount: 30000,
      CommissionType: 'Standard',
      AgencyName: 'Agency C',
    },
    {
      Status: 'DEREGISTERED',
      PaymentCount: 4,
      TotalPaymentAmount: 40000,
      CommissionType: 'Standard',
      AgencyName: 'Agency D',
    },
    {
      Status: 'reg',
      PaymentCount: 2,
      TotalPaymentAmount: 20000,
      CommissionType: 'Standard',
      AgencyName: 'Agency E',
    },
  ],
  ParkedPaymentsAgingReport: [],
  TotalPaymentCountInLast14Days: 10,
  PaymentsByAgency: [],
});

/**
 * Dataset for Edge 3: "Coastal Brokers" appears only in PaymentStatusReport,
 * not in ParkedPaymentsAgingReport.
 */
export const createEdge3Dashboard = (): PaymentsDashboardRead => ({
  PaymentStatusReport: [
    ...HAPPY_PATH_PAYMENT_STATUS_REPORT,
    {
      Status: 'REG',
      PaymentCount: 5,
      TotalPaymentAmount: 55000,
      CommissionType: 'Standard',
      AgencyName: 'Coastal Brokers',
    },
  ],
  ParkedPaymentsAgingReport: HAPPY_PATH_PARKED_AGING_REPORT,
  TotalPaymentCountInLast14Days: 23,
  PaymentsByAgency: HAPPY_PATH_PAYMENTS_BY_AGENCY,
});
