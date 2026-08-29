#!/usr/bin/env node
/**
 * generate-code.mjs — the REVERSE lane's emitter (spec
 * 2026-08-28-figma-to-code-generation T3–T6): a deep frame extract
 * (extract-frame.mjs) becomes DRAFT React-wrapper JSX (@southleft/al-react).
 *
 * Mapping rules (flag, never guess):
 *   - set name → tag: inverted from every contract's
 *     bindings.figma.componentSetName; misses degrade to a named TODO.
 *   - instance props → code props via the contract:
 *       1. a prop whose bindings.figma.property equals the Figma property
 *          name (VARIANT labels normalize — lowercase, alnum — against the
 *          prop's code values; the label "Default" means omit);
 *       2. else name fallback: Figma property name vs code prop name minus
 *          an is/has prefix (Dismissible → isDismissible), booleans from
 *          True/False/Yes/No labels;
 *       3. else FLAGGED as a comment + degradation ("Weight" today).
 *     "State" is the interaction axis, not a prop — skipped, flagged when
 *     not Default. TEXT properties become children.
 *   - arrangement → ALLayout ONLY (AGENTS.md rule): direction from the
 *     layout mode (column is the flow default and is omitted), wrap
 *     carried; gap/align/justify px facts ride as comments (mapping px to
 *     al-layout's token'd props is a judgment call v1 refuses to guess).
 *   - bare TEXT nodes → <span> with font metadata comments (drafts carry
 *     copy; promoting spans to DS type components is the human's call).
 *   - page-art (absolute overlays, vector grids, image fills, hidden
 *     nodes) → named degradation comments, never fabricated markup.
 *
 * Deterministic: same extract in → byte-identical .tsx out
 * (--check-determinism derives twice and compares).
 *
 * Usage:
 *   node scripts/contracts/generate-code.mjs --project southleft --extract hero [--check-determinism]
 * Output: <syncDir>/generated-code/<extract>.tsx (draft artifact, gitignored zone)
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

import { scope, projectArg } from '../figma-atoms/project-scope.mjs';
import { argOf } from '../lib/argv.mjs';
import { contractFilePath } from '../../libs/altitude-mcp/src/lib/parity.mjs';

const EXTRACT = argOf('--extract');
const CHECK_DETERMINISM = process.argv.includes('--check-determinism');
if (!EXTRACT) { console.error('usage: generate-code.mjs --project <id> --extract <name> [--check-determinism]'); process.exit(1); }

const SC = scope(projectArg());
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const pascal = (tag) => tag.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
const wrapperName = (tag) => 'AL' + pascal(tag.replace(/^al-/, ''));

/** set name -> {tag, contract} from every tracked contract. */
function loadSetMap(projectId) {
  const dir = dirname(contractFilePath(projectId, '_'));
  const map = new Map();
  if (!existsSync(dir)) return map;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.contract.json')).sort()) {
    try {
      const c = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      const setName = c.bindings?.figma?.componentSetName;
      if (c.id && setName && !map.has(setName)) map.set(setName, { tag: c.id, contract: c });
    } catch { /* unreadable sibling */ }
  }
  return map;
}

function mapInstanceProps(contract, figmaProps, notes) {
  const attrs = [];
  let childrenText = null;
  for (const [figName, rawVal] of Object.entries(figmaProps)) {
    const val = typeof rawVal === 'string' ? rawVal : rawVal;
    // TEXT property -> children
    if (figName === 'Text' && typeof val === 'string') { childrenText = val; continue; }
    // Interaction state axis is not a code prop.
    if (figName === 'State') {
      if (norm(String(val)) !== 'default') notes.push(`State=${val} is an interaction state, not a prop — dropped`);
      continue;
    }
    // Icon slots: swap ids with the slot hidden carry no code meaning.
    if (/^icon /i.test(figName)) continue;
    if (/^slot /i.test(figName)) {
      if (val === true) notes.push(`${figName}=true — slot content lived in Figma; supply slot children by hand`);
      continue;
    }
    // 1. contract binding by Figma property name
    let prop = (contract.props || []).find((p) => p.bindings?.figma?.property === figName);
    // 2. name fallback (is/has prefix stripped)
    if (!prop) prop = (contract.props || []).find((p) => norm(p.name.replace(/^(is|has)(?=[A-Z])/, '')) === norm(figName));
    if (!prop) {
      if (!(val === false || norm(String(val)) === 'default' || norm(String(val)) === 'false')) {
        notes.push(`unmapped Figma property ${figName}=${JSON.stringify(val)} — no contract prop pairs to it`);
      }
      continue;
    }
    if (prop.type === 'boolean' || typeof val === 'boolean') {
      const truthy = val === true || ['true', 'yes', 'on'].includes(norm(String(val)));
      const falsy = val === false || ['false', 'no', 'off', 'default'].includes(norm(String(val)));
      if (truthy) attrs.push(prop.name);
      else if (!falsy) notes.push(`boolean ${prop.name}: unrecognized label ${JSON.stringify(val)}`);
      continue;
    }
    if (norm(String(val)) === 'default') continue; // component default — omit
    const match = (prop.values || []).find((v) => norm(v) === norm(String(val)));
    if (match) attrs.push(`${prop.name}="${match}"`);
    else notes.push(`enum ${prop.name}: Figma label ${JSON.stringify(val)} matches none of ${JSON.stringify(prop.values || [])}`);
  }
  return { attrs, childrenText };
}

function esc(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/{/g, "{'{'}").replace(/}/g, "{'}'}");
}

function emit(node, setMap, depth, out, degradations, imports) {
  const ind = '  '.repeat(depth + 2);
  if (node.hidden) { degradations.push(`hidden:${node.name}`); return; }
  if (node.absolute || (node.fills || []).some((f) => f.type === 'IMAGE') || /^grid-[vh]$/.test(node.name)) {
    // Page-art: overlays, image fills, synthesized grid vectors.
    degradations.push(`page-art:${node.name}`);
    out.push(`${ind}{/* page-art (not DS-expressible): ${node.name} ${node.w}x${node.h}${node.absolute ? ' (absolute overlay)' : ''} */}`);
    return;
  }
  if (node.instance) {
    const hit = node.instance.set ? setMap.get(node.instance.set) : null;
    if (!hit) {
      degradations.push(`unmapped-set:${node.instance.set || node.instance.main}`);
      out.push(`${ind}{/* TODO unmapped component: instance of "${node.instance.set || node.instance.main}" */}`);
      return;
    }
    const comp = wrapperName(hit.tag);
    imports.add(comp);
    const notes = [];
    const { attrs, childrenText } = mapInstanceProps(hit.contract, node.instance.props || {}, notes);
    for (const n of notes) degradations.push(`prop:${comp}:${n}`);
    const noteStr = notes.length ? `${ind}{/* ${notes.join(' · ')} */}\n` : '';
    const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';
    if (childrenText) out.push(`${noteStr}${ind}<${comp}${attrStr}>${esc(childrenText)}</${comp}>`);
    else out.push(`${noteStr}${ind}<${comp}${attrStr} />`);
    return;
  }
  if (node.type === 'TEXT' && node.text) {
    const t = node.text;
    const meta = [t.textStyle ? `style: ${t.textStyle}` : `font: ${t.font} ${t.fontSize}px — no text style bound`];
    out.push(`${ind}{/* ${meta.join(' · ')} */}`);
    out.push(`${ind}<span>${esc(t.characters)}</span>`);
    if (!t.textStyle) degradations.push(`text-style-less:${String(t.characters).slice(0, 24)}`);
    return;
  }
  // Frame -> ALLayout (the ONLY arrangement element — AGENTS.md).
  const kids = node.children || [];
  if (!kids.length) { degradations.push(`empty-frame:${node.name}`); return; }
  imports.add('ALLayout');
  const attrs = [];
  if (node.layout?.mode === 'HORIZONTAL') attrs.push('direction="row"');
  if (node.layout?.wrap) attrs.push('wrap');
  const meta = [];
  if (node.layout) {
    if (node.layout.gap) meta.push(`gap ${node.layout.gap}px`);
    if (node.layout.rowGap) meta.push(`row-gap ${node.layout.rowGap}px`);
    if (node.layout.pad && node.layout.pad.some((p) => p > 0)) meta.push(`pad [${node.layout.pad.join(',')}]`);
    if (node.layout.alignItems && node.layout.alignItems !== 'MIN') meta.push(`align ${node.layout.alignItems}`);
    if (node.layout.justify && node.layout.justify !== 'MIN') meta.push(`justify ${node.layout.justify}`);
  }
  const metaStr = meta.length ? `${ind}{/* ${node.name}: ${meta.join(' · ')} — map to al-layout token props by hand */}\n` : '';
  out.push(`${metaStr}${ind}<ALLayout${attrs.length ? ' ' + attrs.join(' ') : ''}>`);
  for (const k of kids) emit(k, setMap, depth + 1, out, degradations, imports);
  out.push(`${ind}</ALLayout>`);
}

function derive(extract, setMap) {
  const out = [];
  const degradations = [];
  const imports = new Set();
  for (const k of extract.tree.children || []) emit(k, setMap, 0, out, degradations, imports);
  const compName = pascal(EXTRACT.replace(/[^a-z0-9]+/gi, '-')) + 'Draft';
  const importList = [...imports].sort().join(', ');
  const src = `// GENERATED DRAFT — figma-to-code (spec 2026-08-28-figma-to-code-generation).
// Source: Figma set ${JSON.stringify(extract.setName)} on page ${JSON.stringify(extract.pageName)} (${extract.setId}).
// Draft code for a NEW composition — review, then promote by hand; library
// components stay hand-authored. Comments carry every judgment this emitter
// refused to make; the degradation list is in the sidecar JSON.
import { ${importList} } from '@southleft/al-react';

export function ${compName}() {
  return (
    <ALLayout /* root: ${extract.tree.w}x${extract.tree.h} */>
${out.join('\n')}
    </ALLayout>
  );
}
`;
  return { src, degradations };
}

const extractPath = join(SC.dirs.sync, 'frame-extracts', `${EXTRACT}.extract.json`);
if (!existsSync(extractPath)) { console.error(`[generate-code] no ${extractPath} — run extract-frame.mjs first.`); process.exit(1); }
const extract = JSON.parse(readFileSync(extractPath, 'utf8'));
const setMap = loadSetMap(SC.id);

if (CHECK_DETERMINISM) {
  const a = derive(extract, setMap).src;
  const b = derive(extract, setMap).src;
  const ok = a === b;
  console.log(`[generate-code] --check-determinism ${SC.id}/${EXTRACT}: ${ok ? 'DETERMINISTIC' : 'NONDETERMINISTIC'}`);
  process.exit(ok ? 0 : 1);
}

/** Parallel emitter: the SAME derive tree as al-* custom elements — a
 * renderable fixture for the REVERSED verification bookend (T7). Wrappers
 * are 1:1 forwards, so the fixture renders exactly what the JSX would. */
function emitHtml(node, setMap, depth, out) {
  const ind = '  '.repeat(depth + 3);
  if (node.hidden || node.absolute || (node.fills || []).some((f) => f.type === 'IMAGE') || /^grid-[vh]$/.test(node.name)) return;
  if (node.instance) {
    const hit = node.instance.set ? setMap.get(node.instance.set) : null;
    if (!hit) return;
    const notes = [];
    const { attrs, childrenText } = mapInstanceProps(hit.contract, node.instance.props || {}, notes);
    const attrStr = attrs.length ? ' ' + attrs.map((a) => a.replace(/^([a-zA-Z]+)$/, '$1')).join(' ') : '';
    out.push(`${ind}<${hit.tag}${attrStr}>${childrenText ? String(childrenText).replace(/&/g, '&amp;').replace(/</g, '&lt;') : ''}</${hit.tag}>`);
    return;
  }
  if (node.type === 'TEXT' && node.text) {
    out.push(`${ind}<span>${String(node.text.characters).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`);
    return;
  }
  const kids = node.children || [];
  if (!kids.length) return;
  const attrs = [];
  if (node.layout?.mode === 'HORIZONTAL') attrs.push('direction="row"');
  if (node.layout?.wrap) attrs.push('wrap');
  out.push(`${ind}<al-layout${attrs.length ? ' ' + attrs.join(' ') : ''}>`);
  for (const k of kids) emitHtml(k, setMap, depth + 1, out);
  out.push(`${ind}</al-layout>`);
}

function deriveFixture(extract, setMap) {
  const body = [];
  for (const k of extract.tree.children || []) emitHtml(k, setMap, 0, body);
  return `<!doctype html>
<!-- GENERATED fixture for the reversed verification bookend (T7): the draft
     composition as al-* elements, rendered by the real bundle so the round
     trip can be MEASURED against the original section. -->
<html><head>
<meta charset="utf-8">
<link rel="stylesheet" href="/libs/al-web-components/dist/css/main.css">
<script>window.alAutoRegistry = true;</script>
</head><body style="margin:0">
<al-theme brand="southleft" mode="dark">
  <section data-section-id="${EXTRACT}-draft" style="width:${extract.tree.w}px">
${body.join('\n')}
  </section>
</al-theme>
<script type="module" src="../atoms-bundle.js"></script>
</body></html>
`;
}

const { src, degradations } = derive(extract, setMap);
const outDir = join(SC.dirs.sync, 'generated-code');
mkdirSync(outDir, { recursive: true });
const tsxPath = join(outDir, `${EXTRACT}.tsx`);
writeFileSync(tsxPath, src);
writeFileSync(join(outDir, `${EXTRACT}.degradations.json`), `${JSON.stringify(degradations, null, 2)}\n`);
const fixturePath = join(outDir, `${EXTRACT}.fixture.html`);
writeFileSync(fixturePath, deriveFixture(extract, setMap));
console.log(`[generate-code] ${SC.id}/${EXTRACT}: wrote ${tsxPath} (${src.split('\n').length} lines, ${degradations.length} degradations) + ${fixturePath}`);
for (const d of degradations.slice(0, 20)) console.log(`  - ${d}`);
