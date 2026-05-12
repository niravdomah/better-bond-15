# Epic 2: Dashboard

## Description

Implements the Dashboard home page at route `/`. Fetches `GET /v1/payments/dashboard` on mount and renders three metric cards (Ready to Pay count, Payments Made Last 14 Days count + total value, Parked count), a Payment Status Report grid, and a Parked Payments Aging Report grid. Both grids share a single client-side AgencyName filter dropdown. Metric cards always show overall totals regardless of the agency filter. Full loading (skeleton), error (toast + card placeholders), and empty (per-grid message) states are included.

This epic requires Epic 1 (Foundation) to be complete: auth middleware, navigation bar, API client, Sonner toast infrastructure, `formatCurrency` utility, and MortgageMax branding tokens must all be in place before this epic is implemented.

## Stories

1. **Story 2.1 — Dashboard Page with Metric Cards and Report Grids** - Replaces the template placeholder at `app/(protected)/page.tsx` with the full Dashboard page: three metric cards derived from `PaymentsDashboardRead`, Payment Status Report grid (Status, PaymentCount, TotalPaymentAmount, CommissionType, AgencyName), Parked Payments Aging Report grid (Range, AgencyName, PaymentCount), shared AgencyName filter dropdown, skeleton loading states, toast-only error state, and per-grid empty state. | File: `story-1-dashboard-page.md` | Status: Pending
