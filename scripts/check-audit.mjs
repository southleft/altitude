#!/usr/bin/env node
/**
 * check-audit.mjs — dependency-vulnerability gate.
 *
 * WHY IT IS SCOPED RATHER THAN `pnpm audit` VERBATIM:
 * a bare `pnpm audit` on this workspace reports ~70 advisories (37 high). Almost
 * all of them are dev tooling — vite/esbuild dev-server issues, webpack-dev-server,
 * the MCP server's transitive express stack, a fixture app's router. None of that
 * reaches a consumer of the design system. A gate that fails on all 70 would be
 * turned off within a week, which is how repos end up with `continue-on-error`.
 *
 * So this gate has two tiers, and both can actually fail:
 *
 *   SHIPPED (fatal at `high`): advisories whose dependency path runs through
 *     al-web-components or al-react — the two packages that get published. Code
 *     here lands in consumers' apps. This tier is currently EMPTY and the gate
 *     exists to keep it that way. (It was not empty before: nanoid, a direct
 *     runtime dependency of al-web-components used for ARIA id generation,
 *     carried a high advisory until it was bumped to 5.1.16.)
 *
 *   WORKSPACE (fatal at `critical`): everything else in the production graph —
 *     dev servers, the MCP host, fixture apps. Only a critical is worth stopping
 *     a build for here; anything lower is reported and left visible.
 *
 * Accepted risks go in `.altitude/audit-allowlist.json` with a reason and an
 * expiry date, so an exception is a dated decision rather than a silent hole.
 * An entry past its expiry fails the gate on purpose.
 *
 * Usage: node scripts/check-audit.mjs   (pnpm run check:audit)
 *        --json   emit the raw parsed summary instead of the report
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ALLOWLIST_PATH = join(REPO_ROOT, '.altitude', 'audit-allowlist.json');

/** Packages that are actually published. A vulnerability here reaches consumers. */
const PUBLISHED = ['al-web-components', 'al-react'];

const RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };
const SHIPPED_FATAL_AT = RANK.high;
const WORKSPACE_FATAL_AT = RANK.critical;

// ---------------------------------------------------------------- run audit
let audit;
try {
  // `pnpm audit` exits non-zero when it finds anything, so failure here is
  // expected and the output is still what we want. Only a parse failure is real.
  const raw = execFileSync('pnpm', ['audit', '--prod', '--json'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
    shell: process.platform === 'win32',
  });
  audit = JSON.parse(raw);
} catch (err) {
  if (err.stdout) {
    try {
      audit = JSON.parse(err.stdout);
    } catch {
      console.error(`check-audit: pnpm audit produced unparseable output: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.error(`check-audit: could not run pnpm audit: ${err.message}`);
    process.exit(1);
  }
}

// ------------------------------------------------------------- allowlist
let allowlist = { accepted: [] };
if (existsSync(ALLOWLIST_PATH)) {
  try {
    allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
  } catch (err) {
    console.error(`check-audit: ${ALLOWLIST_PATH} does not parse: ${err.message}`);
    process.exit(1);
  }
}
const today = new Date().toISOString().slice(0, 10);
const acceptedById = new Map();
const expired = [];
for (const entry of allowlist.accepted ?? []) {
  if (!entry.id || !entry.reason || !entry.expires) {
    console.error(
      `check-audit: allowlist entry ${JSON.stringify(entry)} needs id, reason and expires`,
    );
    process.exit(1);
  }
  if (entry.expires < today) expired.push(entry);
  else acceptedById.set(String(entry.id), entry);
}

// ------------------------------------------------------------- classify
const advisories = Object.values(audit.advisories ?? {});
const shipped = [];
const workspace = [];

for (const adv of advisories) {
  const paths = (adv.findings ?? []).flatMap((f) => f.paths ?? []);
  const hitsPublished = paths.some((p) =>
    PUBLISHED.some((pkg) => p.includes(`libs/${pkg}`) || p.includes(`libs\\${pkg}`) || p.includes(`${pkg}@link`)),
  );
  const row = {
    id: String(adv.github_advisory_id ?? adv.id ?? adv.module_name),
    module: adv.module_name,
    severity: adv.severity,
    title: adv.title,
    vulnerable: adv.vulnerable_versions,
    patched: adv.patched_versions,
    samplePath: paths[0] ?? '(unknown path)',
  };
  (hitsPublished ? shipped : workspace).push(row);
}

// ------------------------------------------------------------- report
const fmt = (r) =>
  `  [${r.severity}] ${r.module} — ${String(r.title).slice(0, 72)}\n` +
  `      patched: ${r.patched ?? 'none'}  |  via ${r.samplePath}`;

console.log('check-audit: production dependency graph\n');
console.log(`SHIPPED (published packages: ${PUBLISHED.join(', ')})`);
if (shipped.length === 0) {
  console.log('  none — nothing known-vulnerable reaches consumers.\n');
} else {
  shipped.forEach((r) => console.log(fmt(r)));
  console.log('');
}
console.log(`WORKSPACE (dev servers, MCP host, fixture apps): ${workspace.length} advisory(ies)`);
const counts = workspace.reduce((acc, r) => ((acc[r.severity] = (acc[r.severity] ?? 0) + 1), acc), {});
console.log(`  ${JSON.stringify(counts)}\n`);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ shipped, workspace }, null, 2));
}

// ------------------------------------------------------------- verdict
const failures = [];

for (const r of shipped) {
  if (RANK[r.severity] >= SHIPPED_FATAL_AT && !acceptedById.has(r.id)) {
    failures.push(`SHIPPED ${r.severity} in ${r.module} (${r.id}) — reaches published consumers`);
  }
}
for (const r of workspace) {
  if (RANK[r.severity] >= WORKSPACE_FATAL_AT && !acceptedById.has(r.id)) {
    failures.push(`WORKSPACE ${r.severity} in ${r.module} (${r.id})`);
  }
}
for (const e of expired) {
  failures.push(`allowlist entry ${e.id} expired on ${e.expires} — re-assess or re-date it`);
}

if (failures.length > 0) {
  console.error(`check-audit: FAIL — ${failures.length} blocking issue(s)\n`);
  failures.forEach((f) => console.error(`  ${f}`));
  console.error(
    `\nFix the dependency, or record a dated exception in\n` +
      `.altitude/audit-allowlist.json: { "id", "reason", "expires": "YYYY-MM-DD" }\n`,
  );
  process.exit(1);
}

console.log('check-audit: PASS — no blocking advisories.');
