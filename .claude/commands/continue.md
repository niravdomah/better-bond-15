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
3. **Per-story iteration**: REALIGN → TEST-DESIGN → WRITE-TESTS → IMPLEMENT → QA → commit → (next story)

After QA passes for a story:

- If more stories in epic → REALIGN for next story
- If no more stories but more epics → STORIES for next epic
- If last story in a phase's last epic (phasing enabled) → PHASE-BOUNDARY (user chooses Continue or Stop)
- If no more stories and no more epics → Feature complete!

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

### Batched Epic Mode Dispatch (check FIRST)

**Before dispatching to a per-story phase, check whether the workflow is in batched epic mode.**

If the state JSON has `workflow.batchMode === "epic"` and `epicPass` is present:

- The current pass is `state.epicPass.phase` (one of: `REALIGN`, `TEST-DESIGN`, `WRITE-TESTS`, `IMPLEMENT`, `EPIC-QA`).
- The story currently IN_PROGRESS within the pass is `state.currentStory` (mirrored in `epicPass.storyPhases[currentStory]`).
- **Dispatch to the matching `### Phase: EPIC-<PASS>` section below**, NOT the per-story phase sections.
- The legacy per-story sections (`### Phase: REALIGN`, etc.) only apply when `batchMode === "story"` (the legacy default).

**Pass progression invariants:**

- Stories within a pass run sequentially (Story 1 → Story 2 → Story 3). When a story completes the current pass, run `--complete-story-pass --story M` to mark it COMPLETE and promote the next pending story to IN_PROGRESS.
- When every story has completed the pass, run `--advance-pass` to flip to the next pass (resets all `storyPhases` to PENDING, marks story 1 IN_PROGRESS, updates `epicPass.phase`).
- Do NOT call `transition-phase.js --to <PHASE>` for individual story phase transitions while in batched mode. Use `--complete-story-pass` and `--advance-pass` instead.

### Phase: EPIC-REALIGN

Current epic: state.currentEpic. Current story (in flight): state.currentStory.

For the in-flight story (and each subsequent PENDING story afterwards within this pass):

1. Run the realign agent's Call A autonomously for the story (use the existing per-story REALIGN prompt — see [orchestrator-rules.md § REALIGN](../shared/orchestrator-rules.md#realign-1-2-scoped-calls)).
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

For each PENDING/IN_PROGRESS story in `epicPass.storyOrder` (strict sequential — Story 1 first, then Story 2, ...):

1. Launch the **developer** agent for the story (single autonomous call — see [orchestrator-rules.md § IMPLEMENT](../shared/orchestrator-rules.md#implement-single-call--fully-autonomous)). The agent prompt must include: `"You are story M in the EPIC-IMPLEMENT pass. Stories 1..M-1 in this pass have already implemented — their code is on disk. Read the existing patterns and extend them; do not rebuild what they already produced."`
2. After it returns, run `--complete-story-pass --story M`.

Strict order is required because Story N's developer agent reads Story N-1's just-completed code. No user gating in this pass. When all stories are COMPLETE, run `--advance-pass` to advance to EPIC-QA. Fire dashboard update.

### Phase: EPIC-QA

This is a single epic-level QA: one E2E verification, one consolidated manual verification, one big commit at the end. Per-story QA Call A may still run individually for spec-compliance scoping, but Call B/C are epic-level.

1. **Per-story Call A (review-mode)**: for each story in `epicPass.storyOrder`, launch the **code-reviewer** agent Call A with story-level scope. Collect findings. Do NOT commit yet.

2. **E2E Verification (Gate 6a, epic-level)**: launch the **playwright-runner** agent with prompt: `"Run epic-level Playwright verification. Command: node .claude/scripts/run-e2e-verification.js --epic-mode --epic <N>. Return the structured JSON result."` Handle the result:
   - `passed` → continue to manual verification
   - `failed` → enter QA Fix Cycle (see below)
   - `halt` → STOP and ask the user how to proceed
   - `auto-skipped:fixme` / `auto-skipped:non-routable` → continue with caveat

3. **Manual Verification (Gate 6, batched)**: read each story's verification checklist at `generated-docs/qa/epic-N-[slug]/story-M-[slug]-verification-checklist.md`. Display them as ONE consolidated checklist grouped by story, then present a single `AskUserQuestion` with options:
   - "All stories pass" → continue to commit
   - "Findings on specific stories" → for each story with findings, run `node .claude/scripts/transition-phase.js --record-qa-finding --story M --note "..."`, then enter QA Fix Cycle

4. **QA Fix Cycle (per-story scoping)**: for each story with findings:
   - Launch the **developer** agent scoped to the story (prompt includes the finding text + story context).
   - Re-run that story's Vitest + Playwright spec only.
   - Increment `epicPass.fixCycles[M]`. If `fixCycles[M] >= 3`, halt and ask the user how to proceed (do not auto-retry).
   - When all flagged stories' fixes land, run **full-epic Vitest + Playwright + spec-compliance-watchdog** as the cross-story regression gate. Failures here go back into the fix cycle.
   - Re-prompt manual verification ONLY for the stories that had findings.

5. **Spec Compliance Check (Gate 6, epic-level)**: launch the **spec-compliance-watchdog** with prompt: `"Verify implementation matches specs across this epic. Compare against the epicPass.passStartedAt baseline diff (all stories in this epic)."` Any drift halts the commit and goes through the standard drift resolution.

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

### Phase: REALIGN

Current epic: [N], Current story: [M]

Run REALIGN per [orchestrator-rules.md § REALIGN](../shared/orchestrator-rules.md#realign-1-2-scoped-calls) (canonical — covers the auto-completed and revisions-proposed branches).

After REALIGN completes, proceed directly to TEST-DESIGN.

### Phase: TEST-DESIGN

Current epic: [N], Current story: [M]
Story file: [path from state]

Run TEST-DESIGN per [orchestrator-rules.md § TEST-DESIGN](../shared/orchestrator-rules.md#test-design-2-scoped-calls--ba-decision-persistence) (canonical — includes the Call A prompt, `list-ba-decisions.js` enumeration, doc display rules, batched `AskUserQuestion` for >3 decisions, `resolve-ba-decision.js` persistence, and Call B transition).

After Call B returns, proceed directly to WRITE-TESTS.

### Phase: WRITE-TESTS

Current epic: [N], Current story: [M]
Story file: [path from state]

This phase is fully autonomous. Use the WRITE-TESTS prompt from [orchestrator-rules.md § WRITE-TESTS](../shared/orchestrator-rules.md#write-tests-single-call--fully-autonomous) (canonical — includes the test-handoff path argument).

After it returns:
- Fire dashboard update.
- Proceed directly to IMPLEMENT (execute the IMPLEMENT instructions below).

### Phase: IMPLEMENT

Current epic: [N], Current story: [M]

Run IMPLEMENT per [orchestrator-rules.md § IMPLEMENT](../shared/orchestrator-rules.md#implement-single-call--fully-autonomous) (canonical — single autonomous call; the agent reads the story and test-handoff, captures a baseline `npm test` run, implements, re-tests, and returns a summary).

After it returns:
- Fire dashboard update.
- Proceed directly to QA.

### Phase: QA

Current epic: [N], Current story: [M]

QA runs the full canonical flow defined in [orchestrator-rules.md § QA (3 scoped calls)](../shared/orchestrator-rules.md#qa-3-scoped-calls): Call A → Call B → E2E Verification (Gate 6a) → Manual Verification → Spec Compliance Check (Gate 6) → Call C.

Resumption-specific routing: read the workflow state and re-enter the loop at whichever sub-step was interrupted. Use the canonical Call A/B/C prompts, the E2E Verification procedure (including halt prompts, the 3-cycle fix cap, and `e2eStatus` persistence), the QA Fix Cycle, and the Spec Compliance Check exactly as defined in orchestrator-rules.md — do not paraphrase. The verification checklist file at `generated-docs/qa/epic-N-[slug]/story-M-[slug]-verification-checklist.md` is the source of truth for every re-verification prompt; read it verbatim each time.

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
