#!/usr/bin/env node
/**
 * build-axe-baseline.mjs — turn a test-storybook run log into the axe baseline
 * table that the accessibility-remediation spec works from.
 *
 * Usage: node scripts/build-axe-baseline.mjs <clean-log-path> <out-md-path>
 *
 * The log must be ANSI-stripped output of
 *   pnpm --filter @southleft/al-web-components exec test-storybook --url http://localhost:PORT
 * run against a STATIC Storybook build. See the measurement note it emits.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [, , logPath, outPath] = process.argv;
if (!logPath || !outPath) {
  console.error('usage: build-axe-baseline.mjs <clean-log> <out.md>');
  process.exit(1);
}

const log = readFileSync(logPath, 'utf8');
const lines = log.split(/\r?\n/);

// axe rule ids as they appear in axe-playwright's detailed terminal table.
const RULE_IDS = [
  'list', 'listitem', 'aria-controls', 'aria-required-parent', 'aria-label',
  'aria-valid-attr-value', 'aria-roles', 'aria-current', 'aria-required-children',
  'aria-selected', 'aria-disabled', 'link-name', 'label', 'aria-input-field-name',
  'nested-interactive', 'aria-labelledby', 'aria-prohibited-attr', 'button-name',
];

const hist = {};
for (const id of RULE_IDS) {
  const matches = log.match(new RegExp(`\\b${id}\\b`, 'g'));
  if (matches) hist[id] = matches.length;
}

// Failing stories, grouped by the component suite that owns them.
const byComponent = new Map();
for (const line of lines) {
  const m = line.match(/●\s+(.+?)\s+›\s+(.+?)\s+›\s+(smoke-test|play-test)/);
  if (!m) continue;
  const comp = m[1].trim();
  if (!byComponent.has(comp)) byComponent.set(comp, new Set());
  byComponent.get(comp).add(m[2].trim());
}
const rows = [...byComponent.entries()].sort((a, b) => b[1].size - a[1].size);

// Totals straight from the jest summary line, so the doc cannot drift from the run.
const totals = log.match(/Tests:\s+(\d+) failed,\s+(\d+) passed,\s+(\d+) total/);
const suites = log.match(/Test Suites:\s+(\d+) failed,\s+(\d+) passed,\s+(\d+) total/);

const md = `# axe baseline — what \`continue-on-error: true\` was hiding

Captured ${new Date().toISOString().slice(0, 10)} by running \`test-storybook\` against a **static**
Storybook build (wcag2a + wcag2aa + wcag21a + wcag21aa; \`color-contrast\` disabled in
\`.storybook/test-runner.ts\`).

**Result: ${totals ? `${totals[2]} passed, ${totals[1]} failed, ${totals[3]} total` : 'see log'} — across ${
  suites ? `${suites[1]} of ${suites[3]}` : rows.length
} component suites.**

The workflow comment on the \`continue-on-error\` line claimed "3 pre-existing Lit warnings".
That was wrong by more than an order of magnitude, and wrong in kind: every one of these
failures is an axe-core violation (they all surface through axe-playwright's
\`testResultDependsOnViolations\`), not a Lit warning.

## Measurement note — read before re-running

Run the suite against a **static build on a dedicated port**. A Storybook dev server left
running on 6006 will silently absorb the run and produce a completely different number:
measured against dev, this same suite reports **323** failures, mostly 15s timeouts
(the icon stories took 47s to mount in dev versus 710ms static). Those extra ~229 failures
are an artifact of the dev server, not real defects.

## Violation rules, by occurrence across the run

| axe rule | occurrences |
|---|---|
${Object.entries(hist)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `| \`${k}\` | ${v} |`)
  .join('\n')}

The \`list\` / \`listitem\` / \`aria-required-parent\` / \`aria-required-children\` cluster dominates.
Those four are one structural problem wearing four names: a \`role=list\` whose children are not
\`listitem\` (or a \`listitem\` with no list parent), which in this library happens across a shadow
boundary when a component renders the list role itself and slots the items in. Expect to fix it
per-component in the template, not per-story with attributes.

## Failing suites, by number of failing stories

| component | failing stories |
|---|---|
${rows.map(([c, s]) => `| ${c} | ${s.size} |`).join('\n')}

---
_Regenerate:_ build the static Storybook, serve it on a free port, run
\`pnpm --filter @southleft/al-web-components exec test-storybook --url http://localhost:PORT\`,
strip ANSI from the log, then \`node scripts/build-axe-baseline.mjs <log> <out.md>\`.
`;

writeFileSync(outPath, md);
console.log(`wrote ${outPath}`);
console.log(`  rules: ${Object.keys(hist).length}, suites: ${rows.length}`);
