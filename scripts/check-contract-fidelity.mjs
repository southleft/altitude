#!/usr/bin/env node
/**
 * check-contract-fidelity.mjs — is a contract a faithful enough description of
 * its component to REBUILD it?
 *
 * Written 2026-08-29, the day a regeneration sweep replaced good Figma sets
 * with bare boxes. The sweep was preceded by a careful comparison — of variant
 * counts and axis names. Every one of those matched. What nobody compared was
 * whether the contract still described a component worth rebuilding, and the
 * answer for much of the library is no: al-progress generated a frame with
 * ZERO children because its contract records a 0-wide root.
 *
 * Two signals, deliberately weighted differently, because one is a fact and
 * the other is a judgement.
 *
 * 1. ZERO-WIDTH ROOT — gated.
 *    `anatomy.root.box.w === 0` is not a small box; it is the absence of a
 *    measurement. It happens to every `width: 100%` / `flex: 1` component
 *    measured in an unconstrained harness (the repair skill's trap 12), and
 *    generating from one CANNOT produce anything but a degenerate set. There
 *    is no false positive to weigh: 0 means nothing was measured.
 *
 * 2. STRUCTURE SHORTFALL — reported, never gated.
 *    The contract's anatomy node count against what the docs actually render.
 *    A large gap means the contract cannot reproduce the component's insides.
 *    It is NOT gated because the number is genuinely noisy: a docs page mounts
 *    a realistic composition (al-list renders many items, al-tabs renders its
 *    panels), so the page legitimately has more nodes than one component's
 *    anatomy. Gating on it would be the eleven-false-positive lesson all over
 *    again. It is ranked and printed so a human can read it.
 *
 * Ground truth comes from `capture-docs.mjs` — every component, every variant,
 * from the real docs. Without that index this check cannot run, and it says so
 * rather than passing vacuously.
 *
 * Usage:
 *   pnpm run capture:docs            # produce the ground truth first
 *   node scripts/check-contract-fidelity.mjs [--project <id>] [--component <tag>] [--json]
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { resolveProject } from '../libs/altitude-mcp/src/lib/ds-project.mjs';

const argOf = (flag, dflt = null) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const JSON_OUT = process.argv.includes('--json');
const ONLY = argOf('--component', null);

const project = resolveProject();
const contractsDir = join(project.resolved.contractsDir ?? join(process.cwd(), '.altitude', 'contracts', project.id));
const shotsIndex = join(project.resolved.figmaSyncDir, 'shots', 'docs', 'index.json');

if (!existsSync(shotsIndex)) {
  console.error(`[fidelity] no docs ground truth at ${shotsIndex}`);
  console.error('Capture it first:  pnpm run capture:docs   (needs the docs served — see the script header)');
  process.exit(1);
}

/** The richest successful shot per component is the best evidence of what the
 * component really renders; a variant that paints less is not evidence of a
 * thinner component. */
function bestBySlug() {
  const idx = JSON.parse(readFileSync(shotsIndex, 'utf8'));
  const best = new Map();
  for (const e of idx.entries ?? []) {
    if (!e.file || !e.rendered) continue;
    const prev = best.get(e.slug);
    if (!prev || e.rendered.els > prev.rendered.els) best.set(e.slug, e);
  }
  return best;
}

const countNodes = (n) => (n ? 1 + (n.children ?? []).reduce((a, c) => a + countNodes(c), 0) : 0);

const best = bestBySlug();
const rows = [];
for (const f of readdirSync(contractsDir).filter((x) => x.endsWith('.contract.json')).sort()) {
  const c = JSON.parse(readFileSync(join(contractsDir, f), 'utf8'));
  if (ONLY && c.id !== ONLY) continue;
  const slug = c.id.replace(/^al-/, '');
  const docs = best.get(slug);
  const root = c.anatomy?.root ?? c.anatomy ?? null;
  const box = root?.box ?? { w: 0, h: 0 };
  rows.push({
    tag: c.id,
    // 'measured' vs 'unavailable' is the whole distinction. A MEASURED root
    // that came out zero-wide is trap 12 — the measurement ran and returned
    // nothing usable. An UNAVAILABLE one was never measured at all (usually
    // no plan.mjs entry, or a brand-only component outside this project).
    // Both block generation, for completely different reasons and with
    // completely different fixes, so they are never reported as one number.
    anatomySource: c.anatomySource ?? 'unknown',
    hasAnatomy: !!root,
    // Subtract the root itself so this counts CHILDREN, the same thing the
    // docs walk counts.
    contractNodes: Math.max(countNodes(root) - 1, 0),
    docsNodes: docs?.rendered?.els ?? null,
    contractW: box.w ?? 0,
    contractH: box.h ?? 0,
    docsW: docs?.w ?? null,
    docsH: docs?.h ?? null,
    hasDocsEvidence: !!docs,
  });
}

// Gated ONLY where the docs prove the component really does render with a
// width. A zero-width contract for something with no docs evidence (every
// al-icon-*, an SVG wrapper that is never generated as a set) is not
// actionable, and gating on it would bury the real ones under false alarms —
// this repo's own eleven-false-positive lesson.
// MEASURED but zero: the measurement ran and produced nothing usable (trap
// 12). Gated where the docs prove the component really renders with a width.
const zeroWidth = rows.filter((r) => r.anatomySource === 'measured' && !r.contractW && r.hasDocsEvidence && r.docsW >= 1);
const zeroWidthUnjudged = rows.filter((r) => r.anatomySource === 'measured' && !r.contractW && !(r.hasDocsEvidence && r.docsW >= 1));
// NEVER measured: no anatomy to be zero. A different defect with a different
// fix (give it a plan.mjs entry), reported separately so it can never be
// mistaken for the one above.
const noAnatomy = rows.filter((r) => r.anatomySource !== 'measured' || !r.hasAnatomy);
const withEvidence = rows.filter((r) => r.hasDocsEvidence);
const shortfall = withEvidence
  .filter((r) => r.docsNodes - r.contractNodes >= 3)
  .sort((a, b) => (b.docsNodes - b.contractNodes) - (a.docsNodes - a.contractNodes));
const noEvidence = rows.filter((r) => !r.hasDocsEvidence);

if (JSON_OUT) {
  console.log(JSON.stringify({ project: project.id, rows, zeroWidth: zeroWidth.map((r) => r.tag), shortfall: shortfall.map((r) => r.tag) }, null, 2));
  process.exit(zeroWidth.length ? 1 : 0);
}

const pad = (s, n) => String(s).padEnd(n);

console.log(`[fidelity] ${rows.length} contract(s) for project "${project.id}", ${withEvidence.length} with docs evidence`);

if (zeroWidth.length) {
  console.log(`\nZERO-WIDTH ROOT — the contract records no measurement, so generation cannot be faithful (${zeroWidth.length}):`);
  for (const r of zeroWidth) {
    console.log('  ' + pad(r.tag, 24) + 'contract ' + pad(r.contractW + 'x' + r.contractH, 10) + (r.docsW != null ? 'docs ' + r.docsW + 'x' + r.docsH : 'docs (no evidence)'));
  }
  console.log('  Cause is almost always a width:100% / flex:1 component measured in an unconstrained');
  console.log('  harness (repair skill trap 12). Fix the measurement harness width, re-measure, then');
  console.log('  re-derive — do NOT hand-edit the contract; it is derived.');
}

if (shortfall.length) {
  console.log(`\nSTRUCTURE SHORTFALL — contract anatomy thinner than what the docs render (${shortfall.length}, reported only):`);
  console.log('  ' + pad('component', 24) + pad('contract', 10) + pad('docs', 8) + 'gap');
  for (const r of shortfall.slice(0, 20)) {
    console.log('  ' + pad(r.tag, 24) + pad(r.contractNodes, 10) + pad(r.docsNodes, 8) + (r.docsNodes - r.contractNodes));
  }
  if (shortfall.length > 20) console.log(`  ... ${shortfall.length - 20} more`);
  console.log('  NOT a gate: a docs page mounts a realistic composition, so it legitimately renders more');
  console.log('  nodes than one component\'s anatomy. Read it as a ranking of which contracts are');
  console.log('  furthest from describing their component, not as a list of defects.');
}

if (noAnatomy.length) {
  const withDocs = noAnatomy.filter((r) => r.hasDocsEvidence && r.docsW >= 1);
  console.log(`
NO ANATOMY — never measured, so there is nothing to generate from (${noAnatomy.length}):`);
  for (const r of withDocs) {
    console.log('  ' + pad(r.tag, 24) + pad('anatomySource=' + r.anatomySource, 28) + 'docs render ' + r.docsW + 'x' + r.docsH);
  }
  if (withDocs.length !== noAnatomy.length) {
    console.log(`  (+${noAnatomy.length - withDocs.length} with no docs evidence either: ${noAnatomy.filter((r) => !(r.hasDocsEvidence && r.docsW >= 1)).map((r) => r.tag).join(', ')})`);
  }
  console.log('  These need a plan.mjs entry with real cases and slots before they can be measured');
  console.log('  at all. Distinct from the zero-width group above: nothing measured them, so there is');
  console.log('  no bad number to fix — there is no number.');
}

if (zeroWidthUnjudged.length) {
  console.log(`
ZERO-WIDTH but NOT judged (${zeroWidthUnjudged.length}) — no docs evidence they render with a width.`);
  console.log(`  al-icon-* are SVG wrappers and are never generated as sets: ${zeroWidthUnjudged.map((r) => r.tag).join(', ')}`);
}

if (noEvidence.length) {
  console.log(`\nNO DOCS EVIDENCE (${noEvidence.length}) — not judged either way: ${noEvidence.map((r) => r.tag).join(', ')}`);
}

if (zeroWidth.length) {
  console.error(`\n[fidelity] FAIL — ${zeroWidth.length} contract(s) carry a zero-width root. Generating any of them into Figma produces a degenerate set.`);
  process.exit(1);
}
console.log('\n[fidelity] PASS — every contract carries a measured root box.');
