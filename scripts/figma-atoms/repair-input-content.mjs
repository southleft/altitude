/** Restore the native input's editable content in-place, retaining master IDs. */
import {call,parsePayload} from '../lib/figma-shim.mjs';
import {scope} from './project-scope.mjs';
import {fileGuardSnippet} from '../contracts/figma/plugin-snippets.mjs';
const sc=scope('altitude');
await call('figma_navigate',{url:sc.project.figma.urlBase.replace('{fileKey}',sc.fileKey),lock:true});
const result=parsePayload(await call('figma_execute',{timeout:60000,code:`${fileGuardSnippet(sc)}
await figma.loadAllPagesAsync();
const find=name=>figma.root.children.find(p=>p.name==='🛠 '+name)?.findOne(n=>n.type==='COMPONENT_SET'&&n.name===name);
const set=find('Input'),icon=figma.root.children.find(p=>p.name==='🛠 Icons')?.findOne(n=>n.type==='COMPONENT'&&n.name==='Icon');
if(!set||!icon)throw new Error('Missing canonical Input or Icon');
const rows=set.children.map(v=>({v,container:v.findOne(n=>n.name==='al-c-input__container'),field:v.findOne(n=>n.name==='al-c-input__input')}));
if(rows.some(r=>!r.container||!r.field))throw new Error('Unexpected input anatomy');
const vars=await figma.variables.getLocalVariablesAsync();
const variable=name=>{const v=vars.find(v=>v.name===name);if(!v)throw new Error('Missing '+name);return v;};
const control=variable('theme/size/control'),padding=variable('theme/space/sm'),gap=variable('theme/space/xxs'),color=variable('theme/color/content/neutral-faint');
await figma.loadFontAsync({family:'Public Sans',style:'Regular'});
function prop(name,type,value){const key=Object.keys(set.componentPropertyDefinitions).find(k=>k.split('#')[0]===name);return key||set.addComponentProperty(name,type,value);}
const value=prop('Value','TEXT','Placeholder'),before=prop('Slot Before','BOOLEAN',false),after=prop('Slot After','BOOLEAN',false);
for(const {v,container,field} of rows){
 for(const n of [v,container]){for(const edge of ['Top','Right','Bottom','Left']){n.setBoundVariable('padding'+edge,null);n['padding'+edge]=0;}}
 v.setBoundVariable('itemSpacing',gap);
 container.layoutMode='VERTICAL';container.primaryAxisSizingMode='AUTO';container.layoutSizingHorizontal='FILL';
 field.layoutMode='HORIZONTAL';field.counterAxisAlignItems='CENTER';field.primaryAxisAlignItems='MIN';field.primaryAxisSizingMode='FIXED';field.counterAxisSizingMode='FIXED';
 field.layoutSizingHorizontal='FILL';field.setBoundVariable('height',control);field.setBoundVariable('minHeight',control);
 field.setBoundVariable('paddingLeft',padding);field.setBoundVariable('paddingRight',padding);
 field.paddingTop=0;field.paddingBottom=0;field.setBoundVariable('itemSpacing',gap);
 let text=field.findOne(n=>n.type==='TEXT'&&n.name==='Value');
 if(!text){text=figma.createText();text.name='Value';field.appendChild(text);}
 text.fontName={family:'Public Sans',style:'Regular'};text.fontSize=14;text.lineHeight={unit:'PIXELS',value:24};text.characters='Placeholder';text.textAlignHorizontal='LEFT';
 text.fills=[figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0}},'color',color)];
 text.componentPropertyReferences={...text.componentPropertyReferences,characters:value};text.textAutoResize='HEIGHT';text.layoutSizingHorizontal='FILL';
 for(const [name,key,index] of [['Icon Before',before,0],['Icon After',after,field.children.length]]){
  let inst=field.findOne(n=>n.type==='INSTANCE'&&n.name===name);
  if(!inst){inst=icon.createInstance();inst.name=name;field.insertChild(Math.min(index,field.children.length),inst);}
  inst.resize(20,20);inst.visible=false;inst.componentPropertyReferences={...inst.componentPropertyReferences,visible:key};
  if(name==='Icon Before')field.insertChild(0,inst);else field.appendChild(inst);
 }
}
return {set:set.id,variants:rows.length,properties:[value,before,after]};`}));
if(result?.success===false)throw new Error(result.error);
console.log(JSON.stringify(result));
