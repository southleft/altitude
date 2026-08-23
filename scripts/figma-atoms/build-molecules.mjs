#!/usr/bin/env node
/**
 * build-molecules.mjs — delete-then-build every molecule page, one at a time.
 *
 *   node scripts/figma-atoms/build-molecules.mjs [key ...] [--keep]
 *
 * Sequential on purpose: the Desktop Bridge is a single channel, and the convention is
 * to verify one component before touching the next. `--keep` skips the delete pass so a
 * page that already looks right is left alone (build-page aborts on an existing page).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const MOLECULES = [
  'al-checkbox-group', 'al-radio-group',
  'al-breadcrumbs', 'al-menu', 'al-tabs', 'al-input', 'al-textarea',
  'al-input-stepper', 'al-range', 'al-empty-state', 'al-file-upload',
  'al-table', 'al-pagination', 'al-toggle-button-group', 'al-combobox'
];

const args = process.argv.slice(2);
const KEEP = args.includes('--keep');
const keys = args.filter((a) => !a.startsWith('--'));
const targets = keys.length ? keys : MOLECULES;

const run = (script, extra) => {
  try {
    return execFileSync(process.execPath, ['scripts/figma-atoms/' + script, ...extra], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 300000,
    });
  } catch (e) {
    return 'ERROR: ' + ((e.stdout || '') + (e.stderr || '') || e.message).slice(0, 300);
  }
};

const summary = [];
for (const key of targets) {
  const ops = JSON.parse(readFileSync(`.altitude/figma-sync/ops/${key}.json`, 'utf8'));
  const name = ops.name;
  if (!KEEP) run('delete-page.mjs', [name]);
  const out = run('build-page.mjs', [key]);
  let row;
  try {
    const o = JSON.parse(out);
    row = { name, variants: o.variants, missingVars: (o.missingVars || []).length, set: o.set };
  } catch {
    row = { name, error: out.trim().slice(0, 200) };
  }
  summary.push(row);
  console.log(row.error
    ? `${name.padEnd(18)} FAILED  ${row.error}`
    : `${name.padEnd(18)} variants=${String(row.variants).padStart(3)}  missingVars=${row.missingVars}  ${row.set}`);
}

const bad = summary.filter((r) => r.error || r.missingVars);
console.log(`\n${summary.length} built, ${bad.length} with problems`);
