# Feature: [Name]

## Problem Statement

[2-3 sentences: what problem this solves and for whom]

## User Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| [role name] | [who this user is] | [what they can see/do] |

## Functional Requirements

- **R1:** [Testable requirement statement]
- **R2:** [Testable requirement statement]

## Business Rules

- **BR1:** [Explicit condition and outcome]
- **BR2:** [Explicit condition and outcome]

## Data Model

| Entity | Key Fields | Relationships |
|--------|-----------|---------------|
| [entity name] | [field1, field2, ...] | [belongs to X, has many Y] |

## Backend Integration

<!--
Mirror of `context.backendConnectivity` from the intake manifest. Populated when INTAKE Step 4b (api-connectivity-agent) ran and produced Shape 2 (verified) or Shape 3 (captured but unverified). Replace this section with "No backend integration — see manifest dataSource" when dataSource is `mock-only` or `new-api`.

The manifest is the source of truth — this section exists so reviewers can see backend integration alongside the rest of the FRS without opening a JSON file.
-->

| Aspect | Value |
|--------|-------|
| Base URL | [e.g. `https://api.example.com` — from manifest `backendConnectivity.baseUrl`] |
| Auth scheme | [bearer / apiKey / basic / oauth2-client-creds / cookie / none / custom] |
| Auth header | [e.g. `Authorization`, `X-API-Key`] |
| Auth value format | [e.g. `Bearer {token}`, `{token}`] |
| Credential env vars | [e.g. `API_TOKEN` — names only, never values] |
| Smoke-test endpoint | [e.g. `GET /v1/users/me`] |
| Smoke-test status | [e.g. `200 verified 2026-05-06T19:30:00Z` — or `null (deferred — see warning)`] |
| CORS / proxy notes | [e.g. "Backend host differs from localhost — Next.js rewrite proxy needed"] |

## Key Workflows

### [Workflow Name]

1. User does X
2. System responds with Y

## Compliance & Regulatory Requirements

<!-- Only include domains flagged during INTAKE compliance screening. If no compliance domains were triggered, replace this section with: "No compliance domains were identified during intake screening." -->

- **CR1:** [Compliance requirement — e.g., "All card data MUST be handled by Stripe hosted payment fields — no PAN or CVV data touches our servers (PCI-DSS)"]
- **CR2:** [Compliance requirement — e.g., "Users MUST be able to request deletion of their personal data (GDPR — right to erasure)"]

## Non-Functional Requirements

- **NFR1:** [Testable non-functional requirement — e.g., "Page load under 2s on 3G connection"]
- **NFR2:** [Testable non-functional requirement — e.g., "All interactive elements accessible via keyboard navigation"]

## Out of Scope

- [Explicit list of what this feature does NOT include]

## Source Traceability

| ID  | Source | Reference |
|-----|--------|-----------|
| R1   | [filename or "User input"] | [Section/paragraph reference or question that prompted it] |
| BR1  | [filename or "User input"] | [Section/paragraph reference or question that prompted it] |
| NFR1 | [filename or "User input"] | [Section/paragraph reference or question that prompted it] |
| CR1  | [filename or "User input"] | [Section/paragraph reference or question that prompted it] |
