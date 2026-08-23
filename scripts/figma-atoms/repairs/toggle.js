/* Toggle repair — set 2874:20 in Altitude Design System.
 * Truth: libs/al-web-components/components/toggle/toggle.scss
 *
 *  track   40x22 pill, Off: background/default-strong, On: background/primary-default
 *  knob    18x18, content/default, shadow theme/box-shadow/xs = 0/2/2/0 theme/color/shadow/default
 *  disabled = SAME fills as Default + node opacity bound to theme/opacity/disabled
 *             (the code only dims — it does not swap to disabled-* colours)
 *  hover   = pixel-identical to Default (code has NO :hover — Button/Active precedent;
 *            T15 stays open for a code-side hover if wanted)
 *  focus   = 2px border/primary-default ring (already present as Focus Outline rect)
 */
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) V[v.name] = v;
const need = [
  'theme/color/background/default-strong', 'theme/color/background/primary-default',
  'theme/color/content/default', 'theme/opacity/disabled', 'theme/color/border/primary-default',
];
const missing = need.filter((n) => !V[n]);
if (missing.length) return 'MISSING VARS: ' + missing.join(', ');
const shadowVar = V['theme/color/shadow/default'] || null;

async function rgbOf(v) {
  const c = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
  let val = v.valuesByMode[c.defaultModeId];
  let guard = 0;
  while (val && val.type === 'VARIABLE_ALIAS' && guard++ < 8) {
    const nv = await figma.variables.getVariableByIdAsync(val.id);
    const nc = await figma.variables.getVariableCollectionByIdAsync(nv.variableCollectionId);
    val = nv.valuesByMode[nc.defaultModeId];
  }
  return val && val.r !== undefined ? val : { r: 0, g: 0, b: 0, a: 1 };
}
async function boundSolid(name) {
  return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: await rgbOf(V[name]) }, 'color', V[name]);
}

const set = await figma.getNodeByIdAsync('2874:20');
if (!set || set.type !== 'COMPONENT_SET' || set.name !== 'Toggle') return 'WRONG NODE: ' + (set && set.name);
const log = [];

for (const comp of set.children) {
  const checked = /Checked=On/.test(comp.name);
  const state = (comp.name.match(/State=(\w+)/) || [])[1];
  const e = { v: comp.name, ops: [] };

  // 1. track fill — same for Default/Hover/Focus/Disabled (code never swaps it)
  comp.fills = [await boundSolid(checked ? 'theme/color/background/primary-default' : 'theme/color/background/default-strong')];
  e.ops.push('trackFill');

  // 2. disabled: dim via the opacity VARIABLE (percentage in Figma — trap #5)
  if (state === 'Disabled') {
    try { comp.setBoundVariable('opacity', V['theme/opacity/disabled']); e.ops.push('opacity=var'); }
    catch (err) { comp.opacity = 0.4; e.ops.push('opacity=0.4lit'); }
  } else if (comp.opacity !== 1) {
    comp.opacity = 1; e.ops.push('opacity=1');
  }

  // 3. knob: content/default + box-shadow/xs geometry, colour bound if the var exists
  for (const k of comp.children) {
    if (k.type === 'ELLIPSE' && k.name === 'Knob') {
      k.fills = [await boundSolid('theme/color/content/default')];
      const sc = shadowVar ? await rgbOf(shadowVar) : { r: 0, g: 0, b: 0, a: 0.6 };
      let fx = {
        type: 'DROP_SHADOW',
        color: { r: sc.r, g: sc.g, b: sc.b, a: sc.a !== undefined ? sc.a : 0.6 },
        offset: { x: 0, y: 2 }, radius: 2, spread: 0,
        visible: true, blendMode: 'NORMAL',
      };
      if (shadowVar) {
        try { fx = figma.variables.setBoundVariableForEffect(fx, 'color', shadowVar); e.ops.push('knobShadow=var'); }
        catch (err) { e.ops.push('knobShadow=lit'); }
      } else e.ops.push('knobShadow=lit');
      k.effects = [fx];
      e.ops.push('knobFill');
    }
    // 4. focus ring: 2px stroke
    if (k.name === 'Focus Outline') {
      k.strokes = [await boundSolid('theme/color/border/primary-default')];
      k.strokeWeight = 2;
      e.ops.push('focusRing');
    }
  }
  log.push(e);
}
return JSON.stringify(log);
