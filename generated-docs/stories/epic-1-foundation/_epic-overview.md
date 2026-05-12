# Epic 1: Foundation — Auth, Branding, Navigation, and API Setup

## Description

Configures next-auth with a single-role credentials provider, applies MortgageMax branding (navy `#1A3A6E`, teal accent, light mode only), implements the top navigation bar with active-route highlighting, and verifies the API client is wired correctly to `http://localhost:8042`. Replaces all template auth/demo code that conflicts with the FRS (4-role demo users, multi-role RoleGate, custom toast context) with FRS-compliant equivalents.

This epic is the prerequisite for all other epics. It delivers no business-feature pages, but it makes every subsequent story possible by establishing: authenticated route protection, the application shell, branding tokens, and a smoke-tested API client.

## Stories

1. **Story 1.1 — MortgageMax Branding and Sign-In Page** - Replace the template sign-in page with MortgageMax-branded UI (navy/teal palette, logo or wordmark, light mode only). Configure next-auth credentials provider with a single demo user (`admin@example.com` / `Admin123!`) reflecting the FRS single-role model. Remove signup, signout, and forbidden auth routes that are out of scope for the POC. Verify redirect to Dashboard on success and error display on failure. | File: `story-1-branding-and-signin.md` | Status: Pending
2. **Story 1.2 — Top Navigation Bar and App Shell** - Build the top navigation bar (Dashboard, Payment Management, Payments Made links with active-route highlight), apply MortgageMax branding tokens to the `(protected)` layout, and replace the template's custom toast context with Shadcn Sonner. The nav renders on all protected pages; it is verified via stub pages added in this story and replaced with real pages in Epics 2–4. | File: `story-2-top-nav-and-app-shell.md` | Status: Pending
3. **Story 1.3 — API Client Configuration and Utilities** - Verify the existing API client is pointed at `http://localhost:8042` (no proxy), add TypeScript types generated from `generated-docs/specs/api-spec.yaml`, add endpoint functions for all 10 FRS-defined endpoints (dashboard, payments CRUD, batches, PDF download, demo reset), add a `formatCurrency` utility (R format per BR9), and add a `formatDate` utility. Smoke-test `GET /v1/payments/dashboard` from the client. | File: `story-3-api-client-and-utilities.md` | Status: Pending
