#!/usr/bin/env node
/**
 * THE NEW-CODE STYLE GATE — Stylelint, but only on the lines this branch wrote.
 *
 * WHY THIS EXISTS RATHER THAN JUST FAILING THE BUILD. The two Stylelint rules
 * (see `stylelint.config.mjs`) split cleanly in this repo, measured 2026-08-23:
 *
 *   SCSS — 143 files across `libs/al-web-components`, `libs/sl-web-components`
 *     and every example app: 0 violations. `pnpm lint:styles` gates that
 *     outright; there is no debt to grandfather and no reason to be clever.
 *
 *   the sites' hand-written CSS — 21 real, PRE-EXISTING violations:
 *     `apps/docs/src/styles/docs.css` (15 literal status hues),
 *     `.altitude/visual-compare/harness/scoped.css` (5 harness colours) and
 *     `apps/southleft/src/styles/layout.css` (1 — `var(--sw)`, a swatch colour
 *     set inline on the element, which no stylesheet-only rule can see).
 *     Fixing the first two means changing rendered colours on a live site,
 *     which is a design decision and a VRT run, not a lint pass — and
 *     blanket-disabling them would delete the finding.
 *
 * So those 21 stay visible in `pnpm lint:styles:report`, and this gate holds the
 * line where it can be held honestly: a CHANGED line must be clean, whatever
 * file it is in. Debt is frozen, not blessed, and not hidden.
 *
 * CAVEAT, stated because it matters: on a long-lived branch that has diverged
 * far from its base, "changed" approaches "everything", and this reports the
 * pre-existing CSS as new. It is a per-PR gate; it is not a substitute for
 * `lint:styles`, which is the one that always means what it says.
 *
 *   node scripts/check-styles-changed.mjs [--base <ref>]
 *
 * `--base` defaults to `origin/main`, then `main`, then the empty tree (which
 * makes every line "changed" — the right behaviour for a first commit and for a
 * shallow CI checkout that has no main to diff against).
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import stylelint from 'stylelint';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const git = (...args) => execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/** The empty-tree hash: diffing against it yields "every line is new". */
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

function resolveBase() {
  const explicit = process.argv.indexOf('--base');
  const candidates = explicit > -1 ? [process.argv[explicit + 1]] : ['origin/main', 'main'];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return git('merge-base', 'HEAD', candidate).trim();
    } catch {
      /* not a ref in this checkout — try the next */
    }
  }
  return EMPTY_TREE;
}

const STYLE_FILE = /\.(scss|css)$/;

/**
 * Changed line numbers per file, parsed from a unified diff.
 *
 * Only the `+` side matters: a line this branch deleted cannot carry a
 * violation, and a violation on an untouched line is exactly what this gate is
 * built to leave alone.
 */
function changedLines(base) {
  const diff = git('diff', '--unified=0', '--diff-filter=ACMR', base, '--', '*.scss', '*.css');
  /** @type {Map<string, Set<number>>} */
  const byFile = new Map();
  let current = null;

  for (const line of diff.split('\n')) {
    const fileMatch = /^\+\+\+ b\/(.+)$/.exec(line);
    if (fileMatch) {
      current = STYLE_FILE.test(fileMatch[1]) ? fileMatch[1] : null;
      if (current && !byFile.has(current)) byFile.set(current, new Set());
      continue;
    }
    if (!current) continue;
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (!hunk) continue;
    const start = Number(hunk[1]);
    const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    for (let n = start; n < start + count; n++) byFile.get(current).add(n);
  }

  // Uncommitted work counts too — this is meant to be runnable before a commit.
  const dirty = git('diff', '--unified=0', '--diff-filter=ACMR', '--', '*.scss', '*.css');
  let dirtyFile = null;
  for (const line of dirty.split('\n')) {
    const fileMatch = /^\+\+\+ b\/(.+)$/.exec(line);
    if (fileMatch) {
      dirtyFile = STYLE_FILE.test(fileMatch[1]) ? fileMatch[1] : null;
      if (dirtyFile && !byFile.has(dirtyFile)) byFile.set(dirtyFile, new Set());
      continue;
    }
    if (!dirtyFile) continue;
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (!hunk) continue;
    const start = Number(hunk[1]);
    const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    for (let n = start; n < start + count; n++) byFile.get(dirtyFile).add(n);
  }

  return byFile;
}

const base = resolveBase();
const byFile = changedLines(base);
const files = [...byFile.keys()].filter((file) => byFile.get(file).size > 0);

console.log(`Stylelint, changed lines only — base ${base === EMPTY_TREE ? '(empty tree: every line is new)' : base.slice(0, 12)}`);

if (files.length === 0) {
  console.log('OK — this branch changed no .scss or .css lines.');
  process.exit(0);
}

const { results } = await stylelint.lint({ files, cwd: REPO_ROOT, formatter: 'json' });

let onChanged = 0;
let onUntouched = 0;
const reports = [];

for (const result of results) {
  const relative = result.source.replace(REPO_ROOT, '').replace(/\\/g, '/').replace(/^\//, '');
  const lines = byFile.get(relative) ?? new Set();
  for (const warning of result.warnings) {
    if (lines.has(warning.line)) {
      onChanged++;
      reports.push(`  ${relative}:${warning.line}:${warning.column}  ${warning.text}`);
    } else {
      onUntouched++;
    }
  }
}

console.log(`  files with changed style lines : ${files.length}`);
console.log(`  violations on changed lines    : ${onChanged}`);
console.log(`  pre-existing, left alone       : ${onUntouched}`);

if (onChanged) {
  console.error('\nFAIL — this branch introduced style violations:\n');
  for (const report of reports) console.error(report);
  console.error('\nEvery colour must be a `var(--al-…)` from the token layer, and every');
  console.error('custom property must be one that exists. See stylelint.config.mjs, and');
  console.error('`node scripts/build-root-llms.mjs` output for the real token set.');
  console.error('`npx stylelint <file> --fix` fixes what is mechanically fixable.');
  process.exit(1);
}

console.log('\nOK — no style violation on any line this branch changed.');
