/**
 * Story Metadata:
 * - Route: N/A (infrastructure only)
 * - Target File: lib/api/endpoints.ts (new), types/api-generated.ts (new),
 *                lib/utils/format.ts (new), lib/utils/constants.ts (update)
 * - Page Action: create_new (endpoint functions and types), modify_existing (constants)
 *
 * Tests for Epic 1, Story 3: API Client Configuration and Shared Utilities.
 *
 * Render scope: `api` — no UI components. All tests are pure function/module
 * tests with global fetch mocked via vi.stubGlobal.
 *
 * These tests WILL FAIL until the feature is implemented — that is the point (TDD red).
 *
 * Locked specs from resolved BA decisions:
 * - BA-1: formatDate("2024-03-15") → "15 Mar 2024"
 * - BA-2: formatCurrency(null|undefined) → "—" (U+2014 em-dash); real zero → "R 0.00"
 * - BA-3: formatDate(null|undefined|"") → "—"; unparseable input → "—"
 * - BA-4: Payment.Status normalised from plain string to { StatusCode: string }
 *         Backend returns Status: "REG" → getPayments() returns Status: { StatusCode: "REG" }
 *         Backend returns Status: { StatusCode: "MAN-PAY", Description: "Manual Payment" } → passthrough unchanged
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Imports that WILL FAIL until implementation — TDD red phase
// ---------------------------------------------------------------------------

// Endpoint functions (to be created at web/src/lib/api/endpoints.ts)
import {
  getDashboard,
  getPayments,
  getPaymentBatches,
  parkPayments,
  unparkPayments,
  createPaymentBatch,
  downloadInvoicePdf,
  resetDemoData,
} from '@/lib/api/endpoints';

// Format utilities (to be created at web/src/lib/utils/format.ts)
import { formatCurrency, formatDate } from '@/lib/utils/format';

// Constants — already exists and verified to default to http://localhost:8042
import { API_BASE_URL } from '@/lib/utils/constants';

// ---------------------------------------------------------------------------
// Global fetch mock
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

/** Create a minimal successful JSON response mock */
function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: true,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
    blob: async () => new Blob(),
  } as unknown as Response;
}

/** Create a binary octet-stream response mock (for PDF downloads) */
function blobResponse(): Response {
  const blob = new Blob(['%PDF-1.4 binary content'], {
    type: 'application/octet-stream',
  });
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/octet-stream' }),
    json: async () => {
      throw new Error('Not JSON');
    },
    blob: async () => blob,
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// AC-1 — API base URL defaults
// ---------------------------------------------------------------------------

describe('API base URL configuration', () => {
  // AC-1
  it('NEXT_PUBLIC_API_BASE_URL defaults to http://localhost:8042', () => {
    expect(API_BASE_URL).toBe('http://localhost:8042');
  });
});

// ---------------------------------------------------------------------------
// AC-5, AC-21 — getDashboard
// ---------------------------------------------------------------------------

describe('getDashboard()', () => {
  beforeEach(() => vi.clearAllMocks());

  // AC-5, AC-21
  it('calls GET http://localhost:8042/v1/payments/dashboard and returns PaymentsDashboard shape', async () => {
    const mockDashboard = {
      PaymentStatusReport: [{ Status: 'REG', PaymentCount: 10 }],
      ParkedPaymentsAgingReport: [],
      TotalPaymentCountInLast14Days: 14,
      PaymentsByAgency: [],
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(mockDashboard));

    const result = await getDashboard();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8042/v1/payments/dashboard',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result).toMatchObject({
      TotalPaymentCountInLast14Days: 14,
      PaymentStatusReport: expect.any(Array),
    });
  });
});

// ---------------------------------------------------------------------------
// AC-6 — getPayments (envelope unwrapping + BA-4 Status normalisation)
// ---------------------------------------------------------------------------

describe('getPayments()', () => {
  beforeEach(() => vi.clearAllMocks());

  // AC-6
  it('calls GET http://localhost:8042/v1/payments and unwraps the PaymentList envelope', async () => {
    const mockEnvelope = {
      PaymentList: [
        {
          Id: 101,
          Reference: 'REF-001',
          AgencyName: 'ABC Realty',
          Status: { StatusCode: 'REG' },
        },
      ],
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(mockEnvelope));

    const result = await getPayments();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8042/v1/payments',
      expect.objectContaining({ method: 'GET' }),
    );
    // Returned value must be the unwrapped array, not the { PaymentList: [...] } envelope
    expect(Array.isArray(result)).toBe(true);
    expect((result as { Id: number }[])[0]).toMatchObject({ Id: 101 });
  });

  // AC-6, BA-4 — Status normalisation: plain string → object
  it('normalises backend plain-string Status "REG" to { StatusCode: "REG" }', async () => {
    const mockEnvelope = {
      PaymentList: [{ Id: 101, Reference: 'REF-001', Status: 'REG' }],
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(mockEnvelope));

    const result = await getPayments();
    const payment = (result as Array<{ Status: unknown }>)[0];

    expect(payment.Status).toEqual({ StatusCode: 'REG' });
  });

  // AC-6, BA-4 — Status normalisation: already-object passthrough (no double-wrapping)
  it('passes through an already-object Status unchanged (no double-wrapping)', async () => {
    const mockEnvelope = {
      PaymentList: [
        {
          Id: 202,
          Reference: 'REF-002',
          Status: { StatusCode: 'MAN-PAY', Description: 'Manual Payment' },
        },
      ],
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(mockEnvelope));

    const result = await getPayments();
    const payment = (result as Array<{ Status: unknown }>)[0];

    expect(payment.Status).toEqual({
      StatusCode: 'MAN-PAY',
      Description: 'Manual Payment',
    });
  });
});

// ---------------------------------------------------------------------------
// AC-7 — parkPayments
// ---------------------------------------------------------------------------

describe('parkPayments()', () => {
  beforeEach(() => vi.clearAllMocks());

  // AC-3, AC-7
  it('calls PUT http://localhost:8042/v1/payments/park with integer PaymentIds in body', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    await parkPayments([101, 102]);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8042/v1/payments/park',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ PaymentIds: [101, 102] }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// AC-8 — unparkPayments
// ---------------------------------------------------------------------------

describe('unparkPayments()', () => {
  beforeEach(() => vi.clearAllMocks());

  // AC-3, AC-8
  it('calls PUT http://localhost:8042/v1/payments/unpark with integer PaymentIds in body', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    await unparkPayments([203]);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8042/v1/payments/unpark',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ PaymentIds: [203] }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// AC-9 — createPaymentBatch with LastChangedUser header
// ---------------------------------------------------------------------------

describe('createPaymentBatch()', () => {
  beforeEach(() => vi.clearAllMocks());

  // AC-3, AC-4, AC-9
  it('calls POST http://localhost:8042/v1/payment-batches with LastChangedUser header and integer PaymentIds', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ Id: 55 }));

    await createPaymentBatch([101, 102], 'Jane Smith');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8042/v1/payment-batches',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ PaymentIds: [101, 102] }),
        headers: expect.objectContaining({
          LastChangedUser: 'Jane Smith',
        }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// AC-10 — getPaymentBatches (envelope unwrapping)
// ---------------------------------------------------------------------------

describe('getPaymentBatches()', () => {
  beforeEach(() => vi.clearAllMocks());

  // AC-10
  it('calls GET http://localhost:8042/v1/payment-batches and unwraps the PaymentBatchList envelope', async () => {
    const mockEnvelope = {
      PaymentBatchList: [
        { Id: 55, Reference: 'BATCH-001', AgencyName: 'ABC Realty' },
      ],
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(mockEnvelope));

    const result = await getPaymentBatches();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8042/v1/payment-batches',
      expect.objectContaining({ method: 'GET' }),
    );
    // Returned value must be the unwrapped array, not the { PaymentBatchList: [...] } envelope
    expect(Array.isArray(result)).toBe(true);
    expect((result as { Id: number }[])[0]).toMatchObject({ Id: 55 });
  });
});

// ---------------------------------------------------------------------------
// AC-11 — downloadInvoicePdf (binary Blob response)
// ---------------------------------------------------------------------------

describe('downloadInvoicePdf()', () => {
  beforeEach(() => vi.clearAllMocks());

  // AC-11
  it('calls POST http://localhost:8042/v1/payment-batches/55/download-invoice-pdf and returns a Blob', async () => {
    mockFetch.mockResolvedValueOnce(blobResponse());

    const result = await downloadInvoicePdf(55);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8042/v1/payment-batches/55/download-invoice-pdf',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result).toBeInstanceOf(Blob);
  });
});

// ---------------------------------------------------------------------------
// AC-12 — resetDemoData
// ---------------------------------------------------------------------------

describe('resetDemoData()', () => {
  beforeEach(() => vi.clearAllMocks());

  // AC-12
  it('calls POST http://localhost:8042/demo/reset-demo', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(null));

    await resetDemoData();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8042/demo/reset-demo',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

// ---------------------------------------------------------------------------
// AC-17, AC-18, AC-19 — formatCurrency
// ---------------------------------------------------------------------------

describe('formatCurrency()', () => {
  // AC-17
  it('formats 1234567.89 as "R 1,234,567.89"', () => {
    expect(formatCurrency(1234567.89)).toBe('R 1,234,567.89');
  });

  // AC-18
  it('formats 0 as "R 0.00" (real zero is not the em-dash fallback)', () => {
    expect(formatCurrency(0)).toBe('R 0.00');
  });

  // AC-19
  it('formats 1000 as "R 1,000.00"', () => {
    expect(formatCurrency(1000)).toBe('R 1,000.00');
  });

  // Edge A
  it('formats 0.5 as "R 0.50" (always exactly two decimal places)', () => {
    expect(formatCurrency(0.5)).toBe('R 0.50');
  });

  // Edge B — BA-2: null input
  it('returns "—" (em-dash U+2014) when called with null', () => {
    expect(formatCurrency(null as unknown as number)).toBe('—');
  });

  // Edge B — BA-2: undefined input
  it('returns "—" (em-dash U+2014) when called with undefined', () => {
    expect(formatCurrency(undefined as unknown as number)).toBe('—');
  });
});

// ---------------------------------------------------------------------------
// AC-20 — formatDate (BA-1 and BA-3)
// ---------------------------------------------------------------------------

describe('formatDate()', () => {
  // AC-20, BA-1
  it('formats "2024-03-15" as "15 Mar 2024"', () => {
    expect(formatDate('2024-03-15')).toBe('15 Mar 2024');
  });

  // AC-20, BA-1 — ISO datetime variant also produces the correct output
  it('formats "2024-03-15T00:00:00" as "15 Mar 2024"', () => {
    expect(formatDate('2024-03-15T00:00:00')).toBe('15 Mar 2024');
  });

  // Edge C — BA-3: null
  it('returns "—" (em-dash U+2014) when called with null', () => {
    expect(formatDate(null as unknown as string)).toBe('—');
  });

  // Edge C — BA-3: undefined
  it('returns "—" (em-dash U+2014) when called with undefined', () => {
    expect(formatDate(undefined as unknown as string)).toBe('—');
  });

  // Edge C — BA-3: empty string
  it('returns "—" (em-dash U+2014) when called with an empty string', () => {
    expect(formatDate('')).toBe('—');
  });

  // Edge C — BA-3: unparseable string
  it('returns "—" (em-dash U+2014) when called with an unparseable date string', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });
});
