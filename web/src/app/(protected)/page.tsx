'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getDashboard } from '@/lib/api/endpoints';
import type {
  PaymentsDashboardRead,
  PaymentStatusReportItem,
  ParkedPaymentsAgingReportItem,
} from '@/types/api-generated';
import { formatCurrency } from '@/lib/utils/format';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ERROR_PLACEHOLDER = '— error loading —';
const ALL_AGENCIES_VALUE = '__all__';

// ---------------------------------------------------------------------------
// Derived metric helpers
// ---------------------------------------------------------------------------

function calcReadyToPay(report: PaymentStatusReportItem[]): number {
  return report
    .filter((r) => r.Status?.toLowerCase() === 'reg')
    .reduce((sum, r) => sum + (r.PaymentCount ?? 0), 0);
}

function calcParked(report: PaymentStatusReportItem[]): number {
  return report
    .filter((r) => r.Status?.toLowerCase() === 'parked')
    .reduce((sum, r) => sum + (r.PaymentCount ?? 0), 0);
}

function calcPaymentsMadeTotal(data: PaymentsDashboardRead): number {
  return (data.PaymentsByAgency ?? []).reduce(
    (sum, r) => sum + (r.TotalCommissionCount ?? 0),
    0,
  );
}

function calcAgencies(data: PaymentsDashboardRead): string[] {
  const statusNames = (data.PaymentStatusReport ?? []).map(
    (r) => r.AgencyName ?? '',
  );
  const agingNames = (data.ParkedPaymentsAgingReport ?? []).map(
    (r) => r.AgencyName ?? '',
  );
  const unique = Array.from(new Set([...statusNames, ...agingNames])).filter(
    Boolean,
  );
  return unique.sort((a, b) => a.localeCompare(b));
}

// ---------------------------------------------------------------------------
// MetricCard
//
// The inner div carries data-testid="metric-card" so that tests can scope
// queries using:
//   getByText(/title/i).closest('[data-testid="metric-card"]')
// and then search for the value within it.
//
// The title uses a <p> (not a div) so that
//   closest('[data-testid="metric-card"], section, article, div')
// stops at the data-testid div rather than at an intermediate div.
//
// errorSlots controls how many ERROR_PLACEHOLDER strings are rendered
// when in error state — the Payments Made card has two value slots
// (count + total value) so it needs errorSlots=2.
// ---------------------------------------------------------------------------

interface MetricCardProps {
  title: string;
  primaryValue: React.ReactNode;
  secondaryValue?: React.ReactNode;
  loading: boolean;
  error: boolean;
  errorSlots?: number;
}

function MetricCard({
  title,
  primaryValue,
  secondaryValue,
  loading,
  error,
  errorSlots = 1,
}: MetricCardProps) {
  return (
    <Card>
      <div data-testid="metric-card" className="px-6 py-6">
        <p className="text-sm font-medium text-muted-foreground mb-2">
          {title}
        </p>
        {loading ? (
          <Skeleton data-testid="skeleton" className="h-8 w-24" />
        ) : error ? (
          <>
            {Array.from({ length: errorSlots }).map((_, i) => (
              <p key={i} className="text-2xl font-bold">
                {ERROR_PLACEHOLDER}
              </p>
            ))}
          </>
        ) : (
          <>
            <p className="text-2xl font-bold">{primaryValue}</p>
            {secondaryValue !== undefined && (
              <p className="text-sm text-muted-foreground mt-1">
                {secondaryValue}
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Payment Status Report grid
// ---------------------------------------------------------------------------

interface PaymentStatusGridProps {
  rows: PaymentStatusReportItem[];
  emptyMessage?: string;
}

function PaymentStatusGrid({ rows, emptyMessage }: PaymentStatusGridProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>PaymentCount</TableHead>
          <TableHead>TotalPaymentAmount</TableHead>
          <TableHead>CommissionType</TableHead>
          <TableHead>AgencyName</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={5}
              className="text-center text-muted-foreground"
            >
              {emptyMessage ?? 'No data for selected agency'}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row, idx) => (
            <TableRow key={idx}>
              <TableCell>{row.Status}</TableCell>
              <TableCell className="tabular-nums">{row.PaymentCount}</TableCell>
              <TableCell className="tabular-nums">
                {formatCurrency(row.TotalPaymentAmount ?? null)}
              </TableCell>
              <TableCell>{row.CommissionType}</TableCell>
              <TableCell>{row.AgencyName}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Parked Payments Aging Report grid
// ---------------------------------------------------------------------------

interface AgingGridProps {
  rows: ParkedPaymentsAgingReportItem[];
  emptyMessage?: string;
}

function AgingGrid({ rows, emptyMessage }: AgingGridProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Range</TableHead>
          <TableHead>AgencyName</TableHead>
          <TableHead>PaymentCount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={3}
              className="text-center text-muted-foreground"
            >
              {emptyMessage ?? 'No data for selected agency'}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row, idx) => (
            <TableRow key={idx}>
              <TableCell>{row.Range}</TableCell>
              <TableCell>{row.AgencyName}</TableCell>
              <TableCell className="tabular-nums">{row.PaymentCount}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Skeleton grids (loading state)
// ---------------------------------------------------------------------------

function PaymentStatusSkeletonGrid() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>PaymentCount</TableHead>
          <TableHead>TotalPaymentAmount</TableHead>
          <TableHead>CommissionType</TableHead>
          <TableHead>AgencyName</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[1, 2, 3].map((i) => (
          <TableRow key={i}>
            {[1, 2, 3, 4, 5].map((j) => (
              <TableCell key={j}>
                <Skeleton data-testid="skeleton" className="h-4 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function AgingSkeletonGrid() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Range</TableHead>
          <TableHead>AgencyName</TableHead>
          <TableHead>PaymentCount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[1, 2, 3].map((i) => (
          <TableRow key={i}>
            {[1, 2, 3].map((j) => (
              <TableCell key={j}>
                <Skeleton data-testid="skeleton" className="h-4 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------

type LoadState = 'loading' | 'loaded' | 'error';

export default function DashboardPage() {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [data, setData] = useState<PaymentsDashboardRead | null>(null);
  const [selectedAgency, setSelectedAgency] =
    useState<string>(ALL_AGENCIES_VALUE);

  useEffect(() => {
    let cancelled = false;
    getDashboard()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoadState('loaded');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadState('error');
          toast.error('Failed to load dashboard data. Please try again.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = loadState === 'loading';
  const isError = loadState === 'error';

  // Derived values (only meaningful when loaded)
  const statusReport = data?.PaymentStatusReport ?? [];
  const agingReport = data?.ParkedPaymentsAgingReport ?? [];
  const readyToPayCount = calcReadyToPay(statusReport);
  const parkedCount = calcParked(statusReport);
  const paymentsMadeCount = data?.TotalPaymentCountInLast14Days;
  const paymentsMadeTotal = data ? calcPaymentsMadeTotal(data) : 0;
  const agencies = data ? calcAgencies(data) : [];

  // Filtered rows (client-side — no API call on filter change)
  const filteredStatusReport =
    selectedAgency === ALL_AGENCIES_VALUE
      ? statusReport
      : statusReport.filter((r) => r.AgencyName === selectedAgency);

  const filteredAgingReport =
    selectedAgency === ALL_AGENCIES_VALUE
      ? agingReport
      : agingReport.filter((r) => r.AgencyName === selectedAgency);

  // BA-3: "0" when present and zero; "—" (em-dash) when absent or null
  const paymentsMadeCountDisplay =
    paymentsMadeCount === null || paymentsMadeCount === undefined
      ? '—'
      : String(paymentsMadeCount);

  return (
    <main className="container mx-auto px-4 py-8 space-y-8">
      {/* Metric Cards — always visible regardless of filter */}
      <section aria-label="Dashboard metrics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Ready to Pay */}
          <MetricCard
            title="Ready to Pay"
            primaryValue={String(readyToPayCount)}
            loading={isLoading}
            error={isError}
          />

          {/* Payments Made (Last 14 Days) — has TWO value slots (count + total),
              so errorSlots=2 to show two error placeholders per BA-1 */}
          <MetricCard
            title="Payments Made (Last 14 Days)"
            primaryValue={paymentsMadeCountDisplay}
            secondaryValue={
              isLoading || isError
                ? undefined
                : formatCurrency(paymentsMadeTotal)
            }
            loading={isLoading}
            error={isError}
            errorSlots={2}
          />

          {/* Parked */}
          <MetricCard
            title="Parked"
            primaryValue={String(parkedCount)}
            loading={isLoading}
            error={isError}
          />
        </div>
      </section>

      {/* Report grids — hidden on error */}
      {!isError && (
        <section aria-label="Report grids">
          {/* Agency filter dropdown */}
          <div className="mb-4 flex items-center gap-3">
            <label htmlFor="agency-filter" className="text-sm font-medium">
              Filter by Agency:
            </label>
            {/* security-ignore: read-only agency filter — no user-submitted data, no validation required */}
            <Select
              value={selectedAgency}
              onValueChange={setSelectedAgency}
              disabled={isLoading}
            >
              <SelectTrigger id="agency-filter" className="w-64">
                <SelectValue placeholder="All Agencies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_AGENCIES_VALUE}>All Agencies</SelectItem>
                {agencies.map((agency) => (
                  <SelectItem key={agency} value={agency}>
                    {agency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Status Report */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">
              Payment Status Report
            </h2>
            {isLoading ? (
              <PaymentStatusSkeletonGrid />
            ) : (
              <PaymentStatusGrid
                rows={filteredStatusReport}
                emptyMessage="No data for selected agency"
              />
            )}
          </div>

          {/* Parked Payments Aging Report */}
          <div>
            <h2 className="text-lg font-semibold mb-3">
              Parked Payments Aging Report
            </h2>
            {isLoading ? (
              <AgingSkeletonGrid />
            ) : (
              <AgingGrid
                rows={filteredAgingReport}
                emptyMessage="No data for selected agency"
              />
            )}
          </div>
        </section>
      )}
    </main>
  );
}
