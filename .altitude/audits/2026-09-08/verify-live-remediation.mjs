import fs from 'node:fs';
import {call,parsePayload} from '../../../scripts/lib/figma-shim.mjs';
import {scope} from '../../../scripts/figma-atoms/project-scope.mjs';
import {fileGuardSnippet} from '../../../scripts/contracts/figma/plugin-snippets.mjs';
const sc=scope('altitude');
const before=JSON.parse(fs.readFileSync('.altitude/audits/2026-09-08/figma-live.json'));
const originals=before.sets.filter(s=>s.page==='🛠 '+s.name).map(s=>({id:s.id,name:s.name,variants:s.variants.map(v=>v.id)}));
const result=parsePayload(await call('figma_execute',{timeout:60000,code:`${fileGuardSnippet(sc)}
await figma.loadAllPagesAsync();
const rows=[];
for(const p of figma.root.children.filter(p=>p.name.startsWith('🛠 '))){
 for(const set of p.findAll(n=>n.type==='COMPONENT_SET'&&p.name==='🛠 '+n.name)){
  let parent=set.parent;
  while(parent.parent&&parent.parent.type!=='PAGE')parent=parent.parent;
  const header=parent.type==='FRAME'&&parent.findAll(n=>n.type==='TEXT'&&/documentation/i.test(n.characters));
  rows.push({id:set.id,name:set.name,page:p.name,description:!!set.description.trim(),links:set.documentationLinks.map(l=>l.uri),annotated:!!set.annotations.length,parent:parent.name,parentDocumentationText:!!header?.length,variants:set.children.map(v=>({id:v.id,name:v.name,description:!!v.description.trim(),links:v.documentationLinks.map(l=>l.uri)}))});
 }
}
const identity=[];
for(const old of ${JSON.stringify(originals)}){
 const node=await figma.getNodeByIdAsync(old.id);
 identity.push({name:old.name,setPreserved:!!node&&node.name===old.name,variantIdsPreserved:!!node&&old.variants.every(id=>node.children.some(n=>n.id===id))});
}
const vars=await figma.variables.getLocalVariablesAsync();
const styles=[];for(const method of ['getLocalTextStylesAsync','getLocalEffectStylesAsync','getLocalPaintStylesAsync','getLocalGridStylesAsync'])styles.push(...await figma[method]());
return {observedAt:new Date().toISOString(),file:figma.root.name,rows,identity,variables:{total:vars.length,described:vars.filter(v=>v.description.trim()).length,motion:vars.filter(v=>/animation/.test(v.name)).length},styles:{total:styles.length,described:styles.filter(s=>s.description.trim()).length}};`}));
if(result?.success===false)throw new Error(result.error);
fs.writeFileSync('.altitude/audits/2026-09-08/figma-after.json',JSON.stringify(result,null,2));
const missing=result.rows.flatMap(s=>[...(!s.description||!s.links.length?[s.name]:[]),...s.variants.filter(v=>!v.description||!v.links.length).map(v=>s.name+'/'+v.name)]);
console.log(JSON.stringify({sets:result.rows.length,variants:result.rows.reduce((n,s)=>n+s.variants.length,0),metadataMissing:missing,identityFailures:result.identity.filter(x=>!x.setPreserved||!x.variantIdsPreserved),parentsWithoutDocumentationText:result.rows.filter(s=>!s.parentDocumentationText).map(s=>s.name),variables:result.variables,styles:result.styles},null,2));
if(missing.length||result.identity.some(x=>!x.setPreserved||!x.variantIdsPreserved))process.exitCode=1;
