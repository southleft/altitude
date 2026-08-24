#!/usr/bin/env node
/**
 * link-text-styles.mjs — attach the library's shared TEXT STYLES to the text nodes
 * that build-page.mjs created.
 *
 * WHY this is a separate pass: build-page writes typography as literal fontName /
 * fontSize / lineHeight, because that is what the browser measurement gives it. The
 * numbers are right, but nothing REFERENCES the type scale — so a designer editing
 * `theme/typography/body/md/regular` in Figma changes nothing, and the file's type
 * ramp is decorative. Figma has no "bind text style to variable" primitive; the
 * shared style IS the binding, so the node has to point at it.
 *
 * Matching is exact on family + style + size + line-height. A node that matches no
 * style is left alone and REPORTED rather than snapped to a near neighbour — a
 * silently re-typed component is worse than an unlinked one.
 *
 *   node scripts/figma-atoms/link-text-styles.mjs --project southleft [--dry]
 */
import { scope, projectArg } from './project-scope.mjs';

const SC = scope(projectArg());
const DRY = process.argv.includes('--dry');
const shimArg = process.argv.indexOf('--shim');
const SHIM = shimArg > -1 ? Number(process.argv[shimArg + 1]) : 9401;

// 434 setTextStyleIdAsync calls do not fit in one 30s figma_execute. Chunk them and
// drive the loop from here; each call re-walks the tree but skips nodes already linked.
const chunkArg = process.argv.indexOf('--chunk');
const CHUNK = chunkArg > -1 ? Number(process.argv[chunkArg + 1]) : 120;

const CODE = `
if (figma.fileKey !== ${JSON.stringify(SC.fileKey)}) {
  throw new Error('REFUSING TO WRITE: expected ${SC.fileName} (${SC.fileKey}), got ' + figma.root.name);
}
const DRY = ${DRY};
const CHUNK = ${CHUNK};
await figma.loadAllPagesAsync();

const styles = await figma.getLocalTextStylesAsync();
const key = (fam, sty, size, lh) =>
  fam + '|' + sty + '|' + Math.round(size) + '|' + (lh && lh.unit === 'PIXELS' ? Math.round(lh.value) : 'auto');

// Prefer the SEMANTIC name (theme/typography/...) over the raw preset: it is what a
// designer picks from, and it is the level the code's tier-2 aliases live at.
const byKey = new Map();
for (const s of styles) {
  const k = key(s.fontName.family, s.fontName.style, s.fontSize, s.lineHeight);
  const isSemantic = s.name.indexOf('theme/typography/') === 0;
  const prev = byKey.get(k);
  if (!prev || (isSemantic && prev.name.indexOf('theme/typography/') !== 0)) byKey.set(k, s);
}

const texts = [];
function walk(n) {
  if (n.type === 'TEXT') texts.push(n);
  for (const c of (n.children || [])) walk(c);
}
for (const p of figma.root.children) {
  for (const s of p.children.filter((n) => n.type === 'COMPONENT_SET')) walk(s);
}

// Preload every font ONCE. Doing it per node was most of the cost.
if (!DRY) {
  const fonts = new Map();
  for (const t of texts) { const fn = t.fontName; if (fn && fn !== figma.mixed) fonts.set(fn.family + '|' + fn.style, fn); }
  for (const fn of fonts.values()) { try { await figma.loadFontAsync(fn); } catch (e) { /* unavailable */ } }
}

let linked = 0, already = 0, remaining = 0;
const unmatched = {};
for (const t of texts) {
  if (t.textStyleId) { already++; continue; }
  const fn = t.fontName;
  if (!fn || fn === figma.mixed) continue;
  const k = key(fn.family, fn.style, t.fontSize, t.lineHeight);
  const st = byKey.get(k);
  if (!st) { unmatched[k] = (unmatched[k] || 0) + 1; continue; }
  if (DRY) { linked++; continue; }
  if (linked >= CHUNK) { remaining++; continue; }
  await t.setTextStyleIdAsync(st.id);
  linked++;
}
return {
  dryRun: DRY,
  textNodes: texts.length,
  linked, alreadyLinked: already, remaining,
  distinctStyles: byKey.size,
  unmatched: Object.entries(unmatched).sort((a, b) => b[1] - a[1]).slice(0, 12),
};
`;

async function run() {
  const res = await fetch(`http://localhost:${SHIM}/call`, {
    method: 'POST',
    body: JSON.stringify({ name: 'figma_execute', arguments: { code: CODE, fileKey: SC.fileKey, timeout: 30000 } }),
  });
  const out = await res.json();
  let payload;
  try { payload = JSON.parse(out.text); } catch { console.error(out.text ?? out); process.exit(1); }
  if (payload.success === false || payload.error) { console.error('FAILED:', payload.error || payload); process.exit(1); }
  return payload.result;
}

let pass = 0, last = null;
for (;;) {
  const r = await run();
  last = r;
  console.log(`pass ${++pass}: linked ${r.linked}, already ${r.alreadyLinked}, remaining ${r.remaining ?? 0}`);
  if (DRY || !r.remaining) break;
  if (pass > 20) { console.error('too many passes'); break; }
}
console.log(JSON.stringify(last, null, 1));
