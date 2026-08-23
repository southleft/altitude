#!/usr/bin/env node
/**
 * build-button-ops.mjs — turn the measured Button spec into Figma bind operations.
 * Every colour/number is a VARIABLE binding resolved from the token the CSS names.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { figmaVariableFor } from './token-map.mjs';

const spec = JSON.parse(readFileSync('.altitude/figma-sync/button-spec.json', 'utf8'));
const unresolved = new Set();
const v = (css) => {
  if (!css) return null;
  const f = figmaVariableFor(css);
  if (!f) { unresolved.add(css); return null; }
  return f;
};

const ops = spec.map((row) => {
  const t = row.tokens;
  const styleOf = row.authored['border-top-style'];
  const hasBorder = styleOf && styleOf !== 'none' && row.computed.bw > 0;
  return {
    variant: `State=${row.State}, Variant=${row.Variant}`,
    fill: v(t['background-color']),
    textColor: v(t['color']),
    opacity: t['opacity'] ? v(t['opacity']) : null,
    stroke: hasBorder ? { color: v(t['border-top-color']), width: v(t['border-top-width']) } : null,
    padding: {
      top: v(t['padding-top']), right: v(t['padding-right']),
      bottom: v(t['padding-bottom']), left: v(t['padding-left']),
    },
    radius: {
      tl: v(t['border-top-left-radius']), tr: v(t['border-top-right-radius']),
      br: v(t['border-bottom-right-radius']), bl: v(t['border-bottom-left-radius']),
    },
    gap: v(t['column-gap']),
    // Focus is drawn as a 2px stroke in this library, not a CSS outline.
    focusRing: row.State === 'Focus'
      ? { width: v(t['outline-width']) || 'theme/border/width/md', color: 'theme/color/border/primary-default' }
      : null,
    text: row.text ? { family: row.text.ff, size: row.text.fs, weight: row.text.fw, lineHeight: row.text.lh } : null,
    expected: { w: row.size.w, h: row.size.h, bg: row.computed.bg, fc: row.computed.fc },
  };
});

writeFileSync('.altitude/figma-sync/button-ops.json', JSON.stringify(ops, null, 1) + '\n');
const nulls = ops.filter((o) => !o.fill || !o.textColor).length;
console.log(`variants: ${ops.length}`);
console.log(`missing fill/text binding: ${nulls}`);
console.log(`unresolved css names: ${unresolved.size ? [...unresolved].join(', ') : 'none'}`);
console.log('\nsample:', JSON.stringify(ops[0], null, 1));
