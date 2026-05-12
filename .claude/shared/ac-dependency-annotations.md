# Acceptance criteria — dependency annotations

This document explains the `[requires: ...]` annotation that classifies whether each AC can be verified in the browser today, or has to wait for a future story.

## Why

The manual verification checklist is composed by the code-reviewer agent from the story's ACs. Without classification, the checklist asks the user to verify items they can't possibly verify yet — e.g., *"On `/payment-management`, the Payment Management link is highlighted"* when no `/payment-management` page exists. The user wastes time hunting for a problem that isn't there.

To stop this, every AC carries a small machine-readable hint about its runtime preconditions. The classifier ([.claude/scripts/classify-manual-verification.js](../scripts/classify-manual-verification.js)) reads the hint, evaluates whether the preconditions are met in the current codebase, and tags each AC as **verifiable**, **deferred**, or **heuristic-deferred** — and the code-reviewer surfaces those tags in the checklist.

## The annotation

Add an inline-code tag at the end of an AC line:

```markdown
- [ ] AC-6: Given I am signed in as an admin, when I am on the Payment Management screen, then the Payment Management link is highlighted in the nav `[requires: route=/payment-management, hint=Story 1.4 adds this route]`
```

Format: `[requires: <key>=<value>, <key>=<value>, ...]` wrapped in single backticks. The annotation is **optional** — untagged ACs default to "verifiable today", and a heuristic backstop catches obvious misses.

## Supported keys

| Key | Meaning | How the classifier checks it |
|---|---|---|
| `route=<path>` | The AC requires a Next.js route to exist (e.g. `/payment-management`). | Walks `web/src/app/**/page.tsx`; collapses route-group dirs `(name)`; checks for an exact match. |
| `story=<N>.<M>` | The AC is verifiable only after Epic N Story M reaches `COMPLETE`. | Reads `generated-docs/context/workflow-state.json` and checks `epics[N].stories[M].phase === 'COMPLETE'`. |
| `hint=<free text>` | A human-friendly explanation surfaced verbatim on the deferred section of the checklist. | Echoed as-is. |

Multiple `route=` and `story=` entries are allowed; they're all evaluated. `hint=` may be specified once.

## Worked examples

**Cross-page active state — depends on a route that lands in a future story:**
```markdown
- [ ] AC-6: …Payment Management link is highlighted `[requires: route=/payment-management, hint=Story 1.4 adds this route]`
```

**Behavior depends on another story being complete:**
```markdown
- [ ] AC-12: Sign-out button uses the toast infrastructure `[requires: story=1.6, hint=Toast infrastructure lands in Story 1.6]`
```

**Compound dependency — needs both the route and an upstream story:**
```markdown
- [ ] AC-9: Bulk-park action shows a success toast on /payment-management `[requires: route=/payment-management, story=1.6]`
```

## Heuristic backstop

When an AC has no annotation but its text mentions a literal `/<segment>` that doesn't resolve to a real page, the classifier flags it as `heuristic-deferred`. This catches drift in legacy stories that pre-date the convention. The heuristic is intentionally loose (occasional false positives) — it surfaces a warning, not a hard error.

The heuristic skips:

- API-shaped paths starting with `/v\d+` or `/api`
- Paths preceded by an HTTP method verb (`POST /demo/reset-demo`)
- Word-slash-word constructs like `park/unpark` (only the second half would otherwise match)

If the heuristic gives you a false positive, add an explicit annotation to silence it — that's the canonical fix.

## Tooling

- **Per-story classification:** `node .claude/scripts/classify-manual-verification.js --epic <N> --story <M>` returns JSON with one entry per AC.
- **Single-text classification:** `node .claude/scripts/classify-manual-verification.js --check-text "<phrase>"` runs only the heuristic — used by the code-reviewer to validate plain-language items it composes from ACs.
- **Repo-wide drift audit:** `node .claude/scripts/validate-ac-dependencies.js` scans every story file and lists ACs that triggered the heuristic. Soft warning (exit 1) — does not block the workflow.

## Workflow integration

- **feature-planner** writes the annotation when an AC depends on a future route, component, or story. See its agent file for the rule and the worked wrong/right example.
- **code-reviewer Call B** runs the classifier before composing the checklist and renders three sections: `Verifiable today`, `Deferred — will re-verify on a later story`, `Possibly deferred (heuristic — please use judgment)`.
- **validate-phase-output.js** runs the drift validator after STORIES, surfacing any unannotated drift as a soft warning.

## Adding a new annotation key

1. Add a new branch to `parseTag()` and the evaluation loop in `classify-manual-verification.js`.
2. Add a row to the table above.
3. Add a worked example.
4. Run the classifier against existing stories to confirm the new key parses cleanly.
