#!/usr/bin/env node
/**
 * generate-snippet.mjs — build a Figma frame from a MEASURED PAGE SECTION
 * (spec 2026-08-28-snippet-capture-code-to-figma; acceptance benchmark T9 =
 * the southleft homepage hero, section id "hero").
 *
 * WHY. generate-figma.mjs builds component sets from CONTRACTS — the library
 * lane. This is the PAGE lane: a real route's real section (real copy, real
 * theme, token provenance) becomes a Figma build, so "I coded and styled
 * something — make it in Figma" works for compositions that are not library
 * components. The mismatch this closes was proven on the hero: the site's
 * hero is a bespoke `section.sl-hero`, so no component set could ever match
 * it (issue homepage-hero-exists-twice-…-08-28-2026).
 *
 * Pipeline (maximally reused, nothing re-implemented):
 *   1. scripts/figma-atoms/measure-page.mjs  -> <syncDir>/page-<mode>.json
 *      (real-route walk via measure-lib's window.__section)
 *   2. THIS SCRIPT: one section's raw tree -> pseudo-contract, via
 *      emit-contracts.mjs's exported buildAnatomyNode (same anatomy shape as
 *      every real contract — the generator cannot tell the difference)
 *   3. buildOps + buildPluginCode (scripts/contracts/figma/) -> one
 *      figma_execute over the shim onto the scratch page (decoy-guarded).
 *
 * Usage:
 *   node scripts/figma-atoms/measure-page.mjs --project southleft --base http://localhost:4188/southleft --mode dark
 *   node scripts/contracts/generate-snippet.mjs --section hero --project southleft [--mode dark]
 *     [--page "Site Sections"] [--source page] [--route /] [--ops-only] [--check-determinism]
 *
 * Known v1 degradations (all reported, never silent):
 *   - rasterised replaced elements (canvasPng) are not emitted as image
 *     fills yet — each drops with `snippet-raster-not-emitted:<path>`;
 *   - background-image lattices (the hero grid texture) have no token and no
 *     image emission — `snippet-bg-image-dropped:<path>`.
 */
import { readFileSync, mkdirSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';

import { scope, projectArg } from '../figma-atoms/project-scope.mjs';
import { buildAnatomyNode } from './emit-contracts.mjs';
import { buildOps } from './figma/derive-ops.mjs';
import { buildPluginCode } from './figma/build-set-code.mjs';
import { DEFAULT_COMPONENT_CONFIG } from './figma/component-config.mjs';
import { argOf } from '../lib/argv.mjs';
import { call as shimCall, parsePayload, shimPortFromArgv, checkDecoyGuard } from '../lib/figma-shim.mjs';
import { contractFilePath } from '../../libs/altitude-mcp/src/lib/parity.mjs';

const SECTION = argOf('--section');
const MODE = argOf('--mode') || 'dark';
const ROUTE = argOf('--route') || '/';
const SOURCE = argOf('--source') || 'page';
const PAGE_NAME = argOf('--page') || 'Site Sections';
const SHIM_PORT = shimPortFromArgv();
const OPS_ONLY = process.argv.includes('--ops-only');
const CHECK_DETERMINISM = process.argv.includes('--check-determinism');
// ONE-COMMAND LOOP (round 9 — owner goal: least input from the human):
//   --measure   run measure-page.mjs first (fresh capture from --base)
//   --verify    run verify-figma.mjs after the build (numeric report +
//               image pair), and exit with ITS status so the loop gates
const DO_MEASURE = process.argv.includes('--measure');
const DO_VERIFY = process.argv.includes('--verify');
const BASE_URL = argOf('--base') || null; // argOf's 2nd param is an argv ARRAY, not a default

if (!SECTION) {
  console.error('usage: generate-snippet.mjs --section <sectionId> [--project <id>] [--mode dark] [--route /] [--source page] [--page "Site Sections"] [--ops-only] [--check-determinism]');
  process.exit(1);
}

const SC = scope(projectArg());

function titleCase(id) {
  return id.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Same knownNames source emit-contracts uses conceptually: every tracked
 * contract's tag — so nested al-c-<name> blocks annotate to instances. */
function knownComponentNames(projectId) {
  const dir = dirname(contractFilePath(projectId, '_'));
  const names = new Set();
  if (!existsSync(dir)) return names;
  for (const f of readdirSync(dir)) {
    const m = /^al-([a-z][a-z-]*)\.contract\.json$/.exec(f);
    if (m) names.add(m[1]);
  }
  return names;
}

/** Component tag -> Figma set name, from sibling contracts (mirror of
 * generate-figma.mjs's loadNestedSetNames — that fn is CLI-internal). */
function loadNestedSetNames(projectId) {
  const dir = dirname(contractFilePath(projectId, '_'));
  const map = {};
  if (!existsSync(dir)) return map;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.contract.json')).sort()) {
    try {
      const c = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      if (c.id && c.bindings?.figma?.componentSetName) map[c.id] = c.bindings.figma.componentSetName;
    } catch { /* unreadable sibling must not block the build */ }
  }
  return map;
}

/** Walk raw + shaped trees in lockstep, reporting what v1 cannot express. */
function collectDegradations(raw, path, out, shaped) {
  if (!raw) return out;
  // Rasters are now EMITTED as image fills (round 4); a failure surfaces as
  // the builder's snippet-image-fill-failed miss. Only a bgImage that was
  // NOT rasterised (a container with children — rasterising would bake its
  // text into pixels) is still a real degradation.
  if (raw.computed?.bgImage && !raw.canvasPng) out.push(`snippet-bg-image-dropped:${path}`);
  if (shaped?.nonUniformGaps) out.push(`snippet-nonuniform-gaps:${path}:[${shaped.nonUniformGaps.join(',')}]`);
  (raw.kids ?? []).forEach((kid, i) => collectDegradations(kid, `${path}.${i}`, out, shaped?.children?.[i]));
  return out;
}

/** PAGE-lane literal type metrics (learnings note 2026-08-28): attach the
 * measured USED font-size/line-height to every shaped node. Unconditional on
 * purpose — a typography token reports the authored var, not the clamp()ed
 * used size, and the page is this lane's ground truth. buildAnatomyNode maps
 * raw.kids 1:1 to node.children, so lockstep indices are exact. Pseudo-
 * contracts are never schema-validated; these keys never enter real
 * contracts. */
function attachTypeLiterals(raw, node, parentRaw) {
  if (!raw || !node) return;
  const c = raw.computed ?? {};
  // MIXED-CONTENT text (footer round 2): a node whose label is a bare text
  // node BESIDE element children carries ownText, which buildAnatomyNode
  // does not map — the "inspect: off" chips rendered only their <kbd> keys.
  if (!node.text && raw.ownText) node.text = String(raw.ownText).slice(0, 300);
  const fs = c.fs;
  if (fs) node.fsPx = Math.round(fs * 10) / 10;
  const lh = c.lh;
  if (lh) node.lhPx = Math.round(lh * 10) / 10;
  // Literal used STYLES (round 4 — instance style divergence, terminal
  // chrome, texture): computed colors/borders/radii/weight for surfaces
  // authored with no token. Transparent backgrounds are skipped at the
  // source so ops stay lean. Tokens always win at the consumption site.
  if (c.bg && c.bg !== 'rgba(0, 0, 0, 0)' && c.bg !== 'transparent') node.bgCss = c.bg;
  if (c.fc) node.fcCss = c.fc;
  if (c.fw) node.fwCss = String(c.fw);
  // Font FAMILY per node (round 6 — owner: "headings, desc, chips, terminal
  // aren't right"): the site mixes IBM Plex Sans / IBM Plex Mono per node
  // while the generated build rendered everything in the Figma masters'
  // single display family. Measured family is the truth here.
  if (c.ff) node.ffCss = c.ff;
  // NATIVE GRID TEXTURE (owner principle, round 6: CSS-described paint
  // becomes VECTORS, raster is last resort): the classic two-gradient grid
  // (1px line, transparent, tiled by background-size) parses into pitch +
  // line color and builds as hairline rectangles — crisp, recolorable, and
  // immune to the raster-contamination class entirely.
  const grid = parseGridTexture(c);
  if (grid && !process.env.SNIPPET_NO_GRID) node.gridTex = grid;
  // INLINE FLOW (footer round 5, owner catch on the annotation strip): a
  // block container whose sized element children are ALL inline-level (the
  // chip's dot+label, the state chips' label+kbd) flows HORIZONTALLY in the
  // browser — the block→VERTICAL axis rule stacked them.
  const disp = String(c.display || '');
  if ((disp === 'block' || disp === 'flow-root' || disp === 'list-item') && (raw.kids ?? []).length) {
    const sizedKids = (raw.kids ?? []).filter((k) => k.w > 2 || k.h > 2);
    if (sizedKids.length && sizedKids.every((k) => String(k.computed?.display || '').startsWith('inline'))) node.inlineFlow = true;
  }
  // GRID EDGE PADDING (footer round 5, owner: "the component needs padding
  // around the edge"): a grid's fluid gutter tracks inset EVERY child —
  // recoverable as padding when all children share the inset. Generalizes
  // the single-child gutter-centering rule to multi-child grids (the
  // footer's constrained layout slots three rows).
  if (disp === 'grid' && !node.padPx && (raw.kids ?? []).length) {
    const gk = (raw.kids ?? []).filter((k) => k.w > 2 && k.h > 2);
    if (gk.length) {
      const r1 = (v) => Math.max(0, Math.round(v * 10) / 10);
      const padL = r1(Math.min(...gk.map((k) => k.x - raw.x)));
      const padR = r1(raw.w - Math.max(...gk.map((k) => k.x + k.w - raw.x)));
      const padT = r1(Math.min(...gk.map((k) => k.y - raw.y)));
      const padB = r1(raw.h - Math.max(...gk.map((k) => k.y + k.h - raw.y)));
      if (padL > 1 || padR > 1 || padT > 1 || padB > 1) node.padPx = [padT, padR, padB, padL];
    }
  }
  // Any-side border (round 3): bw is the TOP width only — a left-border
  // quote or top-border divider was invisible to the old top-only gate.
  const bw4 = Array.isArray(c.bw4) ? c.bw4.map((v) => Math.round(v * 10) / 10) : (c.bw > 0 ? [c.bw, c.bw, c.bw, c.bw] : null);
  if (bw4 && bw4.some((v) => v > 0) && c.bc && c.bstyle && c.bstyle !== 'none') {
    node.bcCss = c.bc;
    node.bwPx = Math.max(...bw4);
    node.bw4 = bw4;
  }
  if (Array.isArray(c.r) && c.r.some((v) => v > 0)) node.radPx = c.r.map((v) => Math.round(v * 10) / 10);
  // Absolute overlays (texture/murmur): offset relative to the PARENT box —
  // raw x/y are section-root-relative, so subtract the parent's.
  if ((c.pos === 'absolute' || c.pos === 'fixed') && parentRaw) {
    node.absPos = {
      x: Math.round((raw.x - parentRaw.x) * 10) / 10,
      y: Math.round((raw.y - parentRaw.y) * 10) / 10,
    };
  }
  // Rasterised replaced element (measure-page attaches canvasPng data URIs).
  // A node with a parsed gridTex gets NO raster — vectors beat pixels.
  if (raw.canvasPng && !node.gridTex) {
    const b64 = String(raw.canvasPng).split(',')[1];
    if (b64) node.imgB64 = b64;
  }
  // Colored text runs (round 7): measure-lib's preformatted-block branch
  // records per-range colors (the terminal's green ticks / red prompt), but
  // the contract transform drops them — the terminal body rendered
  // single-color. Carried verbatim; consumed via setRangeFills.
  if (Array.isArray(raw.runs) && raw.runs.length) node.runs = raw.runs;
  // Measured used paddings/gap — same rationale: page spacing is often
  // clamp()/local CSS with no token, and dropping it collapses the vertical
  // rhythm (hero round 2: content started at y=0 instead of y=128).
  const pad = raw.computed?.pad;
  if (Array.isArray(pad) && pad.some((p) => p > 0)) node.padPx = pad.map((p) => Math.round(p * 10) / 10);
  const gap = raw.computed?.gap;
  if (gap > 0) node.gapPx = Math.round(gap * 10) / 10;
  // SIBLING-GAP SYNTHESIS (hero round 3): CSS margins are captured by no
  // fact, so a kicker's margin-bottom vanishes and children butt together.
  // The raw walk carries per-node x/y, so uniform inter-sibling spacing is
  // recoverable as itemSpacing. Applied only when gaps are UNIFORM (auto
  // layout has one itemSpacing); mixed gaps are reported by generate-snippet
  // as a degradation instead of being averaged into a lie.
  if (!node.gapPx && (raw.kids ?? []).length >= 2) {
    // Grid maps to HORIZONTAL — its inter-track gap is an X gap (round 8:
    // the two-column split's 80px track gap was being synthesized on Y).
    const axis = (raw.computed?.display === 'grid' || (String(raw.computed?.display || '').includes('flex') && raw.computed?.dir === 'row')) ? 'x' : 'y';
    const sized = (raw.kids ?? []).filter((k) => k.w > 2 || k.h > 2);
    const gaps = [];
    for (let i = 1; i < sized.length; i += 1) {
      const prev = sized[i - 1];
      const cur = sized[i];
      gaps.push(axis === 'y' ? cur.y - (prev.y + prev.h) : cur.x - (prev.x + prev.w));
    }
    const pos = gaps.filter((g) => g >= 0);
    if (pos.length === gaps.length && gaps.length > 0) {
      const min = Math.min(...gaps);
      const max = Math.max(...gaps);
      if (max - min <= 2 && min > 0) node.gapPx = Math.round(((min + max) / 2) * 10) / 10;
      else if (max - min > 2) {
        // MARGIN-AUTO DETECTION (round 7 — the terminal title sits at the
        // bar's far end via margin-left:auto, a fact nothing measures): a
        // LAST flex-row child whose leading gap dwarfs the others is pushed,
        // not flowed. Expressed as an absolute child at its measured offset
        // (auto layout has no auto-margin equivalent).
        const lastGap = gaps[gaps.length - 1];
        const others = gaps.slice(0, -1);
        const maxOther = others.length ? Math.max(...others) : 0;
        if (axis === 'x' && lastGap > 60 && lastGap > 3 * Math.max(maxOther, 8)) {
          const lastSized = sized[sized.length - 1];
          const li = (raw.kids ?? []).indexOf(lastSized);
          if (li >= 0 && node.children?.[li]) {
            node.children[li].absPos = {
              x: Math.round((lastSized.x - raw.x) * 10) / 10,
              y: Math.round((lastSized.y - raw.y) * 10) / 10,
            };
          }
          node.nonUniformGaps = others.map((g) => Math.round(g));
        } else {
          // PER-CHILD MARGIN RECOVERY (round 9, the last layout residual):
          // mixed gaps become base itemSpacing (the MIN) plus a trailing
          // margin extra (mbPx below / mrPx beside) on the child BEFORE
          // each larger gap — the kicker's margin-bottom: 20 over a 0-gap
          // stack. Consumers add it as trailing padding on the child's own
          // (transparent, hug) box, which spaces siblings identically.
          const base = min;
          if (base > 0) node.gapPx = Math.round(base * 10) / 10;
          let allAssigned = true;
          for (let gi = 0; gi < gaps.length; gi += 1) {
            const extra = gaps[gi] - base;
            if (extra > 1) {
              const li2 = (raw.kids ?? []).indexOf(sized[gi]);
              if (li2 >= 0 && node.children?.[li2]) {
                node.children[li2][axis === 'y' ? 'mbPx' : 'mrPx'] = Math.round(extra * 10) / 10;
              } else allAssigned = false;
            }
          }
          if (!allAssigned) node.nonUniformGaps = gaps.map((g) => Math.round(g));
        }
      }
    }
  }
  (raw.kids ?? []).forEach((kid, i) => attachTypeLiterals(kid, node.children?.[i], raw));
}

/** Parse the classic CSS grid-texture pattern: one or two
 * linear-gradient(<line-color> 1px, transparent 1px) layers tiled by
 * background-size. Returns {pitchX, pitchY, color, vertical, horizontal} or
 * null for anything it cannot honestly express (which then falls back to the
 * raster path). */
function parseGridTexture(c) {
  const bgi = String(c.bgImage || '');
  if (!bgi || bgi === 'none') return null;
  const segs = [];
  const re = /linear-gradient\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
  let m;
  while ((m = re.exec(bgi))) segs.push(m[1]);
  if (!segs.length || segs.length > 2) return null;
  let color = null;
  let vertical = false;
  let horizontal = false;
  for (const s of segs) {
    const cm = /(rgba?\([^)]*\)|color\(srgb[^)]*\))\s+1px/.exec(s);
    if (!cm) return null; // not a hairline pattern — raster fallback
    color = cm[1];
    if (/to right|90deg/.test(s)) vertical = true;
    else horizontal = true;
  }
  const px = /([\d.]+)px\s+([\d.]+)px/.exec(String(c.bgSize || '').split(',')[0] || '');
  if (!px) return null;
  return { pitchX: parseFloat(px[1]), pitchY: parseFloat(px[2]), color, vertical, horizontal };
}

function buildPseudoContract(section) {
  const ctx = { selfBase: `site-${SECTION}`, knownNames: knownComponentNames(SC.id) };
  const root = buildAnatomyNode(section.root, ctx, true);
  attachTypeLiterals(section.root, root);
  return {
    id: `al-site-${SECTION}`,
    name: `Site ${titleCase(SECTION)}`,
    version: '0.0.0',
    status: 'derived',
    description: `PAGE SECTION snippet — measured live from route "${ROUTE}" (mode ${MODE}) by measure-page.mjs, selector [data-section-id="${SECTION}"]. Not a library component; built by generate-snippet.mjs (spec 2026-08-28-snippet-capture-code-to-figma).`,
    semantics: { element: section.root.tag || 'section' },
    props: [],
    events: [],
    slots: [],
    composition: null,
    states: ['default'],
    anatomySource: 'measured-page',
    anatomyCase: `route:${ROUTE} mode:${MODE}`,
    anatomy: { root },
    tokens: [],
    a11y: { ariaAttributes: [], cssParts: [] },
    bindings: {
      code: { tagName: `site-${SECTION}`, importPath: null, workspace: null },
      figma: { componentSetName: `Site ${titleCase(SECTION)}` },
    },
  };
}

async function call(name, args) {
  try {
    return await shimCall(name, args, { port: SHIM_PORT });
  } catch (e) {
    if (e?.code === 'ERR_SHIM_UNREACHABLE') { console.error(e.message); process.exit(1); }
    throw e;
  }
}

async function main() {
  if (DO_MEASURE) {
    const margs = ['scripts/figma-atoms/measure-page.mjs', '--project', SC.id, '--mode', MODE, '--out', SOURCE];
    if (BASE_URL) margs.push('--base', BASE_URL);
    console.log(`[generate-snippet] --measure: ${margs.join(' ')}`);
    execFileSync(process.execPath, margs, { stdio: 'inherit' });
  }
  const pagePath = join(SC.dirs.sync, `${SOURCE}-${MODE}.json`);
  if (!existsSync(pagePath)) {
    console.error(`[generate-snippet] no ${pagePath} — run measure-page.mjs first (same --project/--mode/--out).`);
    process.exit(1);
  }
  const measured = JSON.parse(readFileSync(pagePath, 'utf8'));
  const sections = measured[ROUTE] ?? measured[ROUTE === '/' ? '' : ROUTE] ?? [];
  const section = sections.find((s) => s.id === SECTION || String(s.id).split(/\s+/)[0] === SECTION);
  if (!section) {
    console.error(`[generate-snippet] section "${SECTION}" not found on route "${ROUTE}". Available: ${sections.map((s) => s.id).join(', ') || '(none)'}`);
    process.exit(1);
  }

  const contract = buildPseudoContract(section);
  // Full-bleed by nature: a page section's root width IS its measured width —
  // the same pin figma.gen.json's rootWidth curation gives full-bleed brand
  // organisms, here a rule (every page section qualifies by construction).
  const config = { ...DEFAULT_COMPONENT_CONFIG, rootWidth: true };
  const nestedSetNames = loadNestedSetNames(SC.id);
  const opsInputs = { projectId: SC.id, pageName: PAGE_NAME, config, nestedSetNames };

  if (CHECK_DETERMINISM) {
    const first = JSON.stringify(buildOps(buildPseudoContract(section), opsInputs), null, 2);
    const second = JSON.stringify(buildOps(buildPseudoContract(section), opsInputs), null, 2);
    const ok = first === second;
    console.log(`[generate-snippet] --check-determinism ${SC.id}/${SECTION}: ${ok ? 'DETERMINISTIC' : 'NONDETERMINISTIC'}`);
    if (!ok) process.exit(1);
    return;
  }

  const ops = buildOps(contract, opsInputs);
  const degradations = collectDegradations(section.root, '0', [], contract.anatomy.root);
  const dir = join(SC.dirs.sync, 'generated-ops');
  mkdirSync(dir, { recursive: true });
  const outPath = join(dir, `snippet-${SECTION}.ops.json`);
  writeFileSync(outPath, `${JSON.stringify(ops, null, 2)}\n`, 'utf8');
  console.log(`[generate-snippet] ${SC.id}/${SECTION}: ${ops.variants.length} variant ops -> ${outPath}`);
  if (degradations.length) console.log(`[generate-snippet] v1 degradations: ${degradations.join(', ')}`);

  if (OPS_ONLY) return;

  const status = parsePayload(await call('figma_get_status', {}));
  const guard = checkDecoyGuard(SC.project, JSON.stringify(status));
  if (guard.blocked) {
    console.error(`Refusing to generate: Figma is on the "${guard.decoy.fileName}" DECOY file. Open "${SC.fileName}" (${SC.fileKey}).`);
    process.exit(1);
  }
  // POSITIVE file match (2026-08-28): the decoy guard blocks only LISTED
  // decoys — an unrelated file (a client file left focused) passed it. The
  // open file must BE the target, not merely not-a-decoy.
  if (status.currentFileKey && status.currentFileKey !== SC.fileKey) {
    console.error(`Refusing to generate: Figma has "${status.currentFileName}" (${status.currentFileKey}) open — not "${SC.fileName}" (${SC.fileKey}). Focus the target file and re-run.`);
    process.exit(1);
  }

  const code = buildPluginCode(ops, SC, config);
  const text = await call('figma_execute', { code, fileKey: SC.fileKey, timeout: 90000 });
  let payload;
  try { payload = JSON.parse(text); } catch { console.error(text); process.exit(1); }
  if (payload.success === false || payload.error) {
    console.error('[generate-snippet] BUILD FAILED:', payload.error || payload);
    process.exit(1);
  }
  const result = typeof payload.result === 'string' ? JSON.parse(payload.result) : payload.result;
  console.log(JSON.stringify({ ...result, snippetDegradations: degradations }, null, 2));

  if (DO_VERIFY) {
    const vargs = ['scripts/contracts/verify-figma.mjs', '--section', SECTION, '--project', SC.id,
      '--mode', MODE, '--route', ROUTE, '--source', SOURCE, '--page', PAGE_NAME];
    console.log(`[generate-snippet] --verify: ${vargs.join(' ')}`);
    try {
      execFileSync(process.execPath, vargs, { stdio: 'inherit' });
    } catch (e) {
      // verify exits 1 when nodes exceed tolerance — propagate so the
      // one-command loop can gate on it.
      process.exitCode = e.status ?? 1;
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/') || process.argv[1]?.endsWith('generate-snippet.mjs')) {
  await main();
}
