/**
 * visual-facts.mjs — the non-geometric half of Figma↔code verification.
 *
 * T4, spec 2026-08-29-parity-judgement-gates-and-evals.
 *
 * WHY. `verify-figma.mjs` compared bounding boxes and nothing else, and
 * `visual-compare.mjs` captured PNG pairs and compared nothing at all. So
 * **colour, glyph identity and label text had no gate anywhere in the repo** —
 * a set could be built in the wrong colour, with the wrong words in it, and
 * pass every check. The only thing standing there was a human flipping through
 * screenshots, and the snippet skill's own trap 9 records how that goes:
 * "Perception is not a comparator — the chips 'looked right' red at thumbnail
 * scale; the measured facts were correct and the eyeball was wrong."
 *
 * Both sides are STRUCTURED DATA — the measured tree carries `computed.bg` /
 * `computed.fc` / `text`, the Figma tree carries fills and `characters` — so
 * this is a comparator, not a judge. No model is involved.
 *
 * Every function returns a fact with an explicit `status`, and `skipped` is a
 * first-class outcome carrying its reason. A fact that cannot be compared must
 * say so; it must never silently count as agreement.
 */
import { cssColorToHex, figmaPaintToHex, sameColor } from './color.mjs';

export const FACT = {
  OK: 'ok',
  MISMATCH: 'MISMATCH',
  SKIPPED: 'skipped',
};

const fact = (kind, status, detail, extra = {}) => ({ kind, status, detail, ...extra });

/**
 * Normalize text for comparison.
 *
 * Collapses whitespace and strips zero-width characters: the browser reports
 * the DOM's whitespace, Figma reports what was typed into the text node, and
 * they differ on line breaks and indentation for text that is identical to a
 * reader. Case and punctuation are NOT normalized — "Get started" vs "Get
 * Started" is a real difference in a design system.
 */
export function normalizeText(s) {
  if (typeof s !== 'string') return null;
  const out = s.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
  return out === '' ? null : out;
}

/**
 * Does the Figma node say the same words as the measured node?
 *
 * Only compares when the FIGMA side is a TEXT node. The measured side's `text`
 * is a subtree roll-up, so a measured container whose words are split across
 * several Figma text nodes would mismatch for a reason that is about tree
 * shape, not content — that is the geometry walk's job to report, not this.
 */
export function compareText(measured, figma) {
  if (!figma || figma.type !== 'TEXT') {
    return fact('text', FACT.SKIPPED, 'the paired Figma node is not a TEXT node — nothing to compare words against');
  }
  const m = normalizeText(measured?.text);
  const f = normalizeText(figma.characters);
  if (m === null && f === null) return fact('text', FACT.SKIPPED, 'neither side carries text');
  if (m === null) return fact('text', FACT.MISMATCH, `Figma reads "${f}" but the measured node has no text`, { measured: null, figma: f });
  if (f === null) return fact('text', FACT.MISMATCH, `the measured node reads "${m}" but the Figma text node is empty`, { measured: m, figma: null });
  if (m === f) return fact('text', FACT.OK, `both read "${m}"`, { measured: m, figma: f });
  return fact('text', FACT.MISMATCH, `measured "${m}" vs Figma "${f}"`, { measured: m, figma: f });
}

/**
 * Does the Figma node paint the same colour as the measured node?
 *
 * A TEXT node is compared against the measured FOREGROUND colour (`computed.fc`),
 * anything else against the measured BACKGROUND (`computed.bg`) — a text
 * node's fill IS its letter colour in Figma, which is the single most common
 * way this comparison gets written backwards.
 */
export function compareFill(measured, figma, { tolerance = 1 } = {}) {
  const isText = figma?.type === 'TEXT';
  const source = isText ? 'computed.fc' : 'computed.bg';
  const measuredCss = isText ? measured?.fc : measured?.bg;
  const mHex = cssColorToHex(measuredCss);
  const fHex = figmaPaintToHex(figma?.fill);

  if (mHex === null && fHex === null) {
    return fact('fill', FACT.SKIPPED, `neither side paints a flat colour (${source} = ${measuredCss ?? 'none'})`);
  }
  if (mHex === null) {
    // Not a mismatch: a gradient, an image or `transparent` on the measured
    // side is unrepresentable here, not proof the Figma paint is wrong.
    return fact('fill', FACT.SKIPPED, `the measured ${source} (${measuredCss ?? 'none'}) is not a flat colour; Figma paints ${fHex}`, { figma: fHex });
  }
  if (fHex === null) {
    return fact('fill', FACT.MISMATCH, `the measured ${source} is ${mHex} but the Figma node paints no flat colour`, { measured: mHex, figma: null });
  }
  if (sameColor(mHex, fHex, tolerance)) {
    // Name the source even on success: a reader has to be able to tell that a
    // TEXT node was compared against `computed.fc` and not `computed.bg`,
    // otherwise a pass proves nothing about which comparison actually ran.
    return fact('fill', FACT.OK, `both paint ${mHex} (${source})`, { measured: mHex, figma: fHex });
  }
  return fact('fill', FACT.MISMATCH, `measured ${source} is ${mHex}, Figma paints ${fHex}`, { measured: mHex, figma: fHex });
}

/**
 * Is the Figma node's fill bound to a variable, or is it a literal?
 *
 * Trap 4 in `altitude-figma-repair/SKILL.md`: **an unbound fill that happens
 * to be the right colour is still broken.** It will not follow a mode switch
 * and it will not follow a token change — `compareFill()` above passes it
 * clean, which is exactly why this is a separate fact and not folded into it.
 *
 * Only meaningful where a paint exists at all.
 */
export function compareFillBinding(figma) {
  if (figmaPaintToHex(figma?.fill) === null) {
    return fact('fill-binding', FACT.SKIPPED, 'no flat paint to bind');
  }
  if (figma?.fillBound) {
    return fact('fill-binding', FACT.OK, 'the fill is bound to a variable');
  }
  return fact('fill-binding', FACT.MISMATCH, 'the fill is a literal colour, not bound to a variable — it will not follow a mode switch or a token change');
}

/** Every non-geometric fact for one paired node. */
export function nodeFacts(measured, figma, opts = {}) {
  if (!measured || !figma) return [];
  return [compareText(measured, figma), compareFill(measured, figma, opts), compareFillBinding(figma)];
}

/** Roll up fact statuses across rows: `{ ok, mismatch, skipped }`. */
export function summarizeFacts(rows) {
  const out = { ok: 0, mismatch: 0, skipped: 0 };
  for (const row of rows) {
    for (const f of row.facts ?? []) {
      if (f.status === FACT.OK) out.ok += 1;
      else if (f.status === FACT.MISMATCH) out.mismatch += 1;
      else out.skipped += 1;
    }
  }
  return out;
}
