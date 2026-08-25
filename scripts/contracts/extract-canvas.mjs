#!/usr/bin/env node
/**
 * extract-canvas.mjs — the CANVAS leg of the three-way contract <-> code <->
 * canvas comparison (T6 does the diffing; this only extracts).
 *
 * For each Figma component set the active project's parity manifest maps a
 * tag to, read LIVE (over scripts/figma-atoms/mcp-shim.mjs): variant axes and
 * their legal values, every component property (VARIANT/BOOLEAN/TEXT/
 * INSTANCE_SWAP), bound-variable NAMES per node (fills/strokes/spacing/
 * radius...), bound text-style names, interaction states expressed as a
 * "State" variant axis, and a named-layer anatomy of the default variant,
 * walked `--depth` child levels deep (default DEFAULT_ANATOMY_DEPTH, T17 —
 * was a fixed 2; see `--depth`). A per-set visited-node cap
 * (MAX_ANATOMY_NODES) guards against pathologically large trees; a walk the
 * cap actually cut short is recorded as a `degradations` entry, never
 * silently truncated. Output is shaped to mirror contract.schema.json as
 * closely as a canvas-only read honestly can — see .altitude/contracts/
 * canvas-contract.schema.json for exactly where the two diverge and why.
 *
 * NAME EVERY DEGRADATION. A canvas read cannot know a code attribute name, a
 * `--al-*` token name, an ARIA attribute, or a CSS part. Rather than omit
 * those silently (which would read as "this component simply has none"),
 * every emitted contract carries a `degradations` array naming each one —
 * adapted from ds-contracts-poc's provenance convention (see
 * .altitude/contracts/README.md).
 *
 * Requires a live write channel to Figma Desktop, same as
 * scripts/figma-parity/refresh-figma-digests.mjs:
 *   node scripts/figma-atoms/mcp-shim.mjs        # spawns figma-console-mcp, http on :9401
 *   (Figma Desktop open on the project's file with the Desktop Bridge plugin running)
 *
 * Usage:
 *   node scripts/contracts/extract-canvas.mjs                        # every mapped set, DS_PROJECT/registry default
 *   node scripts/contracts/extract-canvas.mjs --project southleft
 *   node scripts/contracts/extract-canvas.mjs --component al-button  # one set — the reconciliation-loop path
 *   node scripts/contracts/extract-canvas.mjs --component al-button --depth 6  # deeper anatomy walk (default 5)
 *   node scripts/contracts/extract-canvas.mjs --from-fixture scripts/contracts/__fixtures__/canvas-sample.json
 *   node scripts/contracts/extract-canvas.mjs --self-test            # offline: decoy-guard logic only
 *   pnpm run contracts:canvas / contracts:canvas:sl
 *
 * Output: .altitude/figma-sync/<project-subdir>/canvas-contracts/<tag>.canvas.json
 * (gitignored, same as every other refresh-pipeline artifact under figma-sync/
 * — see .gitignore:110-125 — canvas dumps are OBSERVATIONS, not durable state).
 * `extractedAt` is deliberately NOT in the contract body (determinism — same
 * inputs -> byte-identical file); the run timestamp + per-set digest live in
 * one sidecar per project: canvas-contracts/canvas-extraction-meta.json.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { resolveProject, figmaNodeUrlFor } from '../../libs/altitude-mcp/src/lib/ds-project.mjs';
import { readManifest, digestOf } from '../../libs/altitude-mcp/src/lib/parity.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const SCHEMA_PATH = join(REPO_ROOT, '.altitude', 'contracts', 'canvas-contract.schema.json');

/** How many child levels to walk from the default-variant root, by default
 * (T17 — was a fixed 2; several token-binding disagreements against the
 * FIRST live al-button run turned out to be nodes the depth-2 walk simply
 * never reached). Override with `--depth N`. Still a landmark read (named
 * layers + their bound variables), not a guaranteed full tree dump — see
 * MAX_ANATOMY_NODES. */
const DEFAULT_ANATOMY_DEPTH = 5;

/** Total nodes visitable in one set's anatomy walk, across the whole tree
 * (not per level) — a guard against a pathologically large/deep component
 * set turning one extraction into a slow, huge dump. Once reached, the walk
 * stops descending; a set that hit the cap gets a `degradations` entry
 * naming it, never a silently-truncated tree. */
const MAX_ANATOMY_NODES = 500;

const STATE_NAMES = ['hover', 'focus', 'active', 'disabled'];

// ── argv ─────────────────────────────────────────────────────────────────

function argOf(flag) {
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1) || null;
  const i = process.argv.indexOf(flag);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('-') ? process.argv[i + 1] : null;
}

const COMPONENT = argOf('--component');
const FROM_FIXTURE = argOf('--from-fixture');
const SELF_TEST = process.argv.includes('--self-test');
const PORT = Number(argOf('--port') ?? 9401);
const SHIM = `http://127.0.0.1:${PORT}/call`;
const ANATOMY_DEPTH = Number(argOf('--depth') ?? DEFAULT_ANATOMY_DEPTH);

// ── small, dependency-free helpers ─────────────────────────────────────────

/** `'Icon Leading#123:0'` -> `'Icon Leading'` — component-property keys carry
 * a per-set `#id` suffix for TEXT/BOOLEAN/INSTANCE_SWAP props (same trap
 * scripts/figma-atoms/build-page.mjs:394-398 already works around). */
function normPropKey(key) {
  return String(key).split('#')[0].trim();
}

const normState = (s) => String(s ?? '').toLowerCase().replace(/[^a-z]/g, '');

// ── decoy guard (mirrors scripts/figma-parity/refresh-figma-digests.mjs) ──

/**
 * Refuse to trust a Figma read if the connected file is a known decoy for
 * this project. `statusText` is the raw JSON.stringify of `figma_get_status`'s
 * response — same substring check refresh-figma-digests.mjs uses, since the
 * decoy fileKey appearing anywhere in that payload is enough to distrust it.
 *
 * @returns {{blocked: boolean, decoy: object|null}}
 */
export function checkDecoyGuard(project, statusText) {
  for (const decoy of project.figma?.decoys ?? []) {
    if (statusText.includes(decoy.fileKey)) return { blocked: true, decoy };
  }
  return { blocked: false, decoy: null };
}

function runSelfTest() {
  const fakeProject = {
    id: '__self-test__',
    figma: {
      fileKey: 'REAL0000000000000000000',
      fileName: 'Real File',
      decoys: [{ fileKey: 'DECOY000000000000000000', fileName: 'Decoy File', why: 'synthetic fixture for --self-test' }],
    },
  };
  const decoyStatus = JSON.stringify({ fileKey: 'DECOY000000000000000000', fileName: 'Decoy File' });
  const realStatus = JSON.stringify({ fileKey: 'REAL0000000000000000000', fileName: 'Real File' });

  const onDecoy = checkDecoyGuard(fakeProject, decoyStatus);
  const onReal = checkDecoyGuard(fakeProject, realStatus);

  let ok = true;
  if (!onDecoy.blocked) { console.error('[self-test] FAIL — decoy file was NOT refused.'); ok = false; }
  else console.log('[self-test] PASS — decoy file refused:', onDecoy.decoy.fileName);
  if (onReal.blocked) { console.error('[self-test] FAIL — the real file was refused as if it were a decoy.'); ok = false; }
  else console.log('[self-test] PASS — real file not flagged as a decoy.');

  process.exit(ok ? 0 : 1);
}

// ── the sandbox snapshot (runs inside Figma Desktop via figma_execute) ────

/**
 * Build the code string figma_execute runs. Returns the RAW per-set dump —
 * see scripts/contracts/__fixtures__/canvas-sample.json for its shape (one
 * entry of the `sets` array below). The transform into contract shape
 * (`buildCanvasContract`) happens back in Node, never in the sandbox, so the
 * exact same function runs whether the input came from Figma or a fixture.
 */
function snapshotCode(wanted) {
  return `
    await figma.loadAllPagesAsync();
    const WANTED = ${JSON.stringify(wanted)};

    async function resolveVar(id) {
      try {
        const v = await figma.variables.getVariableByIdAsync(id);
        return v ? v.name : null;
      } catch (e) { return null; }
    }

    async function collectBoundVariables(n) {
      const out = {};
      const bv = n.boundVariables || {};
      for (const prop in bv) {
        const ref = bv[prop];
        if (ref && ref.type === 'VARIABLE_ALIAS' && ref.id) out[prop] = await resolveVar(ref.id);
      }
      if (Array.isArray(n.fills)) {
        for (let i = 0; i < n.fills.length; i++) {
          const id = n.fills[i] && n.fills[i].boundVariables && n.fills[i].boundVariables.color && n.fills[i].boundVariables.color.id;
          if (id) out['fills[' + i + '].color'] = await resolveVar(id);
        }
      }
      if (Array.isArray(n.strokes)) {
        for (let i = 0; i < n.strokes.length; i++) {
          const id = n.strokes[i] && n.strokes[i].boundVariables && n.strokes[i].boundVariables.color && n.strokes[i].boundVariables.color.id;
          if (id) out['strokes[' + i + '].color'] = await resolveVar(id);
        }
      }
      return out;
    }

    async function anatomyNode(n, depth, budget) {
      budget.visited += 1;
      const boundVariables = await collectBoundVariables(n);
      let textStyle = null;
      if (n.type === 'TEXT' && n.textStyleId && typeof n.textStyleId === 'string') {
        try { const s = await figma.getStyleByIdAsync(n.textStyleId); textStyle = s ? s.name : null; }
        catch (e) { textStyle = null; }
      }
      let children = [];
      if (depth > 0 && 'children' in n && n.children) {
        for (const c of n.children) {
          if (budget.visited >= budget.max) { budget.truncated = true; break; }
          children.push(await anatomyNode(c, depth - 1, budget));
        }
      }
      return { name: n.name, type: n.type, boundVariables, textStyle, children };
    }

    // 🛠 component pages only — same scan refresh-figma-digests.mjs's SNAPSHOT_CODE uses.
    const setsByName = {};
    for (const page of figma.root.children) {
      if (!page.name.startsWith('\\u{1F6E0}')) continue;
      for (const node of page.findAllWithCriteria({ types: ['COMPONENT_SET'] })) {
        if (!setsByName[node.name]) setsByName[node.name] = node;
      }
    }

    const out = [];
    for (const w of WANTED) {
      let node = null;
      if (w.nodeId) { try { node = await figma.getNodeByIdAsync(w.nodeId); } catch (e) { node = null; } }
      if (!node) node = setsByName[w.name] || null;
      if (!node) { out.push({ tag: w.tag, name: w.name, nodeId: w.nodeId, missing: true }); continue; }

      let defs = {};
      try {
        defs = Object.fromEntries(
          Object.entries(node.componentPropertyDefinitions || {}).map(([k, d]) => [k, { type: d.type, options: d.variantOptions || null }]),
        );
      } catch (e) { defs = { __error: String(e) }; }

      const variants = node.type === 'COMPONENT_SET'
        ? node.children.map((c) => ({ name: c.name }))
        : [{ name: node.name }];
      const base = node.type === 'COMPONENT_SET' ? node.defaultVariant : node;
      const budget = { visited: 0, max: ${MAX_ANATOMY_NODES}, truncated: false };
      const anatomy = base ? await anatomyNode(base, ${ANATOMY_DEPTH}, budget) : null;

      out.push({
        tag: w.tag,
        fileKey: figma.fileKey || null,
        name: node.name,
        nodeId: node.id,
        defs,
        variants,
        defaultVariantName: base ? base.name : null,
        anatomy,
        anatomyTruncated: budget.truncated,
      });
    }
    return JSON.stringify({ fileKey: figma.fileKey || null, sets: out });
  `;
}

// ── raw dump -> contract-shaped transform (fixture AND live share this) ───

/** Raw anatomy node (fixture shape, or the sandbox's `anatomyNode` output) -> canvasNode + token/text-style collection. */
function buildAnatomy(rawNode) {
  if (!rawNode) return { anatomy: null, tokens: [], textStyles: [] };
  const tokens = new Set();
  const textStyles = new Set();

  const walk = (n) => {
    const boundVariables = {};
    for (const [key, value] of Object.entries(n.boundVariables ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
      boundVariables[key] = value ?? null;
      if (value) tokens.add(value);
    }
    if (n.textStyle) textStyles.add(n.textStyle);
    return {
      name: n.name,
      type: n.type,
      textStyle: n.textStyle ?? null,
      boundVariables,
      children: (n.children ?? []).map(walk),
    };
  };

  return { anatomy: walk(rawNode), tokens: [...tokens].sort(), textStyles: [...textStyles].sort() };
}

/**
 * The transform pipeline: ONE raw per-set dump -> ONE canvas contract. Pure —
 * no fs/network — so `--from-fixture` exercises exactly what the live path
 * runs after `figma_execute` returns.
 *
 * @param {string} tag
 * @param {object|null} raw one entry of the sandbox's `sets` array, or null (set not requested/found)
 * @param {object} project resolved project record
 * @param {object|null} manifestEntry this tag's parity-manifest entry, for a name/nodeId fallback when raw is missing
 */
export function buildCanvasContract(tag, raw, project, manifestEntry) {
  const missing = !raw || raw.missing;
  const defs = raw?.defs && !raw.defs.__error ? raw.defs : {};

  const propsByName = new Map();
  for (const [rawKey, def] of Object.entries(defs)) {
    const name = normPropKey(rawKey);
    propsByName.set(name, {
      type: def?.type ?? 'NONE',
      values: def?.options?.length ? def.options.slice().sort() : null,
    });
  }

  const componentProperties = [...propsByName.entries()]
    .map(([name, def]) => ({ name, type: def.type, values: def.values }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const variantAxes = componentProperties
    .filter((p) => p.type === 'VARIANT')
    .map((p) => ({ name: p.name, values: p.values ?? [] }));

  const stateAxis = variantAxes.find((a) => normState(a.name) === 'state');
  const states = stateAxis ? STATE_NAMES.filter((s) => stateAxis.values.some((v) => normState(v) === s)) : [];

  const { anatomy, tokens, textStyles } = buildAnatomy(raw?.anatomy ?? null);

  const degradations = [
    'props[].bindings.code — canvas has no code attribute names; see componentProperties for the Figma-side property list only.',
    'events, slots — not representable in a Figma component set.',
    'a11y.{ariaAttributes,cssParts} — ARIA attributes and CSS parts are code (CEM) facts; no accessibility read is performed from canvas.',
    'semantics.role — no live accessibility-tree read is performed from canvas.',
    'anatomy.*.tokens — canvas resolves Figma bound-VARIABLE NAMES only (see anatomy.*.boundVariables); it cannot know which `--al-*` custom property a variable maps to in code (see scripts/figma-atoms/token-map.mjs for that side).',
    'bindings.code — no code binding is derivable from canvas alone.',
  ];
  if (!states.length) degradations.push('states — no "State" variant axis found on this set.');
  if (missing) degradations.push('anatomy, variantAxes, componentProperties — the set was not found live (missing, renamed, or deleted in Figma).');
  // T17: the anatomy walk stops at MAX_ANATOMY_NODES total visited nodes,
  // not just `--depth` levels — named here, never a silent truncation, so a
  // reader (or contract-diff.mjs's token-binding comparison) knows this
  // anatomy is a PARTIAL read of a set too large to walk in full.
  if (raw?.anatomyTruncated) {
    degradations.push(`anatomy — node visit cap (${MAX_ANATOMY_NODES}) reached before the full tree was walked; anatomy/tokens is a partial read.`);
  }

  const figmaName = raw?.name ?? manifestEntry?.figma?.name ?? null;
  const nodeId = raw?.nodeId ?? manifestEntry?.figma?.nodeId ?? null;
  const fileKey = raw?.fileKey ?? project.figma.fileKey ?? null;

  return {
    $schema: '../canvas-contract.schema.json',
    component: tag,
    figma: { name: figmaName, nodeId, fileKey },
    variantAxes,
    componentProperties,
    states,
    textStyles,
    tokens,
    anatomySource: anatomy ? 'observed' : 'unavailable',
    anatomyCase: anatomy ? (raw?.defaultVariantName ?? null) : null,
    anatomy,
    bindings: {
      code: null,
      figma: {
        fileKey,
        componentSetName: figmaName,
        nodeId,
        url: figmaName ? figmaNodeUrlFor(project, nodeId) : null,
      },
    },
    degradations,
  };
}

// ── ajv validation (same bridge emit-contracts.mjs --check uses) ──────────

function validateWithAjv(contracts) {
  const require = createRequire(import.meta.url);
  let Ajv;
  try {
    Ajv = require('ajv');
  } catch (err) {
    console.error(`[canvas] ajv is not resolvable, skipping validation: ${err.message}`);
    return true;
  }
  const ajv = new Ajv({ strict: false, allErrors: true });
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
  const validate = ajv.compile(schema);

  let failures = 0;
  for (const { path, contract } of contracts) {
    const valid = validate(contract);
    if (!valid) {
      failures++;
      console.error(`[canvas] INVALID — ${relative(REPO_ROOT, path)}`);
      for (const e of validate.errors ?? []) console.error(`    ${e.instancePath || '/'}: ${e.message}`);
    }
  }
  if (failures) {
    console.error(`[canvas] --check FAILED — ${failures}/${contracts.length} canvas contracts do not satisfy canvas-contract.schema.json.`);
    return false;
  }
  console.log(`[canvas] --check PASSED — ${contracts.length}/${contracts.length} canvas contracts satisfy canvas-contract.schema.json.`);
  return true;
}

// ── shim transport (mirrors refresh-figma-digests.mjs's call()/parsePayload()) ──

async function call(name, args) {
  let res;
  try {
    res = await fetch(SHIM, { method: 'POST', body: JSON.stringify({ name, arguments: args }) });
  } catch {
    console.error(
      `Cannot reach the figma-console shim on :${PORT}.\n` +
        'Start it first:  node scripts/figma-atoms/mcp-shim.mjs\n' +
        '(Figma Desktop must be open with the Desktop Bridge plugin running, on the project\'s file.)',
    );
    process.exit(1);
  }
  const body = await res.json();
  if (body.error || body.isError) throw new Error(`${name} failed: ${JSON.stringify(body.error ?? body.text).slice(0, 500)}`);
  return body.text;
}

function parsePayload(text) {
  try {
    const outer = JSON.parse(text);
    if (typeof outer === 'string') return JSON.parse(outer);
    if (outer && typeof outer.result === 'string') return JSON.parse(outer.result);
    return outer?.result ?? outer;
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error(`unparseable figma_execute payload: ${text.slice(0, 300)}`);
    return JSON.parse(text.slice(start, end + 1));
  }
}

// ── output ──────────────────────────────────────────────────────────────

function writeContract(canvasDir, tag, contract) {
  mkdirSync(canvasDir, { recursive: true });
  const outPath = join(canvasDir, `${tag}.canvas.json`);
  writeFileSync(outPath, JSON.stringify(contract, null, 2) + '\n', 'utf8');
  return outPath;
}

function writeMeta(canvasDir, project, digests) {
  mkdirSync(canvasDir, { recursive: true });
  const metaPath = join(canvasDir, 'canvas-extraction-meta.json');
  const meta = {
    project: project.id,
    extractedAt: new Date().toISOString(),
    sets: Object.fromEntries(Object.entries(digests).sort(([a], [b]) => a.localeCompare(b))),
  };
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
  return metaPath;
}

// ── main ────────────────────────────────────────────────────────────────

async function main() {
  if (SELF_TEST) return runSelfTest();

  const project = resolveProject();
  const canvasDir = join(project.resolved.figmaSyncDir, 'canvas-contracts');

  if (FROM_FIXTURE) {
    const fixturePath = join(REPO_ROOT, FROM_FIXTURE);
    if (!existsSync(fixturePath)) {
      console.error(`[canvas] --from-fixture ${FROM_FIXTURE} does not exist.`);
      process.exit(1);
    }
    const raw = JSON.parse(readFileSync(fixturePath, 'utf8'));
    const tag = raw.tag;
    if (!tag) {
      console.error('[canvas] fixture is missing a "tag" field.');
      process.exit(1);
    }
    const manifest = readManifest(project);
    const manifestEntry = manifest?.components?.[tag] ?? null;

    const contract = buildCanvasContract(tag, raw, project, manifestEntry);
    const outPath = writeContract(canvasDir, tag, contract);
    const metaPath = writeMeta(canvasDir, project, { [tag]: digestOf(contract) });
    console.log(`[canvas] ${project.id}: extracted ${tag} from fixture -> ${relative(REPO_ROOT, outPath)}`);
    console.log(`[canvas] meta -> ${relative(REPO_ROOT, metaPath)}`);

    if (!validateWithAjv([{ path: outPath, contract }])) process.exit(1);
    return;
  }

  const manifest = readManifest(project);
  if (!manifest) {
    console.error(`[canvas] no parity manifest for "${project.id}" — run parity:seed first.`);
    process.exit(2);
  }

  const tags = COMPONENT ? [COMPONENT] : Object.keys(manifest.components ?? {}).sort();
  const wanted = [];
  const skipped = [];
  for (const tag of tags) {
    const entry = manifest.components?.[tag];
    if (!entry) {
      if (COMPONENT) { console.error(`[canvas] "${tag}" is not in the "${project.id}" parity manifest.`); process.exit(2); }
      continue;
    }
    if (entry.excluded || !entry.figma?.name) { skipped.push(tag); continue; }
    wanted.push({ tag, name: entry.figma.name, nodeId: entry.figma.nodeId ?? null });
  }
  if (!wanted.length) {
    console.error(`[canvas] nothing to extract — no Figma-mapped, non-excluded component${COMPONENT ? ` matching "${COMPONENT}"` : ''} in the "${project.id}" manifest.`);
    process.exit(2);
  }

  // Confirm the shim is reachable and NOT pointed at a decoy — before trusting
  // anything it returns (mirrors refresh-figma-digests.mjs exactly).
  const status = parsePayload(await call('figma_get_status', {}));
  const statusStr = JSON.stringify(status);
  const guard = checkDecoyGuard(project, statusStr);
  if (guard.blocked) {
    console.error(
      `Refusing to extract: Figma is on the "${guard.decoy.fileName}" DECOY file. Open "${project.figma.fileName}" (${project.figma.fileKey}).` +
        (guard.decoy.why ? `\n  ${guard.decoy.why}` : ''),
    );
    process.exit(1);
  }

  const payload = parsePayload(await call('figma_execute', { code: snapshotCode(wanted) }));
  if (payload.fileKey && payload.fileKey !== project.figma.fileKey) {
    console.error(
      `Refusing to extract: connected file is ${payload.fileKey}, expected ${project.figma.fileKey} ("${project.figma.fileName}").`,
    );
    process.exit(1);
  }

  const byTag = new Map((payload.sets ?? []).map((s) => [s.tag, s]));
  const contracts = [];
  const digests = {};
  let missingLive = 0;
  for (const { tag } of wanted) {
    const raw = byTag.get(tag) ?? null;
    if (raw?.missing) missingLive += 1;
    const manifestEntry = manifest.components[tag];
    const contract = buildCanvasContract(tag, raw, project, manifestEntry);
    const outPath = writeContract(canvasDir, tag, contract);
    digests[tag] = digestOf(contract);
    contracts.push({ path: outPath, contract });
  }
  const metaPath = writeMeta(canvasDir, project, digests);

  console.log(
    `[canvas] ${project.id}: extracted ${contracts.length} set(s) (${missingLive} not found live), skipped ${skipped.length} (excluded/unmapped).`,
  );
  console.log(`[canvas] meta -> ${relative(REPO_ROOT, metaPath)}`);

  if (!validateWithAjv(contracts)) process.exit(1);
}

await main();
