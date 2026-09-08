#!/usr/bin/env node
/**
 * build-metadata-ops.mjs — the METADATA-ONLY Figma payload.
 *
 * Usage:
 *   node scripts/contracts/figma/build-metadata-ops.mjs [--project altitude]
 *                                                       [--out <path>]
 *
 * Emits, for every contract bound to a real Figma component set, the two fields
 * a component set carries ABOUT ITSELF rather than about its geometry:
 *
 *   description         the set's own description box
 *   documentationLinks  the set's "documentation link" slot
 *
 * WHY THIS IS NOT `generate-figma.mjs`
 *
 * `generate-figma.mjs` builds a component SET: it replaces the whole set, mints
 * new node ids, and orphans every instance and every pinned node id pointing at
 * the old one. That is the right tool for "this set is wrong"; it is a
 * catastrophic tool for "this set needs a description". The ops emitted here
 * address an EXISTING set by its `bindings.figma.nodeId` and set two string-ish
 * fields on it. Nothing is created, nothing is measured, no variant is touched,
 * and re-running is idempotent.
 *
 * The doc-header frame that `generate-figma.mjs` draws on each page already
 * carries a documentation link (see `doc-header-style.mjs`). That is a TEXT
 * NODE on the canvas, readable by a person looking at the page. It is not the
 * component set's `documentationLinks`, which is what a tool retrieves — which
 * is why the AI-readiness audit scores documentation links at 4% while every
 * generated page visibly has one.
 *
 * WHAT THE DESCRIPTION CONTAINS
 *
 * Assembled from the contract, never stored redundantly: purpose, the tag,
 * props, slots, the accessibility contract, and the docs URL. Each of those has
 * exactly one source of truth elsewhere, so regenerating after a contract
 * change is how this stays honest. Sections with nothing to say are OMITTED
 * rather than emitted empty — a heading with nothing under it reads as
 * "documented" to a person skimming, which is the failure mode this whole
 * exercise exists to remove.
 *
 * AND FOR EACH VARIANT
 *
 * The set answers "what is this component". Every variant additionally answers
 * "what do I type to get THIS cell" — the markup for that combination, with any
 * axis value that is NOT reachable from an attribute (an interaction state; the
 * option Figma uses to name an omitted attribute) named explicitly rather than
 * quietly dropped. Variant names come from the parity manifest's observation of
 * the live canvas, so run `pnpm run parity:refresh` before this.
 *
 * Output is deterministic: no timestamps, contracts walked in sorted order.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveProject } from '../../../libs/altitude-mcp/src/lib/ds-project.mjs';
import { readManifest } from '../../../libs/altitude-mcp/src/lib/parity.mjs';
import { normKey } from '../../../libs/altitude-mcp/src/lib/contract-diff.mjs';
import { booleanTrueOption, codeValuesOf } from '../build-code-connect.mjs';
import { fileGuardSnippet } from './plugin-snippets.mjs';
import { loadComponentConfig } from './component-config.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : fallback;
};

const PROJECT = arg('--project', 'altitude');
const CONTRACTS = join(ROOT, '.altitude/contracts', PROJECT);
const OUT = resolve(ROOT, arg('--out', `.altitude/figma-sync/${PROJECT}-metadata-ops.json`));

/** The docs site publishes one page per component, slugged by the tag minus its
 *  prefix — `apps/docs/src/pages/components/[slug].astro` builds them from the
 *  registry, whose slug IS the component directory name. */
const DOCS_BASE = `${resolveProject(PROJECT).docs.productionBase}/components`;
const slugFor = (tag) => tag.replace(/^[a-z]{2}-/, '');

/** A description the CEM never filled in. Not worth shipping to Figma: it says
 *  strictly less than the set's own name already does. */
const BOILERPLATE = /^Component:\s*[a-z]{2}-[a-z0-9-]+$/;

/** The lead line of a prop's docs, as one line.
 *
 * Cut at the first NEWLINE as well as the first sentence, whichever comes
 * first. Altitude's prop JSDoc is overwhelmingly "one summary line, then a
 * per-value bullet list", and the summary line frequently has no full stop —
 * so a sentence-only rule collapses the entire bullet list onto one line and
 * the reference turns into a wall. Markdown bold is stripped: this string ends
 * up in a Figma description box, which renders no markup, so `**sm**` would
 * arrive with the asterisks visible. */
function oneLine(text) {
  if (!text) return '';
  const firstLine = String(text).split(/\r?\n/)[0];
  const flat = firstLine.replace(/\s+/g, ' ').replace(/\*\*/g, '').trim();
  const stop = flat.search(/\.(\s|$)/);
  return (stop > -1 ? flat.slice(0, stop + 1) : flat).trim();
}

/** How a prop's accepted values should read in the description.
 *
 * `type` alone says "enum", which tells a designer nothing. `rawType` carries
 * the authored union (`'sm' | 'lg'`) in the order the author wrote it, which is
 * the meaningful order — `values` is sorted alphabetically, so it would present
 * `lg | sm` and imply a ranking that is not the one in the code. Prefer
 * rawType when it IS a union, fall back to values, then to the bare type. */
function valueList(prop) {
  const raw = (prop.rawType ?? '').trim();
  if (raw.includes('|') && /'/.test(raw)) {
    return raw.split('|').map((v) => v.trim().replace(/^'|'$/g, '')).join(' | ');
  }
  if (Array.isArray(prop.values) && prop.values.length) return prop.values.join(' | ');
  return prop.type && prop.type !== 'string' ? prop.type : '';
}

/** The per-value bullet list under a prop's summary line, as {key, note}.
 *
 * Two spellings are live in the JSDoc and both must parse, because the authors
 * did not agree: `- **default** renders …` (bolded key, al-button's `variant`)
 * and `- omitted renders …` (bare key, al-button's `size`). Take the bold span
 * when there is one, else the first word. */
function valueBullets(text) {
  const out = [];
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const m = /^\s*-\s+(?:\*\*(?<bold>[^*]+)\*\*|(?<bare>\S+))\s+(?<note>.+)$/.exec(line);
    if (!m) continue;
    const key = (m.groups.bold ?? m.groups.bare).trim();
    out.push({ key, note: m.groups.note.replace(/\s+/g, ' ').trim() });
  }
  return out;
}

/** The bullets documenting values the prop's TYPE does not offer.
 *
 * The union says what you can SET; a bullet keyed on something outside it says
 * what happens when you DON'T — and that is exactly the case Figma gives a
 * name to, because a variant axis has no way to express "absent". al-button's
 * `variant` union is bare|neutral|secondary|tertiary while its Figma axis also
 * offers `Primary`; the reconciling fact ("**default** renders the primary
 * button") lives only in a bullet that `oneLine()` throws away.
 *
 * Booleans are excluded: `- **true** …` / `- **false** …` document the two
 * settable values, so every boolean would otherwise emit two lines of noise. */
function unsetValueBullets(prop) {
  if (prop.type === 'boolean') return [];
  const declared = new Set((prop.values ?? []).map(normKey));
  return valueBullets(prop.description).filter((b) => !declared.has(normKey(b.key)));
}

function describeProps(contract) {
  const props = (contract.props ?? []).filter((p) => !p.bindings?.figma?.omit);
  if (!props.length) return null;
  return props.flatMap((p) => {
    const values = valueList(p);
    const type = values ? `: ${values}` : '';
    const note = oneLine(p.description);
    const lines = [`- ${p.name}${type}${note ? ` — ${note}` : ''}`];
    for (const b of unsetValueBullets(p)) lines.push(`  - ${b.key}: ${b.note}`);
    return lines;
  });
}

function describeSlots(contract) {
  const slots = contract.slots ?? [];
  if (!slots.length) return null;
  return slots.map((s) => {
    const name = s.name ? s.name : '(default)';
    const note = oneLine(s.description);
    return `- ${name}${note ? ` — ${note}` : ''}`;
  });
}

function describeA11y(contract) {
  const a11y = contract.a11y ?? {};
  const sem = contract.semantics ?? {};
  const lines = [];
  if (sem.element) lines.push(`- element: <${sem.element}>`);
  if (sem.role) lines.push(`- role: ${sem.role}`);
  for (const k of a11y.keyboard ?? []) lines.push(`- key ${k.keys}: ${k.action}`);
  if (a11y.focus) lines.push(`- focus: ${a11y.focus}`);
  if (a11y.screenReader) lines.push(`- screen reader: ${a11y.screenReader}`);
  return lines.length ? lines : null;
}

function buildDescription(contract, docsUrl) {
  const out = [];
  const purpose = (contract.description ?? '').trim();
  if (purpose && !BOILERPLATE.test(purpose)) out.push(purpose, '');

  out.push(`Tag: ${contract.id}`);

  const props = describeProps(contract);
  if (props) out.push('', 'Props', ...props);

  const slots = describeSlots(contract);
  if (slots) out.push('', 'Slots', ...slots);

  const a11y = describeA11y(contract);
  if (a11y) out.push('', 'Accessibility', ...a11y);

  out.push('', `Docs: ${docsUrl}`);
  return out.join('\n');
}

/* ── per-variant metadata ───────────────────────────────────────────────────
 *
 * A component set's own description answers "what is this component". It does
 * NOT answer the question a designer has while looking at one cell of a
 * 120-cell grid: "what do I type to get THIS one". Each variant carries its
 * own description and documentation link for that.
 *
 * The variant NAMES come from the parity manifest's observation of the real
 * canvas (`figmaContract.variants`), not from the contract — a contract has no
 * variant matrix, and inventing one from the cartesian product of the axes
 * would mint cells that do not exist (repair SKILL trap 11, "the contract can
 * UNDER- and OVER-state the variant matrix"). Refresh the observation first:
 * `pnpm run parity:refresh`.
 */

/** Legal values come from types, never prose that may describe omitted defaults. */
function settableValues(prop) {
  return codeValuesOf(prop);
}

/** The HTML attribute for a prop, as the apps actually write it (camelCase —
 *  `hideText="true"`, not `hidetext`; HTML attribute names are case-insensitive
 *  and Lit lowercases on the way in). */
const attrOf = (prop) => prop.bindings?.code?.attribute ?? prop.name;

/** Figma variant axis -> how each of its options is reached from code.
 *
 * Returns `Map<axisName, Map<normalizedOption, {attr}|{note}>>`. An option with
 * neither is the axis's neutral `Default` cell and contributes nothing.
 *
 * The leftover rule is the whole point. An option that no code value produces
 * is either (a) the rendering you get when the attribute is OMITTED — true for
 * exactly one option of an enum-backed axis, which is how Figma names
 * al-button's unset default `Primary` — or (b) something not expressible as an
 * attribute at all, like `State=Hover`. Guessing between them silently is how
 * a description ends up asserting an attribute that does not exist, so the
 * ambiguous case degrades to a NAMED miss rather than a plausible sentence.
 */
function axisPlansOf(contract) {
  const byAxis = new Map();
  for (const p of contract.props ?? []) {
    const f = p.bindings?.figma;
    if (!f || f.omit || f.kind !== 'VARIANT' || !f.property) continue;
    if (!byAxis.has(f.property)) byAxis.set(f.property, { props: [], options: new Set() });
    const entry = byAxis.get(f.property);
    entry.props.push(p);
    for (const o of f.options ?? []) entry.options.add(o);
  }

  const plans = new Map();
  for (const [axis, { props, options }] of byAxis) {
    const plan = new Map();
    const leftovers = [];
    for (const option of options) {
      let hit = null;
      for (const p of props) {
        if (p.type === 'boolean') {
          const trueOption = booleanTrueOption(p.name, [...options]);
          if (trueOption && normKey(option) === normKey(trueOption)) {
            hit = { attr: { name: attrOf(p), value: 'true' } };
          } else if (trueOption && (options.size === 2 || ['off','no','false'].includes(normKey(option)))) {
            hit = { note: `the ${p.name} attribute is omitted (false)` };
          }
        } else {
          const v = settableValues(p).find((x) => normKey(x) === normKey(option));
          if (v) hit = { attr: { name: attrOf(p), value: v } };
        }
        if (hit?.attr) break;
      }
      if (hit) plan.set(normKey(option), hit);
      else if (normKey(option) !== 'default') leftovers.push(option);
    }

    const enums = props.filter((p) => p.type !== 'boolean');
    if (leftovers.length === 1 && enums.length === 1) {
      plan.set(normKey(leftovers[0]), {
        note: `the ${enums[0].name} attribute is omitted (its default rendering)`,
      });
    } else {
      /* More than one unmatched option on an axis that DOES have a settable
       * prop. This is not "unreachable" — it is unrecorded: two props can share
       * one axis (al-field-note's isError + isDisabled both pair with `State`)
       * and no contract field says which value produces which option (see
       * altitude-figma-repair, "Curating a pairing the emitter cannot derive").
       * Name the prop to look at rather than asserting the option is dead. */
      const owners = props.map((p) => p.name).join(' / ');
      for (const option of leftovers) {
        plan.set(normKey(option), {
          note: `the contract does not record which ${owners} value produces this option`,
        });
      }
    }
    plans.set(axis, plan);
  }
  return plans;
}

/** `"State=Hover, Variant=Primary"` -> `[["State","Hover"],["Variant","Primary"]]`,
 *  in the order Figma wrote them so the rendering is stable. */
function parseVariantName(name) {
  return String(name)
    .split(',')
    .map((part) => part.split('='))
    .filter((kv) => kv.length === 2)
    .map(([k, v]) => [k.trim(), v.trim()]);
}

export function buildVariantDescription(contract, setName, variantName, docsUrl) {
  const plans = axisPlansOf(contract);
  const pairs = parseVariantName(variantName);

  const attrs = [];
  const notes = [];
  const slotMarkup=[];
  const config=loadComponentConfig(ROOT,contract.id).config;
  for (const [axis, value] of pairs) {
    const recipe=config.variantAttributes?.[axis]?.[value];
    if(recipe){
      for(const [name,raw] of Object.entries(recipe)){
        const prop=contract.props.find(p=>p.name===name);
        if(!prop)throw new Error(`Unknown curated prop ${contract.id}.${name}`);
        if(raw!==false)attrs.push(`${attrOf(prop)}="${raw}"`);
      }
      notes.push(`- ${axis}=${value} — composed from the documented component properties${recipe.groupId?'; groupId must match the intended menu group':''}`);
      continue;
    }
    const slotAxis=(config.caseAxes||[]).find(a=>a.property===axis&&a.slot&&(contract.slots||[]).some(s=>s.name===a.slot));
    if(slotAxis&&['yes','no'].includes(normKey(value))){
      if(normKey(value)==='yes')slotMarkup.push(`<div slot="${slotAxis.slot}">${axis} content</div>`);
      else notes.push(`- ${axis}=${value} — the ${slotAxis.slot} slot is empty`);
      continue;
    }
    const hit = plans.get(axis)?.get(normKey(value));
    if (!hit?.attr && normKey(axis) === 'state' && ['hover', 'focus', 'focused', 'active'].includes(normKey(value))) {
      notes.push(`- ${axis}=${value} — transient browser interaction; reproduce with pointer or keyboard input`);
      continue;
    }
    if (!hit) {
      if (normKey(value) !== 'default') {
        notes.push(`- ${axis}=${value} — unmapped; this example does not reproduce this axis`);
      }
      continue;
    }
    if (hit.attr) attrs.push(`${hit.attr.name}="${hit.attr.value}"`);
    else notes.push(`- ${axis}=${value} — ${hit.note}`);
  }

  const hasDefaultSlot = (contract.slots ?? []).some((s) => !s.name);
  const open = `<${contract.id}${attrs.length ? ` ${attrs.join(' ')}` : ''}>`;
  const markup = `${open}${hasDefaultSlot?'Label':''}${slotMarkup.join('')}</${contract.id}>`;

  const out = [`${setName} — ${variantName}`, '', markup];
  if (notes.length) out.push('', ...notes);
  out.push('', `Docs: ${docsUrl}`);
  return out.join('\n');
}

function main() {
  if (!existsSync(CONTRACTS)) {
    throw new Error(`[metadata-ops] no contracts directory for project "${PROJECT}": ${CONTRACTS}`);
  }

  const files = readdirSync(CONTRACTS).filter((f) => f.endsWith('.contract.json')).sort();
  const sets = [];
  const skipped = [];
  let fileKey = null;

  /* Observed variant names, per tag. A missing manifest is not fatal — the set
   * descriptions do not depend on it — but it must be SAID, or a run that
   * quietly emitted no variants looks identical to one with none to emit. */
  const manifest = readManifest(resolveProject(PROJECT));
  if (!manifest) {
    console.warn(`[metadata-ops] no parity manifest for "${PROJECT}" — emitting set metadata only, no variants.`);
  }

  for (const file of files) {
    const contract = JSON.parse(readFileSync(join(CONTRACTS, file), 'utf8'));
    const figma = contract.bindings?.figma ?? {};
    /* No nodeId means no real set to write to. Generating an op for it would
     * either no-op or, worse, be "helpfully" resolved by name against some
     * other set. Report the count; do not guess. */
    if (!figma.nodeId) {
      skipped.push(contract.id);
      continue;
    }
    fileKey ??= figma.fileKey ?? null;
    const docsUrl = `${DOCS_BASE}/${slugFor(contract.id)}/`;
    const setName = figma.componentSetName ?? contract.name;
    const observed = manifest?.components?.[contract.id]?.figmaContract?.variants ?? [];
    sets.push({
      tag: contract.id,
      nodeId: figma.nodeId,
      componentSetName: setName,
      description: buildDescription(contract, docsUrl),
      annotations: (contract.a11y?.keyboard?.length || contract.a11y?.focus || contract.a11y?.screenReader)
        ? [{ label: describeA11y(contract).join('\n') }] : [],
      documentationLinks: [{ uri: docsUrl }],
      variants: observed.map((name) => ({
        name,
        description: buildVariantDescription(contract, setName, name, docsUrl),
        documentationLinks: [{ uri: docsUrl }],
      })),
    });
  }

  const payload = {
    schemaVersion: 1,
    generator: 'scripts/contracts/figma/build-metadata-ops.mjs',
    project: PROJECT,
    fileKey,
    note: 'Metadata only. Sets are addressed by nodeId and their variants by NAME ' +
          'within the set; no geometry, variant matrix or node structure is touched ' +
          'by applying this payload.',
    sets,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');

  /* The apply half.
   *
   * Writing these fields needs code running INSIDE the Figma plugin sandbox:
   * `description` and `documentationLinks` are plugin-API properties, not REST
   * ones, and the Dev Mode MCP server is read-only. The repo's established
   * route is `bridge-io.mjs` serving this payload on localhost:9223-9232 (the
   * only ports the Desktop Bridge manifest whitelists) with the sandbox
   * fetching it, rather than inlining a large payload into a code string.
   *
   * Emitted as a pasteable snippet so it works either way — driven by
   * `figma_execute`, or pasted into the plugin console by hand.
   *
   * Idempotent: it assigns two fields on nodes addressed BY ID, creates
   * nothing, and re-running writes the same values again. */
  const variantCount = sets.reduce((n, s) => n + s.variants.length, 0);

  const snippet = [
    fileGuardSnippet({fileKey: resolveProject(PROJECT).figma.fileKey, fileName: resolveProject(PROJECT).figma.fileName}),
    '// Altitude - apply component metadata (description + documentationLinks).',
    '// Prereq:  node scripts/figma-atoms/bridge-io.mjs --port 9229',
    '// Applies to ' + sets.length + ' sets and ' + variantCount + ' variants. Touches no geometry.',
    "const res = await fetch('http://localhost:9229/" + PROJECT + "-metadata-ops.json');",
    'const payload = await res.json();',
    '',
    '// A pinned id can resolve to a DETACHED node (repair SKILL trap 1):',
    '// node.removed is false, but its parent chain reaches no page in this',
    '// document. Writing there succeeds and changes nothing anyone can see.',
    'function isLive(n) {',
    '  try { if (n.removed) return false; } catch (e) { return false; }',
    '  var q = n;',
    "  while (q && q.type !== 'PAGE') q = q.parent;",
    '  return !!q && figma.root.children.indexOf(q) !== -1;',
    '}',
    '',
    'await figma.loadAllPagesAsync();',
    'const applied = [], missing = [], detached = [], wrongType = [];',
    'const variantsMissing = [];',
    'let variantsApplied = 0;',
    'for (const set of payload.sets) {',
    '  const node = await figma.getNodeByIdAsync(set.nodeId);',
    "  if (!node) { missing.push(set.tag); continue; }",
    '  // Guard the id. A stale nodeId that now resolves to something else would',
    '  // otherwise get a component description written onto an unrelated node.',
    "  if (node.type !== 'COMPONENT_SET' && node.type !== 'COMPONENT') {",
    "    wrongType.push(set.tag + ' -> ' + node.type); continue;",
    '  }',
    '  if (!isLive(node)) { detached.push(set.tag); continue; }',
    '  node.description = set.description;',
    '  node.documentationLinks = set.documentationLinks;',
    '  if (set.annotations.length) node.annotations = set.annotations;',
    '  applied.push(set.tag);',
    '',
    '  // Variants resolve BY NAME inside their own set, never by id: a set',
    '  // rebuild re-mints every child id, and a name that no longer exists is',
    '  // reported rather than skipped.',
    "  if (node.type !== 'COMPONENT_SET') continue;",
    '  const byName = new Map(node.children.map(function (c) { return [c.name, c]; }));',
    '  for (const v of set.variants || []) {',
    '    const child = byName.get(v.name);',
    "    if (!child) { variantsMissing.push(set.tag + ' / ' + v.name); continue; }",
    '    child.description = v.description;',
    '    child.documentationLinks = v.documentationLinks;',
    '    variantsApplied += 1;',
    '  }',
    '}',
    "console.log('sets applied    ', applied.length);",
    "console.log('sets missing    ', missing.length, missing);",
    "console.log('sets detached   ', detached.length, detached);",
    "console.log('sets wrongType  ', wrongType.length, wrongType);",
    "console.log('variants applied', variantsApplied);",
    "console.log('variants missing', variantsMissing.length, variantsMissing);",
    "if (missing.length || detached.length || wrongType.length || variantsMissing.length) throw new Error('Metadata application incomplete');",
    '',
  ].join('\n');

  const snippetPath = OUT.replace(/[.]json$/, '-apply.js');
  writeFileSync(snippetPath, snippet);

  const withPurpose = sets.filter((s) => !s.description.startsWith('Tag:')).length;
  const withKeys = sets.filter((s) => s.description.includes('\n- key ')).length;
  const noVariants = sets.filter((s) => !s.variants.length).map((s) => s.tag);
  const unmapped = sets.reduce(
    (n, s) => n + s.variants.filter((v) => v.description.includes("does not record which")).length,
    0,
  );
  console.log(`[metadata-ops] ${sets.length} sets written to ${OUT}`);
  console.log(`[metadata-ops]   with purpose prose: ${withPurpose}`);
  console.log(`[metadata-ops]   with keyboard contract: ${withKeys}`);
  console.log(`[metadata-ops]   every set carries a documentation link`);
  console.log(`[metadata-ops] ${variantCount} variants, each with its own description + link`);
  if (unmapped) console.log(`[metadata-ops]   ${unmapped} variant axis value(s) map to no code value — named in the text`);
  if (noVariants.length) console.log(`[metadata-ops]   no observed variants for: ${noVariants.join(', ')}`);
  console.log(`[metadata-ops] ${skipped.length} contracts skipped (no bindings.figma.nodeId)`);
  console.log(`[metadata-ops] apply snippet: ${snippetPath}`);
}

if (resolve(process.argv[1] ?? '') === resolve(fileURLToPath(import.meta.url))) main();
