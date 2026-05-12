/**
 * API Endpoint Functions
 *
 * Wraps the project's API client with the correct paths, methods, and
 * TypeScript types. Implements envelope unwrapping and BA-4 Status
 * normalisation for the BetterBond Commission Payments POC.
 *
 * BA-4: getPayments() normalises Payment.Status from a plain string
 *       (e.g. "REG") into { StatusCode: string } so consumers always
 *       receive an object. Object responses pass through unchanged.
 */

import { apiClient, get, post, put } from '@/lib/api/client';
import type {
  PaymentBatchRead,
  PaymentRead,
  PaymentsDashboardRead,
} from '@/types/api-generated';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// The BA-4 spec requires Status to be normalised to { StatusCode: string }.
// We define a narrower local type so callers that consume getPayments() can
// access payment.Status.StatusCode without casting every time.
export interface NormalisedPaymentStatus {
  StatusCode: string;
  Description?: string;
}

export interface NormalisedPaymentRead extends Omit<PaymentRead, 'Status'> {
  Status?: NormalisedPaymentStatus;
}

// ---------------------------------------------------------------------------
// Payment endpoints
// ---------------------------------------------------------------------------

/**
 * GET /v1/payments/dashboard
 * Returns dashboard summary (status report, aging report, agency breakdown).
 */
export function getDashboard(): Promise<PaymentsDashboardRead> {
  return get<PaymentsDashboardRead>('/v1/payments/dashboard');
}

/**
 * GET /v1/payments
 * Returns the full list of payments. Unwraps the { PaymentList: [...] }
 * envelope and normalises each payment's Status field per BA-4.
 */
export async function getPayments(): Promise<NormalisedPaymentRead[]> {
  const envelope = await get<{ PaymentList?: Record<string, unknown>[] }>(
    '/v1/payments',
  );
  const list = envelope?.PaymentList ?? [];
  return list.map((p) => {
    const status = p['Status'];
    if (typeof status === 'string') {
      return { ...p, Status: { StatusCode: status } } as NormalisedPaymentRead;
    }
    return p as NormalisedPaymentRead;
  });
}

/**
 * PUT /v1/payments/park
 * Parks (holds) a set of payments by their numeric IDs.
 */
export function parkPayments(ids: number[]): Promise<void> {
  return put<void>('/v1/payments/park', { PaymentIds: ids });
}

/**
 * PUT /v1/payments/unpark
 * Un-parks (releases) a set of payments by their numeric IDs.
 */
export function unparkPayments(ids: number[]): Promise<void> {
  return put<void>('/v1/payments/unpark', { PaymentIds: ids });
}

// ---------------------------------------------------------------------------
// Payment Batch endpoints
// ---------------------------------------------------------------------------

/**
 * POST /v1/payment-batches
 * Creates a new payment batch. Injects the LastChangedUser HTTP header.
 */
export function createPaymentBatch(
  paymentIds: number[],
  lastChangedUser: string,
): Promise<unknown> {
  return post<unknown>(
    '/v1/payment-batches',
    { PaymentIds: paymentIds },
    lastChangedUser,
  );
}

/**
 * GET /v1/payment-batches
 * Returns the full list of payment batches. Unwraps the
 * { PaymentBatchList: [...] } envelope.
 */
export async function getPaymentBatches(): Promise<PaymentBatchRead[]> {
  const envelope = await get<{ PaymentBatchList?: PaymentBatchRead[] }>(
    '/v1/payment-batches',
  );
  return envelope?.PaymentBatchList ?? [];
}

/**
 * POST /v1/payment-batches/{id}/download-invoice-pdf
 * Downloads the invoice PDF for a payment batch. Returns a Blob via the
 * isBinaryResponse flag on the API client.
 */
export function downloadInvoicePdf(id: number): Promise<Blob> {
  return apiClient<Blob>(`/v1/payment-batches/${id}/download-invoice-pdf`, {
    method: 'POST',
    isBinaryResponse: true,
  });
}

// ---------------------------------------------------------------------------
// Demo Administration endpoints
// ---------------------------------------------------------------------------

/**
 * POST /demo/reset-demo
 * Resets all demo data to its initial fixture state.
 */
export function resetDemoData(): Promise<void> {
  return post<void>('/demo/reset-demo');
}
