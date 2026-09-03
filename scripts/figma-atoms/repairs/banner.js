/* Banner repair — run via figma_execute against set 729:229 in
 * Altitude Design System. Truth: libs/al-web-components/components/banner/banner.scss
 *
 *   container  fill    theme/color/background/neutral-default
 *              border  bottom only, theme/border/width solid theme/color/border/neutral-default
 *              radius  0 (page-level bar, not a card)
 *              pad     theme/space/sm (12) vert, theme/space/@ (16) horiz
 *              gap     theme/space/@ (16)   [lives on the Main Content row]
 *   tone icon  fill    theme/color/content/{info|success|warning|danger}-default
 *   text       fill    theme/color/content/neutral-default (anatomy Figma adds beyond the
 *                      code — Title/Description — keeps its type styles, colors bound)
 *
 * Instances inside (Button (Icon), tone icon) are only OVERRIDDEN for the tone
 * vector fill; the Button (Icon) master gets its own repair.
 */
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) V[v.name] = v;
const need = [
  'theme/color/background/neutral-default', 'theme/color/border/neutral-default', 'theme/color/content/neutral-default',
  'theme/color/content/info-default', 'theme/color/content/success-default',
  'theme/color/content/warning-default', 'theme/color/content/danger-default',
  'theme/space/@', 'theme/space/sm', 'theme/border/width/@',
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
  // Trap: the literal passed here stays as the fallback colour — it MUST be the
  // variable's own resolved value, never black or a measured colour.
  return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: await rgbOf(V[name]) }, 'color', V[name]);
}

const TONE = { Info: 'info', Success: 'success', Warning: 'warning', Danger: 'danger' };
const set = await figma.getNodeByIdAsync('729:229');
if (!set || set.type !== 'COMPONENT_SET' || set.name !== 'Banner') return 'WRONG NODE: ' + (set && set.name);
const log = [];

for (const comp of set.children) {
  const toneName = (comp.name.match(/Variant=(\w+)/) || [])[1];
  const tone = TONE[toneName];
  const entry = { variant: comp.name, ops: [] };

  // 1. container fill
  comp.fills = [await boundSolid('theme/color/background/neutral-default')];
  entry.ops.push('fill');

  // 2. radius -> 0 (unbind first)
  for (const f of ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius']) {
    try { comp.setBoundVariable(f, null); } catch (e) { /* not bound */ }
    comp[f] = 0;
  }
  entry.ops.push('radius=0');

  // 3. padding sm/@ all bound
  comp.setBoundVariable('paddingTop', V['theme/space/sm']);
  comp.setBoundVariable('paddingBottom', V['theme/space/sm']);
  comp.setBoundVariable('paddingLeft', V['theme/space/@']);
  comp.setBoundVariable('paddingRight', V['theme/space/@']);
  entry.ops.push('padding');

  // 4. bottom border only
  comp.strokes = [await boundSolid('theme/color/border/neutral-default')];
  comp.strokeAlign = 'INSIDE';
  comp.strokeTopWeight = 0; comp.strokeLeftWeight = 0; comp.strokeRightWeight = 0;
  try { comp.setBoundVariable('strokeBottomWeight', V['theme/border/width/@']); } catch (e) { comp.strokeBottomWeight = 1; }
  entry.ops.push('borderBottom');

  // 5. descendants
  const walk = async (n, insideInstance) => {
    if (n.name === 'Main Content' && n.type === 'FRAME') {
      n.setBoundVariable('itemSpacing', V['theme/space/@']);
      try { n.setBoundVariable('paddingTop', null); } catch (e) { /* ok */ }
      n.paddingTop = 0;
      entry.ops.push('gap=@');
    }
    // tone icon: an INSTANCE directly under Main Content whose vector carries the tone colour
    if (n.type === 'VECTOR' && tone && !n.name.includes('arrow')) {
      const parentChain = [];
      let p = n.parent;
      while (p && p.type !== 'COMPONENT') { parentChain.push(p.name); p = p.parent; }
      const inButton = parentChain.some((x) => /button/i.test(x));
      if (!inButton) {
        try {
          n.fills = [await boundSolid('theme/color/content/' + tone + '-default')];
          entry.ops.push('icon:' + tone);
        } catch (e) { entry.ops.push('icon-FAIL:' + e.message); }
      }
    }
    if (n.type === 'TEXT' && !insideInstance) {
      const unbound = !(n.fills && n.fills[0] && n.fills[0].boundVariables && n.fills[0].boundVariables.color);
      if (unbound) {
        try {
          n.fills = [await boundSolid('theme/color/content/neutral-default')];
          entry.ops.push('text:' + n.name);
        } catch (e) { entry.ops.push('text-FAIL:' + n.name); }
      }
    }
    if ('children' in n) {
      for (const c of n.children) await walk(c, insideInstance || n.type === 'INSTANCE');
    }
  };
  for (const c of comp.children) await walk(c, false);
  log.push(entry);
}
return JSON.stringify(log);
