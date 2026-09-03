#!/usr/bin/env node
/**
 * Context budget: how much an agent must READ before it may start work.
 *
 * The problem this measures. Every gate in this repo watches an artifact the
 * repo PRODUCES — bundle bytes, token counts, vocabulary violations. Nothing
 * watched the input side, so the instructions grew monotonically: each session
 * that lost an hour to a trap wrote the trap down, and nobody ever took one
 * out. A 2026-09-02 audit found the four Figma skills at ~11,900 words with the
 * same trap told in as many as nine places, and named the state exactly:
 * "crossed from asset into scar tissue". A skill that costs more to read than
 * the mistake costs to make is a net loss, and no per-file review can see that
 * — only a whole-read-path tabulation can.
 *
 * So this counts the words on the READ PATHS an agent actually takes, and
 * ratchets them. The paths are declared in READ_PATHS below, and each one is a
 * real sequence a session performs before its first action, not a directory:
 *
 *   always-loaded    CLAUDE.md + .claude/CLAUDE.md — read on EVERY turn of
 *                    every session, so a word here is the most expensive word
 *                    in the repository.
 *   figma-generate   the above, plus AGENTS.md, the generate skill,
 *                    FIGMA-CLEANLINESS.md (binding) and COVERAGE.md (read
 *                    FIRST, per the skill) — everything CLAUDE.md § "Figma
 *                    work" requires before a single component is generated.
 *
 * TWO-WAY RATCHET, deliberately, following scripts/check-api-vocabulary.mjs:
 *
 *   1. ABOVE the pin fails. A PR may not make the read path longer. There is
 *      no tolerance on this side and no size at which growth is acceptable.
 *   2. BELOW the pin, by more than `slack`, ALSO fails, and says to run
 *      --update. A ratchet that only notices increases is a ratchet that never
 *      moves: somebody compresses a skill, leaves the ceiling where it was, and
 *      has silently bought back the slack for the next person to spend. That is
 *      how this repo's coverage ratchet got seeded once and never turned.
 *
 * `slack` is the only tolerance, it applies to the DOWN side only, and it
 * exists so a typo fix does not red the build. It is stored in the baseline, so
 * it is a reviewable number rather than a constant buried here.
 *
 * A WORD is a whitespace-separated token of the file as an agent receives it —
 * frontmatter, code fences and tables included, because the agent reads those
 * too. Deliberately not a token count: tokenizers are model- and version-
 * specific, and a gate whose number moves when a vendor ships a new tokenizer
 * is measuring the vendor, not the repo.
 *
 * Usage:
 *   node scripts/check-context-budget.mjs            # check only
 *   node scripts/check-context-budget.mjs --report   # per-file breakdown
 *   node scripts/check-context-budget.mjs --update   # re-pin after a reduction
 *   node scripts/check-context-budget.mjs --json     # machine-readable
 *
 * Overrides (used by the self-test to point at a throwaway repo):
 *   --root <dir> --baseline <file>
 *
 * Exit codes: 0 pass · 1 over/under the pin · 2 could not measure.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const HELP = `Usage: node scripts/check-context-budget.mjs [options]

  --report          print the per-file breakdown for every read path and exit
  --json            emit the machine-readable report on stdout
  --update          re-pin the ratchet to the measured totals; required after
                    a deliberate reduction (or a justified rise)
  --root <dir>      repo root (default: the repo this script lives in)
  --baseline <file> ratchet baseline path
  --help            this text

Exit codes: 0 pass · 1 over/under the pin · 2 could not measure.
`;

/**
 * The read paths. Order is the order an agent reads them, and every entry is
 * mandatory on that path — an optional "see also" is not a budget item, because
 * the agent does not have to read it before acting.
 *
 * Adding a file here is a real decision: it says a session cannot start without
 * it. The baseline records the list, so growing it shows up as a named diff
 * rather than as an unexplained jump in a total.
 */
export const READ_PATHS = {
  'always-loaded': {
    why: 'read on every turn of every session — the most expensive words in the repo',
    files: ['CLAUDE.md', '.claude/CLAUDE.md'],
  },
  'figma-generate': {
    why: 'everything CLAUDE.md § "Figma work" requires before generating one component',
    files: [
      'CLAUDE.md',
      '.claude/CLAUDE.md',
      'AGENTS.md',
      '.claude/skills/altitude-figma-generate/SKILL.md',
      '.altitude/FIGMA-CLEANLINESS.md',
      '.altitude/contracts/COVERAGE.md',
    ],
  },
};

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const [k, inline] = a.replace(/^--/, '').split('=');
    if (inline !== undefined) {
      out[k] = inline;
    } else {
      out[k] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    }
  }
  return out;
}

function die(message) {
  console.error(`context-budget: ${message}`);
  process.exit(2);
}

/**
 * Words in a file as an agent receives it.
 *
 * No stripping of frontmatter, fences or tables: the agent pays for those. The
 * only normalization is the newline family, so a CRLF checkout and an LF one
 * measure the same — this repo is developed on Windows and gated on Linux, and
 * a baseline that disagreed across platforms would be unsatisfiable from one of
 * them (the same failure `.gitattributes` had to fix for the bundle baseline).
 */
export function countWords(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * The slack a fresh pin gets, on the DOWN side only: 1% of the path, floored at
 * 20 words so a typo fix cannot red the build, and capped at 10% of the path so
 * the floor cannot swallow a short one whole. Without the cap a 10-word path
 * would carry 20 words of tolerance — a ratchet with more slack than travel.
 */
export function defaultSlack(total) {
  return Math.max(0, Math.min(Math.max(20, Math.round(total * 0.01)), Math.floor(total * 0.1)));
}

export function measure(root, paths = READ_PATHS) {
  const result = {};
  const missing = [];
  for (const [name, def] of Object.entries(paths)) {
    const files = [];
    for (const rel of def.files) {
      const abs = join(root, rel);
      if (!existsSync(abs)) {
        missing.push(`${name}: ${rel}`);
        continue;
      }
      files.push({ file: rel, words: countWords(readFileSync(abs, 'utf8')) });
    }
    result[name] = {
      why: def.why,
      files,
      total: files.reduce((n, f) => n + f.words, 0),
    };
  }
  return { result, missing };
}

// ---------------------------------------------------------------------------

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  console.log(HELP);
  process.exit(0);
}

const ROOT = resolve(options.root === true || !options.root ? resolve(HERE, '..') : options.root);
const BASELINE = resolve(
  options.baseline && options.baseline !== true
    ? options.baseline
    : join(ROOT, '.altitude/baselines/context-budget.json')
);

const { result: measured, missing } = measure(ROOT);

// Silence is the only forbidden failure: a read path with a file that is not
// there has not been measured, and reporting a smaller number for it would be
// worse than reporting nothing.
if (missing.length) {
  die(
    `${missing.length} declared read-path file(s) are not on disk — cannot measure:\n  ` +
      missing.join('\n  ') +
      '\nEither the file moved (fix READ_PATHS) or the checkout is incomplete.'
  );
}

const report = {
  root: ROOT,
  paths: measured,
};

if (options.report) {
  console.log('Altitude — agent context budget\n');
  for (const [name, path] of Object.entries(measured)) {
    console.log(`  ${name}  —  ${path.why}`);
    for (const f of path.files) {
      console.log(`    ${String(f.words).padStart(6)}  ${f.file}`);
    }
    console.log(`    ${String(path.total).padStart(6)}  TOTAL\n`);
  }
  if (existsSync(BASELINE)) {
    const base = JSON.parse(readFileSync(BASELINE, 'utf8'));
    console.log('  against the pin:');
    for (const [name, path] of Object.entries(measured)) {
      const pinned = base.paths?.[name];
      if (!pinned) {
        console.log(`    ${name.padEnd(16)} (not pinned yet)`);
        continue;
      }
      const delta = path.total - pinned.words;
      const sign = delta > 0 ? '+' : '';
      console.log(`    ${name.padEnd(16)} ${String(path.total).padStart(6)} vs ${String(pinned.words).padStart(6)}  ${sign}${delta}`);
    }
  } else {
    console.log('  (no baseline yet — run without --report to seed one)');
  }
  if (options.json) console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
function serializeBaseline(note) {
  const paths = {};
  for (const [name, path] of Object.entries(measured)) {
    paths[name] = {
      why: path.why,
      files: path.files.map((f) => f.file),
      words: path.total,
      slack: defaultSlack(path.total),
    };
  }
  return `${JSON.stringify(
    {
      $comment:
        'Pinned by scripts/check-context-budget.mjs. `words` is a CEILING an agent read path may not exceed, and dropping more than `slack` below it also fails so the ratchet actually turns. Re-pin with --update, in the same PR as the change that earned it.',
      updated: new Date().toISOString(),
      note,
      paths,
    },
    null,
    2
  )}\n`;
}

if (!existsSync(BASELINE)) {
  mkdirSync(dirname(BASELINE), { recursive: true });
  writeFileSync(BASELINE, serializeBaseline('seeded'));
  console.log(`context-budget: seeded baseline at ${BASELINE}`);
  for (const [name, path] of Object.entries(measured)) console.log(`  ${String(path.total).padStart(6)}  ${name}`);
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
} catch (error) {
  die(`baseline at ${BASELINE} is not valid JSON — ${error.message}`);
}

// ---------------------------------------------------------------------------
// Gate
// ---------------------------------------------------------------------------
const problems = [];

for (const [name, path] of Object.entries(measured)) {
  const pinned = baseline.paths?.[name];
  if (!pinned) {
    problems.push({
      path: name,
      kind: 'unpinned-path',
      detail: `read path \`${name}\` is declared in READ_PATHS but not in the baseline. Run --update to pin it.`,
    });
    continue;
  }

  // The file LIST is part of the measurement. A path that quietly gained a
  // mandatory file would otherwise read as an unexplained jump in a total.
  const was = (pinned.files ?? []).join('|');
  const now = path.files.map((f) => f.file).join('|');
  if (was !== now) {
    problems.push({
      path: name,
      kind: 'read-path-changed',
      detail: `the files on \`${name}\` changed.\n      pinned:   ${pinned.files.join(', ')}\n      measured: ${path.files.map((f) => f.file).join(', ')}\n      Adding a file here says a session cannot start without it. Justify it, then --update.`,
    });
    continue;
  }

  const slack = pinned.slack ?? 0;
  if (path.total > pinned.words) {
    problems.push({
      path: name,
      kind: 'over-budget',
      detail: `${pinned.words} -> ${path.total} words (+${path.total - pinned.words}). A PR may not lengthen an agent's read path. Compress somewhere on this path, or justify the rise and re-pin with --update.`,
    });
  } else if (path.total < pinned.words - slack) {
    problems.push({
      path: name,
      kind: 'ratchet-not-turned',
      detail: `${pinned.words} -> ${path.total} words (-${pinned.words - path.total}, slack ${slack}), but the ceiling is still ${pinned.words}. Something was compressed and the ratchet was not turned; the slack would silently permit a future regression. Run:\n        node scripts/check-context-budget.mjs --update`,
    });
  }
}

if (options.json) {
  console.log(JSON.stringify({ ...report, baseline: baseline.paths, problems }, null, 2));
  process.exit(problems.length ? 1 : 0);
}

if (options.update) {
  writeFileSync(
    BASELINE,
    serializeBaseline(
      Object.entries(measured)
        .map(([name, path]) => `${name}: ${baseline.paths?.[name]?.words ?? '-'} -> ${path.total}`)
        .join('; ')
    )
  );
  console.log('context-budget: re-pinned.');
  for (const [name, path] of Object.entries(measured)) {
    const before = baseline.paths?.[name]?.words;
    console.log(`  ${name.padEnd(16)} ${before === undefined ? 'new' : before} -> ${path.total}`);
  }
  process.exit(0);
}

console.log('Altitude — agent context budget');
for (const [name, path] of Object.entries(measured)) {
  const pinned = baseline.paths?.[name];
  const at = pinned ? `${path.total} / ${pinned.words}` : `${path.total} / (unpinned)`;
  console.log(`  ${name.padEnd(16)} ${at} words`);
}

if (problems.length) {
  console.error(`\nFAIL — ${problems.length} read path(s) off the pin:`);
  for (const p of problems) console.error(`  ${p.path}  [${p.kind}]\n      ${p.detail}`);
  process.exit(1);
}

console.log('\nOK — every read path is at or just under its pin.');
