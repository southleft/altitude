/** Add missing states in-place. Never replace a set or its existing variants. */
import {call,parsePayload} from '../lib/figma-shim.mjs';
import {scope} from './project-scope.mjs';
import {fileGuardSnippet} from '../contracts/figma/plugin-snippets.mjs';
const sc=scope('altitude');
await call('figma_navigate',{url:sc.project.figma.urlBase.replace('{fileKey}',sc.fileKey),lock:true});
const result=parsePayload(await call('figma_execute',{timeout:60000,code:`${fileGuardSnippet(sc)}
await figma.loadAllPagesAsync();
const variables=await figma.variables.getLocalVariablesAsync();
const color=variables.find(v=>v.name==='theme/color/focus-ring'),width=variables.find(v=>v.name==='theme/border/width/md');
if(!color||!width)throw new Error('Missing focus tokens');
const sets=['Toggle Button','Breadcrumbs Item'].map(name=>{
 const set=figma.root.children.find(p=>p.name==='🛠 '+name)?.findOne(n=>n.type==='COMPONENT_SET'&&n.name===name);
 if(!set)throw new Error('Missing canonical '+name);
 const bases=set.children.filter(v=>v.variantProperties.State==='Default'&&(name!=='Breadcrumbs Item'||v.variantProperties.Current==='No'));
 if(!bases.length)throw new Error('No focusable baseline '+name);
 if(name==='Breadcrumbs Item'&&bases.some(v=>!v.findOne(n=>n.name==='al-c-breadcrumbs-item__label')))throw new Error('Missing focus target');
 return {name,set,bases};
});
const added=[];
for(const {name,set,bases} of sets){
 let x=24;const y=Math.max(...set.children.map(n=>n.y+n.height))+64;
 for(const base of bases){
  const targetName=base.name.replace('State=Default','State=Focus');
  if(set.children.some(v=>v.name===targetName))continue;
  const clone=base.clone();set.appendChild(clone);clone.name=targetName;clone.x=x;clone.y=y;
  const target=name==='Breadcrumbs Item'?clone.findOne(n=>n.name==='al-c-breadcrumbs-item__label'):clone;
  target.strokes=[figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0}},'color',color)];
  target.strokeAlign='OUTSIDE';target.setBoundVariable('strokeWeight',width);
  clone.description=base.description.replaceAll('State=Default','State=Focus')+'\\nFocus is a transient keyboard state, not an attribute.';
  clone.documentationLinks=base.documentationLinks;
  x+=clone.width+40;added.push({set:name,id:clone.id,name:clone.name});
 }
 if(set.layoutMode==='NONE')set.resize(Math.max(set.width,x),Math.max(set.height,...set.children.map(n=>n.y+n.height+24)));
 let child=set;
 while(child.parent?.type==='FRAME'){
  const parent=child.parent,required=Math.ceil(child.y+child.height+(parent.paddingBottom||0));
  if(required>parent.height)parent.minHeight=Math.max(parent.minHeight||0,required);
  child=parent;
 }
}
return {added};`}));
if(result?.success===false)throw new Error(result.error);
console.log(JSON.stringify(result));
