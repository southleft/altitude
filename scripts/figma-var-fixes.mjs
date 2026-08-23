#!/usr/bin/env node
/**
 * figma-var-fixes.mjs — emit the operations that make the Figma variables in
 * `Altitude Design System` match `styles/tokens/**`.
 *
 * Direction is code -> Figma. Deletions are NEVER emitted: Figma-only variables
 * are reported for a human to decide, because designs in the file may use them.
 */
import { writeFileSync } from 'node:fs';

const setValue = (name, collection, mode, value) => ({ op: 'set', name, collection, mode, value });
const create = (name, collection, type, values, why) => ({ op: 'create', name, collection, type, values, why });

const ops = [];

/* --- 1. Tier 2 Brand corruption ---------------------------------------- */
// Altitude primary-default is #FF00AA (magenta) and Southleft is #CC0088.
// styles/tokens/tier-2/brand/{altitude,southleft}/colors.json say blue.500 / red.500.
ops.push(setValue('theme/color/background/primary-default', 'Tier 2 Brand', 'Altitude', '{color/brand/blue/500}'));
ops.push(setValue('theme/color/background/primary-default', 'Tier 2 Brand', 'Southleft', '{color/brand/red/500}'));

// The six brand-level secondary variables are #FFFFFF placeholders. Code defines no
// brand-level secondary at all, so the correct no-op override is the Theme value (taupe).
const secondary = {
  'theme/color/background/secondary-default': '{color/brand/taupe/500}',
  'theme/color/background/secondary-strong': '{color/brand/taupe/400}',
  'theme/color/content/secondary-weak': '{color/brand/taupe/900}',
  'theme/color/content/secondary-default': '{color/brand/taupe/500}',
  'theme/color/content/secondary-strong': '{color/brand/taupe/400}',
  'theme/color/border/secondary-default': '{color/brand/taupe/500}',
};
for (const [n, v] of Object.entries(secondary)) {
  ops.push(setValue(n, 'Tier 2 Brand', 'Altitude', v));
  ops.push(setValue(n, 'Tier 2 Brand', 'Southleft', v));
}

/* --- 2. Value mismatches where code is authoritative -------------------- */
// Figma stores opacity as a percentage; Figma opacity fields are 0-1, and the code
// tokens are fractions. 40 bound to a layer opacity is meaningless.
ops.push(setValue('opacity/0', 'Tier 1', 'Default', 0));
ops.push(setValue('opacity/24', 'Tier 1', 'Default', 0.24));
ops.push(setValue('opacity/40', 'Tier 1', 'Default', 0.4));
ops.push(setValue('opacity/100', 'Tier 1', 'Default', 1));
// Rounding drift: 0.7*255 = 178.5. Code rounds up (B3), Figma down (B2).
ops.push(setValue('color/transparent/dark/70', 'Tier 1', 'Default', '#000000B3'));
ops.push(setValue('color/transparent/dark/90', 'Tier 1', 'Default', '#000000E6'));
ops.push(setValue('color/transparent/light/70', 'Tier 1', 'Default', '#FFFFFFB3'));
ops.push(setValue('color/transparent/light/90', 'Tier 1', 'Default', '#FFFFFFE6'));

/* --- 3. Tokens the code has and Figma lacks ----------------------------- */
const yellow = { 100:'#F8FFD1',200:'#EFFF9E',300:'#E4FB6D',400:'#D9F53E',500:'#CDEB13',600:'#A8C400',700:'#7E9600',800:'#566800',900:'#151A00' };
const violet = { 100:'#EDE7FF',200:'#D4C5FF',300:'#B69EFF',400:'#9878FF',500:'#7C5CFF',600:'#6344E8',700:'#4C32B8',800:'#33207F',900:'#0E0728' };
for (const [k, v] of Object.entries(yellow)) ops.push(create(`color/brand/yellow/${k}`, 'Tier 1', 'COLOR', { Default: v }, 'code has color.brand.yellow'));
for (const [k, v] of Object.entries(violet)) ops.push(create(`color/brand/violet/${k}`, 'Tier 1', 'COLOR', { Default: v }, 'code has color.brand.violet'));
ops.push(create('color/shadow/warm', 'Tier 1', 'COLOR', { Default: '#251B0C8C' }, 'code has color.shadow.warm'));
ops.push(create('color/shadow/violet', 'Tier 1', 'COLOR', { Default: '#7C5CFF59' }, 'code has color.shadow.violet'));

for (const r of [0, 12, 16, 24]) ops.push(create(`border/radius/${r}`, 'Tier 1', 'FLOAT', { Default: r }, 'code has border.radius'));
ops.push(create('theme/border/radius/xs', 'Tier 2', 'FLOAT', { Default: '{border/radius/2}' }, 'code has theme.border.radius.xs'));

ops.push(create('typography/font-size/56', 'Tier 1', 'FLOAT', { Default: 56 }, 'code has font-size.56'));
for (const lh of [16, 48, 60, 72, 110]) ops.push(create(`typography/line-height/${lh}`, 'Tier 1', 'FLOAT', { Default: lh }, 'code has line-height'));

// letter-spacing is 0% / 1% in code. Figma FLOAT is unitless — recorded as a caveat.
ops.push(create('typography/letter-spacing/0', 'Tier 1', 'FLOAT', { Default: 0 }, 'code letter-spacing.0 = 0% (unit lost)'));
ops.push(create('typography/letter-spacing/1', 'Tier 1', 'FLOAT', { Default: 1 }, 'code letter-spacing.1 = 1% (unit lost)'));

const families = {
  editorial: 'Georgia, Cambria, serif',
  grotesk: 'Archivo, Arial, sans-serif',
  tech: 'Space Grotesk, Arial, sans-serif',
  soft: 'DM Sans, Verdana, sans-serif',
  modern: 'Sora, Verdana, sans-serif',
};
for (const [k, v] of Object.entries(families)) ops.push(create(`typography/font-family/${k}`, 'Tier 1', 'STRING', { Default: v }, 'code has font-family'));

ops.push(create('typography/text-decoration/none', 'Tier 1', 'STRING', { Default: 'none' }, 'code has text-decoration.none'));
ops.push(create('typography/text-decoration/underline', 'Tier 1', 'STRING', { Default: 'underline' }, 'code has text-decoration.underline'));

for (const [k, v] of Object.entries({ sm: 8, md: 24, lg: 64 })) {
  ops.push(create(`animation/distance/${k}`, 'Tier 1', 'FLOAT', { Default: v }, 'code has animation.distance'));
}

writeFileSync('.altitude/figma-sync/figma-var-ops.json', JSON.stringify(ops, null, 1) + '\n');
const n = (t) => ops.filter(o => o.op === t).length;
console.log(`ops: ${ops.length}  (set ${n('set')}, create ${n('create')})`);
