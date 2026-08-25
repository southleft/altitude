#!/usr/bin/env node
/**
 * Gate the accessibility report. `build-a11y-report.mjs` GENERATES; it does not
 * fail, by design — its job is to tell the truth including about the rule the
 * gate excludes. This is the half that fails a build.
 *
 * Two assertions, and the second is the one people forget:
 *
 *   structuralViolations — the WCAG 2 A/AA rules, minus `color-contrast`. That
 *     one is excluded deliberately: 18 components still fail it, tracked in
 *     accessibility-remediation, and failing here would turn the job red without
 *     fixing a single ratio. The docs panels use the same split.
 *
 *   storiesErrored — a story that would not render was measured as NOTHING, and
 *     nothing must never read as clean. This is the failure mode that makes an
 *     accessibility gate worthless: it passes loudest exactly when it measured
 *     least.
 *
 * Lives as a file rather than an inline `node -e` in the workflow so it can be
 * run and tested locally, and so no one has to escape a template literal through
 * YAML.
 *
 * Usage: node scripts/assert-a11y-clean.mjs <report.json>
 */
import { readFileSync } from 'node:fs';

const r = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const { structuralViolations: s, storiesErrored: e, stories, componentsMeasured: c } = r.totals;
console.log(`${stories} stories, ${c} components, ${s} structural, ${e} errored`);
if (e > 0) {
  console.error(`FAIL — ${e} story/stories failed to render; they were measured as nothing.`);
  process.exit(1);
}
if (s > 0) {
  console.error(`FAIL — ${s} structural axe violation(s).`);
  process.exit(1);
}
console.log('OK');
