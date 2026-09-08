import fs from 'node:fs';
import {call,parsePayload} from '../../../scripts/lib/figma-shim.mjs';
import {scope} from '../../../scripts/figma-atoms/project-scope.mjs';
import {fileGuardSnippet} from '../../../scripts/contracts/figma/plugin-snippets.mjs';
const sc=scope('altitude');
await call('figma_navigate',{url:sc.project.figma.urlBase.replace('{fileKey}',sc.fileKey),lock:true});
const code=`${fileGuardSnippet(sc)}
await figma.loadAllPagesAsync();
function tree(n,d=0){return {id:n.id,name:n.name,type:n.type,visible:n.visible,text:n.characters,props:n.componentProperties,children:d<5 && n.children?n.children.map(c=>tree(c,d+1)):[]};}
const result={};
for(const name of ['Button','Input','Combobox']) {
 const page=figma.root.children.find(p=>p.name==='🛠 '+name);
 const set=page.findOne(n=>n.type==='COMPONENT_SET'&&n.name===name);
 result[name]={id:set.id,props:set.componentPropertyDefinitions,variants:set.children.map(c=>({id:c.id,name:c.name})),tree:tree(set.children[0])};
}
return JSON.parse(JSON.stringify(result,(k,v)=>typeof v==='symbol'?'MIXED':v));`;
const result=parsePayload(await call('figma_execute',{code,timeout:60000}));
fs.writeFileSync('.altitude/audits/2026-09-08/control-trees.json',JSON.stringify(result,null,2));
