---
description: Start the TDD workflow - begins with INTAKE to gather requirements, then proceeds through DESIGN, SCOPE, and implementation
---

Start the feature development workflow.

**Read and follow all rules in [orchestrator-rules.md](../shared/orchestrator-rules.md) — they are mandatory.**

## Workflow Overview

The workflow has four stages:

**Stage 0: Requirements gathering (INTAKE)**
```
/start → [onboarding routing] → [intake-agent] → [prototype-review-agent (v2 only)] → [api-connectivity-agent] → [intake-brd-review-agent]
                                              INTAKE
```
- Orchestrator: Welcomes user, routes between "share docs", "prototype import", and "guided Q&A" paths
- intake-agent: Scans `documentation/`, orchestrator asks checklist questions (with project context), agent produces manifest
- prototype-review-agent (v2 only): Exports .pen screenshots, extracts enrichments, flags assumptions, cross-validates specs, pre-maps genesis→FRS sections
- api-connectivity-agent: Parses `securitySchemes` from the spec, captures missing backend auth details from the user, runs a curl smoke test against a chosen endpoint, persists `backendConnectivity` to the manifest. Skipped for `mock-only` and `new-api` data sources. Runs before BRD review so connectivity findings (CORS, auth mismatch, 404 on a "complete" spec) flow into the FRS rather than being retrofit later.
- intake-brd-review-agent: Reviews completeness (including `backendConnectivity` findings), orchestrator asks clarifying questions, agent produces FRS

**Stage 1: One-time setup (DESIGN → SCOPE)**
```
/continue → [design-api-agent]       ─┐
            [design-style-agent]    ├─ parallel Call A → sequential approvals → parallel Call B ─┐
            [design-wireframe-agent] ─┘        DESIGN (conditional per manifest)                 ├─ feature-planner
            [type-generator-agent]  ── autonomous (after spec approved) ─────────────────────────┘    SCOPE
```
- DESIGN (mandatory): Orchestrator reads intake manifest, launches agents in parallel (API + Style + Wireframe Call A simultaneously), copies user-provided files when generate=false. After spec approval, type-generator-agent runs autonomously to produce typed API endpoints
- SCOPE: Define ALL epics (no stories yet) → user approves the epic list

**Stage 2: Per-epic (STORIES)**
```
For each epic:
  feature-planner (STORIES) → Define stories for THIS epic → user approves
```

**Stage 3: Per-epic iteration — TDD flow**

All stories in an epic advance one phase at a time as a "pass". The single epic-level QA collapses manual verification across stories and produces ONE commit at the end of the epic.
```
For each epic:
  REALIGN pass (story 1 → 2 → 3)  → TEST-DESIGN pass (story 1 → 2 → 3)
    → WRITE-TESTS pass (story 1 → 2 → 3)
    → IMPLEMENT pass (story 1 → 2 → 3, strict order — story N reads N-1's code)
    → EPIC-QA (single E2E + manual verification + commit covering all stories)
```
See [orchestrator-rules.md § Epic-Level TDD Flow](../shared/orchestrator-rules.md#epic-level-tdd-flow) for the pass-by-pass execution model.

**REALIGN:** Reviews any discovered impacts from previous stories and revises the upcoming story. Auto-completes if no impacts exist.
**TEST-DESIGN:** Produces a BA-reviewable specification-by-example document before tests are written. Surfaces missing business decisions.

This ensures:
- Requirements gathered and reviewed before any development
- Full epic scope visibility before story implementation begins
- Stories defined per-epic (not all upfront) for flexibility
- Tests written immediately before each story (true TDD)
- Quality gates always pass (no skipped tests)
- One epic-level commit after EPIC-QA passes
- Early feedback through per-pass review
- Faster pivots — one epic at a time, with per-story scoping inside each pass
- Implementation learnings feed back into future story planning via REALIGN
- **FRS requirements override template code** — agents must implement what the spec says, not extend template scaffolding (see orchestrator-rules.md § FRS-Over-Template Rule)

## What to Do

### Step 0: Ensure Setup Is Complete

Before starting the workflow, verify that the project environment is ready. Check these two indicators:

1. `web/node_modules/` exists (dependencies installed)
2. `.claude/preferences.json` exists (git preferences configured)

If **both** exist, skip to Step 1 with a brief note: "Project setup is complete. Starting workflow."

If **either** is missing, run `/setup` first (invoke it via the Skill tool). If setup fails, stop and help the user resolve the issue — do not proceed into the workflow with a broken environment.

> **CRITICAL — DO NOT STOP AFTER SETUP.** This is an instruction the model frequently violates. When the Skill tool returns from `/setup`, you are NOT done. Setup is a sub-step of `/start`. You MUST continue to Step 1 in the SAME response — no pausing, no stopping, no waiting, no asking the user. Your job in `/start` is not done until you reach the STOP marker at Step 5.
>
> **Checklist after Skill tool returns:**
> 1. Did setup succeed? → If yes, proceed to Step 1 immediately (next tool call or text output should be Step 1)
> 2. Did setup fail? → Stop and help the user fix it
>
> **DO NOT** output any concluding text like "Ready to go" or "Continuing with the workflow" after setup. Just silently move to Step 1.

### Step 1: Initialize Workflow State

**Initialize the workflow state file.** This ensures `/continue` can resume the workflow if interrupted.

**Important:** This command must run from the **project root** (not `web/`). If setup just completed, the working directory may have shifted. Do NOT prepend `cd ..` — instead, use the project root path directly:

```bash
node .claude/scripts/transition-phase.js --init INTAKE
```

If state already exists, the script returns `"status": "exists"` - this is fine, proceed with the workflow.

### Step 1b: Open Dashboard in Browser

After workflow state is initialized, generate and open the visual dashboard so the user can watch progress throughout the workflow. This is **fire-and-forget** — if it fails, log a warning and continue (do not block the workflow).

```bash
node .claude/scripts/generate-dashboard-html.js --collect
```

If the script succeeds, open the dashboard in the default browser:

```bash
start "" "generated-docs/dashboard.html"
```

Do not display a confirmation message — the dashboard opening silently in the background is sufficient. The user can glance at it throughout the workflow; it auto-refreshes every 10 seconds.

If the script fails, output a single-line warning and continue:
> "Dashboard generation failed — you can run `/dashboard` manually later."

### Step 2: Initialize Progress Display

After initializing workflow state, display the TodoWrite progress list (see shared rules for the script command and pattern).

---

### Step 3: Welcome and Onboarding Routing

Display a welcome message to the user:

> "Welcome to Stadium 8. We'll guide you through requirements, architecture, and test-first development. Let's start by capturing what you're building."

Then ask a routing question using `AskUserQuestion`:

- **Question:** "How would you like to get started?"
- **Options:**
  - "I have existing docs to share" — description: "Copy project materials (specs, requirements, wireframes, API docs) into the documentation/ folder"
  - "I have a prototype repo to import" — description: "Import artifacts from a prototyping tool repo (docs, design tokens, React source)"
  - "Let's build requirements together" — description: "I'll ask questions and we'll define the requirements from scratch"

---

#### Option A: Share Existing Materials

If the user chose "I have existing docs to share":

1. Tell the user:
   > "Drop whatever you have into the `documentation/` folder — feature specs, requirements docs, API schemas, wireframes, design files, meeting notes. Anything goes. I'll work with whatever's there."

2. Use `AskUserQuestion`:
   - **Question:** "Let me know when your files are in place."
   - **Options:** "Ready, I've added my files" / "Actually, let's do guided Q&A instead"

3. If "Ready": Proceed to **Step 4** (Call A will detect Mode 1 or 2 based on what was added).

4. If "Actually, let's do guided Q&A instead": Switch to the **Option C** flow below.

Store the routing result: `onboardingPath = "docs"`. Set `projectDescription = null` (the docs serve as the project description).

---

#### Option B: Prototype Import

If the user chose "I have a prototype repo to import":

1. Ask for the path as a **plain-text prompt** — output the question as regular text, do NOT use `AskUserQuestion` (see [shared rules § Open-ended prompt exception](../shared/orchestrator-rules.md#user-questions-mandatory)):
   > "What's the path to your prototype repo? You can use an absolute path (`C:\Git\my-prototype`) or a relative path (`../my-prototype`)."

2. Run the import script:
   ```bash
   node .claude/scripts/import-prototype.js --from "<user-provided-path>"
   ```

3. If `status: "ok"`: Display the summary based on the `format` field in the output:

   **v2 format** — display:
   ```
   Imported from prototype (v2 format):

     Requirements:  genesis.md (unified requirements document)
     Design:        tokens.css (CSS design tokens) + project.pen (Pencil design)
     API Specs:     [list from apiSpecs array, or "None"]
     Prototype:     [screen count] screens ([screen names from prototypeSrc.screens])
     Mock Data:     [count] fixture files
     Stories:       [count] implementation artifacts (index only)
   ```

   If multiple API specs found, list each on a separate line. If `warning` is set, display it before proceeding.

   **v1 format** — display: file counts, prototype names detected (existing behaviour).

   Store `importFormat = output.format` and `originalRepoPath = output.originalRepoPath` for later use. Then proceed to **Step 4** (Call A will detect Mode 1 from the imported docs).

4. If `status: "error"`: Display the error message and suggestion. Use `AskUserQuestion`:
   - **Question:** "The import didn't work. What would you like to do?"
   - **Options:** "Let me fix the path and try again" / "I'll copy files manually instead" / "Let's do guided Q&A instead"
   - If "fix the path": re-ask for the path and retry
   - If "copy files manually": switch to **Option A** flow
   - If "guided Q&A": switch to **Option C** flow

Store the routing result: `onboardingPath = "prototype"`. Set `projectDescription = null` (the imported docs serve as the project description).

---

#### Option C: Guided Q&A

If the user chose "Let's build requirements together":

1. Ask for the project description as a **plain-text prompt** (see [shared rules § Open-ended prompt exception](../shared/orchestrator-rules.md#user-questions-mandatory)):
   > "What are you building? Give me the elevator pitch — who's it for, what does it do, and what's the core problem it solves. As much or as little detail as you like."

2. Capture the user's response as `projectDescription`.

3. Store the routing result: `onboardingPath = "qa"`. Proceed to **Step 4**.

---

### Step 4: INTAKE Phase — Gather Requirements

INTAKE is always the first phase. It runs two agents sequentially, each using scoped calls with orchestrator-driven user interaction.

#### Step 4a: Intake Agent (up to 3 scoped calls)

**Call A — Scan + Analyze:**

Launch `intake-agent` with prompt:
> "This is Call A — Scan + Analyze. Scan documentation/ for existing specs, catalog what you find, detect operating mode, and return structured results. Do NOT produce the manifest. Do NOT use AskUserQuestion. Do NOT commit."

The agent returns structured scan results including:
- `scan_summary`: what was found in documentation/
- `mode`: 1 (existing specs), 2 (partial), or 3 (from scratch)
- `inferred_answers`: pre-filled checklist answers if docs provide them (Mode 1)
- `has_wireframes`: boolean
- `wireframe_paths`: file paths if applicable

**Orchestrator — Checklist Questions:**

Display the scan summary to the user, then ask the 5 mandatory checklist questions (and conditional sub-questions) sequentially using `AskUserQuestion`.

> **Prototype Assumptions Warning:** When the scan detects prototype docs (`has_prototype_docs: true`), the orchestrator MUST explicitly verify prototype-scoped assumptions with the user. Prototyping tools generate documentation for demo/prototype purposes — their requirements often specify mock APIs, localStorage persistence, simplified auth, or other shortcuts that are appropriate for a demo but NOT for production. This repository builds production-ready, test-driven applications. The checklist questions below are the verification point — do not silently inherit prototype assumptions. When inferred answers come from prototype docs, frame confirmations to surface this distinction (e.g., "The prototype spec says mock API with localStorage — is that what you want for the real app, or will there be a backend API?").

If the user came through **Option B** (prototype import), the scan results will be rich — prototype docs typically define roles, styling, data models, and UI patterns in detail. Leverage this context the same way you would a project description: reference specific prototype findings when asking confirmations (e.g., "The prototype's business-requirements.md defines admin and broker roles with these permissions. Is that the complete picture for the production app?").

If the user came through **Option C** (guided Q&A), they already provided a project description. Use it to make these questions more specific and relevant. For example, if the user described "a commission payments dashboard for brokers and admins," reference that context: "Based on what you've described, it sounds like there are at least broker and admin roles. Who else uses this, and what can each role see and do?"

1. **Roles/Permissions:**
   - If Mode 1 (inferred from docs): "I see the spec mentions [inferred roles]. Is that the complete list, or is there more?"
     - Options: "Yes, that covers it" / "Let me clarify"
   - If Mode 2/3: Reference the project description (if available) to suggest likely roles, then ask: "Who uses this application? What distinct roles exist, and what can each role see and do?"
     - Options provide common patterns; user can use "Other" for free text

2. **Styling/Branding:**
   - If Mode 1: "There's [inferred styling info]. Anything to override or add?"
     - Options: "Use as-is" / "I have additions"
   - If Mode 2/3: "Any specific colors, themes, or design system preferences? Dark mode, light mode, or both?"
     - Options: "No specific preferences" / "Let me describe"

3. **API & Backend Setup** (two questions in a single `AskUserQuestion` call):

   These two concerns are tightly coupled — present them together using the multi-question form of `AskUserQuestion` (the `questions` array accepts 1-4 questions). Each question gets its own header chip, question text, and option set.

   If prototype docs exist and specify mock/localStorage, prepend to Q3a's question text: "The prototype spec calls for mock data with localStorage — that's typical for prototypes. For the production app: "

   If `has_api_spec: true` from scan results, prepend to Q3a's question text: "I found an API spec at [api_spec_paths]. "

   **Q3a** — API Specification:
   - header: `"API spec"`
   - question: `"Do you have an OpenAPI or Swagger specification?"`
   - options (4):
     - label: `"Yes, complete"` — description: `"Covers all the endpoints the app needs"`
     - label: `"Yes, partial"` — description: `"Some endpoints are missing or still being designed — we'll generate the rest"`
     - label: `"No"` — description: `"We'll design the full API spec from your requirements"`
     - label: `"N/A — no backend API"` — description: `"The app won't call a backend (static data, localStorage, etc.)"`

   **Q3b** — Backend Readiness:
   - header: `"Backend"`
   - question: `"Is your backend API up and running?"`
   - options (2):
     - label: `"Yes, it's running"` — description: `"API calls go directly to your backend"`
     - label: `"No, still in development"` — description: `"We'll set up a mock layer so you can build the frontend now"`

   **Decision matrix** — map the combined answers to manifest values:

   | Q3a (Spec?) | Q3b (Backend?) | `dataSource` | `specCompleteness` | Mock layer? |
   |---|---|---|---|---|
   | Yes, complete | Yes, it's running | `existing-api` | `complete` | No |
   | Yes, complete | No, still in development | `api-in-development` | `complete` | Yes |
   | Yes, partial | Yes, it's running | `existing-api` | `partial` | No |
   | Yes, partial | No, still in development | `api-in-development` | `partial` | Yes |
   | No | Yes, it's running | `new-api` | `none` | No |
   | No | No, still in development | `api-in-development` | `none` | Yes |
   | N/A — no backend API | *(any answer)* | `mock-only` | N/A | No |

   **Key rule:** Any answer where the backend is "still in development" triggers `api-in-development` mode with full provenance tracking (`x-source` tags), `/api-status`, `/api-mock-refresh`, and the MSW mock layer. If Q3a is "N/A", Q3b's answer is ignored — always maps to `mock-only`.

   **Spec validation:** If the user chose "Yes, complete" or "Yes, partial" but `has_api_spec: false` from the scan, note: "I didn't find an API spec in documentation/ — please add your OpenAPI/Swagger file there so we can use it." Wait for confirmation before proceeding.

   Capture as: `dataSource`, `specCompleteness: "complete" | "partial" | "none"`, and include both in the Call B user answers block.

4. **Authentication Method:**
   - If Mode 1 (inferred from docs): Check if docs mention an auth approach. If found: "I see the spec mentions [inferred auth approach]. Is that correct?" Options: "Yes, that's right" / "Let me clarify"
   - If Mode 2/3: "How will users authenticate?"
     - Options: "Backend For Frontend (recommended)" / "Frontend-only (next-auth)" / "Custom"
     - "Backend For Frontend" description: "Backend handles OIDC login/logout, sets cookies. Frontend calls backend for user info."
     - "Frontend-only (next-auth)" description: "Next.js handles auth directly using next-auth with credentials/OAuth providers. Note: API calls to the backend will not carry authenticated session context — this approach only protects frontend routes."
     - "Custom" description: "I have a different authentication/authorization approach in mind."
   - If **frontend-only** selected, display this note before proceeding:
     > "With frontend-only auth, authentication is handled entirely in Next.js via next-auth. This protects frontend routes, but API calls to your backend will **not** carry authenticated session context — the backend has no way to verify who the user is. If your backend needs to know the caller's identity, consider BFF instead."
   - If **BFF** selected, display this backend requirements note:
     > "With BFF authentication, your backend will need to:
     > - Expose a **login endpoint** that redirects to the OIDC provider and, after successful authentication, sets an HTTP-only session cookie and redirects back to the frontend
     > - Expose a **userinfo endpoint** that validates the session cookie and returns the authenticated user's details (id, email, name, role)
     > - Expose a **logout endpoint** that clears the session cookie, terminates the OIDC session, and redirects back to the frontend
     > - Handle all token exchange and session management server-side (the frontend never sees OIDC tokens)"
   - Then ask 3 follow-up sub-questions as **plain-text prompts** (open-ended — URLs vary per project, see [shared rules § Open-ended prompt exception](../shared/orchestrator-rules.md#user-questions-mandatory)):
     - "What is the login endpoint URL?" (e.g., `/api/auth/login` or `https://backend.example.com/login`)
     - "What is the userinfo endpoint URL?" (e.g., `/api/auth/userinfo`)
     - "What is the logout endpoint URL?" (e.g., `/api/auth/logout`)
   - If **Custom** selected, ask as a **plain-text prompt** (open-ended, see [shared rules § Open-ended prompt exception](../shared/orchestrator-rules.md#user-questions-mandatory)):
     - "Describe your authentication and authorization approach — what technology, protocol, or pattern will you use, and how should the frontend handle login, logout, and session verification?"
   - Capture as `authMethod: "bff" | "frontend-only" | "custom"`. If BFF: include `bffEndpoints: { login, userinfo, logout }`. If custom: include `customAuthNotes` with the user's description.

5. **Compliance & Regulatory:**

   Before asking this question, scan the user's documentation, project description, and prior checklist answers for compliance keyword triggers (see [compliance policy](../policies/compliance-intake.md) § Keyword Triggers). Build a list of detected domains.

   - If **domains detected:** Present them specifically — e.g., "Based on what you've described, there are a couple of areas where industry regulations may apply:"
     - For each detected domain, ask the domain-specific questions from the compliance policy
     - Example (payment detected): "You mentioned payment processing — how will payments be handled? Options: Third-party provider (Stripe, Adyen, etc.) / Direct card capture / Not decided yet"
     - Example (personal data detected): "The app collects personal information — where will your users be located? This determines which data protection laws apply. Options: EU/UK (GDPR) / South Africa (POPIA) / California (CCPA) / Multiple regions / Not sure"
   - If **no domains detected:** Ask a brief confirmation — "I haven't spotted anything that would trigger specific compliance requirements (like payment processing, personal data collection, or health records). Does that sound right, or is there anything I should know about?"
     - Options: "That's correct" / "Actually, there are compliance considerations"
     - If "Actually...": ask as a **plain-text prompt**: "What compliance or regulatory requirements should we be aware of?"

   Capture as: `complianceDomains: string[]` (e.g., `["pci-dss", "gdpr"]`) and `complianceNotes: string` (free-text details). Include both in the Call B user answers block.

6. **Wireframe quality** (only if `has_wireframes` is true):
   - "Are these wireframes rough references or detailed enough for implementation?"
   - Options: "Rough references" / "Detailed, use as-is"

**Call B — Produce Manifest:**

Launch `intake-agent` with prompt:
> "This is Call B — Produce Manifest. Here are the scan results and user answers:
>
> [paste scan results from Call A]
>
> Onboarding path: [docs, prototype, or qa]
> Project description: [projectDescription text, or "N/A — user provided documentation files" if Option A/B]
>
> User answers:
> 1. Roles/Permissions: [answer]
> 2. Styling/Branding: [answer]
> 3a. API Spec: [user's Q3a answer, e.g., "Yes, partial"]
> 3b. Backend Readiness: [user's Q3b answer, e.g., "No, still in development"]
>    → dataSource: [existing-api|new-api|api-in-development|mock-only]
>    → specCompleteness: [complete|partial|none]
> 4. Authentication Method: [bff|frontend-only|custom]
> 4a. BFF Endpoints: login=[url], userinfo=[url], logout=[url] (only if Authentication Method is "bff")
> 4b. Custom Auth Notes: [user's description] (only if Authentication Method is "custom")
> 5. Compliance Domains: [complianceDomains array, e.g., ["pci-dss", "gdpr"] or []]
> 5a. Compliance Notes: [complianceNotes free-text, or "None"]
> 6. Wireframe Quality: [answer or N/A]
>
> Produce the intake manifest and write it to generated-docs/context/intake-manifest.json. Include the project description in `context.projectDescription` (set to `null` if N/A). Return a human-readable summary. Do NOT commit. Do NOT use AskUserQuestion."

**Orchestrator — Manifest Approval (two-step — display THEN ask):**

> **CRITICAL — You MUST complete BOTH steps below. Skipping step 1 is a known failure mode where the user sees an approval prompt with nothing to review.**

**Step 1 — Display the summary (MANDATORY, do this FIRST):**

Take the human-readable summary that the intake-agent returned from Call B and output it as regular conversation text. Use this format:

```
Here's what I've gathered:

**Project:** [name and 1-sentence description]

**What's already provided:**
- [file name] — [1-sentence description of what it contains]
- [file name] — [1-sentence description]

**What the DESIGN phase will generate:**
- [artifact] — [why it's needed]
- [artifact] — [why it's needed]

**Notes:** [any caveats, e.g., "API is in development — spec covers current endpoints; backend team will add more over time"]
```

**Step 2 — Ask for approval (ONLY after step 1 text is output):**

Call `AskUserQuestion`:
   - "Does this look right? Anything to add or change before we move on?"
   - Options: "Looks good" / "I have changes"

> **Do NOT skip step 1.** The user cannot approve what they haven't seen. The summary must appear as regular text output above the `AskUserQuestion` prompt — never embed it inside the question text, and never call `AskUserQuestion` without displaying the summary first. If the agent's return message is empty or unclear, read `generated-docs/context/intake-manifest.json` and construct the summary yourself.

If "Looks good": proceed to **Step 4a-v2** (if v2 format) or **Step 4b** (otherwise). No Call C needed.

If "I have changes": collect the user's feedback text, then launch Call C.

**Call C — Revise (only if changes requested):**

> "This is Call C — Revise. The user wants these changes: [feedback]. Update the manifest accordingly and return the updated summary. Do NOT commit. Do NOT use AskUserQuestion."

After Call C returns, re-display the updated summary and re-ask approval. Loop until approved.

#### Step 4a-v2: Prototype Review Agent (v2 imports only — single call)

**Skip this step entirely** if the scan results did NOT include `format: v2`. Proceed directly to Step 4b.

This step runs the prototype-review-agent to:
- Export visual screenshots from the .pen design file
- Extract domain enrichments for user review
- Flag prototype assumptions
- Cross-validate data structures against OpenAPI spec(s)
- Pre-map genesis sections to FRS sections
- Update the manifest (set `wireframes.generate = false` if screenshots are exported)

Launch `prototype-review-agent` with prompt:
> "Review the v2 prototype artifacts. The intake manifest is at generated-docs/context/intake-manifest.json. Export screenshots from the .pen file (if it exists), extract enrichments from genesis.md, flag prototype assumptions, cross-validate against OpenAPI specs, and pre-map genesis sections to FRS sections. Return structured PROTOTYPE REVIEW output. Do NOT use AskUserQuestion. Do NOT commit."

**After the agent returns:**

1. **Display screenshots** (if any were exported):
   > "Here are the designs from your prototype — these will serve as wireframes for development:"

   Display a clickable markdown link for each screenshot file:
   > - [payments-dashboard.png](generated-docs/prototype-screenshots/payments-dashboard.png)
   > - [payments-management.png](generated-docs/prototype-screenshots/payments-management.png)

   If no screenshots (no .pen file), skip this display.

2. **Present enrichments** for accept/reject using `AskUserQuestion`:
   > "The prototyping tool suggested these additional considerations:"
   > [list enrichments]

   Options: "Include all" / "Skip all" / "Let me pick"

   If "Let me pick", present each enrichment individually with "Include" / "Skip" options.

3. **Confirm flagged assumptions** using `AskUserQuestion`:
   > "I found these prototype-specific patterns that may not apply to production:"
   > [list assumptions]

   Options: "I'll clarify during the next step" / "These are already addressed in my checklist answers"

4. Store the accepted enrichments, confirmed assumptions, and genesis→FRS mapping. Pass them to the BRD review agent in Step 4b as additional context.

#### Step 4b: API Connectivity Agent (up to 3 scoped calls)

**Skip this step entirely** when `context.dataSource` in the intake manifest is `"mock-only"` or `"new-api"`. Output a single line — "Backend connectivity check skipped (dataSource=[value])." — and proceed to Step 4c (BRD review).

For all other data sources, run the connectivity check now. The goal is to confirm the frontend can reach the backend with valid credentials *before* the FRS is produced — connectivity findings (404 on a "complete" spec, CORS issues, auth-scheme mismatch) are real signals that should feed the FRS, not retrofit it.

> **Why this runs before BRD review:** if the smoke test reveals the backend doesn't actually serve a "complete" spec's endpoints, that's a fundamental signal — `dataSource` should flip from `existing-api` to `api-in-development`, which changes whether mocks get scaffolded later. CORS issues become NFRs in the FRS ("dev calls must go through a Next.js rewrite proxy"). Auth-scheme mismatches become CRs or NFRs. Discovering all this *after* the FRS is committed forces churn.

**Determine the `backendRunning` signal:**

Read the orchestrator's memory of the user's Q3b answer (Backend Readiness):
- Q3b answer was "Yes, it's running" → `backendRunning: true`
- Q3b answer was "No, still in development" → `backendRunning: false`

For `dataSource: "existing-api"` you can also assume `backendRunning: true` unless the user said otherwise.

**Call A — Analyze + Plan:**

Launch `api-connectivity-agent` with prompt:
> "This is Call A — Analyze + Plan. dataSource=[value], backendRunning=[true|false]. Read the OpenAPI spec (look in `documentation/` — DESIGN hasn't run yet, so `generated-docs/specs/api-spec.yaml` won't exist). Parse `securitySchemes` and `security`. Resolve the base URL from spec `servers:`, `web/.env.local`, and `web/.env.example` — flag divergence. Pick a smoke-test endpoint. Build the gap list. Return the structured CONNECTIVITY PLAN. Do NOT run curl yet. Do NOT use AskUserQuestion. Do NOT commit."

The agent returns a CONNECTIVITY PLAN block. If `trigger_decision: skip`, the agent has already written Shape 1 to the manifest — display its `skip_reason` and proceed to Step 4c.

**Orchestrator — Surface Findings + Ask About Gaps:**

Display the plan to the user as conversational text. Cover, in order:

1. **What the spec says:** "I read [spec_path] and found [scheme_from_spec] auth on [N] endpoints. The smoke test will hit `[METHOD smoke_test.endpoint]`."
2. **Base URL:** "I'm planning to use `[base_url.proposed]`. [If divergence, explain.]"
3. **CORS heads-up (if `cors_risk: true`):** "Since the backend host differs from `localhost`, browser calls from the dev server will need a Next.js rewrite proxy or matching CORS headers — flagging this so it doesn't surprise us during implementation."

**If `curl_fallback_recommended: true`** (the spec-driven path can't reasonably produce a smoke test on its own — see [api-connectivity-agent.md § Step 6](../agents/api-connectivity-agent.md)):

Before asking spec-derived gap questions, offer the user the option to paste a working curl as the source of truth. Use `AskUserQuestion`:

> "[Reason from agent's `curl_fallback_reason`, e.g., 'No OpenAPI spec was found in documentation/.' or 'The spec only declares mutating endpoints; probing one without your consent isn't safe.'] Want to paste a curl command that you know works against your backend? I'll use it to drive the smoke test."
> Options: "Yes, I'll paste a curl" / "No, walk me through the spec questions" / "Skip the smoke test"

- If "Yes, I'll paste a curl": jump to the **Curl-Paste Sub-Flow** below. Then proceed to Call B with `user_curl_example` populated.
- If "No": continue with the existing gap-asking loop.
- If "Skip": launch Call B with `user_signal: skip` and `user_curl_example: null`.

Otherwise (when `curl_fallback_recommended: false`), then for each item in `gaps_for_user`, ask the user a targeted question. Use `AskUserQuestion` for choices (e.g., "Which auth scheme?") and **plain-text prompts** for open-ended values (e.g., "What header name carries the credential?"). The curl-fallback is still offered later if the smoke test fails or credentials are missing — see the result-interpretation section below.

> **CRITICAL — Credential security:** When you need credential VALUES, do NOT ask the user to paste them in chat. Per [CLAUDE.md §1](../../CLAUDE.md), session logs are committed to git, so any token pasted here ends up in a public log. Instead:
>
> 1. Tell the user the env var name(s) the agent proposed (e.g., `API_TOKEN`).
> 2. Tell the user to add the value to `web/.env.local` themselves (showing the line: `API_TOKEN=<your-value-here>`).
> 3. Use `AskUserQuestion` with options "Ready, the value is in .env.local" / "Skip the smoke test for now".
> 4. If the user pastes a credential anyway, immediately remind them logs are committed and tell them to (a) move the value to `.env.local`, (b) rotate the credential. Then proceed as if they signalled "Ready".

If the user signals "Skip", launch Call B with `user_signal: skip` — the agent will write Shape 1 with that reason and return.

**Call B — Smoke Test + Persist:**

Launch `api-connectivity-agent` with prompt:
> "This is Call B — Smoke Test + Persist. attempt=1.
>
> RESOLVED CONFIG
> base_url: [resolved value]
> auth_scheme: [bearer | apiKey | basic | oauth2-client-creds | cookie | none | custom]
> auth_header: [header name or null]
> auth_value_format: [template, e.g. "Bearer {token}"]
> credential_env_vars: [array of names]
> smoke_test_endpoint: [path]
> smoke_test_method: GET
> user_signal: [ready | skip]
> user_curl_example: [verbatim pasted curl, or null if not provided]
>
> Verify env vars are set in web/.env.local (check presence only, never read values). If `user_curl_example` is non-null, run Step 0 (parse the curl, auto-redact any literal credentials to .env.local, use the parsed values as the source of truth) before the spec-derived path. Run the smoke test by sourcing .env.local and invoking the .sh artifact. Interpret the HTTP status. Write the appropriate backendConnectivity shape to generated-docs/context/intake-manifest.json (set `sourceMethod` and `userCurlExample` accordingly). Save generated-docs/context/api-smoke-test.sh. Update web/.env.example with commented placeholders if new env vars were proposed. Return the SMOKE TEST RESULT block. Do NOT commit. Do NOT use AskUserQuestion."

**Orchestrator — Interpret the Result:**

Read the SMOKE TEST RESULT block:

- **`result: success`** (Shape 2 written): Display a confirmation:
  > "Connectivity verified — `[METHOD] [endpoint]` returned [status]. Saved to `generated-docs/context/api-smoke-test.sh` for re-running later."
  >
  > If `cors_warning: true`, append: "CORS heads-up: the backend didn't return `Access-Control-Allow-Origin` for `localhost:3000`. Browser calls from the dev server will fail unless we add a Next.js rewrite proxy. I'll flag this for the BRD review to capture as an NFR."
  >
  > Proceed to Step 4c.

- **`result: credentials_missing`**: Use `AskUserQuestion`:
  > "I couldn't find [list of env var names] in `web/.env.local`. Want me to wait while you add them, or skip the check?"
  > Options: "Ready, I've added them" / "Paste a working curl instead" / "Skip the check" / "Tell me where to add them"
  >
  > On "Ready" → re-launch Call B with `attempt: 1` again (this isn't a retry, the test never ran).
  > On "Paste a working curl instead" → run the **Curl-Paste Sub-Flow** below, then re-launch Call B with `attempt: 1`, `user_signal: ready`, and `user_curl_example` populated.
  > On "Skip" → launch Call B with `user_signal: skip` and `user_curl_example: null`.
  > On "Tell me where to add them" → display the `web/.env.local` instructions and re-ask.

- **`result: failure`** with `should_retry: true`: Show the user the `remediation_hint` and ask one targeted question via `AskUserQuestion` based on the `category`. **Always include "Paste a working curl instead" as one of the options**, alongside the category-specific remediation:

  | category | Suggested question |
  |---|---|
  | `dns` | "I couldn't resolve `[host]`. Is the URL correct? Are you on a VPN?" |
  | `connection_refused` | "Connection refused on `[host:port]`. Is the backend actually running?" |
  | `auth_invalid` (401) | "Got 401. The header was `[authHeader]: [authValueFormat redacted]`. Is the format right? Is the token still valid?" |
  | `forbidden` (403) | "Got 403 — token works but lacks permission. Need a token with broader scope, or is the user's role limited?" |
  | `not_found` (404) | "Got 404 on `[endpoint]`. Is the base URL prefix right (e.g., is `/api` missing)? Or is this endpoint not implemented yet?" |
  | `curl_parse_error` | "Couldn't parse the pasted curl. Want to re-paste a corrected version, or fall back to the spec-derived config?" |

  Standard option set (regardless of category): the category-specific answer choices PLUS "Paste a working curl instead" PLUS "Skip the smoke test".

  - On a category-specific remediation → launch **Call C** with `attempt: [previous + 1]`, updated spec-derived config, and `user_curl_example: null`.
  - On "Paste a working curl instead" → run the **Curl-Paste Sub-Flow** and launch **Call C** with `attempt: [previous + 1]` and `user_curl_example` populated.
  - On "Skip the smoke test" → launch Call C (or write Shape 3 directly via Call B with `user_signal: skip` if at attempt 1).

- **`result: failure`** with `should_retry: false` (attempt 3 cap reached): The agent has already written Shape 3 (unverified). Display:
  > "Tried 3 times without a successful round-trip. Saved what we have to the manifest with a warning — the BRD review will pick this up as a deferred verification. Re-run `/api-status --check` after fixing; the smoke test config is in `generated-docs/context/api-smoke-test.sh`. Proceeding to BRD review."
  >
  > Proceed to Step 4c.

- **`result: skipped`**: Shape 1 was written. Display the skip reason. Then ask via `AskUserQuestion`:
  > "Want to verify connectivity by pasting a working curl, or proceed without verification?"
  > Options: "Paste a working curl" / "Proceed without verification"
  >
  > On "Paste a working curl" → run the **Curl-Paste Sub-Flow** and launch Call B with `attempt: 1`, `user_signal: ready`, and `user_curl_example` populated. The agent will overwrite Shape 1 with Shape 2 (or Shape 3) based on the result.
  > On "Proceed without verification" → proceed to Step 4c.

- **Rotation warning (any result with `redacted_literals_detected: true`)**: Whenever the agent's return has `redacted_literals_detected: true`, surface this to the user in plain language BEFORE proceeding to Step 4c or to the next retry:
  > "Heads up — your pasted curl contained literal credentials for [list of env var names from `redacted_env_vars`]. I moved the values into `web/.env.local` and rewrote the curl with `${VAR_NAME}` placeholders. **The original message containing those credentials is in `.claude/logs/*.md`, which is committed to git, so please rotate those credentials at your earliest convenience.** Future runs of `generated-docs/context/api-smoke-test.sh` use the env vars."

**Call C — Retry (conditional):**

> "This is Call C — Retry. attempt=[2 or 3].
>
> RESOLVED CONFIG
> [updated config — include changes from the user's remediation answer]
> user_signal: ready
> user_curl_example: [verbatim pasted curl, or null if the user picked a category-specific remediation]
>
> Run the smoke test again with this config. If `user_curl_example` is non-null, run Step 0 (parse + auto-redact) before the spec-derived path. Same persistence rules as Call B. Return the SMOKE TEST RESULT block. Do NOT commit. Do NOT use AskUserQuestion."

After Call C returns, apply the same interpretation logic. Loop until `should_retry: false`.

**Curl-Paste Sub-Flow:**

When triggered (from `curl_fallback_recommended`, `credentials_missing`, `failure`, or `skipped` paths above), prompt the user as **plain text** (open-ended — see [shared rules § Open-ended prompt exception](../shared/orchestrator-rules.md#user-questions-mandatory)). Do NOT use `AskUserQuestion` here — the user needs to paste a multi-line curl, not pick from options.

Output:

> "Paste a working curl command in your next message. Two ways to do this:
>
> - **Recommended:** Replace credential values with `$ENV_VAR_NAME` placeholders before pasting (e.g., `Authorization: Bearer $API_TOKEN`). I'll record the env var names and you put the values in `web/.env.local`. Nothing sensitive enters the chat transcript.
> - **Or:** Paste your real curl as-is. I'll move the credentials into `web/.env.local` and rewrite the curl with placeholders going forward — but the original message will be in `.claude/logs/*.md` which is committed to git, so you'll need to rotate the credential afterward.
>
> The curl can be a single line or multi-line (`\` continuations are supported). I'll parse the method, URL, headers, query params, and body."

Capture the user's next message verbatim as `user_curl_example`. Pass it into the next Call B or Call C in the `RESOLVED CONFIG` block.

After the agent returns, if `redacted_literals_detected: true`, the rotation warning above is the user-facing surface — display it before continuing.

#### Step 4c: BRD Review Agent (up to 3 scoped calls)

**Call A — Gap Analysis:**

Launch `intake-brd-review-agent` with prompt:
> "This is Call A — Gap Analysis Only. Read the intake manifest (including `context.backendConnectivity` if present), FRS template, and documentation. Review completeness section by section. Return a structured gap analysis with:
> - mode: A (docs exist) or B (no docs)
> - For each of the 10 FRS template sections: coverage status (covered/partial/missing) and specific clarifying questions if any
>
> Be specific with questions: 'What happens when a viewer tries to access admin settings?' NOT 'Tell me about permissions.' Offer sensible defaults where possible.
>
> If `context.backendConnectivity` is present, incorporate its findings into the gap analysis: a CORS warning becomes a candidate NFR, an auth-scheme mismatch with `context.authMethod` becomes a question, a 404 on a 'complete' spec endpoint suggests `dataSource` should flip to `api-in-development`. See the agent's 'Backend connectivity awareness' section for the full mapping.
>
> [If v2 prototype review was performed, append:]
> Additional context from prototype review:
> - Accepted enrichments: [list of accepted enrichments — treat as confirmed requirements]
> - Genesis→FRS section mapping: [the pre-mapping from prototype-review-agent]
> - Source document mapping: [original input document names for traceability]
> - Data structure mismatches: [any flagged mismatches — present as pre-answered questions]
>
> Do NOT write the FRS. Do NOT commit. Do NOT use AskUserQuestion."

**Orchestrator — Clarifying Questions:**

Display the gap analysis summary. For each section that has questions:
- Present the section context (what's covered, what's missing)
- Use `AskUserQuestion` with the specific question(s) for that section
- Collect answers

Accumulate all answers into a structured block.

**Call B — Produce FRS:**

Launch `intake-brd-review-agent` with prompt:
> "This is Call B — Produce FRS. Here is the gap analysis and all user answers:
>
> [paste gap analysis from Call A]
>
> User answers per section:
> [structured answers block]
>
> Write the Feature Requirements Specification to generated-docs/specs/feature-requirements.md with source traceability. Mirror `context.backendConnectivity` into the 'Backend Integration' section of the FRS. Amend the manifest if new artifact needs were discovered. Return a summary (requirement count, business rule count, key sections). Do NOT commit. Do NOT use AskUserQuestion."

**Orchestrator — FRS Approval (two-step — display THEN ask):**

1. **Output the FRS summary as regular conversation text** — requirement count, business rule count, key sections covered, and the file path (`generated-docs/specs/feature-requirements.md`).

2. **Then** call `AskUserQuestion`:
   - "Does this capture everything we need to build?"
   - Options: "Looks complete" / "I have changes"

> Same rule as manifest approval: never call `AskUserQuestion` without displaying the summary first.

If "I have changes": collect feedback.

**Call C — Finalize:**

If approved:
> "This is Call C — Finalize. The user approved the FRS. Commit all INTAKE artifacts (FRS, manifest, logs, generated-docs/context/api-smoke-test.sh if it exists), run the state transition to DESIGN, and push. Do NOT use AskUserQuestion."

If changes requested:
> "This is Call C — Revise. Apply these changes: [feedback]. Update the FRS and traceability table. Return the updated summary. Do NOT commit yet. Do NOT use AskUserQuestion."

If revised, re-display and re-ask approval. When finally approved, launch another finalize call to commit.

---

### Step 5: INTAKE Complete — Context Clearing Boundary

After both agents have completed, INTAKE is done. This is **clearing boundary #1**.

**Dashboard update (fire-and-forget):** Before instructing the user to clear, regenerate the HTML dashboard per the [Dashboard Update Policy](../shared/orchestrator-rules.md#dashboard-update-policy).

Tell the user (conversationally):

> "That wraps up requirements gathering — the Feature Requirements Specification and intake manifest are ready. Next up is the design phase.
>
> Run `/clear` then `/continue` when you're ready to move on."

**STOP** — do not launch the next agent.

---

## After INTAKE (Reference Only — Handled by /continue)

> **DO NOT EXECUTE these phases from `/start`.** The sections below describe what happens when the user runs `/clear` + `/continue`. They are here for context only. Your job in `/start` ends at the STOP above.

After the user runs `/clear` + `/continue`, the workflow enters the mandatory DESIGN phase. The orchestrator reads the intake manifest, launches design agents in parallel (API + Style + Wireframe Call A simultaneously), and copies user-provided files when `generate=false`. See [continue.md](./continue.md) for resumption logic and [orchestrator-rules.md](../shared/orchestrator-rules.md#design-scoped-calls) for the full scoped-call patterns.

## After DESIGN (Handled by /continue)

After the user runs `/clear` + `/continue`, the workflow continues with:

1. **SCOPE**: The feature-planner defines all epics from the FRS
2. **Per-epic pass-based phases**: STORIES, then REALIGN → TEST-DESIGN → WRITE-TESTS → IMPLEMENT passes, then EPIC-QA

These phases are managed by `/continue` based on the workflow state. See [continue.md](./continue.md) for resumption logic and [orchestrator-rules.md](../shared/orchestrator-rules.md#per-phase-scoped-call-prompts) for the full scoped-call patterns.
