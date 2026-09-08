#!/usr/bin/env node
/** Mark noncanonical forks and retired layout wrappers without deleting instances. */
import {scope,projectArg} from './project-scope.mjs';
import {call,parsePayload} from '../lib/figma-shim.mjs';
import {fileGuardSnippet} from '../contracts/figma/plugin-snippets.mjs';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
const sc=scope(projectArg());
const apply=process.argv.includes('--apply');
await call('figma_navigate',{url:sc.project.figma.urlBase.replace('{fileKey}',sc.fileKey),lock:true});
const result=parsePayload(await call('figma_execute',{timeout:60000,code:`${fileGuardSnippet(sc)}
await figma.loadAllPagesAsync();
const prefix=${JSON.stringify(sc.project.figma.componentPagePrefix)}, base=${JSON.stringify(sc.project.docs.productionBase)};
const canonical=new Map();
for(const p of figma.root.children.filter(p=>p.name.startsWith(prefix)))for(const n of p.findAllWithCriteria({types:['COMPONENT_SET']}))if(p.name===prefix+n.name)canonical.set(n.name,n);
const edits=[];
for(const p of figma.root.children)for(const n of p.findAllWithCriteria({types:['COMPONENT_SET','COMPONENT']})){
 if(n.type==='COMPONENT'&&n.parent.type==='COMPONENT_SET')continue;
 const retired=['Chip Group','Button Group','Toggle Button Group','Toast Group'].includes(n.name);
 const duplicate=canonical.has(n.name)&&canonical.get(n.name).id!==n.id&&!p.name.startsWith(prefix);
 const oldCombo=n.name==='Combobox/Default'&&canonical.has('Combobox');
 if(!retired&&!duplicate&&!oldCombo)continue;
 const replacement=retired?'Layout':oldCombo?'Combobox':n.name;
 edits.push({id:n.id,oldName:n.name,newName:'Archive / '+n.name,replacement});
 if(${apply}){
  n.name='Archive / '+n.name;
  n.description='Archived reference. Use '+replacement+' from the canonical library. Existing instances are retained for migration.\\n'+n.description;
  n.documentationLinks=[{uri:base+'/components/'+replacement.toLowerCase().replaceAll(' ','-')}];
 }
}
return {apply:${apply},edits};`}));
if(result?.success===false)throw new Error(result.error);
writeFileSync(join(sc.dirs.sync,`archive-${apply?'applied':'plan'}.json`),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
