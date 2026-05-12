#!/usr/bin/env node
// One-shot E2E Verification helper for the playwright-runner agent.
// See .claude/agents/playwright-runner.md for the rationale and return contract.
//
// Usage:
//   node .claude/scripts/run-e2e-verification.js \
//     --epic <N> --story <M> --route <path|N/A> \
//     --current-glob <glob> \
//     [--deferred-globs <comma-separated>] [--fix-cycle-count <N>]

const fs = require('fs');
const path = require('path');
const { spawnSync, spawn } = require('child_process');
const helpers = require('./lib/workflow-helpers');

const ROOT = path.resolve(__dirname, '..', '..');
const WEB = path.join(ROOT, 'web');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { deferredGlobs: [], fixCycleCount: 0, epicMode: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--epic') opts.epic = args[++i];
    else if (a === '--story') opts.story = args[++i];
    else if (a === '--route') opts.route = args[++i];
    else if (a === '--current-glob') opts.currentGlob = args[++i];
    else if (a === '--deferred-globs') {
      opts.deferredGlobs = (args[++i] || '').split(',').filter(Boolean);
    } else if (a === '--fix-cycle-count') {
      opts.fixCycleCount = parseInt(args[++i], 10) || 0;
    } else if (a === '--epic-mode') {
      opts.epicMode = true;
    }
  }
  return opts;
}

/**
 * Discover every routable story spec file in `web/e2e/` for the given epic.
 * Returns array of { story, glob, path, classification }.
 */
function discoverEpicSpecs(epicNum) {
  const e2eDir = path.join(WEB, 'e2e');
  if (!fs.existsSync(e2eDir)) return [];
  const pattern = new RegExp(`^epic-${epicNum}-story-(\\d+)-.*\\.spec\\.ts$`);
  const entries = fs.readdirSync(e2eDir).filter(f => pattern.test(f));
  return entries.map(file => {
    const m = file.match(pattern);
    const storyNum = parseInt(m[1], 10);
    const fullPath = path.join(e2eDir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const liveCount = (content.match(/^\s*test(?:\.only)?\(/gm) || []).length;
    const fixmeCount = (content.match(/^\s*test\.fixme\(/gm) || []).length;
    let classification;
    if (liveCount > 0) classification = 'live';
    else if (fixmeCount > 0) classification = 'fixme';
    else classification = 'missing';
    return {
      story: storyNum,
      glob: `e2e/${file}`,
      path: `e2e/${file}`,
      classification
    };
  });
}

/**
 * Epic-level verification: run every routable spec for the epic in a single
 * playwright invocation. Used during EPIC-QA in batched mode.
 */
function runEpicMode(opts) {
  const specs = discoverEpicSpecs(opts.epic);
  if (specs.length === 0) {
    emit({ status: 'halt', reason: 'no-specs', summary: `No spec files found for Epic ${opts.epic}.`, targets: [] });
    return;
  }

  // Halt if any expected spec is missing (e.g. file exists but no tests at all).
  const missing = specs.filter(s => s.classification === 'missing');
  if (missing.length > 0) {
    emit({
      status: 'halt',
      reason: 'missing-spec',
      summary: `Epic ${opts.epic}: ${missing.length} spec file(s) have no tests.`,
      targets: specs
    });
    return;
  }

  const liveSpecs = specs.filter(s => s.classification === 'live');
  if (liveSpecs.length === 0) {
    emit({
      status: 'auto-skipped:fixme',
      summary: `Epic ${opts.epic}: all specs are test.fixme() — nothing to run.`,
      targets: specs
    });
    return;
  }

  const livePaths = liveSpecs.map(s => s.path);
  const playwright = spawnSync(
    'npx',
    ['playwright', 'test', ...livePaths, '--reporter=json'],
    { cwd: WEB, encoding: 'utf8', shell: true, timeout: 1200000, maxBuffer: 100 * 1024 * 1024 }
  );

  const stdout = playwright.stdout || '';
  const stderr = playwright.stderr || '';
  const exitCode = playwright.status;

  let report = null;
  try { report = JSON.parse(stdout); } catch { /* report stays null */ }

  if (!report) {
    emit({
      status: 'failed',
      failureCount: 1,
      failures: [{
        title: 'Playwright run did not produce parseable JSON',
        error: (stderr || stdout || 'Unknown error').slice(0, 1500),
        filePath: '',
        tracePath: ''
      }],
      tracesDir: 'web/test-results/',
      summary: 'Playwright epic-level run failed before producing results.',
      exitCode
    });
    return;
  }

  const { passCount, specCount, failures } = collectResults(report);

  if (exitCode === 0) {
    emit({
      status: 'passed',
      passCount,
      specCount,
      stories: liveSpecs.map(s => s.story),
      summary: `Epic ${opts.epic}: all ${passCount} tests passed across ${specCount} specs (stories ${liveSpecs.map(s => s.story).join(', ')}).`
    });
  } else {
    // Group failures by story so the orchestrator can scope fix cycles per-story.
    const failuresByStory = {};
    for (const f of failures) {
      const m = (f.filePath || '').match(/epic-\d+-story-(\d+)-/);
      const sNum = m ? parseInt(m[1], 10) : null;
      const key = sNum || 'unknown';
      if (!failuresByStory[key]) failuresByStory[key] = [];
      failuresByStory[key].push(f);
    }
    emit({
      status: 'failed',
      failureCount: failures.length,
      failures,
      failuresByStory,
      tracesDir: 'web/test-results/',
      summary: `Epic ${opts.epic}: ${failures.length} of ${specCount} tests failed.`
    });
  }
}

function persistAndRefresh(opts, status, passCount, failureCount) {
  const args = [
    path.join(ROOT, '.claude/scripts/transition-phase.js'),
    '--set-e2e-status', status,
    '--epic', String(opts.epic),
    '--story', String(opts.story),
    '--e2e-pass', String(passCount || 0),
    '--e2e-fail', String(failureCount || 0)
  ];
  if (opts.fixCycleCount > 0) {
    args.push('--e2e-fix-cycles', String(opts.fixCycleCount));
  }
  try {
    spawnSync('node', args, { cwd: ROOT, encoding: 'utf8', timeout: 30000 });
  } catch { /* best-effort */ }

  // Dashboard refresh runs detached AFTER state is persisted, so it reads the new state.
  try {
    const child = spawn(
      'node',
      [path.join(ROOT, '.claude/scripts/generate-dashboard-html.js'), '--collect'],
      { cwd: ROOT, detached: true, stdio: 'ignore' }
    );
    child.unref();
  } catch { /* best-effort */ }
}

function classifyGlob(globPattern) {
  const normalized = globPattern.replace(/^web[/\\]/, '');
  const dir = path.join(WEB, path.dirname(normalized));
  const fullPaths = helpers.findFiles(dir, path.basename(normalized));
  if (fullPaths.length === 0) {
    return [{ glob: globPattern, classification: 'missing' }];
  }
  return fullPaths.map(fullPath => {
    const relPath = path.relative(WEB, fullPath).split(path.sep).join('/');
    const content = fs.readFileSync(fullPath, 'utf8');
    const liveCount = (content.match(/^\s*test(?:\.only)?\(/gm) || []).length;
    const fixmeCount = (content.match(/^\s*test\.fixme\(/gm) || []).length;
    let classification;
    if (liveCount > 0) classification = 'live';
    else if (fixmeCount > 0) classification = 'fixme';
    else classification = 'missing';
    return { glob: globPattern, classification, path: relPath };
  });
}

function walkPlaywrightSuite(suite, counts) {
  for (const spec of suite.specs || []) {
    counts.specCount++;
    for (const test of spec.tests || []) {
      for (const r of test.results || []) {
        if (r.status === 'passed') {
          counts.passCount++;
        } else {
          const errMsg = (r.error && (r.error.message || r.error.value)) || 'Unknown error';
          counts.failures.push({
            title: spec.title,
            error: String(errMsg).slice(0, 1000),
            filePath: spec.file,
            tracePath: (r.attachments || []).find(a => a.name === 'trace')?.path || ''
          });
        }
      }
    }
  }
  for (const subSuite of suite.suites || []) {
    walkPlaywrightSuite(subSuite, counts);
  }
}

function emit(obj) {
  console.log(JSON.stringify(obj));
}

function collectResults(report) {
  const counts = { passCount: 0, specCount: 0, failures: [] };
  for (const suite of report.suites || []) {
    walkPlaywrightSuite(suite, counts);
  }
  return counts;
}

function main() {
  const opts = parseArgs();

  // Epic-level verification (batched EPIC-QA): run every story spec at once.
  if (opts.epicMode) {
    if (!opts.epic) {
      emit({ status: 'error', summary: '--epic-mode requires --epic <N>' });
      process.exit(1);
    }
    runEpicMode(opts);
    return;
  }

  if (!opts.currentGlob) {
    emit({ status: 'error', summary: '--current-glob is required' });
    process.exit(1);
  }

  if (opts.route === 'N/A') {
    persistAndRefresh(opts, 'auto-skipped:non-routable', 0, 0);
    emit({ status: 'auto-skipped:non-routable', summary: 'Route is N/A — Playwright skipped.' });
    return;
  }

  const allGlobs = [opts.currentGlob, ...opts.deferredGlobs];
  const targets = allGlobs.flatMap(classifyGlob);

  const haltRules = [
    {
      match: t => t.glob === opts.currentGlob && t.classification === 'missing',
      reason: 'missing-current',
      summary: `Spec missing for current story ${opts.epic}-${opts.story}.`
    },
    {
      match: t => t.glob !== opts.currentGlob && t.classification === 'missing',
      reason: 'missing-deferred',
      summary: 'Spec missing for deferred story.'
    },
    {
      match: t => t.glob !== opts.currentGlob && t.classification === 'fixme',
      reason: 'deferred-fixme',
      summary: 'Deferred spec wrapped in test.fixme().'
    }
  ];
  const halt = haltRules.find(r => targets.some(r.match));
  if (halt) {
    emit({ status: 'halt', reason: halt.reason, targets, summary: halt.summary });
    return;
  }

  const liveTargets = targets.filter(t => t.classification === 'live');
  if (liveTargets.length === 0) {
    persistAndRefresh(opts, 'auto-skipped:fixme', 0, 0);
    emit({ status: 'auto-skipped:fixme', targets, summary: 'All targets are test.fixme().' });
    return;
  }

  const livePaths = liveTargets.map(t => t.path);
  const playwright = spawnSync(
    'npx',
    ['playwright', 'test', ...livePaths, '--reporter=json'],
    { cwd: WEB, encoding: 'utf8', shell: true, timeout: 600000, maxBuffer: 50 * 1024 * 1024 }
  );

  const stdout = playwright.stdout || '';
  const stderr = playwright.stderr || '';
  const exitCode = playwright.status;

  let report = null;
  try { report = JSON.parse(stdout); } catch { /* report stays null; handled below */ }

  if (!report) {
    persistAndRefresh(opts, 'failed', 0, 1);
    emit({
      status: 'failed',
      failureCount: 1,
      failures: [{
        title: 'Playwright run did not produce parseable JSON',
        error: (stderr || stdout || 'Unknown error').slice(0, 1500),
        filePath: '',
        tracePath: ''
      }],
      tracesDir: 'web/test-results/',
      summary: 'Playwright run failed before producing test results — check stderr for the cause (often `npx playwright install` not run).',
      exitCode
    });
    return;
  }

  const { passCount, specCount, failures } = collectResults(report);

  if (exitCode === 0) {
    const persistedStatus = opts.fixCycleCount > 0 ? 'passed-after-fix' : 'passed';
    persistAndRefresh(opts, persistedStatus, passCount, 0);
    emit({
      status: 'passed',
      passCount,
      specCount,
      summary: `End-to-end tests passed in a live browser (${passCount} tests across ${specCount} specs).`
    });
  } else {
    persistAndRefresh(opts, 'failed', passCount, failures.length);
    emit({
      status: 'failed',
      failureCount: failures.length,
      failures,
      tracesDir: 'web/test-results/',
      summary: `${failures.length} of ${specCount} tests failed.`
    });
  }
}

main();
