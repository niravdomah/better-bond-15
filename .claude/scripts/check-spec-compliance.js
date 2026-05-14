#!/usr/bin/env node
/**
 * check-spec-compliance.js
 *
 * Script-first spec-compliance check. Runs before the LLM-driven
 * spec-compliance-watchdog so the watchdog only fires when there's actual
 * drift to investigate. Catches structural discrepancies the watchdog
 * laboriously re-discovered in Epic 1:
 *
 *   - AC declared in a story file but missing from the test-design coverage map
 *   - AC declared in a story file but never referenced by any test file
 *   - AC referenced in test-design coverage but not present in the story
 *   - BA decision blocks still unresolved in a test-design doc
 *
 * It does NOT replace the watchdog — semantic drift (e.g., test asserts a
 * different value than the AC describes) still needs an LLM. But on a
 * well-behaved epic where structure matches, this script returns "clean"
 * in a few hundred milliseconds and lets EPIC-QA skip the heavy LLM step.
 *
 * Usage:
 *   node .claude/scripts/check-spec-compliance.js --epic <N>
 *   node .claude/scripts/check-spec-compliance.js --epic <N> --story <M>   # single-story scope
 *   node .claude/scripts/check-spec-compliance.js --epic <N> --verbose
 *
 * Output (always JSON to stdout):
 *   {
 *     "status": "clean" | "discrepancies",
 *     "epic": <N>,
 *     "findings": [
 *       { "story": <M>, "acId": "AC-1", "type": "...", "severity": "...", "message": "..." }
 *     ],
 *     "statsPerStory": {
 *       "<M>": { "acCount": 13, "designedCount": 13, "testedCount": 13, "baPending": 0 }
 *     },
 *     "summary": "..."
 *   }
 *
 * Exit code: 0 on clean, 1 on discrepancies. (Both produce valid JSON;
 * exit code is a quick orchestrator signal.)
 */

const fs = require('fs');
const path = require('path');
const helpers = require('./lib/workflow-helpers');

// =============================================================================
// CLI
// =============================================================================

function parseArgs(argv) {
  const args = { verbose: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--epic' && argv[i + 1]) {
      args.epic = parseInt(argv[++i], 10);
    } else if (a === '--story' && argv[i + 1]) {
      args.story = parseInt(argv[++i], 10);
    } else if (a === '--verbose' || a === '-v') {
      args.verbose = true;
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    }
  }
  if (!args.help && (!args.epic || Number.isNaN(args.epic))) {
    exitWithError('Missing --epic <N>.');
  }
  if (args.story && Number.isNaN(args.story)) {
    exitWithError('Invalid --story <M>.');
  }
  return args;
}

function emit(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

function exitWithError(message) {
  emit({ status: 'error', message });
  process.exit(1);
}

function printHelp() {
  console.log(`
Usage:
  node .claude/scripts/check-spec-compliance.js --epic <N> [--story <M>] [--verbose]

Outputs JSON to stdout. Exit code 0 = clean, 1 = discrepancies found.

Checks:
  - AC in story but missing from test-design coverage map  → "ac_uncovered_in_design"
  - AC in story but no test file references it              → "ac_untested"
  - AC in test-design but not in story                      → "ac_orphaned"
  - BA decision blocks still unresolved                     → "ba_decisions_pending"
`);
}

// =============================================================================
// MAIN
// =============================================================================

function checkStory(epicNum, storyNum, options) {
  const { acs, coverage, tested } = helpers.getACTraceability(epicNum, storyNum);

  const acIds = new Set(acs.map(a => a.id));
  const designedIds = coverage.coveredACs; // Set<string>
  const testedIds = tested;                // Set<string>

  const findings = [];

  // ── 1. ACs in story but not in test-design coverage map ───────────────────
  for (const ac of acs) {
    if (!designedIds.has(ac.id)) {
      findings.push({
        story: storyNum,
        acId: ac.id,
        type: 'ac_uncovered_in_design',
        severity: 'medium',
        message: `${ac.id} is in the story file but not mapped in the test-design coverage section.`,
        acText: options.verbose ? ac.text : undefined
      });
    }
  }

  // ── 2. ACs in story but not referenced in any test file ───────────────────
  for (const ac of acs) {
    if (!testedIds.has(ac.id)) {
      findings.push({
        story: storyNum,
        acId: ac.id,
        type: 'ac_untested',
        severity: 'high',
        message: `${ac.id} is in the story file but no test file references it. Either the AC is deferred (note it in test-handoff) or it lacks a test.`,
        acText: options.verbose ? ac.text : undefined
      });
    }
  }

  // ── 3. ACs in test-design coverage but not present in the story ───────────
  for (const designedId of designedIds) {
    if (!acIds.has(designedId)) {
      findings.push({
        story: storyNum,
        acId: designedId,
        type: 'ac_orphaned',
        severity: 'low',
        message: `${designedId} appears in the test-design coverage map but is not declared in the story file. Likely a typo or stale reference.`
      });
    }
  }

  // ── 4. Unresolved BA decisions ────────────────────────────────────────────
  if (coverage.baDecisionsPending > 0) {
    findings.push({
      story: storyNum,
      acId: null,
      type: 'ba_decisions_pending',
      severity: 'blocker',
      message: `Test-design doc still has ${coverage.baDecisionsPending} unresolved "BA decision required" block(s). TEST-DESIGN Call B must resolve every block before WRITE-TESTS.`,
      count: coverage.baDecisionsPending
    });
  }

  return {
    storyNum,
    findings,
    stats: {
      acCount: acs.length,
      designedCount: designedIds.size,
      testedCount: testedIds.size,
      baPending: coverage.baDecisionsPending
    }
  };
}

function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const epicDir = helpers.findEpicDir(args.epic);
  if (!epicDir) {
    exitWithError(`Epic ${args.epic} directory not found in generated-docs/stories/`);
  }

  // Determine which stories to check
  let storyNums;
  if (args.story) {
    storyNums = [args.story];
  } else {
    const storyFiles = helpers.findStoryFiles(epicDir);
    if (storyFiles.length === 0) {
      exitWithError(`Epic ${args.epic} has no story files in ${epicDir}.`);
    }
    storyNums = storyFiles.map(s => s.num).sort((a, b) => a - b);
  }

  const allFindings = [];
  const statsPerStory = {};

  for (const sNum of storyNums) {
    const result = checkStory(args.epic, sNum, { verbose: args.verbose });
    allFindings.push(...result.findings);
    statsPerStory[sNum] = result.stats;
  }

  const clean = allFindings.length === 0;

  // Summary by type
  const byType = allFindings.reduce((acc, f) => {
    acc[f.type] = (acc[f.type] || 0) + 1;
    return acc;
  }, {});

  let summary;
  if (clean) {
    const totalAcs = Object.values(statsPerStory).reduce((s, x) => s + x.acCount, 0);
    summary = `All ${storyNums.length} story file(s) clean. ${totalAcs} AC(s) covered in test-design and referenced by tests; no BA decisions pending.`;
  } else {
    const parts = Object.entries(byType).map(([t, n]) => `${n} × ${t}`);
    summary = `${allFindings.length} discrepancy(s) across ${storyNums.length} story file(s): ${parts.join(', ')}.`;
  }

  emit({
    status: clean ? 'clean' : 'discrepancies',
    epic: args.epic,
    stories: storyNums,
    findings: allFindings,
    statsPerStory,
    summary
  });

  process.exit(clean ? 0 : 1);
}

main();
