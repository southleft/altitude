/* Button (Icon) repair — set 729:2635 in Altitude Design System.
 * Truth: al-button hideText, BARE variant rows of ops/al-button--icon.json —
 * the existing set is authored transparent with content/default icons (it is what
 * Banner's dismiss/expand instances use), so Bare IS its code counterpart.
 *
 *  box      pad theme/space/xs (8, was sm=12), radius theme/border/radius/@ (4),
 *           min 40x40 (browser box: line-height-driven), transparent fill BOUND
 *           to theme/color/background/transparent-default for provenance
 *  icon     content/default; Hover -> content/default-weak (the code's only hover delta)
 *  focus    2px theme/color/border/primary-default ring
 *  disabled node opacity bound to theme/opacity/disabled (percentage var)
 */
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) V[v.name] = v;
const need = [
  'theme/color/background/transparent-default', 'theme/color/content/default',
  'theme/color/content/default-weak', 'theme/color/border/primary-default',
  'theme/space/xs', 'theme/border/radius/@', 'theme/opacity/disabled',
];
const missing = need.filter((n) => !V[n]);
if (missing.length) return 'MISSING VARS: ' + missing.join(', ');

async function rawOf(v) {
  const c = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
  let val = v.valuesByMode[c.defaultModeId];
  let guard = 0;
  while (val && val.type === 'VARIABLE_ALIAS' && guard++ < 8) {
    const nv = await figma.variables.getVariableByIdAsync(val.id);
    const nc = await figma.variables.getVariableCollectionByIdAsync(nv.variableCollectionId);
    val = nv.valuesByMode[nc.defaultModeId];
  }
  return val;
}
async function boundSolid(name) {
  const val = await rawOf(V[name]);
  const color = val && val.r !== undefined ? { r: val.r, g: val.g, b: val.b } : { r: 0, g: 0, b: 0 };
  let paint = { type: 'SOLID', color };
  // alpha lives on paint.opacity — dropping it turned Bare's transparent into solid black once
  if (val && val.a !== undefined && val.a < 1) paint.opacity = val.a;
  return figma.variables.setBoundVariableForPaint(paint, 'color', V[name]);
}

const set = await figma.getNodeByIdAsync('729:2635');
if (!set || set.type !== 'COMPONENT_SET' || set.name !== 'Button (Icon)') return 'WRONG NODE: ' + (set && set.name);
set.description = 'al-button hideText (Bare) — icon-only, transparent surface. Repaired against code tokens 2026-08-21.';
const log = [];

for (const comp of set.children) {
  const state = (comp.name.match(/State=(\w+)/) || [])[1];
  const e = { v: comp.name, ops: [] };

  // box: pad xs, radius @, min 40x40 centered
  for (const f of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']) comp.setBoundVariable(f, V['theme/space/xs']);
  for (const f of ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius']) comp.setBoundVariable(f, V['theme/border/radius/@']);
  comp.primaryAxisSizingMode = 'AUTO';
  comp.counterAxisSizingMode = 'AUTO';
  comp.minWidth = 40; comp.minHeight = 40;
  comp.primaryAxisAlignItems = 'CENTER';
  comp.counterAxisAlignItems = 'CENTER';
  e.ops.push('pad=xs,radius=@,min40');

  // fill: transparent, bound for provenance
  comp.fills = [await boundSolid('theme/color/background/transparent-default')];
  e.ops.push('fill=transparent');

  // disabled dim
  if (state === 'Disabled') {
    try { comp.setBoundVariable('opacity', V['theme/opacity/disabled']); e.ops.push('opacity=var'); }
    catch (err) { comp.opacity = 0.4; e.ops.push('opacity=lit'); }
  } else if (comp.opacity !== 1) { comp.opacity = 1; e.ops.push('opacity=1'); }

  // icon vectors + focus ring
  const iconVar = state === 'Hover' ? 'theme/color/content/default-weak' : 'theme/color/content/default';
  const walk = async (n) => {
    if (n.type === 'VECTOR' && n.name !== 'Focus Outline') {
      try { n.fills = [await boundSolid(iconVar)]; e.ops.push('icon'); } catch (err) { e.ops.push('icon-FAIL'); }
    }
    if (n.name === 'Focus Outline') {
      n.strokes = [await boundSolid('theme/color/border/primary-default')];
      n.strokeWeight = 2;
      e.ops.push('focusRing');
    }
    if ('children' in n) for (const c of n.children) await walk(c);
  };
  for (const c of comp.children) await walk(c);
  log.push(e);
}
return JSON.stringify(log);
