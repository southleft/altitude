#!/usr/bin/env node
/** In-place control repair for the source's existing Button/Input slot anatomy.
 * Preflight every variant; preserve set, variant and layer identities.
 */
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {scope,projectArg} from './project-scope.mjs';
import {call,parsePayload} from '../lib/figma-shim.mjs';
import {fileGuardSnippet} from '../contracts/figma/plugin-snippets.mjs';
const sc=scope(projectArg());
await call('figma_navigate',{url:sc.project.figma.urlBase.replace('{fileKey}',sc.fileKey),lock:true});
const code=`${fileGuardSnippet(sc)}
await figma.loadAllPagesAsync();
function canonical(name){
 const p=figma.root.children.find(p=>p.name==='🛠 '+name);
 const hits=p?p.findAll(n=>n.type==='COMPONENT_SET'&&n.name===name):[];
 if(hits.length!==1)throw new Error('Expected one canonical '+name);
 return hits[0];
}
function own(n,predicate){
 const out=[];
 function walk(x){for(const c of x.children||[]){if(predicate(c))out.push(c);if(c.type!=='INSTANCE')walk(c);}}
 walk(n);return out;
}
const button=canonical('Button'),input=canonical('Input'),combo=canonical('Combobox');
const buttonRows=button.children.map(v=>{
 const texts=own(v,n=>n.type==='TEXT'), before=own(v,n=>n.name==='Icon Before'&&n.type==='INSTANCE'),after=own(v,n=>n.name==='Icon After'&&n.type==='INSTANCE');
 if(texts.length!==1||before.length!==1||after.length!==1)throw new Error('Unexpected Button anatomy: '+v.name);
 return {v,text:texts[0],before:before[0],after:after[0]};
});
const inputRows=input.children.map(v=>{
 const label=own(v,n=>n.name==='al-c-input__label'),text=own(v,n=>n.type==='TEXT'&&n.name==='Label'),footer=own(v,n=>n.name==='al-c-input__footer');
 if(label.length!==1||text.length!==1||footer.length!==1)throw new Error('Unexpected Input anatomy: '+v.name);
 return {v,label:label[0],text:text[0],footer:footer[0]};
});
const combos=combo.children.map(v=>{
 const inputs=own(v,n=>n.type==='INSTANCE'&&n.name==='al-input');
 if(inputs.length!==1||!['Hidden','Shown'].includes(v.variantProperties.Label))throw new Error('Unexpected Combobox anatomy');
 return {v,input:inputs[0]};
});
function prop(set,name,type,value){
 const found=Object.entries(set.componentPropertyDefinitions).find(([key])=>key.split('#')[0]===name);
 if(found){if(found[1].type!==type)throw new Error('Wrong property type: '+name);return found[0];}
 return set.addComponentProperty(name,type,value);
}
const text=prop(button,'Text','TEXT','Button'),showText=prop(button,'Show Text','BOOLEAN',true),before=prop(button,'Slot Before','BOOLEAN',false),after=prop(button,'Slot After','BOOLEAN',false);
for(const r of buttonRows){
 r.text.componentPropertyReferences={...r.text.componentPropertyReferences,characters:text,visible:showText};
 r.before.componentPropertyReferences={...r.before.componentPropertyReferences,visible:before};
 r.after.componentPropertyReferences={...r.after.componentPropertyReferences,visible:after};
}
const labelText=prop(input,'Text','TEXT','Label'),showLabel=prop(input,'Show Label','BOOLEAN',true),showNote=prop(input,'Show Helper','BOOLEAN',true);
for(const r of inputRows){
 r.text.componentPropertyReferences={...r.text.componentPropertyReferences,characters:labelText};
 r.label.componentPropertyReferences={...r.label.componentPropertyReferences,visible:showLabel};
 r.footer.componentPropertyReferences={...r.footer.componentPropertyReferences,visible:showNote};
}
for(const r of combos)r.input.setProperties({[showLabel]:r.v.variantProperties.Label==='Shown',[showNote]:false});
return {button:{id:button.id,variants:buttonRows.length},input:{id:input.id,variants:inputRows.length},combobox:{id:combo.id,variants:combos.length}};`;
const result=parsePayload(await call('figma_execute',{code,timeout:60000}));
if(result?.success===false)throw new Error(result.error);
writeFileSync(join(sc.dirs.sync,'content-controls-repaired.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
