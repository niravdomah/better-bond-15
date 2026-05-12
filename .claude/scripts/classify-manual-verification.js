#!/usr/bin/env node
/**
 * classify-manual-verification.js
 *
 * Classifies each acceptance criterion in a story file as one of:
 *   - "verifiable"          — preconditions met (or no preconditions); ready to verify in browser today.
 *   - "deferred"            — explicit `[requires: ...]` tag declares unmet preconditions.
 *   - "heuristic-deferred"  — the AC text references a /<path> that has no matching Next.js page;
 *                              the AC has no explicit tag, so the classifier guessed.
 *
 * Used by code-reviewer Call B to split the manual-verification checklist into clear sections,
 * so the user is not asked to verify items whose target route/page doesn't exist yet.
 *
 * Usage:
 *   node .claude/scripts/classify-manual-verification.js --epic <N> --story <M>
 *   node .claude/scripts/classify-manual-verification.js --story-file <path>
 *   node .claude/scripts/classify-manual-verification.js --check-text "<arbitrary text>"
 *
 * The --check-text mode is used by the code-reviewer agent AFTER composing
 * each plain-language checklist item. ACs sometimes refer to pages by name
 * ("Payment Management screen") not URL, so the source-level heuristic can't
 * see them; but the rephrased checklist item often surfaces the URL
 * ("On /payment-management, only..."). Running --check-text on each composed
 * item catches that second class of drift.
 *
 * Output: JSON on stdout. Exit 0 on success, 2 on input error.
 *
 * See .claude/shared/ac-dependency-annotations.md for the annotation convention.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--epic') out.epic = parseInt(argv[++i], 10);
    else if (a === '--story') out.story = parseInt(argv[++i], 10);
    else if (a === '--story-file') out.storyFile = argv[++i];
    else if (a === '--check-text') out.checkText = argv[++i];
    else if (a === '--format=json' || a === '--format' && argv[i + 1] === 'json') { /* default */ if (argv[i + 1] === 'json') i++; }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

function err(msg) {
  process.stdout.write(JSON.stringify({ status: 'error', error: msg }) + '\n');
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Locate story file
// ---------------------------------------------------------------------------
function findStoryFile(epic, story) {
  const epicGlobBase = path.join(projectRoot, 'generated-docs', 'stories');
  if (!fs.existsSync(epicGlobBase)) return null;
  const epicDirs = fs.readdirSync(epicGlobBase, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name.startsWith(`epic-${epic}-`))
    .map(e => path.join(epicGlobBase, e.name));
  for (const dir of epicDirs) {
    const candidates = fs.readdirSync(dir).filter(f =>
      new RegExp(`^story-${story}-[a-z][a-z0-9-]*\\.md$`).test(f)
    );
    if (candidates.length > 0) return path.join(dir, candidates[0]);
  }
  return null;
}

let storyFile;
if (args.checkText !== undefined) {
  // Handled below after route-resolution helpers are defined.
} else if (args.storyFile) {
  storyFile = path.isAbsolute(args.storyFile) ? args.storyFile : path.join(projectRoot, args.storyFile);
  if (!fs.existsSync(storyFile)) err(`Story file not found: ${args.storyFile}`);
} else if (Number.isFinite(args.epic) && Number.isFinite(args.story)) {
  storyFile = findStoryFile(args.epic, args.story);
  if (!storyFile) err(`No story file matched epic=${args.epic} story=${args.story}`);
} else {
  err('Specify --epic N --story M, --story-file <path>, or --check-text "<text>"');
}

// ---------------------------------------------------------------------------
// AC parsing — only when classifying a story file (not --check-text mode)
// ---------------------------------------------------------------------------
const content = args.checkText !== undefined ? '' : fs.readFileSync(storyFile, 'utf8');

// Each AC line: optional checkbox + AC-N: text + optional trailing `[requires: ...]` tag.
const AC_LINE_RE = /^\s*-\s*\[[ x]\]\s*(?:\*\*)?(AC-\d+)(?:\*\*)?:\s*(.*?)\s*$/gm;

const acs = [];
if (args.checkText === undefined) {
  // Extract the ## Acceptance Criteria section only.
  const acHeader = /^## Acceptance Criteria\s*$/m;
  const acStart = content.search(acHeader);
  if (acStart === -1) {
    // No ACs at all — emit empty result.
    process.stdout.write(JSON.stringify({ status: 'ok', storyFile: path.relative(projectRoot, storyFile).replace(/\\/g, '/'), acs: [] }, null, 2) + '\n');
    process.exit(0);
  }
  const afterAcHeader = content.indexOf('\n', acStart) + 1;
  const nextH2 = content.indexOf('\n## ', afterAcHeader);
  const acSection = content.slice(afterAcHeader, nextH2 === -1 ? content.length : nextH2);

  let m;
  while ((m = AC_LINE_RE.exec(acSection)) !== null) {
    const id = m[1];
    let text = m[2];

    // Extract trailing `[requires: ...]` tag (the tag itself is wrapped in inline-code backticks).
    const tagMatch = text.match(/`?\[requires:\s*([^\]]*)\]`?\s*$/);
    let rawTag = null;
    if (tagMatch) {
      rawTag = tagMatch[1].trim();
      text = text.slice(0, tagMatch.index).trim();
    }

    acs.push({ id, text, rawTag });
  }
}

// ---------------------------------------------------------------------------
// Tag parsing
// ---------------------------------------------------------------------------
function parseTag(rawTag) {
  // Comma-separated key=value, allow values to contain spaces; hint= can contain commas if quoted.
  const out = { route: [], story: [], hint: null, unknown: [] };
  if (!rawTag) return out;

  // Simple split on comma, then key=value. Values are trimmed.
  const parts = rawTag.split(',').map(s => s.trim()).filter(Boolean);
  for (const p of parts) {
    const eq = p.indexOf('=');
    if (eq === -1) { out.unknown.push(p); continue; }
    const key = p.slice(0, eq).trim().toLowerCase();
    const val = p.slice(eq + 1).trim();
    if (key === 'route') out.route.push(val);
    else if (key === 'story') out.story.push(val);
    else if (key === 'hint') out.hint = (out.hint ? out.hint + ', ' : '') + val;
    else out.unknown.push(p);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Route resolution — Next.js app router with route groups
// ---------------------------------------------------------------------------
const APP_DIR = path.join(projectRoot, 'web', 'src', 'app');

function logicalRouteFor(pageFilePath) {
  // Strip web/src/app/ prefix and /page.tsx suffix.
  let rel = path.relative(APP_DIR, pageFilePath).replace(/\\/g, '/');
  rel = rel.replace(/\/page\.tsx$/, '').replace(/^page\.tsx$/, '');
  // Remove route-group dirs like (protected), (auth).
  const segments = rel.split('/').filter(seg => seg.length > 0 && !/^\(.+\)$/.test(seg));
  return '/' + segments.join('/');
}

let knownRoutes = null;
function getKnownRoutes() {
  if (knownRoutes) return knownRoutes;
  knownRoutes = new Set();
  if (!fs.existsSync(APP_DIR)) return knownRoutes;
  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && /^page\.(tsx?|jsx?)$/.test(e.name)) {
        const route = logicalRouteFor(full);
        knownRoutes.add(route === '' ? '/' : route);
      }
    }
  }
  walk(APP_DIR);
  return knownRoutes;
}

function routeExists(route) {
  // Normalize: strip trailing slash (except root), ensure leading slash.
  let r = route.trim();
  if (!r.startsWith('/')) r = '/' + r;
  if (r.length > 1 && r.endsWith('/')) r = r.slice(0, -1);
  return getKnownRoutes().has(r);
}

// ---------------------------------------------------------------------------
// Workflow-state lookup for `story=N.M`
// ---------------------------------------------------------------------------
let workflowState = null;
function getWorkflowState() {
  if (workflowState !== null) return workflowState;
  const p = path.join(projectRoot, 'generated-docs', 'context', 'workflow-state.json');
  try { workflowState = JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { workflowState = {}; }
  return workflowState;
}

function storyComplete(epic, story) {
  const s = getWorkflowState();
  return s?.epics?.[String(epic)]?.stories?.[String(story)]?.phase === 'COMPLETE';
}

// ---------------------------------------------------------------------------
// Heuristic — extract /path candidates from untagged AC text
// ---------------------------------------------------------------------------
const ROUTE_CANDIDATE_RE = /\/[a-z][a-z0-9-]*(?:\/[a-z0-9_\[\]-]+)*/g;
const HTTP_METHOD_BEFORE_RE = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*$/i;

// Skip API-shaped paths and very-common code-internal paths the user wouldn't browse to.
function isUserFacingShape(p) {
  if (/^\/v\d+\b/.test(p)) return false;          // /v1/..., /v2/...
  if (/^\/api\b/.test(p)) return false;           // /api/...
  if (/^\/_/.test(p)) return false;               // /_next, etc.
  return true;
}

function heuristicCandidates(text) {
  const found = new Set();
  let mm;
  while ((mm = ROUTE_CANDIDATE_RE.exec(text)) !== null) {
    const p = mm[0].replace(/[.,;:!?)\]]+$/, '');
    if (!isUserFacingShape(p)) continue;
    // Skip word-slash-word (e.g., "park/unpark") — a real path is preceded by
    // whitespace, start-of-string, or punctuation like backtick / quote / paren.
    const charBefore = mm.index > 0 ? text[mm.index - 1] : '';
    if (charBefore && /[a-zA-Z0-9]/.test(charBefore)) continue;
    // Skip if immediately preceded by an HTTP method verb (API endpoint context).
    const before = text.slice(0, mm.index);
    if (HTTP_METHOD_BEFORE_RE.test(before)) continue;
    found.add(p);
  }
  return [...found];
}

// ---------------------------------------------------------------------------
// --check-text mode — heuristic on a single string (no AC parsing)
// ---------------------------------------------------------------------------
if (args.checkText !== undefined) {
  const candidates = heuristicCandidates(args.checkText);
  const unresolved = candidates.filter(p => !routeExists(p));
  process.stdout.write(JSON.stringify({
    status: 'ok',
    text: args.checkText,
    candidates,
    unresolved,
    classification: unresolved.length === 0 ? 'verifiable' : 'heuristic-deferred',
  }, null, 2) + '\n');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Classify each AC
// ---------------------------------------------------------------------------
const classified = acs.map(ac => {
  const tag = parseTag(ac.rawTag);
  const requires = [];
  const unmetDeps = [];

  // Explicit route= requirements
  for (const r of tag.route) {
    requires.push(`route=${r}`);
    if (!routeExists(r)) unmetDeps.push(`route=${r} — no page found under web/src/app/`);
  }

  // Explicit story=N.M requirements
  for (const s of tag.story) {
    requires.push(`story=${s}`);
    const m = s.match(/^(\d+)\.(\d+)$/);
    if (!m) {
      unmetDeps.push(`story=${s} — bad format (expected N.M)`);
    } else if (!storyComplete(parseInt(m[1], 10), parseInt(m[2], 10))) {
      unmetDeps.push(`story=${s} — Epic ${m[1]} Story ${m[2]} is not COMPLETE`);
    }
  }

  // Unknown tag fragments — surface for visibility
  for (const u of tag.unknown) {
    requires.push(u);
    unmetDeps.push(`unknown tag fragment: ${u}`);
  }

  let classification;
  if (ac.rawTag !== null) {
    classification = unmetDeps.length === 0 ? 'verifiable' : 'deferred';
  } else {
    // Heuristic for untagged ACs
    const candidates = heuristicCandidates(ac.text);
    const unresolved = candidates.filter(p => !routeExists(p));
    if (unresolved.length === 0) {
      classification = 'verifiable';
    } else {
      classification = 'heuristic-deferred';
      for (const p of unresolved) {
        unmetDeps.push(`text references ${p} — no page found under web/src/app/`);
      }
    }
  }

  return {
    id: ac.id,
    text: ac.text,
    classification,
    requires,
    unmetDeps,
    hint: tag.hint || null,
  };
});

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
const result = {
  status: 'ok',
  storyFile: path.relative(projectRoot, storyFile).replace(/\\/g, '/'),
  counts: {
    total: classified.length,
    verifiable: classified.filter(a => a.classification === 'verifiable').length,
    deferred: classified.filter(a => a.classification === 'deferred').length,
    heuristicDeferred: classified.filter(a => a.classification === 'heuristic-deferred').length,
  },
  acs: classified,
};

process.stdout.write(JSON.stringify(result, null, 2) + '\n');
process.exit(0);
