#!/usr/bin/env node
/**
 * template-prune.js
 *
 * Strips template scaffolding that most webapps don't need so the first epic
 * doesn't pay a 15-20 minute "delete template code" tax. Idempotent — safe
 * to re-run on an already-pruned tree (it just reports "nothing to do").
 *
 * Profiles:
 *   --profile=minimal-poc  (default)
 *     Removes multi-role auth machinery, the custom toast context, example
 *     pages and routes, and dark-mode classes from auth pages. Intended for
 *     single-role POCs that use Shadcn Sonner for toasts and don't need RBAC.
 *
 * Modes:
 *   --dry-run  (default)
 *     Reports what would be deleted/modified without writing any changes.
 *   --apply
 *     Actually performs the changes.
 *
 * Usage:
 *   node .claude/scripts/template-prune.js                       # dry-run, minimal-poc profile
 *   node .claude/scripts/template-prune.js --apply               # apply minimal-poc profile
 *   node .claude/scripts/template-prune.js --profile=minimal-poc --apply
 *
 * When to run:
 *   - During /setup, after `npm install` finishes, when the user opts into the
 *     minimal-poc template variant.
 *   - At DESIGN time, once the FRS confirms a single-role / no-multi-role
 *     model (e.g., NFR3 specifies single role, NFR5 specifies no signup, the
 *     FRS doesn't mention RBAC).
 *
 * Output: human-readable summary to stdout. Exit code 0 = success.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const WEB = path.join(ROOT, 'web');
const WEB_SRC = path.join(WEB, 'src');

// =============================================================================
// CLI
// =============================================================================

function parseArgs(argv) {
  const args = { profile: 'minimal-poc', apply: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--profile=')) args.profile = a.split('=')[1];
    else if (a === '--profile' && argv[i + 1]) args.profile = argv[++i];
    else if (a === '--apply') args.apply = true;
    else if (a === '--dry-run') args.apply = false;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  if (!['minimal-poc'].includes(args.profile)) {
    console.error(`Unknown profile "${args.profile}". Use --profile=minimal-poc.`);
    process.exit(1);
  }
  return args;
}

function printHelp() {
  console.log(`
Usage:
  node .claude/scripts/template-prune.js [--profile=minimal-poc] [--apply|--dry-run]

Profiles:
  minimal-poc   Strip multi-role RBAC, custom toasts, example pages, dark-mode auth.

Modes:
  --dry-run     Report what would change, write nothing (default).
  --apply       Perform the changes.

Idempotent: re-running on an already-pruned tree reports "nothing to do".
`);
}

// =============================================================================
// PROFILE DEFINITIONS
// =============================================================================

// Files to delete entirely.
const MINIMAL_POC_DELETE = [
  // Multi-role RBAC scaffolding
  path.join(WEB_SRC, 'lib/auth/auth-helpers.ts'),
  path.join(WEB_SRC, 'components/RoleGate.tsx'),
  path.join(WEB_SRC, '__tests__/integration/role-gate.test.tsx'),
  path.join(WEB_SRC, '__tests__/integration/auth-helpers.test.ts'),
  path.join(WEB_SRC, '__tests__/integration/rbac.test.ts'),
  path.join(WEB_SRC, 'app/api/example/protected-action/route.ts'),
  path.join(WEB_SRC, 'app/(protected)/example/page.tsx'),
  // Custom toast (replaced by Shadcn Sonner)
  path.join(WEB_SRC, 'components/toast/Toast.tsx'),
  path.join(WEB_SRC, 'components/toast/ToastContainer.tsx'),
  path.join(WEB_SRC, 'contexts/ToastContext.tsx'),
  path.join(WEB_SRC, 'types/toast.ts'),
  // Out-of-scope auth routes (POCs typically use a single sign-in only)
  path.join(WEB_SRC, 'app/auth/signup'),
  path.join(WEB_SRC, 'app/auth/signout'),
  path.join(WEB_SRC, 'app/auth/forbidden'),
  path.join(WEB_SRC, 'app/auth/logged-out'),
  path.join(WEB_SRC, 'app/auth/authenticated')
];

// Empty directories to remove if they become empty after deletions.
const MINIMAL_POC_PRUNE_DIRS = [
  path.join(WEB_SRC, 'components/toast'),
  path.join(WEB_SRC, 'contexts'),
  path.join(WEB_SRC, 'app/api/example'),
  path.join(WEB_SRC, 'app/api'),
  path.join(WEB_SRC, 'app/(protected)/example')
];

// File transforms: { path, expect: substring, replace: replacement, description }
// `expect` must match (idempotency check); if it doesn't match the rule is skipped.
// Each transform applies once.
const MINIMAL_POC_TRANSFORMS = [
  {
    path: path.join(WEB_SRC, 'types/roles.ts'),
    description: 'Simplify UserRole to single USER',
    // Sentinel matches the multi-role enum *value declaration* (not a
    // mention in a comment). The unmodified template has `POWER_USER = 'power_user'`
    // as an enum member; a hand-simplified file may still reference POWER_USER
    // in a comment but won't have the value assignment.
    sentinel: "POWER_USER = '",
    // We replace the whole file content rather than patch a string — safer for
    // multi-line enum changes. The sentinel above tells us the file still has
    // the multi-role enum.
    replaceFile: `/**
 * UserRole — single-role model.
 *
 * The minimal-poc template ships with one role. Multi-role RBAC machinery
 * (RoleGate, requireMinimumRole, hierarchy comparisons) has been removed.
 * If your project later needs multi-role support, restore the enum, add
 * back the helpers in auth-helpers.ts, and re-introduce RoleGate.
 */

export enum UserRole {
  USER = 'user'
}

export const DEFAULT_ROLE = UserRole.USER;
`
  }
];

// =============================================================================
// HELPERS
// =============================================================================

function safeStat(p) {
  try { return fs.statSync(p); } catch { return null; }
}

function deleteRecursive(p, apply) {
  const stat = safeStat(p);
  if (!stat) return false;
  if (apply) {
    fs.rmSync(p, { recursive: true, force: true });
  }
  return true;
}

function isDirEmpty(p) {
  const stat = safeStat(p);
  if (!stat || !stat.isDirectory()) return false;
  try {
    return fs.readdirSync(p).length === 0;
  } catch {
    return false;
  }
}

// =============================================================================
// EXECUTE PROFILE
// =============================================================================

function runMinimalPoc(apply) {
  const report = {
    deleted: [],
    transformed: [],
    prunedDirs: [],
    skipped: [],
    errors: []
  };

  // 1. Deletions
  for (const target of MINIMAL_POC_DELETE) {
    const rel = path.relative(ROOT, target);
    if (!safeStat(target)) {
      report.skipped.push({ path: rel, reason: 'already absent' });
      continue;
    }
    try {
      deleteRecursive(target, apply);
      report.deleted.push(rel);
    } catch (e) {
      report.errors.push({ path: rel, error: e.message });
    }
  }

  // 2. File transforms
  for (const t of MINIMAL_POC_TRANSFORMS) {
    const rel = path.relative(ROOT, t.path);
    if (!safeStat(t.path)) {
      report.skipped.push({ path: rel, reason: 'file not present' });
      continue;
    }
    let content;
    try {
      content = fs.readFileSync(t.path, 'utf-8');
    } catch (e) {
      report.errors.push({ path: rel, error: e.message });
      continue;
    }

    // Idempotency check — if sentinel not present, the transform has already been applied.
    if (t.sentinel && !content.includes(t.sentinel)) {
      report.skipped.push({ path: rel, reason: 'already transformed (sentinel absent)' });
      continue;
    }

    if (apply) {
      try {
        if (t.replaceFile) {
          fs.writeFileSync(t.path, t.replaceFile);
        } else if (t.replace && t.expect) {
          if (!content.includes(t.expect)) {
            report.skipped.push({ path: rel, reason: `expect string absent: ${t.expect.slice(0, 40)}…` });
            continue;
          }
          fs.writeFileSync(t.path, content.replace(t.expect, t.replace));
        }
      } catch (e) {
        report.errors.push({ path: rel, error: e.message });
        continue;
      }
    }
    report.transformed.push({ path: rel, description: t.description });
  }

  // 3. Prune empty directories
  for (const dir of MINIMAL_POC_PRUNE_DIRS) {
    const rel = path.relative(ROOT, dir);
    if (!safeStat(dir)) continue;
    if (!isDirEmpty(dir)) {
      report.skipped.push({ path: rel, reason: 'directory not empty (kept)' });
      continue;
    }
    if (apply) {
      try { fs.rmdirSync(dir); } catch { /* best-effort */ }
    }
    report.prunedDirs.push(rel);
  }

  return report;
}

// =============================================================================
// MAIN
// =============================================================================

function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!fs.existsSync(WEB_SRC)) {
    console.error(`web/src not found at ${WEB_SRC}. Run from the project root.`);
    process.exit(1);
  }

  const apply = args.apply;
  const mode = apply ? 'APPLY' : 'DRY-RUN';
  console.log(`template-prune.js — profile: ${args.profile}, mode: ${mode}`);
  console.log('');

  let report;
  if (args.profile === 'minimal-poc') {
    report = runMinimalPoc(apply);
  } else {
    console.error(`Unknown profile: ${args.profile}`);
    process.exit(1);
  }

  // Summary
  console.log(`Files deleted${apply ? '' : ' (would be)'}: ${report.deleted.length}`);
  for (const p of report.deleted) console.log(`  - ${p}`);

  console.log(`\nFiles transformed${apply ? '' : ' (would be)'}: ${report.transformed.length}`);
  for (const t of report.transformed) console.log(`  - ${t.path}: ${t.description}`);

  console.log(`\nEmpty directories pruned${apply ? '' : ' (would be)'}: ${report.prunedDirs.length}`);
  for (const d of report.prunedDirs) console.log(`  - ${d}`);

  if (report.skipped.length > 0) {
    console.log(`\nSkipped (idempotency): ${report.skipped.length}`);
    for (const s of report.skipped) console.log(`  - ${s.path}: ${s.reason}`);
  }

  if (report.errors.length > 0) {
    console.log(`\nErrors: ${report.errors.length}`);
    for (const e of report.errors) console.log(`  - ${e.path}: ${e.error}`);
    process.exit(1);
  }

  const totalChanges = report.deleted.length + report.transformed.length + report.prunedDirs.length;
  if (totalChanges === 0) {
    console.log('\nNothing to do — tree already pruned for this profile.');
  } else if (!apply) {
    console.log(`\n${totalChanges} change(s) planned. Re-run with --apply to perform them.`);
  } else {
    console.log(`\nDone. ${totalChanges} change(s) applied.`);
    console.log('Next steps:');
    console.log('  - Verify the tree compiles: npm --prefix web run build');
    console.log('  - Verify tests still pass: npm --prefix web test');
    console.log('  - For Shadcn Sonner toasts (if not yet installed): npx --prefix web shadcn add sonner');
  }
}

main();
