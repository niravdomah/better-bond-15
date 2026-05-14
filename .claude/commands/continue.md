---
description: Resume interrupted TDD workflow
---

You are helping a developer resume the TDD workflow from where it was interrupted.

**Read and follow all rules in [orchestrator-rules.md](../shared/orchestrator-rules.md) — they are mandatory.**

## Execution Model

`/continue` is parent-driven. Execute phase instructions directly — read files, launch work agents via `Agent`, present approvals via `AskUserQuestion`.

## Workflow Reminder

The TDD workflow has four stages:

0. **Requirements gathering**: INTAKE (intake-agent → [prototype-review-agent, v2 only] → intake-brd-review-agent)
1. **One-time setup**: DESIGN (mandatory) → SCOPE (define all epics, no stories yet)
2. **Per-epic**: STORIES (define stories for the current epic only)
3. **Per-epic iteration**: REALIGN pass → TEST-DESIGN pass → WRITE-TESTS pass → IMPLEMENT pass → EPIC-QA → epic commit → (next epic)

Stories within a pass run sequentially (Story 1 → 2 → 3). EPIC-QA produces a single epic-level commit covering every story.

After the EPIC-QA commit:

- If more epics → STORIES for next epic
- If last epic in a phase (phasing enabled) → PHASE-BOUNDARY (user chooses Continue or Stop)
- If no more epics → Feature complete!

## Step 1: Validate Workflow State and Restore Progress Display

Collect enriched workflow data **and** the TodoWrite array in a single Bash call:

```bash
node .claude/scripts/collect-dashboard-data.js --format=json --with-todos
```

The `--with-todos` flag includes a `todos` array in the JSON. After parsing the output, call `TodoWrite` with `data.todos` to restore the progress display (lost on `/clear`).

### If `status: "no_state"`:

Attempt to repair the state first:

```bash
node .claude/scripts/transition-phase.js --repair
```

If repair succeeds, show the user the detected state and ask them to confirm before proceeding.

If repair fails (no artifacts found), ask the user:

> "No workflow state or artifacts found. Would you like to start fresh with `/start`, or describe the current state so I can help you continue?"

After repair, check the **confidence level** in the output:

- `"confidence": "high"` — State is reliable, show summary and proceed
- `"confidence": "medium"` — Show the `detected` and `assumed` arrays, ask user to confirm
- `"confidence": "low"` — **REQUIRE** user to verify before proceeding, show warning prominently

After repair, re-run `collect-dashboard-data.js --format=json --with-todos` to get the enriched data and todos.

### If `status: "ok"` (state exists):

Display a brief summary:

```
Resuming: Epic [N], Story [M], Phase: [phase]
```

## Step 2: Execute Phase Instructions

Find the phase below matching the current phase in the state JSON, and execute its instructions directly.

**Execution rules:**

- Read files, launch work agents via `Agent` with the named subagent_type (test-generator, developer, code-reviewer, etc.), and present approvals via `AskUserQuestion`.
- **Display-then-ask:** Before any `AskUserQuestion` that asks the user to approve content (test-design, epic list, manual verification checklist, etc.), output the content as regular assistant text *first*. The `AskUserQuestion` `question` parameter is a short prompt — the long content lives in the preceding assistant text so the user can read what they're approving.
- **Tool budget:** keep parent tool calls per response at ~3 outside of natural turn boundaries (`AskUserQuestion` answers reset the budget). Delegate bash-heavy steps to narrow subagents — currently `playwright-runner` for E2E Verification. See orchestrator-rules.md § Parent Tool-Call Budget for the full constraint.
- Verify all script JSON output: `"status": "ok"` = proceed, `"status": "error"` = STOP and report the error.
- When launching WRITE-TESTS, IMPLEMENT, or TEST-DESIGN agents, include the FRS-over-template reminder from orchestrator-rules.md in the agent's prompt.
- Fire dashboard updates (`node .claude/scripts/generate-dashboard-html.js --collect`) at workflow milestones per the Dashboard Update Policy in orchestrator-rules.md.
- **NEVER suppress spec drift findings.** When composing the spec-compliance-watchdog prompt, do NOT include instructions to ignore, skip, or excuse any changes — regardless of how or why the drift occurred (including user-approved QA fix-cycle changes). Pass fix-cycle context as informational background only.
- Follow all rules in orchestrator-rules.md — especially scoped call patterns, voice guidelines, commit policy, and the FRS-Over-Template Rule.

### Epic Pass Dispatch (per-story work)

Once an epic enters per-story work, dispatch to the matching `### Phase: EPIC-<PASS>` section based on `state.epicPass.phase`:

- The current pass is `state.epicPass.phase` (one of: `REALIGN`, `TEST-DESIGN`, `WRITE-TESTS`, `IMPLEMENT`, `EPIC-QA`).
- The story currently IN_PROGRESS within the pass is `state.currentStory` (mirrored in `epicPass.storyPhases[currentStory]`).
- `epicPass` is auto-initialised by `transition-phase.js` at the STORIES → REALIGN transition for story 1. If it's missing for an epic past STORIES, run `node .claude/scripts/transition-phase.js --init-epic-pass <N>` to recover.

**Pass progression invariants:**

- Stories within a pass run sequentially (Story 1 → Story 2 → Story 3). When a story completes the current pass, run `--complete-story-pass --story M` to mark it COMPLETE and promote the next pending story to IN_PROGRESS.
- When every story has completed the pass, run `--advance-pass` to flip to the next pass (resets all `storyPhases` to PENDING, marks story 1 IN_PROGRESS, updates `epicPass.phase`).
- Do NOT call `transition-phase.js --to <PHASE>` for individual story phase transitions while passes are in flight. Use `--complete-story-pass` and `--advance-pass` instead. The standard `--to COMPLETE` transitions only happen at the end of EPIC-QA, after the epic commit, to advance to the next epic.

### Phase: EPIC-REALIGN

Current epic: state.currentEpic. Current story (in flight): state.currentStory.

For the in-flight story (and each subsequent PENDING story afterwards within this pass):

1. Run the realign agent's Call A autonomously for the story (use the per-story REALIGN prompt from [orchestrator-rules.md § REALIGN](../shared/orchestrator-rules.md#realign-1-2-scoped-calls), applied within the pass).
2. If Call A reports `impactsFound: false` → mark `--complete-story-pass --story M` immediately (auto-complete, no user prompt). Move to the next PENDING story.
3. If Call A reports impacts → COLLECT them but do NOT prompt yet. Continue running Call A for the remaining PENDING stories in the pass.
4. **After all stories in the pass have run Call A**, present a single batched `AskUserQuestion` (up to 4 questions, grouped by story) covering every story that had impacts. On approval, run Call B per story to apply changes. Mark each story COMPLETE via `--complete-story-pass --story M`.
5. When all `storyPhases` are COMPLETE, run `node .claude/scripts/transition-phase.js --advance-pass` to advance to EPIC-TEST-DESIGN.

Fire dashboard update at end of pass.

### Phase: EPIC-TEST-DESIGN

Current epic: state.currentEpic.

For each PENDING/IN_PROGRESS story in `epicPass.storyOrder`:

1. Launch the **test-designer** agent Call A for the story (use the existing prompt from [orchestrator-rules.md § TEST-DESIGN](../shared/orchestrator-rules.md#test-design-2-scoped-calls--ba-decision-persistence)).
2. After Call A returns, run `node .claude/scripts/list-ba-decisions.js --epic <N> --story <M>` to enumerate BA decisions. **Buffer** the decisions in memory keyed by story — do NOT prompt the user yet.

**After all stories have produced test-design docs**, present BA decisions in batched `AskUserQuestion` calls — grouped by story, **max 3 decisions per call**. Continue across multiple `AskUserQuestion` rounds until every decision is resolved. Persist each decision via `resolve-ba-decision.js`.

**Then**, for each story, run test-designer Call B (rewrite test-design doc with resolved decisions and emit `renderScope` field in the test-handoff). Call `--complete-story-pass --story M` after each Call B succeeds.

When all `storyPhases` are COMPLETE, run `--advance-pass` to advance to EPIC-WRITE-TESTS. Fire dashboard update.

### Phase: EPIC-WRITE-TESTS

For each PENDING/IN_PROGRESS story in `epicPass.storyOrder`:

1. Launch the **test-generator** agent for the story (single autonomous call — see [orchestrator-rules.md § WRITE-TESTS](../shared/orchestrator-rules.md#write-tests-single-call--fully-autonomous)).
2. After it returns, run `--complete-story-pass --story M`.

No user gating in this pass. When all stories are COMPLETE, run `--advance-pass` to advance to EPIC-IMPLEMENT. Fire dashboard update.

### Phase: EPIC-IMPLEMENT

EPIC-IMPLEMENT supports DAG scheduling: stories with declared `dependsOn:` metadata may run in parallel. Stories without explicit metadata fall back to the conservative all-prior-stories dependency (legacy strict-sequential).

**Iteration model:**

1. Run `node .claude/scripts/transition-phase.js --promote-runnable-stories`. This promotes every PENDING story whose dependencies are all COMPLETE to IN_PROGRESS and returns their numbers as `promoted: [...]`. If `promoted` is empty AND no stories are still IN_PROGRESS, the pass is fully done — proceed to step 4.

2. Launch the **developer** agent for each promoted story **in parallel** (one Agent call per story in a single message — Claude will run them concurrently). Each agent prompt must include these anchors verbatim:

   > "**Implementation contract.** Open `generated-docs/test-design/epic-N-[slug]/story-M-[slug]-test-handoff.md` and read the `## Implementation Targets` section. That list is your contract — create/modify exactly those files. If you need to touch a file not listed, explain why in your summary and confirm it doesn't conflict with another story's targets."
   >
   > "**DAG ordering.** Your story declares `dependsOn:` in its frontmatter; the orchestrator promoted you because every dependency is on disk and COMPLETE. Stories running in parallel with you have disjoint file scopes. If you encounter a file conflict with a parallel story, STOP and report it — that's a `dependsOn:` declaration bug."
   >
   > "**Sequential predecessors.** Stories listed in your `dependsOn:` have already implemented — their code is on disk. Read the existing patterns and extend them; do not rebuild what they already produced."

3. As each developer returns, run `node .claude/scripts/transition-phase.js --complete-story-pass --story M` for that story. Once ALL the in-parallel developers have returned, loop back to step 1 (in case the completed stories unblock new runnable stories).

4. When all `storyPhases` are COMPLETE, run `node .claude/scripts/transition-phase.js --advance-pass` to advance to EPIC-QA.

**File-conflict insurance:** if `dependsOn:` is declared incorrectly and two parallel developers both modify the same file, the second commit will fail tests (or even the build). The fix is to add a missing dependency edge and re-run from cycle 1. The orchestrator should treat any "I tried to modify file X but found unexpected content" report from a parallel developer as a `dependsOn:` correctness bug to surface in the next plan revision.

**Legacy strict-sequential mode:** stories without explicit `dependsOn:` get the conservative default (depend on every numerically-earlier story). This means existing epics work without changes — `--promote-runnable-stories` returns one story at a time, the same as the old strict flow. Stories opt INTO parallelism by declaring `dependsOn: []` or `dependsOn: [N]` in their frontmatter.

Strict order is required because Story N's developer agent reads Story N-1's just-completed code. No user gating in this pass. When all stories are COMPLETE, run `--advance-pass` to advance to EPIC-QA. Fire dashboard update.

### Phase: EPIC-QA

A single epic-level QA pass: one E2E run, one consolidated manual verification, one commit covering every story. Per-story Call A still runs individually for spec-compliance scoping; Call B (quality gates) and Call C (commit) are epic-level.

1. **Per-story Call A (review-mode)**: for each story in `epicPass.storyOrder`, launch the **code-reviewer** agent Call A with story-level scope. Collect findings. Do NOT commit yet.

2. **E2E Verification (Gate 6a, epic-level)**: launch the **playwright-runner** agent with prompt: `"Run epic-level Playwright verification. Command: node .claude/scripts/run-e2e-verification.js --epic-mode --epic <N>. Return the structured JSON result."` Handle the result:
   - `passed` → continue to manual verification
   - `failed` → enter QA Fix Cycle (see below)
   - `halt` → STOP and ask the user how to proceed
   - `auto-skipped:fixme` / `auto-skipped:non-routable` → continue with caveat

3. **Manual Verification (Gate 6, batched)**: read each story's verification checklist at `generated-docs/qa/epic-N-[slug]/story-M-[slug]-verification-checklist.md`. Display them as ONE consolidated checklist grouped by story, then present a single `AskUserQuestion` with options:
   - "All stories pass" → continue to commit
   - "Findings on specific stories" → for each story with findings, run `node .claude/scripts/transition-phase.js --record-qa-finding --story M --note "..."`, then enter QA Fix Cycle

4. **QA Fix Cycle (per-story fix, regression gate once per cycle)**:

   The cycle has TWO distinct phases. The orchestrator owns the boundary between them.

   **4a — Per-story fix phase (parallel where stories are disjoint)**: for each story with findings, launch the **developer** agent scoped to that story. The orchestrator's prompt to each developer must include this verbatim constraint:

   > "**Re-run ONLY `npm --prefix web test -- epic-N-story-M` and (if a routable spec exists) `npx playwright test web/e2e/epic-N-story-M-*.spec.ts`.** Do NOT re-run the full Vitest suite, the full Playwright suite, or any other story's tests. The orchestrator runs the full-epic regression gate ONCE after all flagged stories' fixes are green — re-running it inside your work is duplicate effort that costs ~5 minutes of agent time per fix attempt. If your story-scoped tests pass, return. If they fail, iterate on the fix (up to your own internal retry budget)."

   Increment `epicPass.fixCycles[M]` per story per cycle. If `fixCycles[M] >= 3`, halt and ask the user how to proceed (do not auto-retry).

   **4b — Cross-story regression gate (ONCE per fix cycle, after 4a)**: after every flagged story's developer has returned green on its own tests, the orchestrator runs the full-epic regression gate ONE TIME:

   ```bash
   npm --prefix web test                                                  # full Vitest
   node .claude/scripts/run-e2e-verification.js --epic-mode --epic <N>    # full Playwright
   node .claude/scripts/check-spec-compliance.js --epic <N>               # script-first spec
   ```

   Each command's exit code is the gate. If anything fails here, identify the regressing story from the failure trace and route ONLY that story back into 4a as cycle attempt N+1. Do not re-run unaffected stories.

   When 4b passes clean: re-prompt manual verification ONLY for the stories that originally had findings (untouched stories don't need re-verification).

5. **Spec Compliance Check (Gate 6, script-first with LLM escalation)**:

   ```bash
   node .claude/scripts/check-spec-compliance.js --epic <N>
   ```

   The script statically checks every AC against the test-design coverage map, test files (Vitest + Playwright), and BA-decision resolution. It runs in under a second. Three outcomes:

   - **`status: "clean"`** (exit 0): no structural drift. Log a one-line confirmation (`Spec-compliance script returned clean — skipping LLM watchdog.`) and proceed to step 6. Semantic drift the script cannot detect (e.g., test asserts a different value than the AC describes) is not common after a clean fix cycle and the saved 5–7 minutes per epic is the optimization budget.

   - **`status: "discrepancies"`** (exit 1): findings exist. Launch the **spec-compliance-watchdog** Call A with the script's JSON findings pre-loaded in the prompt:

     > "This is Call A — Analyze Compliance. EPIC-level scope for Epic [N]. The script-first compliance check at `.claude/scripts/check-spec-compliance.js` ran first and returned these findings (pre-loaded so you don't have to re-discover the structural gaps): [paste the full JSON]. For each finding, classify it as one of: (a) **legitimate-deferred** — AC is verified by build/runtime/manual and is expected not to appear in test files (note it in the response so the test-handoff doc can record it); (b) **real drift** — AC genuinely lacks coverage and needs a fix-cycle entry; (c) **false positive** — the AC actually IS referenced by a test the script missed. Additionally, look for **semantic drift** the script cannot detect: tests asserting values that differ from the AC text, implementation symbols renamed from what the AC describes, BA decisions misapplied. Return a structured report grouped per story."

   - **`status: "error"`** (script crashed): STOP and report the script failure. The watchdog cannot substitute for a broken script run.

   Any "real drift" or watchdog-surfaced semantic drift halts the commit and routes back into fix cycle for the affected story.

6. **Commit (Call C, single)**: once everything is green, launch **code-reviewer** Call C with prompt: `"Epic-level QA pass. Stage all epic changes. Commit with message: 'feat(epic-<N>): <epic name>'."` This is ONE commit covering all stories.

7. **Per-story COMPLETE transitions**: after the single commit succeeds, run `node .claude/scripts/transition-phase.js --epic <N> --story <M> --to COMPLETE` for each story in order. The final transition will auto-advance to the next epic's STORIES (or feature complete).

Fire dashboard update at each major milestone (E2E green, manual verify pass, commit).

### Phase: INTAKE

INTAKE has two or three sequential agents depending on prototype format. Determine which one to resume based on artifacts:

1. Check if `generated-docs/context/intake-manifest.json` exists:
   - No → Recover onboarding context (see below), then resume with **intake-agent**
   - Yes → Check step 2

2. If the manifest has `context.prototypeFormat === "v2"`, check if prototype review has completed:
   - Check if `generated-docs/prototype-screenshots/` has PNG files OR `artifacts.wireframes.generate === false` in the manifest
   - Neither is true → Resume with **prototype-review-agent** (it was interrupted between intake-agent and BRD review)
   - Either is true → Prototype review is done, check step 3

3. Check if `generated-docs/specs/feature-requirements.md` exists:
   - No → Resume with **intake-brd-review-agent**
   - Yes → INTAKE is complete. Inform user and transition to DESIGN.

#### Recovering onboarding context (no manifest yet)

**Step 1** — Infer `onboardingPath` from `documentation/`:
- If `documentation/prototype-src/` contains subdirectories → `"prototype"`
- Else if `documentation/` contains substantive files (not just `.gitkeep`) → `"docs"`
- Else → `"qa"`

**Step 2** — Recover `projectDescription`:
- If `"docs"` or `"prototype"` → `null` (docs serve as description)
- If `"qa"` → use `AskUserQuestion`: "We're picking up where we left off on requirements. I don't have the project description from last session — could you give me the elevator pitch again?"

**Step 3** — Use the scoped call patterns from orchestrator-rules.md. Call A (scan) is idempotent. Pass recovered `onboardingPath` and `projectDescription` into Call B.

#### After the agent completes

- If intake-agent finished AND `context.prototypeFormat === "v2"` → invoke **prototype-review-agent** first, then **intake-brd-review-agent**
- If intake-agent finished AND not v2 → invoke **intake-brd-review-agent** directly
- If prototype-review-agent finished → pass accepted enrichments, confirmed assumptions, and genesis→FRS mapping to **intake-brd-review-agent** Call A as additional context
- If intake-brd-review-agent finished → fire dashboard update, then instruct the user to `/clear` then `/continue` (clearing boundary #1)

### Phase: DESIGN

DESIGN is a multi-agent phase with parallel Call A execution. Read the full DESIGN Execution Model in orchestrator-rules.md.

1. Read the intake manifest: `generated-docs/context/intake-manifest.json`
2. Check which artifacts with `generate == true` are still missing. Use the artifact-to-agent mapping in orchestrator-rules.md to determine output paths. Check whether each agent's expected output file exists on disk. **E6 wireframe skip:** if `artifacts.wireframes.generate === false` (set by prototype-review-agent when .pen screenshots exist), do NOT include design-wireframe-agent — the .pen screenshots serve as wireframes.
3. For user-provided files that need copying (`generate == false` + `userProvided` set): use the copy script:
   ```bash
   node .claude/scripts/copy-with-header.js --from "<path>" --to "generated-docs/specs/<target>"
   ```
4. Determine resumption strategy:
   - **No outputs exist** → Launch all Call A agents **in a single message with parallel `Agent` calls** (full parallel execution model).
   - **Some outputs exist** → Launch Call A only for agents whose output is missing — **in a single message with parallel `Agent` calls**. Also check for `web/src/types/api-generated.ts` if `api-spec.yaml` exists.
   - **All agent outputs exist but dependents haven't run** → Launch mock-setup-agent and/or type-generator-agent as needed
   - **All outputs exist, transition not run** → DESIGN is complete. Run finalize step.

5. If all artifacts exist and transition was already run → inform user, state should be SCOPE.

For Call A results that need user approval (API spec, design tokens, screen list): display each agent's output as assistant text, then use `AskUserQuestion` to present them. Indicate which agent produced each summary.

For autonomous agents (mock-setup-agent, type-generator-agent): handle their full flow internally and report completion.

### Phase: SCOPE

Use the SCOPE scoped-call pattern from orchestrator-rules.md.

Launch feature-planner Call A:

> "This is Call A — Propose Epics. You are in SCOPE mode. Read the FRS at `generated-docs/specs/feature-requirements.md` and propose an epic breakdown. Return the epic list with descriptions and dependency map. If you propose 6 or more epics, also include a phase grouping proposal (see your Phase Grouping instructions). Do NOT write any files. Do NOT commit. Do NOT use AskUserQuestion."

After Call A returns, check whether the proposal includes a phase grouping.

**If NO phase grouping (fewer than 6 epics):** Display the epic list, then use `AskUserQuestion`.

**If phase grouping is included (6+ epics):** Display the epic list AND the phase grouping, then use `AskUserQuestion` with these 4 options:
1. "Approve both (epics and phases as proposed)"
2. "Approve epics, but change the phase grouping" — follow up to get the user's custom grouping
3. "Approve epics, no phases — just do them all in order"
4. "Revise the epics" — standard epic revision flow

When launching Call B, include the user's phase decision:
- Option 1: "Write `_feature-overview.md` with the proposed phase grouping."
- Option 2: "Write `_feature-overview.md` with this custom phase grouping: [user's grouping]."
- Option 3: "Write `_feature-overview.md` without a `## Phases` section."
- Option 4: (re-run Call A with revisions, then re-present)

### Phase: STORIES

Current epic: [N]

Run STORIES per [orchestrator-rules.md § STORIES](../shared/orchestrator-rules.md#stories-2-scoped-calls) (canonical — includes Call A/B prompts and approval flow).

### Phase: PHASE-BOUNDARY

A project phase has completed. Handle two cases based on `state.phaseStatus`:

#### Case A: Fresh arrival (`phaseStatus: "ready"`)

The previous phase just completed (last epic in the current phase passed QA). The user must choose how to proceed.

1. Read workflow state and call `getPhases()` (from `workflow-helpers.js`) to determine:
   - Which phase just completed (name and epic list)
   - What comes next (next phase name and epics)

2. Display as assistant text:

   > "[Phase name] is complete! All [N] epics have passed QA.
   >
   > Next up: [Next phase name] — [Epic list]"

3. Use `AskUserQuestion` with:
   - "Continue to [next phase] as planned"
   - "Stop here — [completed phase] is enough for now"

4. Based on the user's response:
   - **Continue:** Run `node .claude/scripts/transition-phase.js --advance-phase`, then transition to STORIES for the next epic. Fire dashboard update.
   - **Stop here:** Run `node .claude/scripts/transition-phase.js --pause-phase` (sets `phaseStatus: 'paused'` and `pausedAt` to current ISO timestamp; keeps `currentPhase: 'PHASE-BOUNDARY'`). Fire dashboard update. Instruct user to `/clear`. STOP — do not advance.

#### Case B: Resume from pause (`phaseStatus: "paused"`)

The user paused earlier by picking "Stop here" and has now run `/continue`. Auto-resume without asking — running `/continue` IS the intent signal. But run a staleness check first.

1. Call `checkStaleness(state.pausedAt)` (from `workflow-helpers.js`).

2. Branch on result:
   - **`status: 'silent'`:** No files changed since pause. Run `--advance-phase` (clears `pausedAt`) and transition to STORIES for next epic. No user prompt.
   - **`status: 'notify'`:** Print a single-line informational message listing what changed (e.g., "FRS edited since pause — your upcoming epics may reference content that changed. Resuming anyway."). Then run `--advance-phase` and transition. Do NOT prompt the user.
   - **`status: 'halt'`:** Something is actually broken (missing feature-overview, corrupted state, etc.). Display the problems as assistant text and use `AskUserQuestion` to ask how to proceed. Do NOT auto-advance.

### Phase: COMPLETE

Check the next action from the state data:

- More stories in epic → Proceed to REALIGN for next story (execute REALIGN instructions)
- No more stories but more epics → Proceed to STORIES for next epic (execute STORIES instructions)
- No more stories and no more epics → Display: "Feature complete! All epics and stories have been implemented and passed QA."

## Re-ask Rule (QA Manual Verification)

If the user responds to a manual verification `AskUserQuestion` with a free-text question instead of selecting an option, answer their question, then re-ask `AskUserQuestion` with the **full manual verification checklist** included. Read the checklist verbatim from `generated-docs/qa/epic-N-[slug]/story-M-[slug]-verification-checklist.md` — never omit or abbreviate it. The checklist must be visible every time the verification question is presented.

## Script Execution Verification

**All transition scripts output JSON. Always verify the result before proceeding** (see [orchestrator-rules.md § Script Execution Verification](../shared/orchestrator-rules.md#script-execution-verification) for the full rules):

1. `"status": "ok"` = Success, proceed to next step
2. `"status": "error"` = **STOP**, report the error to the user
3. `"status": "warning"` = Proceed with caution, inform user

**Troubleshooting:**
- Check current state: `node .claude/scripts/transition-phase.js --show`
- Validate artifacts: `node .claude/scripts/validate-phase-output.js --phase <PHASE> --epic <N>`
- Repair if needed: `node .claude/scripts/transition-phase.js --repair`

## Error Handling

- **State file missing:** Use `--repair` to reconstruct from artifacts
- **State appears wrong:** Ask user to confirm or correct
- **Script fails:** Ask user to describe current state manually
- **Invalid transition:** Show allowed transitions and ask user what to do

## DO

- Always validate state at the start of the session
- Auto-proceed on high confidence state (no confirmation needed)
- Reconstruct the TodoWrite progress display before executing phase work
- Use scoped calls for every interactive agent

## DON'T

- Auto-approve anything on behalf of the user
- Skip state validation
- Trust artifact detection over the state file
- Proceed if the user says the state is wrong
- Stop for context clearing at non-boundary phase transitions
- Edit code yourself during QA fix cycles — always launch the developer agent

## Related Commands

- `/start` - Start TDD workflow from the beginning
- `/status` - Show current progress without resuming
- `/quality-check` - Validate all 5 quality gates
