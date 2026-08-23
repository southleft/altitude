/* Badge repair — set 2626:541 in Altitude Design System.
 * Truth: libs/al-web-components/components/badge/badge.scss
 *
 *  Text badge  hug-sized, min 20x20 (size(2.5) literal in code), pad 0/xxs,
 *              radius theme/border/radius/round (pill; equals code's 20px at this size),
 *              gap theme/space/xxs, IBM Plex Sans Bold 12 (body-xs-bold)
 *  Dot badge   8x8 = theme/space/xs (code names the SPACE token, not icon/xs)
 *  Tones       Default: background/default-stronger + content/default
 *              info/success/warning/danger: background/{tone}-default + content/{tone}-weak
 *  Rename      Variant=Error -> Variant=Danger (code + this file's Banner both say Danger)
 */
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) V[v.name] = v;
const need = [
  'theme/color/background/default-stronger', 'theme/color/content/default',
  'theme/color/background/info-default', 'theme/color/content/info-weak',
  'theme/color/background/success-default', 'theme/color/content/success-weak',
  'theme/color/background/warning-default', 'theme/color/content/warning-weak',
  'theme/color/background/danger-default', 'theme/color/content/danger-weak',
  'theme/space/xxs', 'theme/space/xs', 'theme/border/radius/round',
];
const missing = need.filter((n) => !V[n]);
if (missing.length) return 'MISSING VARS: ' + missing.join(', ');

async function rgbOf(v) {
  const c = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
  let val = v.valuesByMode[c.defaultModeId];
  let guard = 0;
  while (val && val.type === 'VARIABLE_ALIAS' && guard++ < 8) {
    const nv = await figma.variables.getVariableByIdAsync(val.id);
    const nc = await figma.variables.getVariableCollectionByIdAsync(nv.variableCollectionId);
    val = nv.valuesByMode[nc.defaultModeId];
  }
  return val && val.r !== undefined ? { r: val.r, g: val.g, b: val.b } : { r: 0, g: 0, b: 0 };
}
async function boundSolid(name) {
  return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: await rgbOf(V[name]) }, 'color', V[name]);
}

const TONE = {
  Default: { bg: 'theme/color/background/default-stronger', fg: 'theme/color/content/default' },
  Info: { bg: 'theme/color/background/info-default', fg: 'theme/color/content/info-weak' },
  Success: { bg: 'theme/color/background/success-default', fg: 'theme/color/content/success-weak' },
  Warning: { bg: 'theme/color/background/warning-default', fg: 'theme/color/content/warning-weak' },
  Error: { bg: 'theme/color/background/danger-default', fg: 'theme/color/content/danger-weak' },
  Danger: { bg: 'theme/color/background/danger-default', fg: 'theme/color/content/danger-weak' },
};

const set = await figma.getNodeByIdAsync('2626:541');
if (!set || set.type !== 'COMPONENT_SET' || set.name !== 'Badge') return 'WRONG NODE: ' + (set && set.name);
const log = [];

for (const comp of set.children) {
  const type = (comp.name.match(/Type=(\w+)/) || [])[1];
  const toneName = (comp.name.match(/Variant=(\w+)/) || [])[1];
  const tone = TONE[toneName];
  if (!type || !tone) { log.push({ v: comp.name, skip: 'unparsed axes' }); continue; }
  const e = { v: comp.name, ops: [] };

  if (type === 'Text') {
    // size: hug with 20x20 minimum, instead of hard-bound 16x16 icon size
    for (const f of ['width', 'height']) { try { comp.setBoundVariable(f, null); } catch (err) { /* ok */ } }
    comp.primaryAxisSizingMode = 'AUTO';
    comp.counterAxisSizingMode = 'AUTO';
    comp.minWidth = 20; comp.minHeight = 20;
    comp.primaryAxisAlignItems = 'CENTER';
    comp.counterAxisAlignItems = 'CENTER';
    e.ops.push('hug+min20');
    // padding 0 / xxs
    comp.setBoundVariable('paddingLeft', V['theme/space/xxs']);
    comp.setBoundVariable('paddingRight', V['theme/space/xxs']);
    try { comp.setBoundVariable('paddingTop', null); comp.setBoundVariable('paddingBottom', null); } catch (err) { /* ok */ }
    comp.paddingTop = 0; comp.paddingBottom = 0;
    e.ops.push('pad');
    // gap xxs (was xs)
    comp.setBoundVariable('itemSpacing', V['theme/space/xxs']);
    e.ops.push('gap=xxs');
    // radius: normalize to theme/border/radius/round on all corners
    for (const f of ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius']) {
      comp.setBoundVariable(f, V['theme/border/radius/round']);
    }
    e.ops.push('radius=round');
    // fill
    comp.fills = [await boundSolid(tone.bg)];
    e.ops.push('fill');
    // text fill
    const walkT = async (n) => {
      if (n.type === 'TEXT') { n.fills = [await boundSolid(tone.fg)]; e.ops.push('text'); }
      if ('children' in n) for (const c of n.children) await walkT(c);
    };
    for (const c of comp.children) await walkT(c);
  } else if (type === 'Dot') {
    // 8x8 via theme/space/xs (provenance: the code sizes the dot with the SPACE token)
    comp.setBoundVariable('width', V['theme/space/xs']);
    comp.setBoundVariable('height', V['theme/space/xs']);
    e.ops.push('size=space/xs');
    // tone fill lives on the Dot ellipse
    const walkD = async (n) => {
      if (n.type === 'ELLIPSE' || (n.type === 'VECTOR' && n.name.toLowerCase().includes('dot'))) {
        n.fills = [await boundSolid(tone.bg)];
        e.ops.push('dotFill');
      }
      if ('children' in n) for (const c of n.children) await walkD(c);
    };
    for (const c of comp.children) await walkD(c);
  }

  // vocabulary: Error -> Danger
  if (toneName === 'Error') {
    comp.name = comp.name.replace('Variant=Error', 'Variant=Danger');
    e.ops.push('rename->Danger');
  }
  log.push(e);
}
return JSON.stringify(log);
