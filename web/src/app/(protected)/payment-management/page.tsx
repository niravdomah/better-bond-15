'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { toast } from 'sonner';
import {
  getPayments,
  parkPayments,
  unparkPayments,
  createPaymentBatch,
} from '@/lib/api/endpoints';
import type { NormalisedPaymentRead } from '@/lib/api/endpoints';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { PAGINATION } from '@/lib/utils/constants';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

const PAYMENTS_TOAST_TEXT = 'Failed to load payments. Please try again.';
const EMPTY_STATE_MESSAGE = 'No payments ready for processing.';
const ALL_AGENCIES_VALUE = '__all__';

const PARK_SUCCESS_TOAST = 'Payments parked successfully.';
const UNPARK_SUCCESS_TOAST = 'Payments unparked successfully.';
const PARK_FAILURE_TOAST = 'Failed to park payments. Please try again.';
const UNPARK_FAILURE_TOAST = 'Failed to unpark payments. Please try again.';

const INITIATE_SUCCESS_TOAST = 'Payment batch created successfully.';
const INITIATE_FAILURE_TOAST =
  'Failed to initiate payment batch. Please try again.';

// ---------------------------------------------------------------------------
// Column definitions (13 required columns in required order — AC-4, AC-5)
// ---------------------------------------------------------------------------

const COLUMN_HEADERS = [
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
// Cell renderer — maps column name to payment field value
// ---------------------------------------------------------------------------

function renderCell(
  payment: NormalisedPaymentRead,
  column: (typeof COLUMN_HEADERS)[number],
): React.ReactNode {
  switch (column) {
    case 'Reference':
      return payment.Reference ?? '—';
    case 'AgencyName':
      return payment.AgencyName ?? '—';
    case 'AgentName':
      return payment.AgentName ?? '—';
    case 'AgentSurname':
      return payment.AgentSurname ?? '—';
    case 'ClaimDate':
      return formatDate(payment.ClaimDate);
    case 'BondAmount':
      return formatCurrency(payment.BondAmount ?? null);
    case 'CommissionType':
      return payment.CommissionType ?? '—';
    case 'CommissionAmount':
      return formatCurrency(payment.CommissionAmount ?? null);
    case 'VAT':
      return formatCurrency(payment.VAT ?? null);
    case 'Status':
      return payment.Status?.StatusCode ?? '—';
    case 'GrantDate':
      return formatDate(payment.GrantDate);
    case 'RegistrationDate':
      return formatDate(payment.RegistrationDate);
    case 'Bank':
      return payment.Bank ?? '—';
    default:
      return '—';
  }
}

// ---------------------------------------------------------------------------
// Load state type (mirrors Dashboard pattern)
// ---------------------------------------------------------------------------

type LoadState = 'loading' | 'loaded' | 'error' | 'refreshing';

// ---------------------------------------------------------------------------
// Skeleton loading grid (AC-20)
// ---------------------------------------------------------------------------

const PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE;

function PaymentSkeletonGrid() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead role="presentation" className="w-10" />
          {COLUMN_HEADERS.map((col) => (
            <TableHead key={col}>{col}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: PAGE_SIZE }, (_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton data-testid="skeleton" className="h-4 w-4" />
            </TableCell>
            {COLUMN_HEADERS.map((col) => (
              <TableCell key={col}>
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
// Grid loading overlay — shown during post-mutation re-fetch (BA-1)
// ---------------------------------------------------------------------------

function GridLoadingOverlay() {
  return (
    <div
      role="status"
      data-testid="grid-loading"
      className="absolute inset-0 bg-background/60 flex items-center justify-center z-10"
      aria-label="Refreshing payment list"
    >
      <Skeleton data-testid="skeleton" className="h-8 w-48" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payment Management Page (primary export)
// ---------------------------------------------------------------------------

export default function PaymentManagementPage() {
  const { data: session } = useSession();

  // State — kept at this level so Stories 3.2 and 3.3 can extend with selection
  // state and mutation buttons without re-architecting.
  const [data, setData] = useState<NormalisedPaymentRead[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [selectedAgency, setSelectedAgency] =
    useState<string>(ALL_AGENCIES_VALUE);
  const [currentPage, setCurrentPage] = useState(1);

  // Story 3.2 — Selection state (Set of payment IDs selected on current page)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Story 3.3 — In-flight state for Initiate Payments (BA-2, AC-21)
  const [isInitiating, setIsInitiating] = useState(false);

  const isLoading = loadState === 'loading';
  const isError = loadState === 'error';
  const isRefreshing = loadState === 'refreshing';

  useEffect(() => {
    let cancelled = false;
    getPayments()
      .then((payments) => {
        if (!cancelled) {
          setData(payments);
          setLoadState('loaded');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadState('error');
          toast.error(PAYMENTS_TOAST_TEXT);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Derived state — agency filter options (AC-14, AC-15)
  // ---------------------------------------------------------------------------

  const agencyOptions = [...new Set(data.map((p) => p.AgencyName ?? ''))]
    .filter(Boolean)
    .sort();

  // ---------------------------------------------------------------------------
  // Derived state — filtered list (AC-16, AC-17, AC-18)
  // ---------------------------------------------------------------------------

  const filteredList =
    selectedAgency === ALL_AGENCIES_VALUE
      ? data
      : data.filter((p) => p.AgencyName === selectedAgency);

  // ---------------------------------------------------------------------------
  // Derived state — paginated rows (AC-8)
  // ---------------------------------------------------------------------------

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const paginatedRows = filteredList.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // Pagination button states (AC-11, AC-12, BA-2)
  const isPrevDisabled = currentPage === 1;
  const isNextDisabled = currentPage * PAGE_SIZE >= filteredList.length;

  // ---------------------------------------------------------------------------
  // Derived state — selection (Story 3.2)
  // ---------------------------------------------------------------------------

  const currentPageIds = paginatedRows
    .map((p) => p.Id)
    .filter((id): id is number => id !== undefined);
  const selectedOnPage = currentPageIds.filter((id) => selectedIds.has(id));
  const allOnPageSelected =
    currentPageIds.length > 0 &&
    selectedOnPage.length === currentPageIds.length;
  const someOnPageSelected =
    selectedOnPage.length > 0 && selectedOnPage.length < currentPageIds.length;

  // Header checkbox state: true (all) | "indeterminate" (some) | false (none)
  const headerCheckedState: boolean | 'indeterminate' = allOnPageSelected
    ? true
    : someOnPageSelected
      ? 'indeterminate'
      : false;

  const hasSelection = selectedIds.size > 0;

  // ---------------------------------------------------------------------------
  // Derived state — Initiate Payments button enable conditions (Story 3.3, BR3)
  // Both conditions must be true for the button to be enabled:
  // 1. A specific agency is selected (not "All Agencies")
  // 2. At least one payment in the filtered list has StatusCode === "READY"
  // ---------------------------------------------------------------------------

  const canInitiate =
    selectedAgency !== ALL_AGENCIES_VALUE &&
    filteredList.some((p) => p.Status?.StatusCode === 'READY');

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  function handleAgencyChange(value: string) {
    setSelectedAgency(value);
    setCurrentPage(1); // AC-19: reset pagination on filter change
    setSelectedIds(new Set()); // AC-7: clear selections on filter change
  }

  function handlePrevPage() {
    setCurrentPage((p) => Math.max(1, p - 1));
    setSelectedIds(new Set()); // AC-6: clear selections on page change
  }

  function handleNextPage() {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
    setSelectedIds(new Set()); // AC-6: clear selections on page change
  }

  // Story 3.2 — Row checkbox toggle
  function handleRowCheckboxChange(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  // Story 3.2 — Header checkbox toggle (select/deselect all on current page)
  function handleHeaderCheckboxChange(checked: boolean | 'indeterminate') {
    if (checked === true) {
      // Select all on current page
      setSelectedIds(new Set(currentPageIds));
    } else {
      // Deselect all on current page
      setSelectedIds(new Set());
    }
  }

  // Story 3.2 — Park handler
  async function handlePark() {
    const ids = Array.from(selectedIds);
    try {
      await parkPayments(ids);
      toast.success(PARK_SUCCESS_TOAST);
      setSelectedIds(new Set());
      setLoadState('refreshing');
      const refreshed = await getPayments();
      setData(refreshed);
      setCurrentPage(1);
      setLoadState('loaded');
    } catch {
      toast.error(PARK_FAILURE_TOAST);
    }
  }

  // Story 3.2 — Unpark handler
  async function handleUnpark() {
    const ids = Array.from(selectedIds);
    try {
      await unparkPayments(ids);
      toast.success(UNPARK_SUCCESS_TOAST);
      setSelectedIds(new Set());
      setLoadState('refreshing');
      const refreshed = await getPayments();
      setData(refreshed);
      setCurrentPage(1);
      setLoadState('loaded');
    } catch {
      toast.error(UNPARK_FAILURE_TOAST);
    }
  }

  // Story 3.3 — Initiate Payments handler (AC-4 through AC-14, AC-21, AC-22, BR3-BR8)
  async function handleInitiatePayments() {
    // AC-9, BR8: If session username is unavailable, redirect to sign-in — do NOT call API
    if (!session?.user?.name) {
      signIn();
      return;
    }

    // Compute READY-status payment IDs for the selected agency (BR4, BR5)
    const readyPaymentIds = filteredList
      .filter(
        (p) =>
          p.AgencyName === selectedAgency && p.Status?.StatusCode === 'READY',
      )
      .map((p) => p.Id as number);

    // AC-21, BA-2: Set in-flight state — button becomes disabled with loading indicator
    setIsInitiating(true);

    try {
      // AC-4, AC-8: Call createPaymentBatch which injects LastChangedUser header
      await createPaymentBatch(readyPaymentIds, session.user.name);

      // AC-10: Show success toast
      toast.success(INITIATE_SUCCESS_TOAST);

      // AC-11: Clear selections
      setSelectedIds(new Set());

      // AC-11: Re-fetch payment list (same refreshing pattern as Park/Unpark)
      setLoadState('refreshing');
      const refreshed = await getPayments();
      setData(refreshed);

      // AC-11: Reset to page 1
      setCurrentPage(1);
      setLoadState('loaded');

      // AC-12: Stay on /payment-management — no navigation call
    } catch {
      // AC-13, BA-1: Show exact failure toast text
      toast.error(INITIATE_FAILURE_TOAST);
      // AC-14: No re-fetch on failure — preserve grid state
    } finally {
      // AC-22: Clear in-flight state so button returns to appropriate enabled/disabled state
      setIsInitiating(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Payment Management</h1>

      {/* Toolbar: Agency filter + Park/Unpark + Initiate Payments action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <label htmlFor="agency-filter" className="text-sm font-medium">
          Filter by Agency:
        </label>
        <Select value={selectedAgency} onValueChange={handleAgencyChange}>
          <SelectTrigger id="agency-filter" className="w-64">
            <SelectValue placeholder="All Agencies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_AGENCIES_VALUE}>All Agencies</SelectItem>
            {agencyOptions.map((agency) => (
              <SelectItem key={agency} value={agency}>
                {agency}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Story 3.2: Park and Unpark action buttons (AC-8, AC-11, AC-13, AC-16, BA-2) */}
        {/* Story 3.3: Initiate Payments button (AC-1 through AC-22) */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            disabled={!hasSelection}
            onClick={handlePark}
          >
            Park
          </Button>
          <Button
            variant="outline"
            disabled={!hasSelection}
            onClick={handleUnpark}
          >
            Unpark
          </Button>
          {/* AC-1 through AC-22, BR3, BA-2 */}
          <Button
            disabled={!canInitiate || isInitiating}
            onClick={handleInitiatePayments}
          >
            {isInitiating && (
              <span
                className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
            )}
            Initiate Payments
          </Button>
        </div>
      </div>

      {/* Payment grid */}
      <div className="relative">
        {/* BA-1: Grid loading overlay shown during post-mutation re-fetch */}
        {isRefreshing && <GridLoadingOverlay />}

        {isLoading ? (
          <PaymentSkeletonGrid />
        ) : isError ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead role="presentation" className="w-10" />
                {COLUMN_HEADERS.map((col) => (
                  <TableHead key={col}>{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>{/* No data rows on error (AC-25) */}</TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {/* Story 3.2: header checkbox column (AC-2, AC-3, AC-4, AC-5) */}
                <TableHead role="presentation" className="w-10">
                  <Checkbox
                    aria-label="Select all"
                    checked={headerCheckedState}
                    onCheckedChange={handleHeaderCheckboxChange}
                  />
                </TableHead>
                {COLUMN_HEADERS.map((col) => (
                  <TableHead key={col}>{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={COLUMN_HEADERS.length + 1}
                    className="text-center text-muted-foreground py-8"
                  >
                    {EMPTY_STATE_MESSAGE}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((payment) => (
                  <TableRow key={payment.Id}>
                    {/* Story 3.2: per-row checkbox (AC-1) */}
                    <TableCell>
                      <Checkbox
                        aria-label={`Select payment ${payment.Reference ?? String(payment.Id)}`}
                        checked={
                          payment.Id !== undefined &&
                          selectedIds.has(payment.Id)
                        }
                        onCheckedChange={(checked) =>
                          payment.Id !== undefined &&
                          handleRowCheckboxChange(payment.Id, checked === true)
                        }
                      />
                    </TableCell>
                    {COLUMN_HEADERS.map((col) => (
                      <TableCell key={col}>
                        {renderCell(payment, col)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination controls (AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, BA-2) */}
      {!isLoading && !isError && (
        <div className="flex items-center gap-3 justify-end">
          <Button
            variant="outline"
            onClick={handlePrevPage}
            disabled={isPrevDisabled}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={handleNextPage}
            disabled={isNextDisabled}
          >
            Next
          </Button>
        </div>
      )}
    </main>
  );
}
