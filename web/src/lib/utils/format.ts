/**
 * Shared formatting utilities for the BetterBond Commission Payments application.
 *
 * Locked specs (from resolved BA decisions):
 * - BA-1: formatDate("2024-03-15") → "15 Mar 2024" (day, abbreviated month, full year)
 * - BA-2: formatCurrency(null|undefined) → "—" (em-dash U+2014); real zero → "R 0.00"
 * - BA-3: formatDate(null|undefined|""|unparseable) → "—" (em-dash U+2014)
 */

const EM_DASH = '—';

/**
 * Formats a numeric value as a South African Rand currency string.
 *
 * Returns "—" for null or undefined. Returns "R 0.00" for real zero.
 * Uses comma as thousands separator and period as decimal separator.
 *
 * @example formatCurrency(1234567.89) // "R 1,234,567.89"
 * @example formatCurrency(0)          // "R 0.00"
 * @example formatCurrency(null)       // "—"
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return EM_DASH;
  }

  // en-ZA uses spaces as thousands separators in some environments — normalise to commas
  // and ensure the decimal point is a period.
  // Build deterministically: format the absolute value with grouping, then prepend "R ".
  const parts = Math.abs(value).toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const decPart = parts[1];
  const sign = value < 0 ? '-' : '';

  return `${sign}R ${intPart}.${decPart}`;
}

/**
 * Formats an ISO date string as "DD MMM YYYY" (e.g., "15 Mar 2024").
 *
 * Returns "—" for null, undefined, empty string, or any unparseable input.
 * Accepts both date-only ("2024-03-15") and datetime ("2024-03-15T00:00:00") strings.
 *
 * @example formatDate("2024-03-15")          // "15 Mar 2024"
 * @example formatDate("2024-03-15T00:00:00") // "15 Mar 2024"
 * @example formatDate(null)                  // "—"
 * @example formatDate("not-a-date")          // "—"
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return EM_DASH;
  }

  // Parse the date. If it contains a 'T' treat as local datetime to avoid
  // UTC offset shifting the displayed day. For date-only strings append
  // T00:00:00 so the browser parses them as local time, not UTC.
  const normalized = value.includes('T') ? value : `${value}T00:00:00`;
  const date = new Date(normalized);

  if (isNaN(date.getTime())) {
    return EM_DASH;
  }

  const day = date.getDate();
  const month = date.toLocaleString('en-GB', { month: 'short' });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}
