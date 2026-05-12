#!/usr/bin/env node
/**
 * validate-ac-dependencies.js
 *
 * Repo-wide drift scanner: walks every story file and flags any AC whose text
 * references a /<path> that doesn't resolve to a real Next.js page AND has no
 * explicit `[requires: ...]` annotation.
 *
 * This is a soft-warning backstop — the heuristic has false-positive risk and
 * we don't want to halt the workflow on judgment calls. Use it before a commit
 * if you've been editing ACs, or wire it into CI as a quality gate.
 *
 * Usage:
 *   node .claude/scripts/validate-ac-dependencies.js           # default --check
 *   node .claude/scripts/validate-ac-dependencies.js --verbose
 *   node .claude/scripts/validate-ac-dependencies.js --format=json
 *
 * Exit codes:
 *   0 — no drift (no untagged ACs reference unresolved routes).
 *   1 — drift found (one or more ACs flagged).
 *   2 — schema/path error.
 *
 * See .claude/shared/ac-dependency-annotations.md for the annotation convention.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const args = new Set(process.argv.slice(2));
const verbose = args.has('--verbose');
const jsonOutput = [...args].some(a => a === '--format=json');

const projectRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// ---------------------------------------------------------------------------
// Locate story files
// ---------------------------------------------------------------------------
const storiesRoot = path.join(projectRoot, 'generated-docs', 'stories');
if (!fs.existsSync(storiesRoot)) {
  if (jsonOutput) {
    process.stdout.write(JSON.stringify({ status: 'ok', counts: { stories: 0, drift: 0 }, drift: [] }) + '\n');
  } else {
    process.stdout.write('No generated-docs/stories/ directory yet — nothing to validate.\n');
  }
  process.exit(0);
}

const storyFiles = [];
for (const entry of fs.readdirSync(storiesRoot, { withFileTypes: true })) {
  if (!entry.isDirectory() || !entry.name.startsWith('epic-')) continue;
  const epicDir = path.join(storiesRoot, entry.name);
  for (const f of fs.readdirSync(epicDir)) {
    if (/^story-\d+-[a-z][a-z0-9-]*\.md$/.test(f)) {
      storyFiles.push(path.join(epicDir, f));
    }
  }
}

// ---------------------------------------------------------------------------
// Run classifier per story file (re-uses heuristic logic — single source of truth)
// ---------------------------------------------------------------------------
const classifierPath = path.join(projectRoot, '.claude', 'scripts', 'classify-manual-verification.js');
if (!fs.existsSync(classifierPath)) {
  process.stderr.write(`classifier missing at ${classifierPath}\n`);
  process.exit(2);
}

const drift = [];

for (const sf of storyFiles) {
  const relStoryPath = path.relative(projectRoot, sf).replace(/\\/g, '/');
  const result = spawnSync('node', [classifierPath, '--story-file', sf], {
    encoding: 'utf8',
    cwd: projectRoot,
  });
  if (result.status !== 0 || !result.stdout) {
    process.stderr.write(`classifier failed for ${relStoryPath}: ${result.stderr || ''}\n`);
    continue;
  }
  let parsed;
  try { parsed = JSON.parse(result.stdout); }
  catch (e) {
    process.stderr.write(`classifier output not JSON for ${relStoryPath}: ${e.message}\n`);
    continue;
  }
  for (const ac of parsed.acs || []) {
    if (ac.classification === 'heuristic-deferred') {
      drift.push({
        storyFile: relStoryPath,
        ac: ac.id,
        text: ac.text,
        unmetDeps: ac.unmetDeps,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
if (jsonOutput) {
  process.stdout.write(JSON.stringify({
    status: drift.length === 0 ? 'ok' : 'drift',
    counts: { stories: storyFiles.length, drift: drift.length },
    drift,
  }, null, 2) + '\n');
  process.exit(drift.length === 0 ? 0 : 1);
}

if (drift.length === 0) {
  process.stdout.write(`Clean: ${storyFiles.length} story file(s) scanned, no untagged drift detected.\n`);
  if (verbose && storyFiles.length) {
    process.stdout.write('\nScanned:\n');
    for (const sf of storyFiles) {
      process.stdout.write(`  ${path.relative(projectRoot, sf).replace(/\\/g, '/')}\n`);
    }
  }
  process.exit(0);
}

process.stdout.write(`Drift detected: ${drift.length} AC(s) reference routes that don't exist and have no [requires: ...] annotation.\n`);
process.stdout.write(`  Stories scanned: ${storyFiles.length}   Drift items: ${drift.length}\n\n`);

const byStory = new Map();
for (const d of drift) {
  if (!byStory.has(d.storyFile)) byStory.set(d.storyFile, []);
  byStory.get(d.storyFile).push(d);
}
for (const [story, items] of byStory) {
  process.stdout.write(`  ${story}\n`);
  for (const it of items) {
    process.stdout.write(`    ${it.ac}: ${it.text.slice(0, 80)}${it.text.length > 80 ? '…' : ''}\n`);
    for (const dep of it.unmetDeps) {
      process.stdout.write(`      ${dep}\n`);
    }
  }
  process.stdout.write('\n');
}

process.stdout.write('Add a `[requires: route=/path, hint=Story X adds this]` annotation to each AC, or accept the heuristic warning.\n');
process.stdout.write('Convention: .claude/shared/ac-dependency-annotations.md\n');
process.exit(1);
