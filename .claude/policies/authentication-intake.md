# Authentication Intake Policy

## Core Principle

Authentication is a critical architectural decision. **Never simplify, fold, or skip authentication questions during INTAKE.** Always present the full set of options explicitly, even when the answer seems obvious from existing documentation.

There are **two distinct auth concerns** in INTAKE — keep them separate:

1. **User-facing auth** (how end users sign in) — covered by the rules below.
2. **Backend API auth** (how the frontend authenticates to a backend service) — covered by the "Backend API Auth" section at the end of this file. This concern is owned by the `api-connectivity-agent` (Step 4b of `/start`), but the policy lives here so reviewers see both halves of the auth picture in one place.

---

## Mandatory Rules

1. **Always ask the explicit authentication question** with all three options:
   - "Backend For Frontend (BFF)" — with description of what it means
   - "Frontend-only (next-auth)" — with description and trade-off warning
   - "Custom" — with open-ended follow-up

2. **Never infer the auth method** from API specs, documentation, or other context. The user must explicitly choose.

3. **Never fold auth into a simpler question.** Do not combine it with other questions or rephrase it as "How will authentication work?" — use the exact options above.

4. **If BFF is selected**, always ask the three follow-up sub-questions (login URL, userinfo URL, logout URL) and display the backend requirements note. Also surface the **CI implication**:

   > "CI cannot reach your BFF at the configured URL. The Performance quality gate runs Lighthouse against mocks via `NEXT_PUBLIC_USE_MOCK_API=true` (see the performance job in `.github/workflows/pr-checks.yml`). Lighthouse measures the mocked path, not your real auth flow — useful for Accessibility and Best Practices, less meaningful for Performance numbers. For real-backend audits, point Lighthouse at a reachable staging URL via `LIGHTHOUSE_TARGET_URL` (see `web/lighthouserc.js`)."

5. **If frontend-only is selected**, always display the trade-off warning about backend API calls not carrying session context.

6. **If Custom is selected**, always ask the open-ended follow-up for full details.

## Rationale

Authentication architecture affects every layer of the application — routing, middleware, API client configuration, session management, and security. Skimming over it leads to incorrect assumptions that are expensive to fix later. Even when documentation hints at an answer, the user must confirm explicitly.

---

## Backend API Auth (Step 4b — `api-connectivity-agent`)

This section governs how the *frontend* authenticates to the *backend API* — a separate concern from how end users sign in. Even when user-facing auth is handled by a BFF (so end users never see backend tokens), the dev environment usually still needs a way to call the backend during local development and integration testing. Skipping this question is the single most common cause of "first API call fails" later in the workflow.

### Mandatory rules

1. **Always run the connectivity check at Step 4b**, except when `dataSource` is `mock-only` or `new-api`. Do not let the user opt out of the *check itself* — they can opt out of supplying credentials (which captures Shape 3 in the manifest), but the agent must still parse the spec and persist what it found.

2. **Source `securitySchemes` from the OpenAPI spec** when one exists. Don't ask the user to repeat what the spec already declares. Surface what was found and confirm.

3. **Never accept credential VALUES via chat.** Per [CLAUDE.md §1](../../CLAUDE.md), session logs are committed to git. Credentials must move through `web/.env.local` (gitignored) only. The agent reads env var presence, never values.

4. **Capture env var NAMES in the manifest, never values.** `context.backendConnectivity.credentialEnvVars` is an array of names like `["API_TOKEN"]`. Values are read at runtime by the API client via `process.env`.

5. **Run a real curl smoke test when the backend is reachable.** Don't accept "looks fine in the spec" as proof. A 2xx round-trip is the proof.

6. **Distinguish failure categories.** A 401 means something different than a connection refused. The agent's `category` field maps to a specific remediation question — never use a generic "API call failed" message.

7. **Cap retries at 3 attempts.** After three failures, persist Shape 3 (unverified) and let the user proceed to DESIGN. Do not block the workflow on a backend that genuinely isn't ready yet — that's what the warning and the `api-smoke-test.sh` artifact are for.

8. **Save the artifact even on failure.** `generated-docs/context/api-smoke-test.sh` is a useful starting point for the user to debug independently, regardless of outcome.

9. **Curl-fallback secret handling.** When the user pastes an example curl as a fallback (Step 4b — see "Curl-fallback usage" below), literal credentials in the pasted curl ARE accepted but MUST be moved to `web/.env.local` and replaced with `${VAR_NAME}` placeholders before any agent output, manifest write, or artifact generation. The agent must set `redacted_literals_detected: true` in its return so the orchestrator surfaces a rotation warning to the user — the original message containing the literal is in `.claude/logs/*.md`, which is committed to git per [CLAUDE.md §1](../../CLAUDE.md). This is the ONLY pathway by which a literal credential is ever moved through the agent; bare credential pastes (without curl context) are still refused per Rule 3.

### What "captured but unverified" means

When the user hits the 3-attempt cap and proceeds anyway, the manifest gets Shape 3 (`smokeTest.verifiedStatus: null`, `warning: "..."`). Downstream agents must treat this as a real signal:

- The `developer` agent should not assume the backend is reachable. If a story implementation needs a real backend call, surface the warning to the user before writing code that depends on it.
- `/api-status` displays the warning prominently when Shape 3 is present.
- `/api-go-live` re-runs the captured smoke test against the URL the user is going live with **before** flipping `NEXT_PUBLIC_USE_MOCK_API` off. A non-2xx blocks the flip by default; the user can override with "Flip anyway," which persists a warning to `backendConnectivity.warning` so `/api-status` continues to surface it.

### Curl-fallback usage

When the spec-driven smoke test cannot run cleanly, the orchestrator offers the user the option to paste a working curl. This is a **remediation path**, not a first-class entry point — the spec remains the primary source of truth when present and usable.

**Triggers (per Step 4b in `start.md`):**

- `curl_fallback_recommended: true` from Call A — set by the agent when `spec_status: missing`, when no safe-to-probe `GET` endpoint exists, or when the spec is so partial that auth + base URL are both unresolvable.
- `result: credentials_missing` — env vars not set; the user can paste a curl with literals as an alternative to manually populating `.env.local`.
- `result: failure` with `should_retry: true` — for any category (`dns`, `connection_refused`, `auth_invalid`, `forbidden`, `not_found`, `curl_parse_error`). "Paste a working curl instead" is always one of the AskUserQuestion options alongside the category-specific remediation.
- `result: skipped` — after a deferred Shape 1 or Shape 3 write, the user can verify connectivity by pasting a curl. The agent overwrites the existing shape based on the curl-driven smoke-test result.

**User behaviour:**

- **Recommended:** Replace credential values with `$ENV_VAR_NAME` placeholders before pasting (e.g., `Authorization: Bearer $API_TOKEN`). The agent records the env var names; the user fills `web/.env.local` themselves. Nothing sensitive enters the chat transcript.
- **Fallback (per Rule 9):** Paste the real curl as-is. The agent auto-redacts each literal credential to `web/.env.local`, rewrites the curl with placeholders for all subsequent persistence, and flags the rotation requirement to the orchestrator.

**Persistence:** The curl-fallback path always persists `sourceMethod: "user_curl"` and the redacted `userCurlExample` in `context.backendConnectivity` (Shape 2 or Shape 3). Downstream agents — particularly `developer`, `/api-status`, `/api-go-live`, and `/api-mock-refresh` — can re-run the smoke test from the captured curl without re-prompting the user.

### Rationale

Backend API connectivity is the load-bearing assumption for everything that follows DESIGN. If the harness designs an API spec, generates types, generates mock handlers, then writes a story that calls a real endpoint — and the first real call fails because nobody asked about auth in INTAKE — the user has to unwind several phases of work to fix a question that should have been asked at the start. Front-load the friction.
