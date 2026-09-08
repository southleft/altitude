import fs from 'node:fs';
import {call,parsePayload} from '../../../scripts/lib/figma-shim.mjs';
import {scope} from '../../../scripts/figma-atoms/project-scope.mjs';
import {fileGuardSnippet} from '../../../scripts/contracts/figma/plugin-snippets.mjs';
import {readManifest,writeManifest} from '../../../libs/altitude-mcp/src/lib/parity.mjs';
const sc=scope('altitude');
const names=['Card','Dialog','Drawer','Select','Popover','Tooltip'];
await call('figma_navigate',{url:sc.project.figma.urlBase.replace('{fileKey}',sc.fileKey),lock:true});
const result=parsePayload(await call('figma_execute',{timeout:60000,code:`${fileGuardSnippet(sc)}
await figma.loadAllPagesAsync();
const scratch=figma.root.children.find(p=>p.name==='Contract Pilot');
const rows=${JSON.stringify(names)}.map(name=>{
 const existing=figma.root.children.find(p=>p.name==='🛠 '+name);
 if(existing?.children.length)throw new Error('Target page is occupied: '+name);
 const sets=scratch.findAll(n=>n.type==='COMPONENT_SET'&&n.name===name);
 if(sets.length!==1)throw new Error('Expected one verified candidate '+name);
 const set=sets[0],frame=set.parent;
 if(frame.type!=='FRAME'||frame.parent!==scratch)throw new Error('Unexpected presentation parent '+name);
 return {name,set,frame,existing,ids:set.children.map(n=>n.id)};
});
for(const row of rows){
 const page=row.existing||figma.createPage();page.name='🛠 '+row.name;
 page.appendChild(row.frame);row.frame.x=0;row.frame.y=0;
 if(JSON.stringify(row.ids)!==JSON.stringify(row.set.children.map(n=>n.id)))throw new Error('Variant identity changed');
}
// Keep the existing taxonomy and sort only component pages in each section.
const atom=figma.root.children.find(p=>p.name.includes('ATOMS'));
const molecule=figma.root.children.find(p=>p.name.includes('MOLECULES'));
const organism=figma.root.children.find(p=>p.name.includes('ORGANISMS'));
if(!atom||!molecule||!organism)throw new Error('Missing taxonomy dividers');
for(const [start,end,add] of [[atom,molecule,['Select','Tooltip','Text Block']],[molecule,organism,['Card','Dialog','Drawer','Popover']]]){
 const current=[...figma.root.children];
 const pages=current.slice(current.indexOf(start)+1,current.indexOf(end)).filter(p=>p.name.startsWith('🛠 '));
 for(const name of add){const p=current.find(p=>p.name==='🛠 '+name);if(p&&!pages.includes(p))pages.push(p);}
 pages.sort((a,b)=>a.name.localeCompare(b.name));
 let index=figma.root.children.indexOf(start)+1;
 for(const page of pages)figma.root.insertChild(index++,page);
}
return rows.map(r=>({name:r.name,id:r.set.id,variantIds:r.ids,page:r.frame.parent.name}));`}));
if(result?.success===false)throw new Error(result.error);
const manifest=readManifest();
for(const row of result){const tag='al-'+row.name.toLowerCase();manifest.components[tag].figma={name:row.name,nodeId:row.id};}
writeManifest(manifest);
fs.writeFileSync('.altitude/audits/2026-09-08/promoted-core.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
