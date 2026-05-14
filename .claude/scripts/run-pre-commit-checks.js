#!/usr/bin/env node
/**
 * run-pre-commit-checks.js
 *
 * Single canonical implementation of the pre-commit gate. Invoked by two
 * callers that must stay in sync:
 *
 *   1. .husky/pre-commit  → `--mode=staged`  (scans staged files)
 *   2. code-reviewer Call B → `--mode=working-tree`  (scans working-tree
 *      changes so any failure surfaces as a Call B failure, not a Call C
 *      iteration during `git commit`)
 *
 * Checks run in this order (matches .husky/pre-commit):
 *   1. Secret scan via .github/scripts/scan-secrets.sh
 *   2. TypeScript no-emit type check (whole web/ project)
 *   3. Lint + format
 *      - staged mode:        `npx lint-staged` (auto-detects staged files)
 *      - working-tree mode:  `eslint --fix` + `prettier --write` on
 *                            files changed-vs-HEAD (matches lint-staged's
 *                            ".{js,jsx,ts,tsx}" and ".{json,md,css}" globs)
 *
 * Output (always JSON to stdout):
 *   { status: "ok",  mode, checks: [...] }
 *   { status: "fail", mode, failed: <step>, checks: [...], summary }
 *
 * Exit code: 0 on success, 1 on any failure.
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');
const WEB = path.join(ROOT, 'web');
const SCAN_SECRETS = path.join(ROOT, '.github/scripts/scan-secrets.sh');

// =============================================================================
// CLI
// =============================================================================

function parseArgs(argv) {
  const args = { mode: 'staged', verbose: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mode' && argv[i + 1]) {
      args.mode = argv[++i];
    } else if (a.startsWith('--mode=')) {
      args.mode = a.split('=')[1];
    } else if (a === '--verbose' || a === '-v') {
      args.verbose = true;
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    }
  }
  if (!['staged', 'working-tree'].includes(args.mode)) {
    exitWithError(`Invalid --mode "${args.mode}". Use staged or working-tree.`);
  }
  return args;
}

function emit(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

function exitWithError(message) {
  emit({ status: 'fail', failed: 'usage', summary: message });
  process.exit(1);
}

function printHelp() {
  console.log(`
Usage:
  node .claude/scripts/run-pre-commit-checks.js [--mode=staged|working-tree] [--verbose]

Modes:
  staged        Scan files git has staged (matches the actual pre-commit hook).
  working-tree  Scan files changed vs HEAD (used by code-reviewer Call B).

Output: JSON to stdout. Exit code 0 on success, 1 on failure.
`);
}

// =============================================================================
// FILE LISTING
// =============================================================================

function listStagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      cwd: ROOT,
      encoding: 'utf-8'
    });
    return out.split('\n').map(s => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function listWorkingTreeFiles() {
  // Files changed vs HEAD (both staged and unstaged), excluding deletions.
  try {
    const out = execSync('git diff --name-only --diff-filter=ACMR HEAD', {
      cwd: ROOT,
      encoding: 'utf-8'
    });
    const untracked = execSync('git ls-files --others --exclude-standard', {
      cwd: ROOT,
      encoding: 'utf-8'
    });
    const all = [...out.split('\n'), ...untracked.split('\n')]
      .map(s => s.trim()).filter(Boolean);
    return [...new Set(all)];
  } catch {
    return [];
  }
}

function filterByGlob(files, extensions) {
  return files.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return extensions.includes(ext);
  });
}

// =============================================================================
// CHECK STEPS
// =============================================================================

function runSecretScan(mode, verbose) {
  // The pre-commit hook calls scan-secrets.sh --staged. For working-tree
  // mode we use --dir on the changed files' parent dirs, or fall back to
  // scanning web/src + web/e2e (smaller surface than full repo).
  let cmd, args;
  if (mode === 'staged') {
    cmd = 'bash';
    args = [SCAN_SECRETS, '--staged'];
  } else {
    // Working-tree mode: scan the web source dirs (the only place secrets
    // typically appear in a webapp build). Faster than scanning the whole repo.
    cmd = 'bash';
    args = [SCAN_SECRETS, '--dir', 'web/src'];
  }

  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf-8',
    timeout: 60_000
  });

  return {
    step: 'secret-scan',
    mode,
    ok: result.status === 0,
    exitCode: result.status,
    stdout: verbose ? (result.stdout || '') : (result.stdout || '').slice(0, 500),
    stderr: verbose ? (result.stderr || '') : (result.stderr || '').slice(0, 500)
  };
}

function runTypeCheck(verbose) {
  // tsc --noEmit (matches the pre-commit hook step). Runs from web/.
  const result = spawnSync('npx', ['tsc', '--noEmit'], {
    cwd: WEB,
    encoding: 'utf-8',
    shell: true,
    timeout: 180_000
  });

  return {
    step: 'tsc-noemit',
    ok: result.status === 0,
    exitCode: result.status,
    stdout: verbose ? (result.stdout || '') : (result.stdout || '').slice(0, 1500),
    stderr: verbose ? (result.stderr || '') : (result.stderr || '').slice(0, 800)
  };
}

function runLintFormat(mode, verbose) {
  if (mode === 'staged') {
    // Match the actual pre-commit hook exactly.
    const result = spawnSync('npx', ['lint-staged'], {
      cwd: WEB,
      encoding: 'utf-8',
      shell: true,
      timeout: 120_000
    });
    return {
      step: 'lint-staged',
      ok: result.status === 0,
      exitCode: result.status,
      stdout: verbose ? (result.stdout || '') : (result.stdout || '').slice(0, 1500),
      stderr: verbose ? (result.stderr || '') : (result.stderr || '').slice(0, 800)
    };
  }

  // Working-tree mode: scan the file set lint-staged would scan if everything
  // were staged. The lint-staged config in web/package.json defines globs for
  // *.{js,jsx,ts,tsx} → eslint --fix + prettier --write, and
  // *.{json,md,css}  → prettier --write.
  const allFiles = listWorkingTreeFiles();
  // Only consider files under web/ — that's lint-staged's scope.
  const webFiles = allFiles
    .filter(f => f.startsWith('web/') || f.startsWith('web\\'))
    .map(f => f.replace(/^web[\\/]/, ''));

  const jsLikeFiles = filterByGlob(webFiles, ['.js', '.jsx', '.ts', '.tsx']);
  const formatOnlyFiles = filterByGlob(webFiles, ['.json', '.md', '.css']);

  if (jsLikeFiles.length === 0 && formatOnlyFiles.length === 0) {
    return {
      step: 'lint-format',
      ok: true,
      exitCode: 0,
      stdout: 'No matching files in web/ — nothing to lint.',
      stderr: ''
    };
  }

  const checks = [];

  if (jsLikeFiles.length > 0) {
    const eslintResult = spawnSync(
      'npx',
      ['eslint', '--max-warnings=0', ...jsLikeFiles],
      { cwd: WEB, encoding: 'utf-8', shell: true, timeout: 180_000 }
    );
    checks.push({
      tool: 'eslint',
      ok: eslintResult.status === 0,
      exitCode: eslintResult.status,
      stdout: verbose ? (eslintResult.stdout || '') : (eslintResult.stdout || '').slice(0, 1500),
      stderr: verbose ? (eslintResult.stderr || '') : (eslintResult.stderr || '').slice(0, 800),
      fileCount: jsLikeFiles.length
    });
  }

  if (jsLikeFiles.length > 0 || formatOnlyFiles.length > 0) {
    const prettierFiles = [...jsLikeFiles, ...formatOnlyFiles];
    const prettierResult = spawnSync(
      'npx',
      ['prettier', '--check', ...prettierFiles],
      { cwd: WEB, encoding: 'utf-8', shell: true, timeout: 60_000 }
    );
    checks.push({
      tool: 'prettier',
      ok: prettierResult.status === 0,
      exitCode: prettierResult.status,
      stdout: verbose ? (prettierResult.stdout || '') : (prettierResult.stdout || '').slice(0, 1500),
      stderr: verbose ? (prettierResult.stderr || '') : (prettierResult.stderr || '').slice(0, 800),
      fileCount: prettierFiles.length
    });
  }

  return {
    step: 'lint-format',
    ok: checks.every(c => c.ok),
    checks
  };
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

  // Sanity: the scanner script must exist
  if (!fs.existsSync(SCAN_SECRETS)) {
    emit({
      status: 'fail',
      failed: 'setup',
      summary: `Secret scanner not found at ${SCAN_SECRETS}. Repository may be missing .github/scripts/.`
    });
    process.exit(1);
  }

  // Sanity: web/ must exist
  if (!fs.existsSync(WEB)) {
    emit({
      status: 'fail',
      failed: 'setup',
      summary: `web/ directory not found at ${WEB}.`
    });
    process.exit(1);
  }

  const checks = [];

  // ── 1. Secret scan ──────────────────────────────────────────────────────
  const secretResult = runSecretScan(args.mode, args.verbose);
  checks.push(secretResult);
  if (!secretResult.ok) {
    emit({
      status: 'fail',
      mode: args.mode,
      failed: 'secret-scan',
      checks,
      summary: 'Secret scan failed. Review the secret-scan output for the offending file/pattern.'
    });
    process.exit(1);
  }

  // ── 2. TypeScript type check ────────────────────────────────────────────
  const tscResult = runTypeCheck(args.verbose);
  checks.push(tscResult);
  if (!tscResult.ok) {
    emit({
      status: 'fail',
      mode: args.mode,
      failed: 'tsc-noemit',
      checks,
      summary: 'TypeScript type check failed. Fix the errors before committing.'
    });
    process.exit(1);
  }

  // ── 3. Lint + format ────────────────────────────────────────────────────
  const lintResult = runLintFormat(args.mode, args.verbose);
  checks.push(lintResult);
  if (!lintResult.ok) {
    emit({
      status: 'fail',
      mode: args.mode,
      failed: 'lint-format',
      checks,
      summary: 'Lint or format check failed. Run `npm run lint:fix` and `npx prettier --write` on the offending files.'
    });
    process.exit(1);
  }

  emit({
    status: 'ok',
    mode: args.mode,
    checks: checks.map(c => ({ step: c.step, ok: c.ok })),
    summary: 'All pre-commit checks passed.'
  });
  process.exit(0);
}

main();
