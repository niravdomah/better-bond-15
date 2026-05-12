# Test Design: Top Navigation Bar and App Shell

## Story Summary

**Epic:** 1 — Foundation: Auth, Branding, Navigation, and API Setup
**Story:** 2 of 3
**As a** payment administrator
**I want** a persistent top navigation bar on every authenticated page
**So that** I can move between Dashboard, Payment Management, and Payments Made without losing context, and I can immediately identify this as a MortgageMax application.

## Review Purpose

This document presents concrete business examples for BA review before executable tests are written.

Its purpose is to:
- surface missing business decisions
- let the BA review behavior using examples and expected outcomes
- provide an approved source for downstream test generation

## Business Behaviors Identified

- The navigation bar is always visible on every authenticated (protected) page — it is never hidden or collapsed out of the DOM.
- Exactly three navigation links are shown: "Dashboard", "Payment Management", and "Payments Made" — no others.
- The link matching the current URL path is visually highlighted as the active route using teal text and a bottom border (`border-b-2 border-secondary`); the remaining two links are not highlighted.
- Clicking a non-active navigation link takes the user to the corresponding page.
- The navigation bar carries MortgageMax branding: navy background (`#1A3A6E`), the MortgageMax logo on the left, and white inactive link text.
- A Sign Out button is present on the right side of the navigation bar. The nav bar structure from left to right is: MortgageMax logo | three navigation links (center) | Sign Out button (right).
- The application is light mode only — no dark mode classes or dark theme toggle is present anywhere.
- The template's hand-rolled toast system (custom `Toast.tsx`, `ToastContainer.tsx`, `ToastContext`) is removed and replaced entirely with Shadcn Sonner.
- Toast notifications are visible when triggered, auto-dismiss after exactly 5 seconds (`duration: 5000` in Sonner config), and can be dismissed manually before the timer expires.
- On desktop screens (1280px wide), all three navigation links are displayed in a single horizontal row.
- On mobile screens (375px wide), a hamburger button is displayed. Tapping the hamburger opens a Shadcn `<Sheet>` drawer revealing all three navigation links; tapping a link closes the drawer and navigates to the selected page.
- Keyboard users can Tab through every navigation link (and the Sign Out button) in logical order, and each interactive element shows a visible focus indicator.
- Screen readers identify the nav as a navigation landmark and identify the active link via `aria-current="page"`.

## Key Decisions Surfaced by AI

All four BA decisions for this story have been resolved:

- **BA-1 (mobile nav):** Approved — Hamburger button + Shadcn `<Sheet>` drawer. Links are hidden until the hamburger is tapped.
- **BA-2 (active-link treatment):** Approved — Style guide specification: teal text + bottom border (`border-b-2 border-secondary`); no background highlight.
- **BA-3 (sign-out):** Approved — Sign Out button added to the right side of the nav bar. AC-10 remains in scope. Nav bar structure: logo (left) + three links (center) + Sign Out button (right).
- **BA-4 (toast duration):** Approved — Exactly 5 seconds. Sonner `<Toaster>` config must pass `duration: 5000`.

## Test Scenarios / Review Examples

### 1. Four nav bar sections are present on every authenticated page

| Setup | Value |
| --- | --- |
| User state | Signed in |
| Current page | Dashboard (stub at `/`) |

| Expected | Value |
| --- | --- |
| MortgageMax logo | Visible on the left side of the nav bar |
| Navigation link 1 | "Dashboard" is visible |
| Navigation link 2 | "Payment Management" is visible |
| Navigation link 3 | "Payments Made" is visible |
| Sign Out button | Visible on the right side of the nav bar |
| No other nav links | No additional links appear between or beside the three navigation links |

---

### 2. Dashboard link is highlighted when the user is on the Dashboard page

| Setup | Value |
| --- | --- |
| User state | Signed in |
| Current page | Dashboard (stub at `/`) |

| Expected | Value |
| --- | --- |
| "Dashboard" link | Teal text and bottom border (`border-b-2 border-secondary`) applied |
| "Payment Management" link | No teal text, no bottom border |
| "Payments Made" link | No teal text, no bottom border |
| Active link attribute | "Dashboard" link carries `aria-current="page"` |

---

### 3. Payment Management link is highlighted when the user is on the Payment Management page

| Setup | Value |
| --- | --- |
| User state | Signed in |
| Current page | Payment Management (stub at `/payment-management`) |

| Expected | Value |
| --- | --- |
| "Payment Management" link | Teal text and bottom border (`border-b-2 border-secondary`) applied |
| "Dashboard" link | No teal text, no bottom border |
| "Payments Made" link | No teal text, no bottom border |
| Active link attribute | "Payment Management" link carries `aria-current="page"` |

---

### 4. Payments Made link is highlighted when the user is on the Payments Made page

| Setup | Value |
| --- | --- |
| User state | Signed in |
| Current page | Payments Made (stub at `/payments-made`) |

| Expected | Value |
| --- | --- |
| "Payments Made" link | Teal text and bottom border (`border-b-2 border-secondary`) applied |
| "Dashboard" link | No teal text, no bottom border |
| "Payment Management" link | No teal text, no bottom border |
| Active link attribute | "Payments Made" link carries `aria-current="page"` |

---

### 5. Clicking a navigation link navigates to the correct page

| Setup | Value |
| --- | --- |
| User state | Signed in |
| Starting page | Dashboard (stub at `/`) |

| Input | Value |
| --- | --- |
| Action | Click the "Payment Management" link |

| Expected | Value |
| --- | --- |
| URL after click | `/payment-management` |
| Page content | Payment Management stub page content visible |

| Input | Value |
| --- | --- |
| Action | Click the "Payments Made" link |

| Expected | Value |
| --- | --- |
| URL after click | `/payments-made` |
| Page content | Payments Made stub page content visible |

---

### 6. MortgageMax branding is applied to the navigation bar

| Setup | Value |
| --- | --- |
| User state | Signed in |
| Current page | Any authenticated page |

| Expected | Value |
| --- | --- |
| Nav bar background | Navy (`#1A3A6E`) |
| MortgageMax logo | Visible in the nav bar (left side) |
| Logo alt text | "MortgageMax" (or equivalent descriptive text) |
| Inactive link color | White |
| Dark mode classes | None present — light mode only |

---

### 7. Shadcn Sonner replaces the custom toast system

| Setup | Value |
| --- | --- |
| Application state | Running with the authenticated layout loaded |

| Expected | Value |
| --- | --- |
| Custom toast files | `Toast.tsx`, `ToastContainer.tsx`, and `ToastContext` / `useToast` (custom) are removed from the codebase |
| Sonner `<Toaster />` | Present in the layout (root or protected) — renders in the DOM |
| Sonner duration config | `<Toaster duration={5000} />` — the duration prop is set to exactly 5000 ms |
| Toast import used in client code | `import { toast } from 'sonner'` — no custom context wrapper |

---

### 8. Toast notifications appear, auto-dismiss at exactly 5 seconds, and can be manually dismissed

| Setup | Value |
| --- | --- |
| Application state | Sonner `<Toaster duration={5000} />` present in layout |

| Input | Value |
| --- | --- |
| Action | A toast is triggered (e.g., via a test utility call to `toast('Test message')`) |

| Expected — visible | Value |
| --- | --- |
| Toast message | Appears immediately after trigger |
| Auto-dismiss | After exactly 5 seconds with no user interaction, the toast is gone |

| Input | Value |
| --- | --- |
| Action | User clicks the toast before the 5-second timer expires |

| Expected — manual dismiss | Value |
| --- | --- |
| Toast | Dismissed immediately on click |

---

### 9. Desktop layout: all three links and Sign Out button are visible in a horizontal row

| Setup | Value |
| --- | --- |
| User state | Signed in |
| Viewport width | 1280px (desktop) |

| Expected | Value |
| --- | --- |
| "Dashboard" link | Visible without scrolling or expanding any menu |
| "Payment Management" link | Visible without scrolling or expanding any menu |
| "Payments Made" link | Visible without scrolling or expanding any menu |
| Sign Out button | Visible on the right side of the nav bar |
| Layout orientation | All three links and Sign Out button displayed in a single horizontal row |

---

### 10. Mobile layout: hamburger button opens Sheet drawer at 375px

| Setup | Value |
| --- | --- |
| User state | Signed in |
| Viewport width | 375px (mobile) |

| Expected — initial state | Value |
| --- | --- |
| Hamburger button | Visible in the nav bar |
| Navigation links | Hidden (not visible until hamburger is tapped) |

| Input | Value |
| --- | --- |
| Action | User taps the hamburger button |

| Expected — drawer open | Value |
| --- | --- |
| Shadcn Sheet drawer | Opens (slides in) |
| "Dashboard" link | Visible inside the drawer |
| "Payment Management" link | Visible inside the drawer |
| "Payments Made" link | Visible inside the drawer |

| Input | Value |
| --- | --- |
| Action | User taps a link inside the open drawer |

| Expected — after link tap | Value |
| --- | --- |
| Sheet drawer | Closes |
| Navigation | User is taken to the tapped page |

| Input | Value |
| --- | --- |
| Action | User closes the drawer without tapping a link (sheet close / swipe dismiss) |

| Expected — drawer closed | Value |
| --- | --- |
| Sheet drawer | Closes without navigating |
| Navigation links | Hidden again (back to initial mobile state) |

---

### 11. Sign Out button triggers sign-out flow

| Setup | Value |
| --- | --- |
| User state | Signed in |
| Current page | Any authenticated page |

| Input | Value |
| --- | --- |
| Action | Click the "Sign Out" button in the nav bar |

| Expected | Value |
| --- | --- |
| Auth session | Ended (user is signed out) |
| Redirect | User is taken to the BFF sign-in page (or the app entry point) |
| Nav bar | No longer visible (user is no longer authenticated) |

---

### 12. Keyboard and screen reader accessibility

| Setup | Value |
| --- | --- |
| User state | Signed in |
| Current page | Any authenticated page |

| Input | Value |
| --- | --- |
| Action | Press Tab repeatedly starting from the top of the page |

| Expected — keyboard | Value |
| --- | --- |
| Reach "Dashboard" link | Yes — reachable via Tab |
| Reach "Payment Management" link | Yes — reachable via Tab |
| Reach "Payments Made" link | Yes — reachable via Tab |
| Reach Sign Out button | Yes — reachable via Tab |
| Focus indicator | Visible outline or highlight on each interactive element when focused |
| Tab order | Logo / links / Sign Out button reached in logical reading order (left to right) |

| Expected — screen reader | Value |
| --- | --- |
| Navigation landmark | `<nav>` element (or `role="navigation"`) wraps the nav bar |
| Active link announcement | Active link carries `aria-current="page"` so screen readers announce it as the current page |

## Edge and Alternate Examples

### Active link styling does not bleed to inactive links

| Setup | Value |
| --- | --- |
| User state | Signed in |
| Current page | Payment Management (`/payment-management`) |

| Expected | Value |
| --- | --- |
| Links with active style | Exactly one — "Payment Management" has teal text and `border-b-2 border-secondary` |
| "Dashboard" | No teal text, no bottom border |
| "Payments Made" | No teal text, no bottom border |
| Sign Out button | No active style — it is not a navigable route |

---

### Active-link treatment matches style guide specification exactly

| Setup | Value |
| --- | --- |
| User state | Signed in |
| Current page | Dashboard (`/`) |

| Expected | Value |
| --- | --- |
| Active "Dashboard" link | Teal color text applied (secondary color token, `#0D9488` per design tokens) |
| Active "Dashboard" link | Bottom border `border-b-2 border-secondary` applied |
| Active "Dashboard" link | No background fill / highlight applied |
| Inactive links | No teal text, no bottom border, no background fill |
| No dark mode variant | No `dark:` CSS class on any nav element |

---

### Mobile: closing the drawer without navigating leaves the user on the current page

| Setup | Value |
| --- | --- |
| User state | Signed in |
| Viewport width | 375px |
| Current page | Dashboard (`/`) |

| Input | Value |
| --- | --- |
| Action 1 | Tap hamburger to open Sheet drawer |
| Action 2 | Dismiss drawer (tap outside or use the Sheet close control) without selecting a link |

| Expected | Value |
| --- | --- |
| Current page after dismiss | Still Dashboard — no navigation occurred |
| Sheet drawer | Closed |
| Nav bar | Shows hamburger button again |

## Out of Scope / Not For This Story

- Dashboard, Payment Management, and Payments Made page content — stub pages with a single heading only.
- Any payment data, API calls, or data tables — covered in Epics 2–4.
- Sign-in page and authentication flow — covered in Story 1.1.
- Toast notifications triggered by real API mutations — toast wiring is verified in Epics 3–4; this story only verifies that Sonner is installed with the correct duration config and a triggered toast behaves correctly.
- Dark mode toggle or dark theme — explicitly out of scope per NFR3.
- Audit logging, user roles, or per-agency access restrictions — out of scope per FRS.
- Search or free-text filtering in the nav bar.
- Any confirmation dialogs for navigation actions.
- User identity display (name, avatar) in the nav bar — not required by the FRS for this POC.
