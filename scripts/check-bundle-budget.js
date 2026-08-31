#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const BASELINE = path.join(REPO, '.altitude/baselines/bundle/snapshot.json');
const BUDGET = path.join(REPO, '.altitude/bundle-budget.json');
const PACKAGES = ['al-web-components', 'al-react'];

function loadBudget() {
  if (fs.existsSync(BUDGET)) return JSON.parse(fs.readFileSync(BUDGET, 'utf8'));
  return { totalDriftRatio: 0.10, perFileDriftRatio: 0.25 };
}

function walk(root) {
  if (!fs.existsSync(root)) return [];
  const out = [];
  for (const name of fs.readdirSync(root)) {
    if (name.startsWith('.')) continue;
    const p = path.join(root, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      // POSIX-join: baseline keys are POSIX, so `path.join` would produce
      // backslashes on Windows and miss every per-file lookup below.
      for (const c of walk(p)) out.push(`${name}/${c}`);
    } else {
      out.push(name);
    }
  }
  return out.sort();
}

function pct(x) { return (x * 100).toFixed(2); }
function kb(x) { return (x / 1024).toFixed(0); }

function main() {
  if (!fs.existsSync(BASELINE)) {
    console.error('[bundle-budget] missing baseline; run yarn baselines:capture first.');
    process.exit(2);
  }
  const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  const budget = loadBudget();
  const violations = [];
  let totalBefore = 0;
  let totalAfter = 0;
  for (const pkg of PACKAGES) {
    const distRoot = path.join(REPO, 'libs', pkg, 'dist');
    const baseEntry = baseline.packages && baseline.packages[pkg];
    if (!baseEntry) continue;
    totalBefore += baseEntry.totalBytes;
    let after = 0;
    for (const rel of walk(distRoot)) {
      const p = path.join(distRoot, rel);
      const st = fs.statSync(p);
      after += st.size;
      const baseSize = baseEntry.files && baseEntry.files[rel];
      if (baseSize !== undefined) {
        const drift = (st.size - baseSize) / Math.max(baseSize, 1);
        if (drift > budget.perFileDriftRatio) {
          violations.push({ pkg: pkg, rel: rel, before: baseSize, after: st.size, drift: drift });
        }
      }
    }
    totalAfter += after;
  }
  const totalDrift = (totalAfter - totalBefore) / Math.max(totalBefore, 1);
  console.log('[bundle-budget] total: ' + kb(totalBefore) + 'KB -> ' + kb(totalAfter) + 'KB (' + pct(totalDrift) + '%)');
  let failed = false;
  if (totalDrift > budget.totalDriftRatio) {
    console.error('[bundle-budget] FAIL: total bundle grew ' + pct(totalDrift) + '% (ceiling ' + pct(budget.totalDriftRatio) + '%).');
    failed = true;
  }
  if (violations.length) {
    console.error('[bundle-budget] FAIL: ' + violations.length + ' per-file violation(s):');
    for (const v of violations.slice(0, 10)) {
      console.error('  ' + v.pkg + '/' + v.rel + ': ' + (v.before/1024).toFixed(1) + 'KB -> ' + (v.after/1024).toFixed(1) + 'KB (' + pct(v.drift) + '%)');
    }
    failed = true;
  }
  if (failed) process.exit(1);
  console.log('[bundle-budget] PASS: within budget.');
}

main();
