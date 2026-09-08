#!/usr/bin/env node
/** Describe existing source-matched variables/styles; add the source motion ramp.
 * Existing IDs, collection placement, values and unmatched designer assets survive.
 * Default is a dry run. --apply performs the reviewed plan in the registry target.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { scope, projectArg } from './project-scope.mjs';
import { call, parsePayload } from '../lib/figma-shim.mjs';
import { fileGuardSnippet } from '../contracts/figma/plugin-snippets.mjs';
import { figmaTokenDescription } from '../lib/figma-token-description.mjs';

const sc = scope(projectArg());
if (sc.id !== 'altitude') throw new Error('This source payload is scoped to the base Altitude token tree.');
const source = join(sc.libRoots[0], 'styles/tokens-dtcg');
const descriptions = {};
function walk(tree, prefix = '') {
  for (const [k, v] of Object.entries(tree)) {
    if (k.startsWith('$')) continue;
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && '$value' in v) {
      const description = figmaTokenDescription(path, v);
      if (description) descriptions[path.replaceAll('.', '/')] = description;
    } else if (v && typeof v === 'object') walk(v, path);
  }
}
for (const tier of ['tier-1', 'tier-2']) {
  for (const file of readdirSync(join(source, tier)).filter(f => f.endsWith('.json'))) {
    walk(JSON.parse(readFileSync(join(source, tier, file), 'utf8')));
  }
}
for (const tier of ['tier-2', 'tier-3']) walk(JSON.parse(readFileSync(join(source, tier, 'theme/light/colors.json'), 'utf8')));
// Existing Figma naming conventions: primitive typography is folder-prefixed;
// semantic text/effect styles omit the code's theme prefix.
for (const [name, description] of Object.entries(descriptions)) {
  if (/^(font-family|font-size|font-weight|line-height|letter-spacing|text-decoration)\//.test(name)) descriptions[`typography/${name}`] = description;
  if (/^theme\/(typography|box-shadow)\//.test(name)) descriptions[name.slice(6)] = description;
}
const payload = JSON.parse(readFileSync(join(sc.dirs.sync, 'altitude-figma-payload.json'), 'utf8'));
const motion = payload.collections.flatMap(c => Object.entries(c.variables[c.modes[0]])
  .filter(([name]) => /^(theme\/)?animation\/(duration|timing)\//.test(name))
  .map(([name, def]) => ({name, ...def})));
const apply = process.argv.includes('--apply');
await call('figma_navigate', { url: sc.project.figma.urlBase.replace('{fileKey}', sc.fileKey), lock: true });
const code = `${fileGuardSnippet(sc)}
const descriptions = ${JSON.stringify(descriptions)};
const motion = ${JSON.stringify(motion)};
const apply = ${apply};
const variables = await figma.variables.getLocalVariablesAsync();
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const byName = new Map();
for (const v of variables) { if(byName.has(v.name)) throw new Error('Ambiguous variable: '+v.name); byName.set(v.name,v); }
const primitive = collections.find(c=>c.name==='Tier 1 | Primitive');
const theme = collections.find(c=>c.name==='Tier 2 | Theme');
if(!primitive || !theme) throw new Error('Required existing collections missing');
for(const m of motion){
 const found=byName.get(m.name);
 if(found && found.resolvedType!==m.resolvedType) throw new Error('Motion type mismatch: '+m.name);
 if(typeof m.value==='string' && m.value.startsWith('{')) {
  const ref=m.value.slice(1,-1).replaceAll('.','/');
  if(!byName.has(ref) && !motion.some(x=>x.name===ref)) throw new Error('Missing alias '+ref);
 }
}
const result={apply, describedVariables:[], describedStyles:[], createdMotion:[], unmatchedVariables:[], unmatchedStyles:[]};
for(const m of motion){
 if(!byName.has(m.name)) {
  result.createdMotion.push(m.name);
  if(apply) byName.set(m.name,figma.variables.createVariable(m.name,m.name.startsWith('theme/')?theme:primitive,m.resolvedType));
 }
}
if(apply) for(const m of motion){
 if(!result.createdMotion.includes(m.name)) continue;
 const v=byName.get(m.name), c=collections.find(c=>c.id===v.variableCollectionId);
 const value=typeof m.value==='string' && m.value.startsWith('{')
  ? figma.variables.createVariableAlias(byName.get(m.value.slice(1,-1).replaceAll('.','/'))) : m.value;
 for(const mode of c.modes) v.setValueForMode(mode.modeId,value);
}
for(const v of byName.values()) {
 const d=descriptions[v.name];
 if(d){if(apply)v.description=d;result.describedVariables.push(v.name);}
 else {
  result.unmatchedVariables.push(v.name);
  if(apply && !v.description) v.description='Figma-only value: no exact token match in the current Altitude DTCG source. Retained for existing bindings; this name does not identify a supported code token.';
 }
}
for(const method of ['getLocalTextStylesAsync','getLocalEffectStylesAsync','getLocalPaintStylesAsync','getLocalGridStylesAsync']) {
 for(const s of await figma[method]()) {
  const d=descriptions[s.name];
  if(d){if(apply)s.description=d;result.describedStyles.push(s.name);}
  else result.unmatchedStyles.push(s.name);
 }
}
return result;`;
const result = parsePayload(await call('figma_execute', {code, timeout:60000}));
if(result?.success===false)throw new Error(result.error);
writeFileSync(join(sc.dirs.sync, `token-metadata-${apply?'applied':'plan'}.json`), JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
