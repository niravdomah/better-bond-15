/**
 * Shared mock data factories for Epic 3 — Payment Management.
 *
 * Import from this file in all Epic 3 test files.
 * Do NOT duplicate these factories — extend this file for new entities instead.
 *
 * Types are imported from @/types/api-generated (canonical source derived from OpenAPI spec).
 * The NormalisedPaymentRead type is imported from @/lib/api/endpoints — it reflects BA-4
 * Status normalisation: Status is always { StatusCode: string } after getPayments() runs.
 *
 * Locked BA decision strings (see story-1-payment-grid-filter-pagination-test-handoff.md):
 *   PAYMENTS_TOAST_TEXT  = "Failed to load payments. Please try again."
 *   EMPTY_STATE_MESSAGE  = "No payments ready for processing."
 *   ZERO_VAT_DISPLAY     = "R 0.00"    (BA-3: zero is a real value, not missing)
 *   NULL_DATE_DISPLAY    = "—"         (em-dash U+2014 for null/missing dates)
 *
 * Locked BA decision strings for Story 3 (see story-3-initiate-payments-test-handoff.md):
 *   SUCCESS_TOAST_TEXT  = "Payment batch created successfully."
 *   FAILURE_TOAST_TEXT  = "Failed to initiate payment batch. Please try again."  (BA-1 resolved)
 *
 * Pagination constant: PAGINATION.DEFAULT_PAGE_SIZE = 20 (from @/lib/utils/constants)
 */

import type { NormalisedPaymentRead } from '@/lib/api/endpoints';

// ---------------------------------------------------------------------------
// Locked BA assertion strings — Story 1
// ---------------------------------------------------------------------------

export const PAYMENTS_TOAST_TEXT =
  'Failed to load payments. Please try again.' as const;
export const EMPTY_STATE_MESSAGE = 'No payments ready for processing.' as const;
export const ZERO_VAT_DISPLAY = 'R 0.00' as const;
export const NULL_DATE_DISPLAY = '—' as const; // em-dash U+2014

// ---------------------------------------------------------------------------
// Locked BA assertion strings — Story 3 (BA-1 resolved 2026-05-14)
// ---------------------------------------------------------------------------

export const SUCCESS_TOAST_TEXT =
  'Payment batch created successfully.' as const;

/** BA-1 resolved: exact failure toast text from the FRS workflow narrative */
export const FAILURE_TOAST_TEXT =
  'Failed to initiate payment batch. Please try again.' as const;

// ---------------------------------------------------------------------------
// Column headers (13 required, CommissionPercent excluded — AC-4, AC-5)
// ---------------------------------------------------------------------------

export const REQUIRED_COLUMN_HEADERS = [
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
] as const;

// ---------------------------------------------------------------------------
// Agency constants (Story 3 scenario dataset)
// ---------------------------------------------------------------------------

export const AGENCY_CAPE_HOMES = 'Cape Homes' as const;
export const AGENCY_METRO_REALTY = 'Metro Realty' as const;
export const AGENCY_SUNRIDGE_PROPERTIES = 'Sunridge Properties' as const;

// ---------------------------------------------------------------------------
// Base factory for a single payment (all required fields populated)
// ---------------------------------------------------------------------------

export const createMockPayment = (
  overrides: Partial<NormalisedPaymentRead> = {},
): NormalisedPaymentRead => ({
  Id: 1,
  Reference: 'PMT-001',
  AgencyName: 'HomeFirst Realty',
  AgentName: 'John',
  AgentSurname: 'Smith',
  ClaimDate: '2024-03-15',
  BondAmount: 1250000,
  CommissionType: 'Standard',
  CommissionAmount: 8750.5,
  VAT: 1312.58,
  Status: { StatusCode: 'READY' },
  GrantDate: '2024-04-01',
  RegistrationDate: '2024-04-10',
  Bank: 'FNB',
  LastChangedUser: 'admin@example.com',
  LastChangedDate: '2024-04-15',
  BatchId: undefined,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Factory: known monetary formatting example (Example 4 from test-design)
// ---------------------------------------------------------------------------

export const createMockPaymentWithKnownAmounts = (): NormalisedPaymentRead => ({
  Id: 1,
  Reference: 'PMT-001',
  AgencyName: 'HomeFirst Realty',
  AgentName: 'John',
  AgentSurname: 'Smith',
  ClaimDate: '2024-03-15',
  BondAmount: 1250000, // → "R 1,250,000.00"
  CommissionType: 'Standard',
  CommissionAmount: 8750.5, // → "R 8,750.50"
  VAT: 1312.58, // → "R 1,312.58"
  Status: { StatusCode: 'READY' },
  GrantDate: '2024-04-01',
  RegistrationDate: '2024-04-10',
  Bank: 'FNB',
  LastChangedUser: 'admin@example.com',
  LastChangedDate: '2024-04-15',
});

// ---------------------------------------------------------------------------
// Factory: known date formatting example (Example 5 from test-design)
// ---------------------------------------------------------------------------

export const createMockPaymentWithKnownDates = (): NormalisedPaymentRead => ({
  Id: 2,
  Reference: 'PMT-002',
  AgencyName: 'HomeFirst Realty',
  AgentName: 'Jane',
  AgentSurname: 'Doe',
  ClaimDate: '2024-03-15', // → "15 Mar 2024"
  BondAmount: 500000,
  CommissionType: 'Standard',
  CommissionAmount: 3500,
  VAT: 525,
  Status: { StatusCode: 'READY' },
  GrantDate: '2024-04-01', // → "1 Apr 2024"
  RegistrationDate: '2024-04-10', // → "10 Apr 2024"
  Bank: 'Standard Bank',
  LastChangedUser: 'admin@example.com',
  LastChangedDate: '2024-04-15',
});

// ---------------------------------------------------------------------------
// Factory: zero-VAT payment (BA-3: zero VAT → "R 0.00", not "—")
// ---------------------------------------------------------------------------

export const createMockPaymentWithZeroVat = (): NormalisedPaymentRead =>
  createMockPayment({
    Id: 50,
    Reference: 'PMT-050',
    VAT: 0, // BA-3: must display as "R 0.00"
  });

// ---------------------------------------------------------------------------
// Factory: null GrantDate (Edge 3: null date → "—")
// ---------------------------------------------------------------------------

export const createMockPaymentWithNullDate = (): NormalisedPaymentRead =>
  createMockPayment({
    Id: 99,
    Reference: 'PMT-099',
    GrantDate: undefined, // Edge 3: missing date → "—"
  });

// ---------------------------------------------------------------------------
// Factory: 45-payment list for pagination tests (Examples 2, 6)
// 20 for HomeFirst Realty, 25 for Atlas Properties
// ---------------------------------------------------------------------------

export const createMockPaymentList45 = (): NormalisedPaymentRead[] => {
  const payments: NormalisedPaymentRead[] = [];
  // 20 HomeFirst Realty payments (rows 1–20 in original order)
  for (let i = 1; i <= 20; i++) {
    payments.push(
      createMockPayment({
        Id: i,
        Reference: `PMT-${String(i).padStart(3, '0')}`,
        AgencyName: 'HomeFirst Realty',
        AgentName: `Agent${i}`,
        AgentSurname: `Surname${i}`,
        ClaimDate: '2024-03-15',
        BondAmount: 500000 + i * 1000,
        CommissionAmount: 3500 + i * 10,
        VAT: 525 + i,
        Bank: 'FNB',
      }),
    );
  }
  // 25 Atlas Properties payments (rows 21–45)
  for (let i = 21; i <= 45; i++) {
    payments.push(
      createMockPayment({
        Id: i,
        Reference: `PMT-${String(i).padStart(3, '0')}`,
        AgencyName: 'Atlas Properties',
        AgentName: `Agent${i}`,
        AgentSurname: `Surname${i}`,
        ClaimDate: '2024-04-01',
        BondAmount: 600000 + i * 1000,
        CommissionAmount: 4200 + i * 10,
        VAT: 630 + i,
        Bank: 'Nedbank',
      }),
    );
  }
  return payments;
};

// ---------------------------------------------------------------------------
// Factory: exactly 20 payments (BA-2: pagination controls visible, both disabled)
// ---------------------------------------------------------------------------

export const createMockPaymentListExact20 = (): NormalisedPaymentRead[] => {
  const payments: NormalisedPaymentRead[] = [];
  for (let i = 1; i <= 20; i++) {
    payments.push(
      createMockPayment({
        Id: i,
        Reference: `PMT-${String(i).padStart(3, '0')}`,
        AgencyName: 'HomeFirst Realty',
        AgentName: `Agent${i}`,
        AgentSurname: `Surname${i}`,
        BondAmount: 500000 + i * 1000,
        CommissionAmount: 3500 + i * 10,
        VAT: 525 + i,
      }),
    );
  }
  return payments;
};

// ---------------------------------------------------------------------------
// Factory: 3-agency list for dropdown population test (Example 8)
// Agencies: "Summit Bonds", "HomeFirst Realty", "Atlas Properties"
// After sort: "Atlas Properties", "HomeFirst Realty", "Summit Bonds"
// ---------------------------------------------------------------------------

export const createMockPaymentListThreeAgencies =
  (): NormalisedPaymentRead[] => [
    createMockPayment({
      Id: 1,
      Reference: 'PMT-001',
      AgencyName: 'Summit Bonds',
    }),
    createMockPayment({
      Id: 2,
      Reference: 'PMT-002',
      AgencyName: 'HomeFirst Realty',
    }),
    createMockPayment({
      Id: 3,
      Reference: 'PMT-003',
      AgencyName: 'Atlas Properties',
    }),
    createMockPayment({
      Id: 4,
      Reference: 'PMT-004',
      AgencyName: 'Atlas Properties',
    }),
  ];

// ---------------------------------------------------------------------------
// Factory: empty payment list (Example 13, BA-1: dropdown enabled with only "All Agencies")
// ---------------------------------------------------------------------------

export const createMockPaymentListEmpty = (): NormalisedPaymentRead[] => [];

// ===========================================================================
// Story 3 — Initiate Payments Button datasets
// ===========================================================================

/**
 * Example 1 — "All Agencies" selected: mixed agencies and statuses.
 * Button must be disabled (no specific agency selected).
 */
export const STORY3_ALL_AGENCIES_LIST: NormalisedPaymentRead[] = [
  createMockPayment({
    Id: 1,
    AgencyName: AGENCY_CAPE_HOMES,
    Status: { StatusCode: 'READY' },
  }),
  createMockPayment({
    Id: 2,
    AgencyName: AGENCY_METRO_REALTY,
    Status: { StatusCode: 'READY' },
  }),
  createMockPayment({
    Id: 3,
    AgencyName: AGENCY_SUNRIDGE_PROPERTIES,
    Status: { StatusCode: 'PARKED' },
  }),
];

/**
 * Example 2 — Metro Realty selected, all MAN-PAY.
 * Button must be disabled (no REG payments for this agency).
 */
export const STORY3_METRO_REALTY_ALL_MANPAY: NormalisedPaymentRead[] = [
  createMockPayment({
    Id: 10,
    AgencyName: AGENCY_METRO_REALTY,
    Status: { StatusCode: 'PARKED' },
  }),
  createMockPayment({
    Id: 11,
    AgencyName: AGENCY_METRO_REALTY,
    Status: { StatusCode: 'PARKED' },
  }),
  createMockPayment({
    Id: 12,
    AgencyName: AGENCY_METRO_REALTY,
    Status: { StatusCode: 'PARKED' },
  }),
];

/**
 * Example 3 + 4 — Cape Homes: one REG (ID 201), one MAN-PAY (ID 202).
 * Button enabled when Cape Homes is selected; PaymentIds should be [201] only.
 * Note: cross-agency REG exclusion is tested by STORY3_SUNRIDGE_MIXED (Example 5).
 * The original Metro Realty REG entry (ID 301) was removed as it conflicted with Edge
 * Example 4, which expects Metro Realty to have zero REG payments in the combined dataset.
 */
export const STORY3_CAPE_HOMES_MIXED: NormalisedPaymentRead[] = [
  createMockPayment({
    Id: 201,
    AgencyName: AGENCY_CAPE_HOMES,
    Status: { StatusCode: 'READY' },
  }),
  createMockPayment({
    Id: 202,
    AgencyName: AGENCY_CAPE_HOMES,
    Status: { StatusCode: 'PARKED' },
  }),
];

/**
 * Example 5 — Sunridge Properties: two REG (IDs 101, 102), one MAN-PAY (ID 103),
 * plus REG payments from two other agencies.
 * PaymentIds should be [101, 102] only.
 */
export const STORY3_SUNRIDGE_MIXED: NormalisedPaymentRead[] = [
  createMockPayment({
    Id: 101,
    AgencyName: AGENCY_SUNRIDGE_PROPERTIES,
    Status: { StatusCode: 'READY' },
  }),
  createMockPayment({
    Id: 102,
    AgencyName: AGENCY_SUNRIDGE_PROPERTIES,
    Status: { StatusCode: 'READY' },
  }),
  createMockPayment({
    Id: 103,
    AgencyName: AGENCY_SUNRIDGE_PROPERTIES,
    Status: { StatusCode: 'PARKED' },
  }),
  createMockPayment({
    Id: 201,
    AgencyName: AGENCY_METRO_REALTY,
    Status: { StatusCode: 'READY' },
  }),
  createMockPayment({
    Id: 202,
    AgencyName: AGENCY_CAPE_HOMES,
    Status: { StatusCode: 'READY' },
  }),
];

/**
 * Example 7 — Cape Homes: two REG payments before batch creation.
 * After a successful POST, GET /v1/payments returns STORY3_CAPE_HOMES_POST_BATCH.
 */
export const STORY3_CAPE_HOMES_TWO_REG: NormalisedPaymentRead[] = [
  createMockPayment({
    Id: 201,
    AgencyName: AGENCY_CAPE_HOMES,
    Status: { StatusCode: 'READY' },
  }),
  createMockPayment({
    Id: 202,
    AgencyName: AGENCY_CAPE_HOMES,
    Status: { StatusCode: 'READY' },
  }),
];

/**
 * Post-batch refresh dataset (Example 7): both Cape Homes payments converted to MAN-PAY.
 * Returned by GET /v1/payments after a successful POST /v1/payment-batches.
 */
export const STORY3_CAPE_HOMES_POST_BATCH: NormalisedPaymentRead[] = [
  createMockPayment({
    Id: 201,
    AgencyName: AGENCY_CAPE_HOMES,
    Status: { StatusCode: 'PARKED' },
  }),
  createMockPayment({
    Id: 202,
    AgencyName: AGENCY_CAPE_HOMES,
    Status: { StatusCode: 'PARKED' },
  }),
];

/**
 * Example 8 — Cape Homes: one REG payment; batch creation call will fail (500).
 */
export const STORY3_CAPE_HOMES_ONE_REG: NormalisedPaymentRead[] = [
  createMockPayment({
    Id: 201,
    AgencyName: AGENCY_CAPE_HOMES,
    Status: { StatusCode: 'READY' },
  }),
];

// ===========================================================================
// Story 3.2 — Row Selection, Park/Unpark Bulk Actions, Post-Mutation Refresh
// ===========================================================================

// ---------------------------------------------------------------------------
// Story 3.2: Example 1 — 5 payments (IDs 101–105) for checkbox appearance tests
// ---------------------------------------------------------------------------

export const createSelectionTestPayments = (): NormalisedPaymentRead[] => [
  createMockPayment({
    Id: 101,
    Reference: 'REF-101',
    AgencyName: 'ABC Realty',
    Status: { StatusCode: 'READY' },
  }),
  createMockPayment({
    Id: 102,
    Reference: 'REF-102',
    AgencyName: 'ABC Realty',
    Status: { StatusCode: 'READY' },
  }),
  createMockPayment({
    Id: 103,
    Reference: 'REF-103',
    AgencyName: 'ABC Realty',
    Status: { StatusCode: 'PARKED' },
  }),
  createMockPayment({
    Id: 104,
    Reference: 'REF-104',
    AgencyName: 'ABC Realty',
    Status: { StatusCode: 'READY' },
  }),
  createMockPayment({
    Id: 105,
    Reference: 'REF-105',
    AgencyName: 'ABC Realty',
    Status: { StatusCode: 'READY' },
  }),
];

// ---------------------------------------------------------------------------
// Story 3.2: Example 6 — Park happy path (IDs 201–205)
// Before park: all REG; after re-fetch: IDs 201, 203 now show PARKED
// ---------------------------------------------------------------------------

export const createParkHappyPathPayments = (): NormalisedPaymentRead[] => [
  createMockPayment({
    Id: 201,
    Reference: 'REF-201',
    AgencyName: 'Test Agency',
    Status: { StatusCode: 'READY' },
  }),
  createMockPayment({
    Id: 202,
    Reference: 'REF-202',
    AgencyName: 'Test Agency',
    Status: { StatusCode: 'READY' },
  }),
  createMockPayment({
    Id: 203,
    Reference: 'REF-203',
    AgencyName: 'Test Agency',
    Status: { StatusCode: 'READY' },
  }),
  createMockPayment({
    Id: 204,
    Reference: 'REF-204',
    AgencyName: 'Test Agency',
    Status: { StatusCode: 'READY' },
  }),
  createMockPayment({
    Id: 205,
    Reference: 'REF-205',
    AgencyName: 'Test Agency',
    Status: { StatusCode: 'READY' },
  }),
];

export const createParkHappyPathRefreshedPayments =
  (): NormalisedPaymentRead[] => [
    createMockPayment({
      Id: 201,
      Reference: 'REF-201',
      AgencyName: 'Test Agency',
      Status: { StatusCode: 'PARKED' },
    }),
    createMockPayment({
      Id: 202,
      Reference: 'REF-202',
      AgencyName: 'Test Agency',
      Status: { StatusCode: 'READY' },
    }),
    createMockPayment({
      Id: 203,
      Reference: 'REF-203',
      AgencyName: 'Test Agency',
      Status: { StatusCode: 'PARKED' },
    }),
    createMockPayment({
      Id: 204,
      Reference: 'REF-204',
      AgencyName: 'Test Agency',
      Status: { StatusCode: 'READY' },
    }),
    createMockPayment({
      Id: 205,
      Reference: 'REF-205',
      AgencyName: 'Test Agency',
      Status: { StatusCode: 'READY' },
    }),
  ];

// ---------------------------------------------------------------------------
// Story 3.2: Example 8 — Unpark happy path (IDs 301–304)
// Before unpark: IDs 302, 303 are PARKED; after re-fetch: all show READY
// ---------------------------------------------------------------------------

export const createUnparkHappyPathPayments = (): NormalisedPaymentRead[] => [
  createMockPayment({
    Id: 301,
    Reference: 'REF-301',
    AgencyName: 'Test Agency',
    Status: { StatusCode: 'READY' },
  }),
  createMockPayment({
    Id: 302,
    Reference: 'REF-302',
    AgencyName: 'Test Agency',
    Status: { StatusCode: 'PARKED' },
  }),
  createMockPayment({
    Id: 303,
    Reference: 'REF-303',
    AgencyName: 'Test Agency',
    Status: { StatusCode: 'PARKED' },
  }),
  createMockPayment({
    Id: 304,
    Reference: 'REF-304',
    AgencyName: 'Test Agency',
    Status: { StatusCode: 'READY' },
  }),
];

export const createUnparkHappyPathRefreshedPayments =
  (): NormalisedPaymentRead[] => [
    createMockPayment({
      Id: 301,
      Reference: 'REF-301',
      AgencyName: 'Test Agency',
      Status: { StatusCode: 'READY' },
    }),
    createMockPayment({
      Id: 302,
      Reference: 'REF-302',
      AgencyName: 'Test Agency',
      Status: { StatusCode: 'READY' },
    }),
    createMockPayment({
      Id: 303,
      Reference: 'REF-303',
      AgencyName: 'Test Agency',
      Status: { StatusCode: 'READY' },
    }),
    createMockPayment({
      Id: 304,
      Reference: 'REF-304',
      AgencyName: 'Test Agency',
      Status: { StatusCode: 'READY' },
    }),
  ];

// ---------------------------------------------------------------------------
// Story 3.2: Example 9 — Post-mutation refresh loading indicator
// IDs 401, 402 go from READY to PARKED after park
// ---------------------------------------------------------------------------

export const createPostMutationInitialPayments =
  (): NormalisedPaymentRead[] => [
    createMockPayment({
      Id: 401,
      Reference: 'REF-401',
      AgencyName: 'Test Agency',
      Status: { StatusCode: 'READY' },
    }),
    createMockPayment({
      Id: 402,
      Reference: 'REF-402',
      AgencyName: 'Test Agency',
      Status: { StatusCode: 'READY' },
    }),
  ];

export const createPostMutationRefreshedPayments =
  (): NormalisedPaymentRead[] => [
    createMockPayment({
      Id: 401,
      Reference: 'REF-401',
      AgencyName: 'Test Agency',
      Status: { StatusCode: 'PARKED' },
    }),
    createMockPayment({
      Id: 402,
      Reference: 'REF-402',
      AgencyName: 'Test Agency',
      Status: { StatusCode: 'PARKED' },
    }),
  ];

// ---------------------------------------------------------------------------
// Story 3.2: Example 10 — Park failure (IDs 501, 502); selections preserved
// ---------------------------------------------------------------------------

export const createParkFailurePayments = (): NormalisedPaymentRead[] => [
  createMockPayment({
    Id: 501,
    Reference: 'REF-501',
    AgencyName: 'Fail Agency',
    Status: { StatusCode: 'READY' },
  }),
  createMockPayment({
    Id: 502,
    Reference: 'REF-502',
    AgencyName: 'Fail Agency',
    Status: { StatusCode: 'READY' },
  }),
];

// ---------------------------------------------------------------------------
// Story 3.2: Example 11 — Unpark failure (IDs 601, 602); selections preserved
// ---------------------------------------------------------------------------

export const createUnparkFailurePayments = (): NormalisedPaymentRead[] => [
  createMockPayment({
    Id: 601,
    Reference: 'REF-601',
    AgencyName: 'Fail Agency',
    Status: { StatusCode: 'PARKED' },
  }),
  createMockPayment({
    Id: 602,
    Reference: 'REF-602',
    AgencyName: 'Fail Agency',
    Status: { StatusCode: 'PARKED' },
  }),
];

// ---------------------------------------------------------------------------
// Story 3.2: General-purpose 10-row list for button-state and selection tests
// (Examples 2, 3, 5, 7 — header checkbox and disabled-button scenarios)
// ---------------------------------------------------------------------------

export const createTenPayments = (): NormalisedPaymentRead[] =>
  Array.from({ length: 10 }, (_, i) =>
    createMockPayment({
      Id: 1000 + i,
      Reference: `REF-${1000 + i}`,
      AgencyName: 'Generic Agency',
      Status: { StatusCode: 'READY' },
    }),
  );
