#!/usr/bin/env node
/**
 * T3.4 — Contract validator.
 *
 * For each component schema under `libs/al-web-components/schemas/`,
 * validates a fixture instance and prints PASS/FAIL.
 *
 * Today the fixture is a deliberately-invalid synthetic instance from
 * `tests/contract-fixtures/`, plus a deliberately-valid one. CI uses this to
 * confirm the validator behaves: invalid fails, valid passes. T3.5 will
 * extend the validator to actually load Storybook examples and check them.
 *
 * Acceptance per plan: "validator fails on a deliberately-invalid fixture
 * and passes on a valid one."
 *
 * Exit codes:
 *   0 — all valid fixtures passed, all invalid fixtures correctly rejected
 *   1 — at least one mismatch
 *   2 — internal error
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const SCHEMA_DIR = path.join(REPO, 'libs/al-web-components/schemas');
const FIXTURE_DIR = path.join(REPO, 'tests/contract-fixtures');

let Ajv;
try {
  Ajv = require('ajv');
} catch {
  console.error('[contracts] ajv not installed at repo root. Install: yarn add -D -W ajv');
  process.exit(2);
}

function loadSchemas() {
  const out = new Map();
  if (!fs.existsSync(SCHEMA_DIR)) return out;
  for (const f of fs.readdirSync(SCHEMA_DIR)) {
    if (!f.endsWith('.schema.json')) continue;
    const schema = JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, f), 'utf8'));
    out.set(schema.altitude.tagName, schema);
  }
  return out;
}

function loadFixtures() {
  if (!fs.existsSync(FIXTURE_DIR)) return [];
  const out = [];
  for (const f of fs.readdirSync(FIXTURE_DIR)) {
    if (!f.endsWith('.json')) continue;
    const data = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, f), 'utf8'));
    out.push({ file: f, ...data });
  }
  return out;
}

function main() {
  const schemas = loadSchemas();
  const fixtures = loadFixtures();
  if (!schemas.size) {
    console.error('[contracts] no schemas found at', SCHEMA_DIR);
    process.exit(2);
  }
  if (!fixtures.length) {
    console.error('[contracts] no fixtures found at', FIXTURE_DIR);
    process.exit(2);
  }

  const ajv = new Ajv({ strict: false, allErrors: true });
  let mismatches = 0;
  let passes = 0;
  for (const fx of fixtures) {
    const schema = schemas.get(fx.instance?.tagName);
    if (!schema) {
      console.error(`[contracts] FAIL — fixture ${fx.file} references unknown tag '${fx.instance?.tagName}'`);
      mismatches++;
      continue;
    }
    const validate = ajv.compile(schema);
    const valid = validate(fx.instance);
    const expected = fx.expected === 'valid';
    if (valid === expected) {
      console.log(`[contracts] OK    — ${fx.file} (${fx.expected}) ${valid ? 'passed' : 'rejected'}`);
      passes++;
    } else {
      console.error(`[contracts] FAIL — ${fx.file} expected ${fx.expected} but got ${valid ? 'valid' : 'invalid'}`);
      if (validate.errors) for (const e of validate.errors) console.error(`    ${e.instancePath}: ${e.message}`);
      mismatches++;
    }
  }

  if (mismatches === 0) {
    console.log(`[contracts] PASS — ${passes}/${fixtures.length} fixtures behaved as declared.`);
    process.exit(0);
  }
  console.error(`[contracts] FAIL — ${mismatches}/${fixtures.length} fixtures diverged.`);
  process.exit(1);
}

main();
