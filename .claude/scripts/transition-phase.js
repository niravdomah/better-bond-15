#!/usr/bin/env node
/**
 * transition-phase.js
 * Manages workflow state transitions with validation
 *
 * Usage:
 *   node .claude/scripts/transition-phase.js --to <PHASE> [--verify-output]                          # Global phases (INTAKE, DESIGN, SCOPE) — no --epic needed
 *   node .claude/scripts/transition-phase.js --epic <N> --to <PHASE> [--story <M>] [--validate] [--verify-output]
 *   node .claude/scripts/transition-phase.js --current --to <PHASE> [--story <M>] [--validate] [--verify-output]
 *   node .claude/scripts/transition-phase.js --mark-started
 *   node .claude/scripts/transition-phase.js --show
 *   node .claude/scripts/transition-phase.js --repair
 *
 * Phases: INTAKE, SCOPE, DESIGN, STORIES, REALIGN, TEST-DESIGN, WRITE-TESTS, IMPLEMENT, QA, COMPLETE
 *
 * Workflow Structure (4 Stages):
 *   Stage 1: INTAKE (gather requirements, produce FRS) → DESIGN (multi-agent: API spec, style tokens, wireframes) → SCOPE (define epics only)
 *   Stage 2: Per-Epic: STORIES (define stories for current epic)
 *   Stage 3: Per-Story: REALIGN → WRITE-TESTS → IMPLEMENT → QA
 *
 * Phase Status:
 *   Transitions set phaseStatus to "ready". Agents call --mark-started to set "in_progress".
 *
 * Options:
 *   --validate       Validate prerequisites before transitioning
 *   --verify-output  After transition, verify the FROM phase created expected outputs
 *   --mark-started   Mark current phase as in_progress (agent calls when starting work)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const helpers = require('./lib/workflow-helpers');

const STATE_FILE = 'generated-docs/context/workflow-state.json';
const STATE_DIR = 'generated-docs/context';
const VALIDATE_SCRIPT = '.claude/scripts/validate-phase-output.js';

// Design artifact paths (used in repair, verify, and design-agent tracking)
const SPECS_DIR = 'generated-docs/specs';
const FRS_PATH = `${SPECS_DIR}/feature-requirements.md`;
const API_SPEC_PATH = `${SPECS_DIR}/api-spec.yaml`;
const DESIGN_TOKENS_CSS_PATH = `${SPECS_DIR}/design-tokens.css`;
const DESIGN_TOKENS_MD_PATH = `${SPECS_DIR}/design-tokens.md`;
const INTAKE_MANIFEST_PATH = `${STATE_DIR}/intake-manifest.json`;
const MOCK_HANDLERS_PATH = 'web/src/mocks/handlers.ts';
const API_TYPES_PATH = 'web/src/types/api-generated.ts';

// Phase constants (shared with other scripts via workflow-helpers)
const PHASES = helpers.ALL_PHASES;
const GLOBAL_PHASES = helpers.GLOBAL_PHASES;

// Valid transitions (from → [allowed destinations])
// New 4-stage workflow:
//   Stage 1: INTAKE (gather requirements, produce FRS) → DESIGN (multi-agent: API spec, style tokens, wireframes) → SCOPE (define epics only)
//   Stage 2: Per-Epic: STORIES (define stories for current epic)
//   Stage 3: Per-Story: REALIGN → TEST-DESIGN → WRITE-TESTS → IMPLEMENT → QA
const VALID_TRANSITIONS = {
  'INTAKE': ['DESIGN'],                     // After intake (FRS produced), proceed to design (API spec, style tokens, wireframes)
  'SCOPE': ['DESIGN', 'STORIES'],           // After scope (epics defined), design artifacts or start stories
  'DESIGN': ['SCOPE', 'STORIES'],           // After design (all sub-agents complete), proceed to scope or stories
  'STORIES': ['REALIGN', 'TEST-DESIGN', 'WRITE-TESTS'],  // After stories defined, realign, test-design, or write tests for first story
  'REALIGN': ['TEST-DESIGN'],               // After realign, proceed to test design
  'TEST-DESIGN': ['WRITE-TESTS'],           // After test design, proceed to write tests
  'WRITE-TESTS': ['IMPLEMENT'],             // After writing tests, implement
  'IMPLEMENT': ['QA'],                      // After implementation, QA (review + quality gates)
  'QA': ['COMPLETE', 'IMPLEMENT'],          // After QA, story complete (or back to implement if issues)
  'COMPLETE': ['REALIGN', 'STORIES', 'PHASE-BOUNDARY'],  // After story complete, next story's realign, next epic's stories, or phase boundary
  'PHASE-BOUNDARY': ['STORIES'],             // After phase boundary, continue to next phase's stories (Stop does not transition)
  'PENDING': ['REALIGN', 'TEST-DESIGN', 'WRITE-TESTS'],  // Pending story can start realign, test-design, or write tests
  'NONE': ['INTAKE', 'STORIES', 'REALIGN']            // Initial state (INTAKE is the mandatory entry point)
};

// =============================================================================
// HELPERS
// =============================================================================

function ensureStateDir() {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

function exitWithError(message) {
  console.log(JSON.stringify({ status: 'error', message }, null, 2));
  process.exit(1);
}

function parsePositiveInt(value, label) {
  const num = parseInt(value);
  if (isNaN(num) || num < 1) {
    exitWithError(`Invalid ${label}. Must be a positive integer.`);
  }
  return num;
}

function requireEpicArg(args, flagName) {
  const epicIdx = args.indexOf('--epic');
  if (epicIdx === -1 || !args[epicIdx + 1]) {
    exitWithError(`${flagName} requires --epic <N> to specify which epic.`);
  }
  return parsePositiveInt(args[epicIdx + 1], 'epic number');
}

function readState() {
  return helpers.readWorkflowState();
}

function writeState(state) {
  ensureStateDir();
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function findFeatureSpec() {
  // Canonical location (produced by INTAKE's intake-brd-review-agent)
  const canonicalFRS = FRS_PATH;
  if (fs.existsSync(canonicalFRS)) return canonicalFRS;

  // Fallback: scan documentation/ for user-provided specs
  const docDir = 'documentation';
  if (!fs.existsSync(docDir)) return null;

  const files = fs.readdirSync(docDir)
    .filter(f => f.endsWith('.md') && f !== 'README.md');

  return files.length > 0 ? path.join(docDir, files[0]) : null;
}

function getEpicInfo(epicNum) {
  const epicDirs = [];
  const storiesDir = 'generated-docs/stories';

  if (fs.existsSync(storiesDir)) {
    const entries = fs.readdirSync(storiesDir);
    for (const entry of entries) {
      const match = entry.match(/^epic-(\d+)/);
      if (match) {
        epicDirs.push({
          num: parseInt(match[1]),
          name: entry,
          path: path.join(storiesDir, entry)
        });
      }
    }
  }

  epicDirs.sort((a, b) => a.num - b.num);

  if (epicNum) {
    return epicDirs.find(e => e.num === epicNum) || null;
  }
  return epicDirs;
}

/**
 * Count epic definition files in generated-docs/epics/ (written during SCOPE).
 * These exist before story directories are created, so they are a more reliable
 * source of truth for totalEpics than counting story directories alone.
 */
function countEpicDefinitions() {
  const epicsDir = 'generated-docs/epics';
  let count = 0;

  if (fs.existsSync(epicsDir)) {
    const entries = fs.readdirSync(epicsDir);
    for (const entry of entries) {
      if (entry.match(/^epic-\d+(-[\w]+)*\.md$/)) {
        count++;
      }
    }
  }

  return count;
}

function validateTransition(currentPhase, targetPhase, state, epicNum, storyNum) {
  const from = currentPhase || 'NONE';
  const allowed = VALID_TRANSITIONS[from] || [];

  // Special case: STORIES for epic 2+ requires previous epic to be COMPLETE
  if (targetPhase === 'STORIES' && epicNum > 1) {
    if (!state || !state.epics[epicNum - 1] || state.epics[epicNum - 1].phase !== 'COMPLETE') {
      return {
        valid: false,
        message: `Cannot start Epic ${epicNum} STORIES: Epic ${epicNum - 1} is not COMPLETE`
      };
    }
  }

  // Special case: REALIGN/WRITE-TESTS for story 2+ requires previous story to be COMPLETE
  // In batched epic mode, the prerequisite changes: Story N can enter the current
  // pass once Story N-1 has finished the SAME pass (epicPass.storyPhases[N-1] === 'COMPLETE'),
  // not once Story N-1 has finished every phase.
  if (storyNum && storyNum > 1 && ['REALIGN', 'WRITE-TESTS'].includes(targetPhase)) {
    if (helpers.isBatchedEpic(state)) {
      const epicPass = state.epicPass;
      const prevPhase = epicPass.storyPhases[String(storyNum - 1)];
      // In batched mode the previous story only needs to have COMPLETEd the
      // current pass — same-pass-next-story transitions are explicitly allowed.
      if (prevPhase !== 'COMPLETE') {
        return {
          valid: false,
          message: `Cannot start Story ${storyNum} in batched ${epicPass.phase} pass: Story ${storyNum - 1} has not finished this pass (status: ${prevPhase || 'UNKNOWN'})`
        };
      }
      return { valid: true };
    }

    const epicState = state?.epics?.[epicNum];
    const prevStory = epicState?.stories?.[storyNum - 1];
    if (!prevStory || prevStory.phase !== 'COMPLETE') {
      return {
        valid: false,
        message: `Cannot start Story ${storyNum}: Story ${storyNum - 1} is not COMPLETE`
      };
    }
    return { valid: true };
  }

  // Special case: in batched epic mode, the same-pass-next-story transition
  // for any story phase (REALIGN→REALIGN, TEST-DESIGN→TEST-DESIGN, etc.) is
  // legal because the previous story has just finished the same pass.
  if (helpers.isBatchedEpic(state) && from === targetPhase &&
      helpers.STORY_PHASES.includes(targetPhase)) {
    return { valid: true };
  }

  // Special case: Allow REALIGN/STORIES from COMPLETE (next story or next epic)
  if (from === 'COMPLETE' && ['REALIGN', 'STORIES'].includes(targetPhase)) {
    return { valid: true };
  }

  if (!allowed.includes(targetPhase)) {
    return {
      valid: false,
      message: `Invalid transition: ${from} → ${targetPhase}. Allowed transitions from ${from}: ${allowed.join(', ') || 'none'}`
    };
  }

  return { valid: true };
}

// Phase prerequisites - what must exist before transitioning TO a phase
const PHASE_PREREQUISITES = {
  'INTAKE': [], // Can start intake anytime (entry point)
  'SCOPE': [], // Can start scoping anytime
  'DESIGN': [], // Can start design anytime
  'STORIES': ['SCOPE'], // Need epics defined before defining stories
  'REALIGN': ['STORIES'], // Need stories defined for current epic
  'TEST-DESIGN': ['STORIES'], // Need stories to design test scenarios from
  'WRITE-TESTS': ['STORIES'], // Need stories to generate tests from
  'IMPLEMENT': ['WRITE-TESTS'], // Need tests to implement against
  'QA': ['IMPLEMENT'], // Need implementation to review and validate
  'COMPLETE': ['QA'] // Need QA complete
};

function runValidationScript(phase, epicNum) {
  // Run the validate-phase-output.js script and return its result
  if (!fs.existsSync(VALIDATE_SCRIPT)) {
    return {
      status: 'skipped',
      message: 'Validation script not found',
      path: VALIDATE_SCRIPT
    };
  }

  try {
    const epicArg = epicNum ? `--epic ${epicNum}` : '';
    const cmd = `node ${VALIDATE_SCRIPT} --phase ${phase} ${epicArg}`;
    const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return JSON.parse(output);
  } catch (error) {
    // Script exited with non-zero - parse the output if possible
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch {
        // Couldn't parse output
      }
    }
    return {
      status: 'error',
      message: `Validation script failed: ${error.message}`,
      exitCode: error.status || 1
    };
  }
}

function validatePrerequisites(targetPhase, epicNum) {
  // Check that prerequisites for the target phase are met
  const prereqs = PHASE_PREREQUISITES[targetPhase] || [];

  if (prereqs.length === 0) {
    return { valid: true, message: 'No prerequisites required' };
  }

  const results = [];
  let allValid = true;

  for (const prereqPhase of prereqs) {
    const validation = runValidationScript(prereqPhase, epicNum);

    if (validation.status === 'invalid' || validation.status === 'error') {
      allValid = false;
    }

    results.push({
      phase: prereqPhase,
      ...validation
    });
  }

  return {
    valid: allValid,
    message: allValid
      ? `All prerequisites for ${targetPhase} are met`
      : `Prerequisites for ${targetPhase} not met`,
    prerequisites: results
  };
}

// =============================================================================
// COMMANDS
// =============================================================================

function showState() {
  const state = readState();

  if (!state) {
    console.log(JSON.stringify({
      status: 'no_state',
      message: 'No workflow state found. Run /start to begin.',
      suggestion: 'Use --repair to initialize state from artifacts'
    }, null, 2));
    return;
  }

  console.log(JSON.stringify({
    status: 'ok',
    state
  }, null, 2));
}

function repairState() {
  // Attempt to reconstruct state from filesystem artifacts
  const spec = findFeatureSpec();
  const epics = getEpicInfo();

  if (!spec) {
    console.log(JSON.stringify({
      status: 'error',
      message: 'No feature spec found in generated-docs/specs/ or documentation/. Cannot repair state.'
    }, null, 2));
    process.exit(1);
  }

  // Track what we detected vs what we assumed for confidence calculation
  const detected = [];
  const assumed = [];
  let confidenceScore = 100; // Start at 100, deduct for assumptions

  // Determine current state by scanning artifacts
  let currentEpic = null;
  let currentStory = null;
  let currentPhase = 'SCOPE';
  let epicStates = {};

  // Check for feature overview
  const featureOverviewPath = 'generated-docs/stories/_feature-overview.md';
  const hasFeatureOverview = fs.existsSync(featureOverviewPath);
  if (hasFeatureOverview) {
    detected.push('Feature overview file exists');
  } else {
    assumed.push('No feature overview - assuming PLAN phase needed');
    confidenceScore -= 10;
  }

  // Check for quality gate status (indicates QA completed)
  const qualityGateStatus = 'generated-docs/context/quality-gate-status.json';
  const hasQualityGate = fs.existsSync(qualityGateStatus);
  if (hasQualityGate) {
    detected.push('Quality gate status file exists');
  }

  for (const epic of epics) {
    const hasOverview = fs.existsSync(path.join(epic.path, '_epic-overview.md'));
    let storyFiles = [];
    try {
      storyFiles = fs.readdirSync(epic.path).filter(f => f.startsWith('story-') && f.endsWith('.md'));
    } catch {
      // Directory exists but can't read it
      assumed.push(`Could not read epic-${epic.num} directory`);
      confidenceScore -= 15;
    }

    // Check for test files (flexible matching)
    let testFileCount = 0;
    const testDirs = ['web/src/__tests__/integration', 'web/src/__tests__'];
    for (const testDir of testDirs) {
      if (fs.existsSync(testDir)) {
        try {
          const testFiles = fs.readdirSync(testDir, { recursive: true })
            .filter(f => typeof f === 'string' && f.includes(`epic-${epic.num}`) && (f.endsWith('.test.tsx') || f.endsWith('.test.ts')));
          if (testFiles.length > 0) {
            testFileCount = testFiles.length;
            break;
          }
        } catch {
          // Can't read test dir
        }
      }
    }

    // Check for review marker
    const reviewMarker = `generated-docs/reviews/epic-${epic.num}-review.md`;
    const hasReviewMarker = fs.existsSync(reviewMarker);

    // Check for review findings in context
    let hasReviewFindings = false;
    const reviewFindingsPath = 'generated-docs/context/review-findings.json';
    if (fs.existsSync(reviewFindingsPath)) {
      try {
        const findings = JSON.parse(fs.readFileSync(reviewFindingsPath, 'utf-8'));
        if (findings.recommendation) {
          hasReviewFindings = true;
        }
      } catch {
        // Invalid JSON
      }
    }

    // Determine epic phase with confidence tracking
    let epicPhase;
    let phaseConfidence = 'high';
    let storyStates = {};
    let totalStories = storyFiles.length;

    if (!hasOverview || storyFiles.length === 0) {
      epicPhase = 'STORIES'; // Needs story definition
      if (!hasOverview && storyFiles.length === 0) {
        detected.push(`Epic ${epic.num}: No overview or stories - STORIES phase`);
      } else {
        assumed.push(`Epic ${epic.num}: Partial artifacts - assuming STORIES`);
        phaseConfidence = 'medium';
        confidenceScore -= 10;
      }
    } else {
      // Has stories - determine story-level phases using shared helper
      // Use broader test search for repair (recursive, multiple dirs)
      const repairTestOptions = { dirs: testDirs, recursive: true };
      const stories = helpers.getStoryStates(epic.path, epic.num, repairTestOptions);
      let allStoriesComplete = true;
      let firstIncompleteStory = null;

      for (const story of stories) {
        storyStates[story.number] = {
          name: story.name,
          phase: story.phase
        };
        if (story.phase !== 'COMPLETE') {
          allStoriesComplete = false;
          if (!firstIncompleteStory) firstIncompleteStory = story.number;
        }
      }

      if (allStoriesComplete) {
        epicPhase = 'COMPLETE';
        detected.push(`Epic ${epic.num}: All ${storyFiles.length} stories complete - COMPLETE`);
      } else if (hasReviewMarker || (hasQualityGate && hasReviewFindings)) {
        epicPhase = 'QA';
        detected.push(`Epic ${epic.num}: Has review artifacts - QA phase`);
      } else {
        epicPhase = storyStates[firstIncompleteStory]?.phase || 'IMPLEMENT';
        detected.push(`Epic ${epic.num}: Story ${firstIncompleteStory} in ${epicPhase} phase`);
      }
    }

    epicStates[epic.num] = {
      name: epic.name,
      phase: epicPhase,
      totalStories,
      stories: storyStates,
      tests: testFileCount,
      phaseConfidence
    };

    // Track first incomplete epic
    if (!currentEpic && epicPhase !== 'COMPLETE') {
      currentEpic = epic.num;
      currentPhase = epicPhase;
    }
  }

  // If no epics found, confidence is low
  if (epics.length === 0) {
    assumed.push('No epic directories found - starting fresh');
    confidenceScore -= 20;
  }

  // Calculate overall confidence level
  let confidence;
  let confidenceReason;
  if (confidenceScore >= 80) {
    confidence = 'high';
    confidenceReason = 'Most artifacts clearly indicate current state';
  } else if (confidenceScore >= 50) {
    confidence = 'medium';
    confidenceReason = 'Some artifacts found but state partially inferred';
  } else {
    confidence = 'low';
    confidenceReason = 'Many assumptions made - manual verification strongly recommended';
  }

  // Determine current story from the first incomplete story in current epic
  if (currentEpic && epicStates[currentEpic]?.stories) {
    const stories = epicStates[currentEpic].stories;
    for (const [num, story] of Object.entries(stories)) {
      if (story.phase !== 'COMPLETE') {
        currentStory = parseInt(num);
        currentPhase = story.phase;
        break;
      }
    }
  }

  // --- Enrich repaired state with dashboard fields ---

  // Enrich story-level fields (names, testFiles, acceptance, route)
  for (const [eNum, epicState] of Object.entries(epicStates)) {
    const epicDir = helpers.findEpicDir(parseInt(eNum));
    if (epicDir && epicState.stories) {
      const storyFiles = helpers.findStoryFiles(epicDir);
      for (const [sNum, story] of Object.entries(epicState.stories)) {
        story.testFiles = helpers.countTestFiles(parseInt(eNum), parseInt(sNum));
        const ac = helpers.countStoryAC(epicDir, parseInt(sNum));
        story.acceptance = ac;
        // Extract route from story file if not already set
        if (!story.route) {
          const sf = storyFiles.find(s => s.num === parseInt(sNum));
          if (sf) {
            try {
              const content = fs.readFileSync(sf.path, 'utf-8');
              story.route = helpers.extractStoryRoute(content) || null;
            } catch { /* ignore */ }
          }
        }
      }
    }
  }

  // Cache artifact existence checks (avoid repeated fs.existsSync on same paths)
  const manifestExists = fs.existsSync(INTAKE_MANIFEST_PATH);
  const frsExists = fs.existsSync(FRS_PATH);
  const hasApiSpec = fs.existsSync(API_SPEC_PATH);
  const hasDesignTokensCss = fs.existsSync(DESIGN_TOKENS_CSS_PATH);
  const hasDesignTokensMd = fs.existsSync(DESIGN_TOKENS_MD_PATH);
  const hasMockHandlers = fs.existsSync(MOCK_HANDLERS_PATH);
  const hasApiTypes = fs.existsSync(API_TYPES_PATH);
  const wireframeCount = helpers.countWireframes();

  // Read manifest once (used by both intake and design blocks)
  let manifest = null;
  if (manifestExists) {
    try {
      manifest = JSON.parse(fs.readFileSync(INTAKE_MANIFEST_PATH, 'utf-8'));
    } catch { /* ignore */ }
  }

  // Enrich intake block
  let intakeBlock = undefined;
  if (manifestExists || frsExists) {
    intakeBlock = {
      manifestExists,
      frsExists,
      requirementCount: manifest?.requirementCount ?? null,
      businessRuleCount: manifest?.businessRuleCount ?? null,
      capturedAt: new Date().toISOString()
    };
  }

  // Enrich design block (reconstruct from manifest + artifact existence)
  let designBlock = undefined;
  if (manifest) {
    const arts = manifest.artifacts || {};
    const agentsExpected = [];
    const agentsCompleted = [];
    const autonomousExpected = [];
    const autonomousCompleted = [];

    if (arts.apiSpec && (arts.apiSpec.generate || arts.apiSpec.userProvided)) {
      agentsExpected.push('design-api-agent');
      if (hasApiSpec) agentsCompleted.push('design-api-agent');
    }
    if ((arts.designTokensCss && (arts.designTokensCss.generate || arts.designTokensCss.userProvided)) ||
        (arts.designTokensMd && (arts.designTokensMd.generate || arts.designTokensMd.userProvided))) {
      agentsExpected.push('design-style-agent');
      if (hasDesignTokensCss || hasDesignTokensMd) {
        agentsCompleted.push('design-style-agent');
      }
    }
    if (arts.wireframes && (arts.wireframes.generate || arts.wireframes.userProvided)) {
      agentsExpected.push('design-wireframe-agent');
      if (wireframeCount > 0) agentsCompleted.push('design-wireframe-agent');
    }
    if (arts.apiSpec && arts.apiSpec.mockHandlers) {
      autonomousExpected.push('mock-setup-agent');
      if (hasMockHandlers) autonomousCompleted.push('mock-setup-agent');
    }
    if (hasApiSpec) {
      autonomousExpected.push('type-generator-agent');
      if (hasApiTypes) autonomousCompleted.push('type-generator-agent');
    }

    designBlock = {
      agentsExpected,
      agentsCompleted,
      autonomousExpected,
      autonomousCompleted,
      capturedAt: new Date().toISOString()
    };
  }

  // Enrich design artifacts
  const designArtifactsBlock = {
    apiSpec: hasApiSpec,
    designTokensCss: hasDesignTokensCss,
    designTokensMd: hasDesignTokensMd,
    wireframes: wireframeCount,
    capturedAt: new Date().toISOString()
  };

  // Build repaired state
  const repairedState = {
    featureName: path.basename(spec, '.md'),
    specPath: spec,
    currentEpic: currentEpic || (epics.length > 0 ? epics[epics.length - 1].num : 1),
    currentStory: currentStory,
    currentPhase: currentEpic ? currentPhase : 'COMPLETE',
    epics: epicStates,
    repairedAt: new Date().toISOString(),
    repairNote: 'State reconstructed from artifacts.'
  };

  // Attach enriched blocks if data exists
  if (intakeBlock) repairedState.intake = intakeBlock;
  if (designBlock) repairedState.design = designBlock;
  repairedState.designArtifacts = designArtifactsBlock;

  // Detect batched-mode signals from disk and reconstruct epicPass if needed.
  // Signal: multiple stories in the current epic share the same in-flight phase
  // (e.g. all in TEST-DESIGN, all with tests written but not yet implemented).
  // This is rare in legacy mode — in legacy, only ONE story is in flight at a time.
  if (repairedState.currentEpic && epicStates[repairedState.currentEpic]) {
    const epicSt = epicStates[repairedState.currentEpic];
    const stories = epicSt.stories || {};
    const phases = Object.values(stories).map(s => s.phase);
    const distinctNonComplete = [...new Set(phases.filter(p => p && p !== 'COMPLETE'))];
    // Heuristic: 2+ stories in the same non-COMPLETE phase = batched pass in flight.
    const phaseCounts = {};
    for (const p of phases) {
      if (p && p !== 'COMPLETE') phaseCounts[p] = (phaseCounts[p] || 0) + 1;
    }
    const passPhase = Object.entries(phaseCounts).find(([, c]) => c >= 2)?.[0];
    if (passPhase && helpers.EPIC_PASS_ORDER.includes(passPhase)) {
      const storyNums = Object.keys(stories).map(Number).sort((a, b) => a - b);
      const storyPhases = {};
      for (const n of storyNums) {
        const sp = stories[n]?.phase;
        const spIdx = helpers.EPIC_PASS_ORDER.indexOf(sp);
        const passIdx = helpers.EPIC_PASS_ORDER.indexOf(passPhase);
        if (sp === 'COMPLETE' || (spIdx >= 0 && spIdx > passIdx)) {
          storyPhases[String(n)] = 'COMPLETE';
        } else if (sp === passPhase) {
          // First story at this phase becomes IN_PROGRESS, others remain at this phase
          storyPhases[String(n)] = 'IN_PROGRESS';
        } else {
          storyPhases[String(n)] = 'PENDING';
        }
      }
      // Demote all but the first IN_PROGRESS to PENDING (one at a time within a pass)
      let seenInProgress = false;
      for (const n of storyNums) {
        if (storyPhases[String(n)] === 'IN_PROGRESS') {
          if (seenInProgress) storyPhases[String(n)] = 'PENDING';
          seenInProgress = true;
        }
      }
      repairedState.batchMode = 'epic';
      repairedState.epicPass = {
        phase: passPhase,
        storyOrder: storyNums,
        storyPhases,
        passStartedAt: new Date().toISOString(),
        fixCycles: {},
        qaFindings: {}
      };
      detected.push(`Epic ${repairedState.currentEpic}: detected batched ${passPhase} pass (${distinctNonComplete.length} stories in flight)`);
    }
  }

  writeState(repairedState);

  // Build detailed response
  const response = {
    status: 'repaired',
    message: 'State file repaired from artifacts.',
    confidence,
    confidenceScore,
    confidenceReason,
    detected,
    assumed,
    state: repairedState
  };

  // Add warning based on confidence
  if (confidence === 'low') {
    response.warning = 'LOW CONFIDENCE: Many assumptions were made. Please verify the state manually before proceeding.';
  } else if (confidence === 'medium') {
    response.warning = 'MEDIUM CONFIDENCE: Some state was inferred. Review the detected state and confirm it matches your expectations.';
  } else {
    response.note = 'High confidence repair. State appears accurate based on artifacts found.';
  }

  console.log(JSON.stringify(response, null, 2));
}

function transitionPhase(epicNum, targetPhase, storyNum, options = {}) {
  const { validate = false, verifyOutput = false, cachedState = null } = options;

  if (!PHASES.includes(targetPhase)) {
    console.log(JSON.stringify({
      status: 'error',
      message: `Invalid phase: ${targetPhase}. Valid phases: ${PHASES.join(', ')}`
    }, null, 2));
    process.exit(1);
  }

  let state = cachedState || readState();

  // Initialize state if it doesn't exist
  if (!state) {
    const spec = findFeatureSpec();
    if (!spec && targetPhase !== 'INTAKE') {
      console.log(JSON.stringify({
        status: 'error',
        message: 'No feature spec found in generated-docs/specs/ or documentation/. Create a spec first or use --init INTAKE to gather requirements.'
      }, null, 2));
      process.exit(1);
    }

    const isGlobal = GLOBAL_PHASES.includes(targetPhase);
    state = {
      featureName: spec ? path.basename(spec, '.md') : 'pending-intake',
      specPath: spec || null,
      currentEpic: isGlobal ? null : epicNum,
      currentStory: storyNum || null,
      currentPhase: 'NONE',
      phaseStatus: 'ready',
      epics: {}
    };
  }

  // Determine current phase - consider story-level phase if transitioning a story
  const isGlobalTarget = GLOBAL_PHASES.includes(targetPhase);
  let currentPhase;
  if (isGlobalTarget) {
    // Global phases use the top-level currentPhase (no epic association)
    currentPhase = state.currentPhase || 'NONE';
  } else if (storyNum && state.epics[epicNum]?.stories?.[storyNum]) {
    currentPhase = state.epics[epicNum].stories[storyNum].phase || 'PENDING';
  } else if (state.currentEpic === epicNum && state.currentStory === storyNum) {
    currentPhase = state.currentPhase;
  } else {
    currentPhase = state.epics[epicNum]?.phase || 'NONE';
  }

  const validation = validateTransition(currentPhase, targetPhase, state, epicNum, storyNum);
  if (!validation.valid) {
    console.log(JSON.stringify({
      status: 'error',
      message: validation.message,
      currentState: {
        epic: epicNum,
        story: storyNum || null,
        phase: currentPhase
      }
    }, null, 2));
    process.exit(1);
  }

  // If --validate flag is set, check prerequisites
  if (validate) {
    const prereqCheck = validatePrerequisites(targetPhase, epicNum);
    if (!prereqCheck.valid) {
      console.log(JSON.stringify({
        status: 'error',
        message: prereqCheck.message,
        prerequisites: prereqCheck.prerequisites,
        suggestion: 'Complete the prerequisite phases before transitioning'
      }, null, 2));
      process.exit(1);
    }
  }

  // If --verify-output flag is set, validate that the FROM phase created expected outputs
  let outputValidation = null;
  if (verifyOutput && currentPhase !== 'NONE' && currentPhase !== 'PENDING') {
    outputValidation = runValidationScript(currentPhase, epicNum);
  }

  // Initialize epic state if needed (skip for global phases — they have no epic)
  if (!isGlobalTarget) {
    if (!state.epics[epicNum]) {
      state.epics[epicNum] = { stories: {} };
    }
    if (!state.epics[epicNum].stories) {
      state.epics[epicNum].stories = {};
    }
  }

  // Update state based on whether this is a story-level, global, or epic-level transition
  const isStoryPhase = ['REALIGN', 'TEST-DESIGN', 'WRITE-TESTS', 'IMPLEMENT', 'QA', 'COMPLETE'].includes(targetPhase) && storyNum;

  if (isStoryPhase) {
    // Story-level transition
    if (!state.epics[epicNum].stories[storyNum]) {
      state.epics[epicNum].stories[storyNum] = {};
    }
    state.epics[epicNum].stories[storyNum].phase = targetPhase;
    state.currentStory = storyNum;
    state.currentPhase = targetPhase;
    state.currentEpic = epicNum;
    state.phaseStatus = 'ready'; // Phase transitioned but work not yet started

    // Handle story completion
    if (targetPhase === 'COMPLETE') {
      const epicState = state.epics[epicNum];
      // Count total stories: prefer explicit totalStories, then count story files on disk,
      // then fall back to stories tracked in state. Counting disk files prevents the bug
      // where only state-tracked stories are counted (skipping unstarted stories).
      let totalStories = epicState.totalStories;
      if (!totalStories) {
        const epicInfo = getEpicInfo(epicNum);
        if (epicInfo && fs.existsSync(epicInfo.path)) {
          const storyFiles = fs.readdirSync(epicInfo.path).filter(f => f.startsWith('story-') && f.endsWith('.md'));
          totalStories = storyFiles.length;
        }
      }
      if (!totalStories) {
        totalStories = Object.keys(epicState.stories).length;
      }

      // Check if all stories in epic are complete
      const completedStories = Object.values(epicState.stories)
        .filter(s => s.phase === 'COMPLETE').length;

      if (completedStories >= totalStories) {
        // Epic complete - all stories done
        epicState.phase = 'COMPLETE';

        // Count epic definitions once — used for both auto-detect and cross-validation
        const epicDefCount = countEpicDefinitions();

        // Auto-detect totalEpics if not set
        if (!state.totalEpics) {
          // Prefer epic definition files (written during SCOPE, before story dirs exist)
          const epicDirCount = getEpicInfo().length;
          const detected = Math.max(epicDefCount, epicDirCount);
          if (detected > 0) {
            state.totalEpics = detected;
          }
        }

        // Cross-validate: epic definitions may outnumber story dirs if STORIES
        // hasn't run for later epics yet. Never mark complete prematurely.
        if (epicDefCount > (state.totalEpics || 0)) {
          state.totalEpics = epicDefCount;
        }

        // Check if this is a phase boundary (optional phasing feature)
        const phases = helpers.getPhases(state);
        if (phases.enabled && phases.isMultiPhase && phases.currentPhaseIndex !== null) {
          const currentIdx = phases.currentPhaseIndex;
          const currentGroup = phases.groups[currentIdx];
          const lastEpicInPhase = Math.max(...currentGroup.epics);
          if (epicNum >= lastEpicInPhase && (!state.totalEpics || epicNum < state.totalEpics)) {
            // Phase boundary — don't auto-advance to next epic.
            // currentEpic stays at the last completed epic; /continue presents Continue/Stop.
            state.currentPhase = helpers.PHASE_BOUNDARY;
            state.phaseStatus = 'ready';
            writeState(state);
            const nextPhase = phases.groups[currentIdx + 1];
            console.log(JSON.stringify({
              status: 'ok',
              message: `Phase boundary reached. ${currentGroup.name} complete. Next: ${nextPhase ? nextPhase.name : '(none)'}`,
              phaseBoundary: true,
              completedPhase: { index: currentIdx, name: currentGroup.name, label: currentGroup.label },
              nextPhase: nextPhase ? { index: currentIdx + 1, name: nextPhase.name, label: nextPhase.label } : null,
              state: { epic: state.currentEpic, story: storyNum, phase: state.currentPhase, phaseStatus: state.phaseStatus }
            }, null, 2));
            return;
          }
        }

        // Check if this is the final epic
        if (state.totalEpics && epicNum >= state.totalEpics) {
          state.featureComplete = true;
          state.currentPhase = 'COMPLETE';
          state.phaseStatus = 'complete'; // Feature fully complete
        } else {
          // More epics - advance to STORIES for next epic
          state.currentEpic = epicNum + 1;
          state.currentStory = null;
          state.currentPhase = 'STORIES';
          state.phaseStatus = 'ready'; // Next epic ready to start
        }
      } else {
        // More stories - advance to REALIGN for next story
        state.currentStory = storyNum + 1;
        state.currentPhase = 'REALIGN';
        state.phaseStatus = 'ready'; // Next story ready to start
        // Mark next story as PENDING if it doesn't exist
        if (!epicState.stories[storyNum + 1]) {
          epicState.stories[storyNum + 1] = { phase: 'PENDING' };
        }
      }
    }
  } else if (isGlobalTarget) {
    // Global phase transition (INTAKE, DESIGN, SCOPE) — no epic association
    state.currentEpic = null;
    state.currentStory = null;
    state.currentPhase = targetPhase;
    state.phaseStatus = 'ready'; // Phase transitioned but work not yet started
  } else {
    // Epic-level transition (STORIES)
    state.currentEpic = epicNum;
    state.currentPhase = targetPhase;
    state.epics[epicNum].phase = targetPhase;
    state.phaseStatus = 'ready'; // Phase transitioned but work not yet started

    // If starting STORIES phase, reset story tracking
    if (targetPhase === 'STORIES') {
      state.currentStory = null;
    }
  }

  // =========================================================================
  // METRIC CAPTURE AT TRANSITION POINTS (dashboard enrichment)
  // =========================================================================

  // (a) At INTAKE→DESIGN — capture INTAKE metrics
  if (targetPhase === 'DESIGN') {
    const manifestPath = INTAKE_MANIFEST_PATH;
    const frsPath = FRS_PATH;
    let requirementCount = null;
    let businessRuleCount = null;

    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        requirementCount = manifest.requirementCount ?? null;
        businessRuleCount = manifest.businessRuleCount ?? null;
      } catch { /* manifest unreadable — counts stay null */ }
    }

    state.intake = {
      manifestExists: fs.existsSync(manifestPath),
      frsExists: fs.existsSync(frsPath),
      requirementCount,
      businessRuleCount,
      capturedAt: new Date().toISOString()
    };

    // Update featureName from FRS heading if not yet set
    if (!state.featureName || state.featureName === 'pending-intake') {
      const extracted = helpers.extractFeatureNameFromFiles();
      if (extracted) state.featureName = extracted;
    }
  }

  // (c) At end of STORIES and every REALIGN — capture story and epic names
  if (targetPhase === 'REALIGN' || (currentPhase === 'STORIES' && targetPhase !== 'STORIES')) {
    const epicDir = helpers.findEpicDir(epicNum);
    if (epicDir) {
      state.epics[epicNum].name = path.basename(epicDir);
      const storyFiles = helpers.findStoryFiles(epicDir);
      for (const { num, title } of storyFiles) {
        if (state.epics[epicNum].stories[num]) {
          state.epics[epicNum].stories[num].name = title;
        }
      }
    }
  }

  // (d) At IMPLEMENT — snapshot test file count
  if (targetPhase === 'IMPLEMENT' && storyNum) {
    const count = helpers.countTestFiles(epicNum, storyNum);
    state.epics[epicNum].stories[storyNum].testFiles = count;
  }

  // (e/f2) At QA or COMPLETE — snapshot AC progress
  if ((targetPhase === 'QA' || targetPhase === 'COMPLETE') && storyNum) {
    const epicDir = helpers.findEpicDir(epicNum);
    if (epicDir) {
      const ac = helpers.countStoryAC(epicDir, storyNum);
      state.epics[epicNum].stories[storyNum].acceptance = ac;
    }
  }

  // (g) At SCOPE (from DESIGN) — snapshot design artifacts
  if (targetPhase === 'SCOPE') {
    state.designArtifacts = {
      apiSpec: fs.existsSync(API_SPEC_PATH),
      designTokensCss: fs.existsSync(DESIGN_TOKENS_CSS_PATH),
      designTokensMd: fs.existsSync(DESIGN_TOKENS_MD_PATH),
      wireframes: helpers.countWireframes(),
      capturedAt: new Date().toISOString()
    };
  }

  // Record transition history
  if (!state.history) {
    state.history = [];
  }
  state.history.push({
    timestamp: new Date().toISOString(),
    epic: isGlobalTarget ? null : epicNum,
    story: storyNum || null,
    from: currentPhase,
    to: targetPhase
  });

  // Keep only last 30 history entries (increased for story-level tracking)
  if (state.history.length > 30) {
    state.history = state.history.slice(-30);
  }

  writeState(state);

  // Build response message
  let message;
  if (storyNum) {
    message = `Transitioned Epic ${epicNum}, Story ${storyNum} from ${currentPhase} to ${targetPhase}`;
  } else if (isGlobalTarget) {
    message = `Transitioned from ${currentPhase} to ${targetPhase}`;
  } else {
    message = `Transitioned Epic ${epicNum} from ${currentPhase} to ${targetPhase}`;
  }

  const response = {
    status: 'ok',
    message,
    state: {
      epic: state.currentEpic,
      story: state.currentStory,
      phase: state.currentPhase
    }
  };

  // Add next action hint
  if (targetPhase === 'COMPLETE' && storyNum) {
    const epicState = state.epics[epicNum];
    const totalStories = epicState.totalStories || Object.keys(epicState.stories).length;
    const completedStories = Object.values(epicState.stories)
      .filter(s => s.phase === 'COMPLETE').length;

    if (completedStories >= totalStories) {
      if (state.featureComplete) {
        response.nextAction = 'Feature complete! All epics and stories done.';
      } else {
        response.nextAction = `Epic ${epicNum} complete. Start STORIES for Epic ${epicNum + 1}.`;
      }
    } else {
      response.nextAction = `Start REALIGN for Story ${storyNum + 1}.`;
    }
  }

  // Add feature complete info if applicable
  if (state.featureComplete) {
    response.featureComplete = true;
    response.message = `Story ${storyNum} complete. Feature finished! All ${state.totalEpics} epics done.`;
  }

  // Include output validation results if --verify-output was used
  if (outputValidation) {
    response.outputValidation = outputValidation;
    if (outputValidation.status !== 'valid') {
      response.warning = `Previous phase (${currentPhase}) may have incomplete outputs. Review before proceeding.`;
    }
  }

  console.log(JSON.stringify(response, null, 2));
}

function markStarted() {
  const state = readState();

  if (!state) {
    console.log(JSON.stringify({
      status: 'error',
      message: 'No workflow state found. Cannot mark phase as started.'
    }, null, 2));
    process.exit(1);
  }

  if (state.phaseStatus === 'in_progress') {
    console.log(JSON.stringify({
      status: 'ok',
      message: 'Phase already marked as in progress',
      state: {
        epic: state.currentEpic,
        story: state.currentStory,
        phase: state.currentPhase,
        phaseStatus: state.phaseStatus
      }
    }, null, 2));
    return;
  }

  const previousStatus = state.phaseStatus || 'ready';
  state.phaseStatus = 'in_progress';
  writeState(state);

  console.log(JSON.stringify({
    status: 'ok',
    message: `Phase ${state.currentPhase} marked as in progress`,
    previousStatus,
    state: {
      epic: state.currentEpic,
      story: state.currentStory,
      phase: state.currentPhase,
      phaseStatus: state.phaseStatus
    }
  }, null, 2));
}

function setTotalEpics(total) {
  let state = readState();

  if (!state) {
    console.log(JSON.stringify({
      status: 'error',
      message: 'No workflow state found. Initialize state first by transitioning to SCOPE.'
    }, null, 2));
    process.exit(1);
  }

  state.totalEpics = total;
  writeState(state);

  console.log(JSON.stringify({
    status: 'ok',
    message: `Set total epics to ${total}`,
    totalEpics: total
  }, null, 2));
}

function setTotalStories(epicNum, total) {
  let state = readState();

  if (!state) {
    console.log(JSON.stringify({
      status: 'error',
      message: 'No workflow state found. Initialize state first.'
    }, null, 2));
    process.exit(1);
  }

  if (!state.epics[epicNum]) {
    state.epics[epicNum] = { stories: {} };
  }

  state.epics[epicNum].totalStories = total;

  // Initialize story entries as PENDING if they don't exist
  for (let i = 1; i <= total; i++) {
    if (!state.epics[epicNum].stories[i]) {
      state.epics[epicNum].stories[i] = { phase: 'PENDING' };
    }
  }

  writeState(state);

  console.log(JSON.stringify({
    status: 'ok',
    message: `Set total stories for Epic ${epicNum} to ${total}`,
    epic: epicNum,
    totalStories: total
  }, null, 2));
}

function initState(initialPhase) {
  // Check if state already exists
  const existingState = readState();
  if (existingState) {
    console.log(JSON.stringify({
      status: 'exists',
      message: 'Workflow state already exists. Use --show to view or --repair to reconstruct.',
      state: existingState
    }, null, 2));
    return;
  }

  // Find the feature spec (optional for INTAKE — specs may not exist yet)
  const spec = findFeatureSpec();
  if (!spec && initialPhase !== 'INTAKE') {
    console.log(JSON.stringify({
      status: 'error',
      message: 'No feature spec found in generated-docs/specs/ or documentation/. Create a spec first or use --init INTAKE to gather requirements.'
    }, null, 2));
    process.exit(1);
  }

  // Create initial state
  // INTAKE is a global phase (not per-epic), so don't initialize epic state
  const isGlobalPhase = initialPhase === 'INTAKE';
  const state = {
    featureName: spec ? path.basename(spec, '.md') : null,
    specPath: spec || null,
    currentEpic: isGlobalPhase ? null : 1,
    currentStory: null,
    currentPhase: initialPhase,
    phaseStatus: 'ready', // Phase set but work not yet started
    epics: isGlobalPhase ? {} : {
      1: { phase: initialPhase, stories: {} }
    },
    history: [{
      timestamp: new Date().toISOString(),
      epic: isGlobalPhase ? null : 1,
      story: null,
      from: 'NONE',
      to: initialPhase,
      note: 'Workflow initialized'
    }]
  };

  writeState(state);

  console.log(JSON.stringify({
    status: 'ok',
    message: `Workflow initialized at ${initialPhase} phase`,
    state
  }, null, 2));
}

// =============================================================================
// CLI
// =============================================================================

function printUsage() {
  console.log(`
Usage:
  node .claude/scripts/transition-phase.js --to <PHASE> [--verify-output]                          # Global phases (INTAKE, DESIGN, SCOPE)
  node .claude/scripts/transition-phase.js --epic <N> --to <PHASE> [--story <M>] [--validate] [--verify-output]
  node .claude/scripts/transition-phase.js --current --to <PHASE> [--story <M>] [--validate] [--verify-output]
  node .claude/scripts/transition-phase.js --mark-started
  node .claude/scripts/transition-phase.js --init [INTAKE|DESIGN|SCOPE]
  node .claude/scripts/transition-phase.js --set-totals epics <N>
  node .claude/scripts/transition-phase.js --set-totals stories <N> --epic <E>
  node .claude/scripts/transition-phase.js --design-agent set "agent1,agent2" [--autonomous "agent3,agent4"]
  node .claude/scripts/transition-phase.js --design-agent start "agent-name" [--autonomous]
  node .claude/scripts/transition-phase.js --design-agent complete "agent-name" [--autonomous]
  node .claude/scripts/transition-phase.js --pre-complete-checks --story M [--epic N | --current]
  node .claude/scripts/transition-phase.js --set-manual-verification <passed|auto-skipped|deferred-passed|skipped> --story M [--epic N | --current]
  node .claude/scripts/transition-phase.js --set-e2e-status <passed|passed-after-fix|failed|escalated|auto-skipped:non-routable|auto-skipped:fixme|user-skipped|user-skipped-after-escalation|missing|running|pending> --story M [--epic N | --current] [--e2e-pass N] [--e2e-fail N] [--e2e-fix-cycles N] [--e2e-targets glob1,glob2,...]
  node .claude/scripts/transition-phase.js --get-deferred-verification [--epic N | --current]
  node .claude/scripts/transition-phase.js --advance-phase
  node .claude/scripts/transition-phase.js --pause-phase
  node .claude/scripts/transition-phase.js --upgrade-epic-to-batched <N>
  node .claude/scripts/transition-phase.js --downgrade-epic-to-story <N>
  node .claude/scripts/transition-phase.js --complete-story-pass [--story M]
  node .claude/scripts/transition-phase.js --advance-pass
  node .claude/scripts/transition-phase.js --record-qa-finding --story M --note "..."
  node .claude/scripts/transition-phase.js --show
  node .claude/scripts/transition-phase.js --repair

Workflow Structure (4 Stages):
  Stage 1: INTAKE (gather requirements, produce FRS) → DESIGN (multi-agent: API spec, style tokens, wireframes) → SCOPE (define epics only)
  Stage 2: Per-Epic: STORIES (define stories for current epic)
  Stage 3: Per-Story: REALIGN → WRITE-TESTS → IMPLEMENT → QA

Phase Status:
  When transitioning to a phase, phaseStatus is set to "ready" (work not yet started).
  When an agent begins work, it calls --mark-started to set phaseStatus to "in_progress".
  This allows /status to distinguish between "ready for X" vs "X in progress".

Options:
  --epic <N>              Epic number for transitions
  --current               Use current epic from state (alternative to --epic)
  --to <PHASE>            Target phase: ${PHASES.join(', ')}
  --story <M>             Story number for per-story phases (REALIGN through QA)
  --validate              Check prerequisites before allowing transition
  --verify-output         Validate that the FROM phase created expected outputs
  --mark-started          Mark current phase as in_progress (call when agent starts work)
  --init [PHASE]          Initialize workflow state (INTAKE, DESIGN, or SCOPE; defaults to INTAKE)
  --set-totals epics <N>  Set the total number of epics for this feature
  --set-totals stories <N> Set total stories for an epic (requires --epic)
  --set-total-epics <N>   Legacy alias for --set-totals epics
  --set-total-stories <N> Legacy alias for --set-totals stories (requires --epic)
  --advance-phase         Move from PHASE-BOUNDARY to STORIES for the next phase's first epic
  --pause-phase           Mark PHASE-BOUNDARY as paused (user picked "Stop here")
  --upgrade-epic-to-batched <N>  Flip epic N into batched mode (all stories iterate per phase pass)
  --downgrade-epic-to-story <N>  Revert epic N to legacy per-story mode
  --complete-story-pass   Mark current story as COMPLETE for the current pass and advance to next pending story
  --advance-pass          Advance epicPass to the next pass (requires all stories COMPLETE in current pass)
  --record-qa-finding     Record a QA finding under epicPass.qaFindings[story] during EPIC-QA
  --show                  Display current workflow state
  --repair                Attempt to reconstruct state from artifacts

Examples:
  # Initialize workflow
  node .claude/scripts/transition-phase.js --init INTAKE
  node .claude/scripts/transition-phase.js --init DESIGN
  node .claude/scripts/transition-phase.js --init SCOPE

  # Global phase transitions (no --epic needed)
  node .claude/scripts/transition-phase.js --to DESIGN --verify-output
  node .claude/scripts/transition-phase.js --to SCOPE --verify-output

  # Epic-level transitions
  node .claude/scripts/transition-phase.js --set-totals epics 3
  node .claude/scripts/transition-phase.js --epic 1 --to STORIES

  # Story-level transitions
  node .claude/scripts/transition-phase.js --set-totals stories 4 --epic 1
  node .claude/scripts/transition-phase.js --epic 1 --story 1 --to REALIGN
  node .claude/scripts/transition-phase.js --current --story 1 --to WRITE-TESTS --verify-output
  node .claude/scripts/transition-phase.js --current --story 1 --to IMPLEMENT
  node .claude/scripts/transition-phase.js --current --story 1 --to QA
  node .claude/scripts/transition-phase.js --current --story 1 --to COMPLETE

  # Mark phase as started (agent calls this when beginning work)
  node .claude/scripts/transition-phase.js --mark-started

  # Show state
  node .claude/scripts/transition-phase.js --show
`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  if (args.includes('--show')) {
    showState();
    return;
  }

  if (args.includes('--repair')) {
    repairState();
    return;
  }

  if (args.includes('--mark-started')) {
    markStarted();
    return;
  }

  // Handle --init
  const initIdx = args.indexOf('--init');
  if (initIdx !== -1) {
    // Default to INTAKE if no phase specified, or use the provided phase
    let initialPhase = 'INTAKE';
    const nextArg = args[initIdx + 1];
    if (nextArg && !nextArg.startsWith('--')) {
      initialPhase = nextArg.toUpperCase();
      if (!GLOBAL_PHASES.includes(initialPhase)) {
        console.log(JSON.stringify({
          status: 'error',
          message: `Invalid initial phase: ${initialPhase}. Use ${GLOBAL_PHASES.join(', ')}.`
        }, null, 2));
        process.exit(1);
      }
    }
    initState(initialPhase);
    return;
  }

  // Handle --set-totals (consolidated: epics|stories)
  // Also accepts legacy --set-total-epics / --set-total-stories for backward compatibility
  const setTotalsIdx = args.indexOf('--set-totals');
  const legacyEpicsIdx = args.indexOf('--set-total-epics');
  const legacyStoriesIdx = args.indexOf('--set-total-stories');

  if (setTotalsIdx !== -1 && args[setTotalsIdx + 1]) {
    const subType = args[setTotalsIdx + 1]; // 'epics' or 'stories'
    const total = parsePositiveInt(args[setTotalsIdx + 2], `total ${subType}`);

    if (subType === 'epics') {
      setTotalEpics(total);
      return;
    }

    if (subType === 'stories') {
      const epicNum = requireEpicArg(args, '--set-totals stories');
      setTotalStories(epicNum, total);
      return;
    }

    exitWithError(`Unknown --set-totals type: ${subType}. Use 'epics' or 'stories'.`);
  }

  // Legacy aliases (backward compatibility)
  if (legacyEpicsIdx !== -1 && args[legacyEpicsIdx + 1]) {
    const total = parsePositiveInt(args[legacyEpicsIdx + 1], 'total epics');
    setTotalEpics(total);
    return;
  }

  if (legacyStoriesIdx !== -1 && args[legacyStoriesIdx + 1]) {
    const total = parsePositiveInt(args[legacyStoriesIdx + 1], 'total stories');
    const epicNum = requireEpicArg(args, '--set-total-stories');
    setTotalStories(epicNum, total);
    return;
  }

  // Handle --design-agent (set | complete)
  const designAgentIdx = args.indexOf('--design-agent');
  if (designAgentIdx !== -1 && args[designAgentIdx + 1]) {
    const subAction = args[designAgentIdx + 1]; // 'set' or 'complete'

    if (subAction === 'set') {
      // --design-agent set "agent1,agent2" [--autonomous "agent3,agent4"]
      const agentListStr = args[designAgentIdx + 2] || '';
      const agents = agentListStr ? agentListStr.split(',').map(s => s.trim()) : [];

      const autoIdx = args.indexOf('--autonomous');
      let autonomous = [];
      if (autoIdx !== -1 && args[autoIdx + 1]) {
        autonomous = args[autoIdx + 1].split(',').map(s => s.trim());
      }

      let state = readState();
      if (!state) {
        console.log(JSON.stringify({ status: 'error', message: 'No workflow state found.' }, null, 2));
        process.exit(1);
      }

      state.design = {
        agentsExpected: agents,
        agentsCompleted: [],
        autonomousExpected: autonomous,
        autonomousCompleted: [],
        capturedAt: new Date().toISOString()
      };
      writeState(state);

      console.log(JSON.stringify({
        status: 'ok',
        message: `Set DESIGN agents: ${agents.join(', ')}${autonomous.length ? ` (autonomous: ${autonomous.join(', ')})` : ''}`,
        design: state.design
      }, null, 2));
      return;
    }

    if (subAction === 'start' || subAction === 'complete') {
      const agentName = args[designAgentIdx + 2] || '';
      const isAutonomous = args.includes('--autonomous');

      let state = readState();
      if (!state || !state.design) {
        console.log(JSON.stringify({ status: 'error', message: 'No DESIGN state found. Run --design-agent set first.' }, null, 2));
        process.exit(1);
      }

      const suffix = subAction === 'start' ? 'Started' : 'Completed';
      const list = isAutonomous ? `autonomous${suffix}` : `agents${suffix}`;
      if (!state.design[list]) state.design[list] = [];
      if (!state.design[list].includes(agentName)) {
        state.design[list].push(agentName);
      }
      writeState(state);

      const statusWord = subAction === 'start' ? 'in_progress' : 'complete';
      console.log(JSON.stringify({
        status: 'ok',
        message: `Marked ${agentName} as ${statusWord}${isAutonomous ? ' (autonomous)' : ''}`,
        design: state.design
      }, null, 2));
      return;
    }

    console.log(JSON.stringify({ status: 'error', message: `Unknown --design-agent sub-action: ${subAction}. Use 'set', 'start', or 'complete'.` }, null, 2));
    process.exit(1);
  }

  // Handle --pre-complete-checks (auto-check ACs before commit)
  if (args.includes('--pre-complete-checks')) {
    const storyIdx = args.indexOf('--story');
    const storyArg = storyIdx !== -1 ? parseInt(args[storyIdx + 1]) : null;

    let epicArg = null;
    if (args.includes('--current')) {
      const st = readState();
      if (st) epicArg = st.currentEpic;
    } else {
      const eIdx = args.indexOf('--epic');
      if (eIdx !== -1) epicArg = parseInt(args[eIdx + 1]);
    }

    if (!epicArg || !storyArg) {
      console.log(JSON.stringify({ status: 'error', message: '--pre-complete-checks requires --story M and --epic N (or --current)' }, null, 2));
      process.exit(1);
    }

    const epicDir = helpers.findEpicDir(epicArg);
    if (!epicDir) {
      console.log(JSON.stringify({ status: 'error', message: `Epic ${epicArg} directory not found` }, null, 2));
      process.exit(1);
    }

    helpers.checkAllAcceptanceCriteria(epicDir, storyArg);
    console.log(JSON.stringify({
      status: 'ok',
      message: `Auto-checked all ACs for Epic ${epicArg}, Story ${storyArg}`
    }, null, 2));
    return;
  }

  // Handle --set-manual-verification (record manual verification status for a story)
  if (args.includes('--set-manual-verification')) {
    const mvIdx = args.indexOf('--set-manual-verification');
    const mvValue = args[mvIdx + 1];
    const validValues = ['passed', 'auto-skipped', 'deferred-passed', 'skipped'];

    if (!validValues.includes(mvValue)) {
      console.log(JSON.stringify({ status: 'error', message: `--set-manual-verification value must be one of: ${validValues.join(', ')}` }, null, 2));
      process.exit(1);
    }

    const storyIdx = args.indexOf('--story');
    const storyArg = storyIdx !== -1 ? parseInt(args[storyIdx + 1]) : null;

    let epicArg = null;
    if (args.includes('--current')) {
      const st = readState();
      if (st) epicArg = st.currentEpic;
    } else {
      const eIdx = args.indexOf('--epic');
      if (eIdx !== -1) epicArg = parseInt(args[eIdx + 1]);
    }

    if (!epicArg || !storyArg) {
      console.log(JSON.stringify({ status: 'error', message: '--set-manual-verification requires --story M and --epic N (or --current)' }, null, 2));
      process.exit(1);
    }

    const state = readState();
    if (!state) {
      console.log(JSON.stringify({ status: 'error', message: 'No workflow state found' }, null, 2));
      process.exit(1);
    }

    if (!state.epics?.[epicArg]?.stories?.[storyArg]) {
      console.log(JSON.stringify({ status: 'error', message: `Epic ${epicArg}, Story ${storyArg} not found in state` }, null, 2));
      process.exit(1);
    }

    state.epics[epicArg].stories[storyArg].manualVerification = mvValue;
    writeState(state);

    // deferred-passed means a later routable story's QA verified this non-routable
    // story's ACs. Tick its markdown checkboxes so the dashboard reflects reality.
    if (mvValue === 'deferred-passed') {
      const epicDir = helpers.findEpicDir(epicArg);
      if (epicDir) helpers.checkAllAcceptanceCriteria(epicDir, storyArg);
    }

    const msg = mvValue === 'auto-skipped'
      ? `Story ${storyArg} manual verification auto-skipped (component only)`
      : `Story ${storyArg} manual verification: ${mvValue}`;

    console.log(JSON.stringify({ status: 'ok', message: msg }, null, 2));
    return;
  }

  // Handle --set-e2e-status (record Playwright E2E verification result for a story)
  if (args.includes('--set-e2e-status')) {
    const e2eIdx = args.indexOf('--set-e2e-status');
    const e2eValue = args[e2eIdx + 1];
    const validValues = [
      'pending',
      'running',
      'passed',
      'passed-after-fix',
      'failed',
      'escalated',
      'auto-skipped:non-routable',
      'auto-skipped:fixme',
      'user-skipped',
      'user-skipped-after-escalation',
      'missing'
    ];

    if (!validValues.includes(e2eValue)) {
      console.log(JSON.stringify({
        status: 'error',
        message: `--set-e2e-status value must be one of: ${validValues.join(', ')}`
      }, null, 2));
      process.exit(1);
    }

    const storyIdx = args.indexOf('--story');
    const storyArg = storyIdx !== -1 ? parseInt(args[storyIdx + 1]) : null;

    let epicArg = null;
    if (args.includes('--current')) {
      const st = readState();
      if (st) epicArg = st.currentEpic;
    } else {
      const eIdx = args.indexOf('--epic');
      if (eIdx !== -1) epicArg = parseInt(args[eIdx + 1]);
    }

    if (!epicArg || !storyArg) {
      console.log(JSON.stringify({
        status: 'error',
        message: '--set-e2e-status requires --story M and --epic N (or --current)'
      }, null, 2));
      process.exit(1);
    }

    // Optional counters and target list
    const passIdx = args.indexOf('--e2e-pass');
    const failIdx = args.indexOf('--e2e-fail');
    const targetsIdx = args.indexOf('--e2e-targets');
    const fixCycleIdx = args.indexOf('--e2e-fix-cycles');

    const e2ePassCount = passIdx !== -1 ? parseInt(args[passIdx + 1]) : null;
    const e2eFailCount = failIdx !== -1 ? parseInt(args[failIdx + 1]) : null;
    const e2eFixCycles = fixCycleIdx !== -1 ? parseInt(args[fixCycleIdx + 1]) : null;
    const e2eTargets = targetsIdx !== -1 && args[targetsIdx + 1]
      ? args[targetsIdx + 1].split(',').map(s => s.trim()).filter(Boolean)
      : null;

    const state = readState();
    if (!state) {
      console.log(JSON.stringify({ status: 'error', message: 'No workflow state found' }, null, 2));
      process.exit(1);
    }

    if (!state.epics?.[epicArg]?.stories?.[storyArg]) {
      console.log(JSON.stringify({
        status: 'error',
        message: `Epic ${epicArg}, Story ${storyArg} not found in state`
      }, null, 2));
      process.exit(1);
    }

    const story = state.epics[epicArg].stories[storyArg];
    story.e2eStatus = e2eValue;
    story.e2eLastRun = new Date().toISOString();
    if (e2ePassCount !== null && !Number.isNaN(e2ePassCount)) story.e2ePassCount = e2ePassCount;
    if (e2eFailCount !== null && !Number.isNaN(e2eFailCount)) story.e2eFailCount = e2eFailCount;
    if (e2eFixCycles !== null && !Number.isNaN(e2eFixCycles)) story.e2eFixCycleCount = e2eFixCycles;
    if (e2eTargets) story.deferredE2eTargets = e2eTargets;

    writeState(state);

    console.log(JSON.stringify({
      status: 'ok',
      message: `Story ${storyArg} E2E status: ${e2eValue}`,
      e2eStatus: e2eValue,
      e2eLastRun: story.e2eLastRun,
      e2ePassCount: story.e2ePassCount ?? null,
      e2eFailCount: story.e2eFailCount ?? null,
      e2eFixCycleCount: story.e2eFixCycleCount ?? null,
      deferredE2eTargets: story.deferredE2eTargets ?? []
    }, null, 2));
    return;
  }

  // Handle --get-deferred-verification (list stories awaiting deferred manual verification)
  if (args.includes('--get-deferred-verification')) {
    let epicArg = null;
    if (args.includes('--current')) {
      const st = readState();
      if (st) epicArg = st.currentEpic;
    } else {
      const eIdx = args.indexOf('--epic');
      if (eIdx !== -1) epicArg = parseInt(args[eIdx + 1]);
    }

    if (!epicArg) {
      console.log(JSON.stringify({ status: 'error', message: '--get-deferred-verification requires --epic N or --current' }, null, 2));
      process.exit(1);
    }

    const deferred = helpers.getDeferredVerificationStories(epicArg);
    console.log(JSON.stringify({
      status: 'ok',
      epicNum: epicArg,
      deferredCount: deferred.length,
      stories: deferred
    }, null, 2));
    return;
  }

  // Shared guard for --advance-phase and --pause-phase.
  // Returns validated state; otherwise calls exitWithError and never returns.
  function requirePhaseBoundaryState(flag) {
    const state = readState();
    if (!state) exitWithError('No workflow state found.');
    if (state.currentPhase !== helpers.PHASE_BOUNDARY) {
      exitWithError(`${flag} requires currentPhase to be ${helpers.PHASE_BOUNDARY}, but it is ${state.currentPhase}`);
    }
    return state;
  }

  // Handle --advance-phase (move from PHASE-BOUNDARY to next phase's STORIES)
  if (args.includes('--advance-phase')) {
    const state = requirePhaseBoundaryState('--advance-phase');

    const phases = helpers.getPhases(state);
    if (!phases.enabled || phases.currentPhaseIndex === null) {
      exitWithError('Cannot advance phase: no phases found in _feature-overview.md or currentEpic is not in any phase.');
    }

    // Find the first epic of the next phase
    const nextPhaseIndex = phases.currentPhaseIndex + 1;
    if (nextPhaseIndex >= phases.groups.length) {
      // This shouldn't normally happen (boundary wouldn't have fired for the last phase),
      // but handle gracefully: mark as feature complete
      state.featureComplete = true;
      state.currentPhase = 'COMPLETE';
      state.phaseStatus = 'complete';
    } else {
      const nextGroup = phases.groups[nextPhaseIndex];
      state.currentEpic = Math.min(...nextGroup.epics);
      state.currentStory = null;
      state.currentPhase = 'STORIES';
      state.phaseStatus = 'ready';
    }

    // Clear pausedAt (whether resuming from pause or fresh advance)
    delete state.pausedAt;

    writeState(state);
    console.log(JSON.stringify({
      status: 'ok',
      message: state.featureComplete
        ? 'All phases complete. Feature finished.'
        : `Advanced to ${phases.groups[nextPhaseIndex].name} (Epic ${state.currentEpic})`,
      state: {
        epic: state.currentEpic,
        story: state.currentStory,
        phase: state.currentPhase,
        phaseStatus: state.phaseStatus
      }
    }, null, 2));
    return;
  }

  // ---------------------------------------------------------------------------
  // BATCHED EPIC-LEVEL FLOW HANDLERS
  // ---------------------------------------------------------------------------

  // --upgrade-epic-to-batched <N>
  // One-shot migration: flips an epic into batched mode and initialises its
  // epicPass block. Preserves any in-flight story state — the currently
  // in-progress story stays IN_PROGRESS in the new pass, every other story
  // becomes PENDING. The current pass phase is taken from state.currentPhase
  // when it is a recognised pass; otherwise defaults to REALIGN.
  if (args.includes('--upgrade-epic-to-batched')) {
    const idx = args.indexOf('--upgrade-epic-to-batched');
    const epicNum = parsePositiveInt(args[idx + 1], 'epic number');

    const state = readState();
    if (!state) exitWithError('No workflow state found. Run /start first.');

    const epicDir = helpers.findEpicDir(epicNum);
    if (!epicDir) exitWithError(`Epic ${epicNum} directory not found in generated-docs/stories/`);

    const storyFiles = helpers.findStoryFiles(epicDir);
    if (storyFiles.length === 0) exitWithError(`Epic ${epicNum} has no story files. Run STORIES first.`);
    const storyOrder = storyFiles.map(s => s.num);

    // Determine which story is "in progress" right now
    const stateCurrentStory = state.currentStory && storyOrder.includes(state.currentStory)
      ? state.currentStory
      : storyOrder[0];

    // Determine the current pass phase
    const passCandidate = state.currentPhase;
    const validPasses = ['REALIGN', 'TEST-DESIGN', 'WRITE-TESTS', 'IMPLEMENT'];
    const passPhase = validPasses.includes(passCandidate) ? passCandidate : 'REALIGN';

    // Build epicPass with the in-flight story IN_PROGRESS
    const epicPass = helpers.initEpicPass(storyOrder, { firstInProgress: stateCurrentStory });
    epicPass.phase = passPhase;
    // Honour story positions: stories BEFORE the in-flight one are marked
    // COMPLETE for the current pass (only relevant if the user upgraded
    // mid-pass — e.g. story 1 done in REALIGN, story 2 in-flight). We
    // detect "done" via the legacy per-story phase being >= current pass.
    const passIdx = helpers.EPIC_PASS_ORDER.indexOf(passPhase);
    for (const num of storyOrder) {
      if (num >= stateCurrentStory) continue;
      const legacy = state.epics?.[epicNum]?.stories?.[num]?.phase;
      const legacyIdx = helpers.EPIC_PASS_ORDER.indexOf(legacy);
      if (legacyIdx >= passIdx || legacy === 'COMPLETE') {
        epicPass.storyPhases[String(num)] = 'COMPLETE';
      }
    }

    state.batchMode = 'epic';
    state.epicPass = epicPass;
    state.currentEpic = epicNum;
    state.currentStory = stateCurrentStory;
    state.currentPhase = passPhase;
    state.phaseStatus = state.phaseStatus || 'ready';

    if (!state.history) state.history = [];
    state.history.push({
      timestamp: new Date().toISOString(),
      epic: epicNum,
      story: stateCurrentStory,
      from: passCandidate,
      to: passPhase,
      note: 'Upgraded to batched epic mode'
    });

    writeState(state);
    console.log(JSON.stringify({
      status: 'ok',
      message: `Epic ${epicNum} upgraded to batched mode. Current pass: ${passPhase}.`,
      epicPass,
      state: {
        epic: state.currentEpic,
        story: state.currentStory,
        phase: state.currentPhase,
        batchMode: state.batchMode
      }
    }, null, 2));
    return;
  }

  // --downgrade-epic-to-story <N>
  // Reverse of upgrade: removes batchMode + epicPass, leaves currentPhase /
  // currentStory intact. Used for rollback if batched mode misbehaves.
  if (args.includes('--downgrade-epic-to-story')) {
    const idx = args.indexOf('--downgrade-epic-to-story');
    const epicNum = parsePositiveInt(args[idx + 1], 'epic number');

    const state = readState();
    if (!state) exitWithError('No workflow state found.');
    if (!helpers.isBatchedEpic(state)) exitWithError('Workflow is not in batched mode — nothing to downgrade.');
    if (state.currentEpic !== epicNum) exitWithError(`Cannot downgrade Epic ${epicNum}: currentEpic is ${state.currentEpic}.`);

    delete state.batchMode;
    delete state.epicPass;
    if (!state.history) state.history = [];
    state.history.push({
      timestamp: new Date().toISOString(),
      epic: epicNum,
      story: state.currentStory,
      from: state.currentPhase,
      to: state.currentPhase,
      note: 'Downgraded from batched epic mode'
    });

    writeState(state);
    console.log(JSON.stringify({
      status: 'ok',
      message: `Epic ${epicNum} downgraded to legacy per-story mode.`,
      state: {
        epic: state.currentEpic,
        story: state.currentStory,
        phase: state.currentPhase,
        batchMode: state.batchMode || 'story'
      }
    }, null, 2));
    return;
  }

  // --complete-story-pass [--story M]
  // Marks the current story (or --story M) as COMPLETE for the current pass
  // and advances epicPass to the next pending story. If all stories are now
  // COMPLETE, no auto-advance happens — the caller must run --advance-pass.
  if (args.includes('--complete-story-pass')) {
    const state = readState();
    if (!state) exitWithError('No workflow state found.');
    if (!helpers.isBatchedEpic(state)) exitWithError('--complete-story-pass requires batched epic mode.');

    const storyIdx = args.indexOf('--story');
    const storyNum = storyIdx !== -1 ? parsePositiveInt(args[storyIdx + 1], 'story number') : state.currentStory;
    if (!storyNum) exitWithError('--complete-story-pass requires --story M or a current story in state.');

    const result = helpers.markStoryCompleteInPass(state, storyNum);
    if (result.nextStory) {
      state.currentStory = result.nextStory;
    }

    // Mirror onto legacy per-story phase: in batched mode, the per-story phase
    // field reflects the highest pass that story has completed.
    const epicNum = state.currentEpic;
    if (state.epics?.[epicNum]?.stories) {
      if (!state.epics[epicNum].stories[storyNum]) state.epics[epicNum].stories[storyNum] = {};
      state.epics[epicNum].stories[storyNum].phase = state.epicPass.phase;
    }

    if (!state.history) state.history = [];
    state.history.push({
      timestamp: new Date().toISOString(),
      epic: epicNum,
      story: storyNum,
      from: state.epicPass.phase,
      to: state.epicPass.phase,
      note: `Story ${storyNum} completed ${state.epicPass.phase} pass`
    });

    writeState(state);
    console.log(JSON.stringify({
      status: 'ok',
      message: result.allComplete
        ? `Story ${storyNum} completed ${state.epicPass.phase} pass. All stories done — run --advance-pass.`
        : `Story ${storyNum} completed ${state.epicPass.phase} pass. Next: Story ${result.nextStory}.`,
      passComplete: result.allComplete,
      nextStory: result.nextStory,
      epicPass: state.epicPass
    }, null, 2));
    return;
  }

  // --advance-pass
  // Move epicPass to the next pass (REALIGN→TEST-DESIGN→...→EPIC-QA). Requires
  // every story in the current pass to be COMPLETE.
  if (args.includes('--advance-pass')) {
    const state = readState();
    if (!state) exitWithError('No workflow state found.');
    if (!helpers.isBatchedEpic(state)) exitWithError('--advance-pass requires batched epic mode.');

    let result;
    try {
      result = helpers.advanceEpicPass(state);
    } catch (e) {
      exitWithError(e.message);
    }

    if (!state.history) state.history = [];
    state.history.push({
      timestamp: new Date().toISOString(),
      epic: state.currentEpic,
      story: state.currentStory,
      from: result.from,
      to: result.to || 'EPIC-COMPLETE',
      note: result.allEpicComplete
        ? `Pass ${result.from} complete — epic awaiting per-story COMPLETE transitions`
        : `Advanced from ${result.from} to ${result.to}`
    });

    writeState(state);
    console.log(JSON.stringify({
      status: 'ok',
      message: result.allEpicComplete
        ? `Pass ${result.from} complete. Epic awaiting per-story COMPLETE transitions.`
        : `Advanced from ${result.from} to ${result.to}.`,
      from: result.from,
      to: result.to,
      allEpicComplete: result.allEpicComplete,
      epicPass: state.epicPass,
      state: {
        epic: state.currentEpic,
        story: state.currentStory,
        phase: state.currentPhase
      }
    }, null, 2));
    return;
  }

  // --record-qa-finding --story M --note "..."
  // Append a QA finding under epicPass.qaFindings[M] during EPIC-QA. Used by
  // the orchestrator when the user reports a bug during manual verification.
  if (args.includes('--record-qa-finding')) {
    const state = readState();
    if (!state) exitWithError('No workflow state found.');
    if (!helpers.isBatchedEpic(state)) exitWithError('--record-qa-finding requires batched epic mode.');

    const storyIdx = args.indexOf('--story');
    const noteIdx = args.indexOf('--note');
    const storyNum = storyIdx !== -1 ? parsePositiveInt(args[storyIdx + 1], 'story number') : null;
    const note = noteIdx !== -1 ? args[noteIdx + 1] : null;
    if (!storyNum) exitWithError('--record-qa-finding requires --story M.');
    if (!note) exitWithError('--record-qa-finding requires --note "<text>".');

    if (!state.epicPass.qaFindings) state.epicPass.qaFindings = {};
    const key = String(storyNum);
    if (!state.epicPass.qaFindings[key]) state.epicPass.qaFindings[key] = [];
    state.epicPass.qaFindings[key].push({ timestamp: new Date().toISOString(), note });
    writeState(state);
    console.log(JSON.stringify({
      status: 'ok',
      message: `Recorded QA finding on Story ${storyNum}.`,
      qaFindings: state.epicPass.qaFindings
    }, null, 2));
    return;
  }

  // Handle --pause-phase (mark PHASE-BOUNDARY as paused with timestamp)
  if (args.includes('--pause-phase')) {
    const state = requirePhaseBoundaryState('--pause-phase');

    state.phaseStatus = 'paused';
    state.pausedAt = new Date().toISOString();

    writeState(state);
    console.log(JSON.stringify({
      status: 'ok',
      message: 'Phase paused. Run /continue when ready to resume.',
      state: {
        epic: state.currentEpic,
        story: state.currentStory,
        phase: state.currentPhase,
        phaseStatus: state.phaseStatus,
        pausedAt: state.pausedAt
      }
    }, null, 2));
    return;
  }

  // Read state once for all subsequent lookups (--current, story fallback, transitionPhase)
  const cachedState = readState();

  // Parse transition arguments
  let epicNum = null;
  let targetPhase = null;
  let storyNum = null;
  let useCurrent = false;
  let validate = false;
  let verifyOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--epic' && args[i + 1]) {
      epicNum = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--current') {
      useCurrent = true;
    } else if (args[i] === '--to' && args[i + 1]) {
      targetPhase = args[i + 1].toUpperCase();
      i++;
    } else if (args[i] === '--story' && args[i + 1]) {
      storyNum = parseInt(args[i + 1]);
      if (isNaN(storyNum)) {
        console.log(JSON.stringify({
          status: 'error',
          message: 'Invalid story number. Must be a positive integer.'
        }, null, 2));
        process.exit(1);
      }
      i++;
    } else if (args[i] === '--validate') {
      validate = true;
    } else if (args[i] === '--verify-output') {
      verifyOutput = true;
    }
  }

  // Handle --current flag
  if (useCurrent) {
    if (!cachedState) {
      console.log(JSON.stringify({
        status: 'error',
        message: 'No workflow state found. Cannot use --current. Use --epic <N> instead or run --repair first.'
      }, null, 2));
      process.exit(1);
    }
    epicNum = cachedState.currentEpic;
    // currentEpic is null during global phases — that's OK if the target is also global
    if (!epicNum && targetPhase && !GLOBAL_PHASES.includes(targetPhase)) {
      console.log(JSON.stringify({
        status: 'error',
        message: 'No current epic in state (currently in a global phase). Use --epic <N> to specify explicitly.'
      }, null, 2));
      process.exit(1);
    }
  }

  // Global phases (INTAKE, DESIGN, SCOPE) don't require --epic
  const isGlobalCli = targetPhase && GLOBAL_PHASES.includes(targetPhase);

  if (!isGlobalCli && !epicNum) {
    if (!targetPhase) {
      console.log(JSON.stringify({
        status: 'error',
        message: 'Missing required arguments. Need --epic <N> (or --current) and --to <PHASE>'
      }, null, 2));
    } else {
      console.log(JSON.stringify({
        status: 'error',
        message: `Missing --epic <N> (or --current). Required for non-global phase: ${targetPhase}`
      }, null, 2));
    }
    printUsage();
    process.exit(1);
  }

  if (!targetPhase) {
    console.log(JSON.stringify({
      status: 'error',
      message: 'Missing required argument: --to <PHASE>'
    }, null, 2));
    printUsage();
    process.exit(1);
  }

  // Validate that story-level phases have a story number
  if (helpers.STORY_PHASES.includes(targetPhase) && !storyNum) {
    // Try to use current story from state if available
    if (cachedState && cachedState.currentStory) {
      storyNum = cachedState.currentStory;
    }
  }

  transitionPhase(epicNum, targetPhase, storyNum, { validate, verifyOutput, cachedState });
}

main();
