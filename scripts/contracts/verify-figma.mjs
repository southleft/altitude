#!/usr/bin/env node
/**
 * verify-figma.mjs — the NUMERIC verification bookend (spec
 * 2026-08-28-visual-bookends-for-generation T3/T4).
 *
 * Compares a GENERATED Figma build against the MEASURED ground truth it was
 * built from — bounding boxes, not pixels (font rasterization differs between
 * Chromium and Figma; images are evidence, numbers are the gate). Output is a
 * structured report meant to be read by an agent or human and triaged per the
 * three-layer discipline: each miss is a generic-rule gap, a missing
 * measurement fact, or a curation need — never a hand-edit on canvas.
 *
 * v1 scope: SNIPPET builds (page sections). The measured side is
 * <syncDir>/<source>-<mode>.json from measure-page.mjs; the Figma side is the
 * "<Set Name> — Generated" set's first variant, walked live over the shim.
 *
 * Usage:
 *   node scripts/contracts/verify-figma.mjs --section hero --project southleft \
 *     [--mode dark] [--source page] [--route /] [--page "Site Sections"] [--tolerance-px 3]
 *
 * Matching: both trees are walked in lockstep. The measured tree first drops
 * the nodes the builder itself skips (sr-only <=2px boxes; content-less
 * structural leaves), then children pair positionally. Pairing is reported in
 * every row, so a pairing slip is visible rather than silently poisoning the
 * numbers.
 *
 * Report: <syncDir>/verify/<section>-verify.json + console summary. Exit 1
 * when any node exceeds tolerance, so it can gate.
 *
 * BEYOND GEOMETRY (T4, spec 2026-08-29-parity-judgement-gates-and-evals).
 * This compared bounding boxes and NOTHING else, and visual-compare.mjs
 * captured PNG pairs and compared nothing at all — so colour, glyph identity
 * and label text had no gate anywhere in the repo. A set could be built in the
 * wrong colour, with the wrong words in it, and pass every check; the only
 * thing standing there was a human flipping through screenshots, which the
 * snippet skill's own trap 9 records going wrong ("Perception is not a
 * comparator").
 *
 * Every paired row now carries `facts[]` from scripts/lib/visual-facts.mjs:
 *   - `text`         — the measured words vs the Figma TEXT node's characters
 *   - `fill`         — measured colour vs the Figma paint, canonicalized
 *                      through scripts/lib/color.mjs. A TEXT node compares
 *                      against `computed.fc` (letters), anything else against
 *                      `computed.bg`.
 *   - `fill-binding` — is the paint bound to a VARIABLE, or a literal? An
 *                      unbound fill that happens to be the right colour is
 *                      still broken: it will not follow a mode switch
 *                      (altitude-figma-repair/SKILL.md trap 4). `fill` passes
 *                      on that node, which is why this is a separate fact.
 *
 * These are comparators, not judges — both sides are structured data, no model
 * is involved. `skipped` is a first-class outcome carrying its reason: a
 * gradient or a `transparent` background is NOT comparable to a flat paint and
 * must never count as agreement.
 *
 * They REPORT by default and gate only under `--gate-facts`. Nobody has run
 * this against a live build yet, so their false-positive rate is unmeasured,
 * and this repo's rule is that measured truth outranks assumption. Run it
 * once, read the volume, then turn it on.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import { scope, projectArg } from '../figma-atoms/project-scope.mjs';
import { argOf } from '../lib/argv.mjs';
import { call as shimCall, parsePayload, shimPortFromArgv } from '../lib/figma-shim.mjs';
import { FACT, nodeFacts, summarizeFacts } from '../lib/visual-facts.mjs';

const SECTION = argOf('--section');
const MODE = argOf('--mode') || 'dark';
const ROUTE = argOf('--route') || '/';
const SOURCE = argOf('--source') || 'page';
const PAGE_NAME = argOf('--page') || 'Site Sections';
const TOL_PX = Number(argOf('--tolerance-px') || '3');
// T4: the new non-geometric facts REPORT by default and only gate when asked.
// Nobody has yet run this against a live build, so the false-positive rate of
// the colour and text comparisons is unmeasured -- and this repo's own rule is
// that measured truth outranks assumption. Run it once, look at the volume,
// then flip this on for the section.
const GATE_FACTS = process.argv.includes('--gate-facts');
const SHIM_PORT = shimPortFromArgv();

if (!SECTION) {
  console.error('usage: verify-figma.mjs --section <id> [--project <id>] [--mode dark] [--route /] [--source page] [--page "Site Sections"] [--tolerance-px 3]');
  process.exit(1);
}

const SC = scope(projectArg());

function titleCase(id) {
  return id.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** The builder's own skip predicate, mirrored (build-set-code.mjs walk):
 * sr-only boxes and content-less structural leaves never reach the canvas. */
function buildable(raw) {
  if (raw.w !== undefined && raw.w <= 2 && raw.h !== undefined && raw.h <= 2) return false;
  const c = raw.computed ?? {};
  const hasContent = (raw.kids ?? []).length || Object.keys(raw.tokens ?? {}).length || raw.text || raw.ownText
    // Mirror of the builder's page-lane paints-count-as-content rule.
    || raw.canvasPng || raw.rasterId
    || (c.bg && c.bg !== 'rgba(0, 0, 0, 0)' && c.bg !== 'transparent')
    || (c.bw > 0 && c.bc && c.bstyle && c.bstyle !== 'none');
  return !!hasContent;
}

function measuredView(raw, rootX, rootY) {
  return {
    name: raw.cls ? String(raw.cls).split(/\s+/)[0] : raw.tag,
    x: Math.round((raw.x ?? 0) * 10) / 10,
    y: Math.round((raw.y ?? 0) * 10) / 10,
    w: Math.round((raw.w ?? 0) * 10) / 10,
    h: Math.round((raw.h ?? 0) * 10) / 10,
    text: raw.text || raw.ownText || null,
    // T4: the non-geometric facts. `bg` is the background paint, `fc` the
    // foreground (letter) colour — a TEXT node's fill in Figma is its letter
    // colour, so the comparison needs both and has to pick per node type.
    bg: raw.computed?.bg ?? null,
    fc: raw.computed?.fc ?? null,
    kids: (raw.kids ?? []).filter(buildable).map((k) => measuredView(k, rootX, rootY)),
  };
}

async function figmaTree() {
  // The COMPONENT_SET carries the bare name; "— Generated" is the
  // presentation FRAME around it (observed live: FRAME "Site Hero —
  // Generated" > COMPONENT_SET "Site Hero" > COMPONENT "State=Default").
  const setName = argOf('--set-name') || `Site ${titleCase(SECTION)}`;
  const code = `
await figma.loadAllPagesAsync();
const page = figma.root.children.find((p) => p.name === ${JSON.stringify(PAGE_NAME)});
if (!page) return JSON.stringify({ error: 'page not found: ' + ${JSON.stringify(PAGE_NAME)} });
let set = null;
(function w(n) { if (set) return; if ((n.type === 'COMPONENT_SET' || n.type === 'COMPONENT') && n.name === ${JSON.stringify(setName)}) { set = n; return; } if ('children' in n) for (const c of n.children) w(c); })(page);
if (!set) return JSON.stringify({ error: 'set not found: ' + ${JSON.stringify(setName)} });
const variant = set.type === 'COMPONENT_SET' ? set.children[0] : set;
const rx = variant.absoluteTransform[0][2];
const ry = variant.absoluteTransform[1][2];
// T4 -- the non-geometric facts, read defensively. NOTE: no backticks in any
// comment below. This whole block lives inside a template literal, so a
// backtick here terminates it and the file fails to parse -- trap 3 in
// altitude-figma-generate/SKILL.md, hit again while writing this. Run
// scripts/contracts/figma/check-parse.mjs after touching generator source.
// A node's fills can be figma.mixed (a symbol, not an array) when paints vary
// per character or per child; the Array.isArray guard sends that to null
// rather than throwing mid-walk and losing the whole dump.
const firstPaint = (n) => {
  try {
    const fs = n.fills;
    if (!Array.isArray(fs)) return null;
    const p = fs.find((f) => f && f.visible !== false);
    if (!p) return null;
    return { type: p.type, color: p.color || null, opacity: typeof p.opacity === 'number' ? p.opacity : 1 };
  } catch (e) { return null; }
};
const fillIsBound = (n) => {
  try {
    const bv = n.boundVariables;
    return !!(bv && bv.fills && bv.fills.length);
  } catch (e) { return false; }
};
const characters = (n) => {
  try { return n.type === 'TEXT' ? String(n.characters).slice(0, 300) : null; } catch (e) { return null; }
};
const dump = (n, depth) => ({
  name: n.name.slice(0, 60),
  type: n.type,
  characters: characters(n),
  fill: firstPaint(n),
  fillBound: fillIsBound(n),
  x: Math.round((n.absoluteTransform[0][2] - rx) * 10) / 10,
  y: Math.round((n.absoluteTransform[1][2] - ry) * 10) / 10,
  w: Math.round(n.width * 10) / 10,
  h: Math.round(n.height * 10) / 10,
  // Decorative vector children the generator synthesizes (grid-v/grid-h
  // hairlines) are not measured nodes — pairing them poisons the report
  // with figma-only rows.
  kids: ('children' in n && depth < 14) ? n.children.filter((c) => c.visible !== false && !/^grid-[vh]$/.test(c.name)).map((c) => dump(c, depth + 1)) : [],
});
// The PRESENTATION frame is the themed artifact (explicit dark/light mode
// is applied to it, not to the master) — exporting the raw variant renders
// in the file's default mode: white-on-white. Shoot the presentation frame.
let pres = null;
(function wp(n) { if (pres) return; if (n.type === 'FRAME' && n.name === ${JSON.stringify(setName)} + ' — Generated') { pres = n; return; } if ('children' in n) for (const c of n.children) wp(c); })(page);
return JSON.stringify({ root: dump(variant, 0), variantId: variant.id, presId: pres ? pres.id : null });
`;
  const text = await shimCall('figma_execute', { code, fileKey: SC.fileKey, timeout: 60000 }, { port: SHIM_PORT });
  const payload = JSON.parse(text);
  if (payload.success === false || payload.error) throw new Error('figma dump failed: ' + (payload.error || text));
  const inner = typeof payload.result === 'string' ? JSON.parse(payload.result) : payload.result;
  if (inner.error) throw new Error(inner.error);
  return inner;
}

function compare(meas, fig, path, rows) {
  const dw = Math.round((fig.w - meas.w) * 10) / 10;
  const dh = Math.round((fig.h - meas.h) * 10) / 10;
  const dx = Math.round((fig.x - meas.x) * 10) / 10;
  const dy = Math.round((fig.y - meas.y) * 10) / 10;
  const tol = (m) => Math.max(TOL_PX, m * 0.02);
  const off = Math.abs(dw) > tol(meas.w) || Math.abs(dh) > tol(meas.h) || Math.abs(dx) > tol(meas.w) || Math.abs(dy) > tol(meas.h);
  rows.push({
    path,
    measured: `${meas.name} ${meas.w}x${meas.h}@${meas.x},${meas.y}`,
    figma: `${fig.name} ${fig.w}x${fig.h}@${fig.x},${fig.y}`,
    dw, dh, dx, dy,
    status: off ? 'OFF' : 'ok',
    ...(meas.text ? { text: String(meas.text).slice(0, 40) } : {}),
    // T4 — text, fill colour and fill-boundness. `status` above stays purely
    // geometric so the existing exit-code contract is unchanged; these are
    // reported alongside it and only gate under --gate-facts.
    facts: nodeFacts(meas, fig),
  });
  const n = Math.max(meas.kids.length, fig.kids.length);
  for (let i = 0; i < n; i += 1) {
    const mk = meas.kids[i];
    const fk = fig.kids[i];
    if (mk && fk) compare(mk, fk, `${path}.${i}`, rows);
    else if (mk) rows.push({ path: `${path}.${i}`, measured: `${mk.name} ${mk.w}x${mk.h}`, figma: null, status: 'MISSING-IN-FIGMA' });
    else rows.push({ path: `${path}.${i}`, measured: null, figma: `${fk.name} ${fk.w}x${fk.h}`, status: 'FIGMA-ONLY' });
  }
}

async function main() {
  const pagePath = join(SC.dirs.sync, `${SOURCE}-${MODE}.json`);
  if (!existsSync(pagePath)) { console.error(`[verify] no ${pagePath} — run measure-page.mjs first.`); process.exit(1); }
  const measured = JSON.parse(readFileSync(pagePath, 'utf8'));
  const sections = measured[ROUTE] ?? measured[ROUTE === '/' ? '' : ROUTE] ?? [];
  const section = sections.find((s) => s.id === SECTION || String(s.id).split(/\s+/)[0] === SECTION);
  if (!section) { console.error(`[verify] section "${SECTION}" not found on route "${ROUTE}".`); process.exit(1); }

  const meas = measuredView(section.root, 0, 0);
  const { root: fig, variantId, presId } = await figmaTree();
  const rows = [];
  compare(meas, fig, '0', rows);

  const off = rows.filter((r) => r.status === 'OFF');
  const missing = rows.filter((r) => r.status === 'MISSING-IN-FIGMA');
  const extra = rows.filter((r) => r.status === 'FIGMA-ONLY');
  const factSummary = summarizeFacts(rows);
  const factMismatches = rows.flatMap((r) => (r.facts ?? [])
    .filter((f) => f.status === FACT.MISMATCH)
    .map((f) => ({ path: r.path, ...f })));

  const outDir = join(SC.dirs.sync, 'verify');
  mkdirSync(outDir, { recursive: true });

  // The IMAGE PAIR (bookends spec R4, wired in round 7): every verify run
  // exports the just-verified Figma build next to its numeric report, and
  // names the site ground truth when one exists — evidence a human or agent
  // opens without re-running anything.
  const figmaShot = join(outDir, `${SECTION}-figma.png`);
  let figmaShotOk = false;
  const exportId = presId || variantId; // presentation frame carries the theme mode
  if (exportId) {
    try {
      execFileSync(process.execPath, ['scripts/figma-atoms/export-png.mjs', exportId, figmaShot, '--scale', '1'], { stdio: 'pipe' });
      figmaShotOk = true;
    } catch (e) { console.warn(`[verify] figma export failed: ${String(e.message).split('\n')[0]}`); }
  }
  const groundTruth = join(SC.dirs.sync, 'shots', 'site', `${SECTION}.png`);
  const groundTruthOk = existsSync(groundTruth);

  const outPath = join(outDir, `${SECTION}-verify.json`);
  writeFileSync(outPath, `${JSON.stringify({
    section: SECTION, route: ROUTE, mode: MODE, tolerancePx: TOL_PX,
    facts: { summary: factSummary, gated: GATE_FACTS, mismatches: factMismatches },
    images: { figma: figmaShotOk ? figmaShot : null, groundTruth: groundTruthOk ? groundTruth : null },
    rows,
  }, null, 2)}\n`);

  console.log(`[verify] ${SECTION}: ${rows.length} paired nodes — ${off.length} OFF, ${missing.length} missing-in-figma, ${extra.length} figma-only -> ${outPath}`);
  if (figmaShotOk) console.log(`[verify] image pair: ${figmaShot}${groundTruthOk ? ` vs ${groundTruth}` : ' (no site ground truth captured yet)'}`);
  for (const r of [...off, ...missing, ...extra].slice(0, 25)) {
    console.log(`  ${r.status.padEnd(18)} ${r.path.padEnd(10)} measured=${r.measured ?? '-'}  figma=${r.figma ?? '-'}${r.text ? `  text="${r.text}"` : ''}`);
  }
  console.log(`[verify] facts: ${factSummary.ok} ok, ${factSummary.mismatch} mismatch, ${factSummary.skipped} not comparable${GATE_FACTS ? ' (GATING)' : ' (report only -- pass --gate-facts to enforce)'}`);
  for (const f of factMismatches.slice(0, 15)) {
    console.log(`  FACT ${f.kind.padEnd(13)} ${f.path.padEnd(10)} ${f.detail}`);
  }
  if (factMismatches.length > 15) console.log(`  ... ${factMismatches.length - 15} more fact mismatch(es) -- full list in ${outPath}`);

  const geometryFailed = off.length + missing.length > 0;
  process.exit(geometryFailed || (GATE_FACTS && factMismatches.length) ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/') || process.argv[1]?.endsWith('verify-figma.mjs')) {
  await main();
}
