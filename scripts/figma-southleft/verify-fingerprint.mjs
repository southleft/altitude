#!/usr/bin/env node
/**
 * verify-fingerprint.mjs — compute the canonical fingerprint of the PLAN so it
 * can be compared against the same fingerprint computed inside Figma
 * (see the `figma_execute` snippet printed by --snippet).
 *
 * Canonical line: `<collection>|<name>|<TYPE>|<modeValue>[;<modeValue>]`
 *   alias  -> '@' + target variable name
 *   color  -> lowercase #rrggbb[aa] (alpha only when < 1)
 *   number -> String(Number(n.toFixed(4)))
 * Lines are sorted lexicographically, joined with \n, hashed with FNV-1a/32.
 */
import { readFileSync } from 'node:fs';

const plan = JSON.parse(readFileSync('scripts/figma-southleft/out/plan.json', 'utf8'));

const hex = (c) => {
  const h = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
  return '#' + h(c.r) + h(c.g) + h(c.b) + (c.a < 1 ? h(c.a) : '');
};
const enc = (spec, type) => {
  if (spec && typeof spec === 'object' && spec.alias) return '@' + spec.alias;
  const v = spec && typeof spec === 'object' && 'literal' in spec ? spec.literal : spec;
  if (type === 'COLOR') return hex(v);
  if (typeof v === 'number') return String(Number(v.toFixed(4)));
  return String(v);
};

const lines = [];
for (const c of plan.collections) {
  for (const v of c.variables) {
    lines.push([c.name, v.name, v.resolvedType, c.modes.map((m) => enc(v.values[m], v.resolvedType)).join(';')].join('|'));
  }
}
lines.sort();
const blob = lines.join('\n');

let h = 0x811c9dc5;
for (let i = 0; i < blob.length; i++) { h ^= blob.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }

console.log(JSON.stringify({ lines: lines.length, bytes: blob.length, fnv1a: h.toString(16) }, null, 1));
if (process.argv.includes('--sample')) console.log(lines.slice(0, 3).join('\n'));
