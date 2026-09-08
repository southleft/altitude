import fs from 'node:fs';
const dir = '.altitude/audits/2026-09-08';
const p = JSON.parse(fs.readFileSync('.altitude/ds-projects.json')).projects.altitude;
const code = `
if(figma.root.name !== ${JSON.stringify(p.figma.fileName)} || figma.fileKey !== ${JSON.stringify(p.figma.fileKey)}) throw new Error('Wrong target file');
await figma.loadAllPagesAsync();
const sets=[]; const standalone=[];
for(const page of figma.root.children){
 for(const n of page.findAllWithCriteria({types:['COMPONENT_SET','COMPONENT']})){
  if(n.type==='COMPONENT' && n.parent.type==='COMPONENT_SET')continue;
  const row={id:n.id,name:n.name,page:page.name,description:n.description,documentationLinks:n.documentationLinks,annotations:n.annotations,props:n.componentPropertyDefinitions};
  const variants=n.type==='COMPONENT_SET'?n.children:[n];
  row.variants=variants.map(v=>({id:v.id,name:v.name,width:v.width,height:v.height,description:v.description,annotations:v.annotations,reactions:v.reactions,props:v.variantProperties,focusCandidates:v.findAll(x=>/focus|ring/i.test(x.name)).map(x=>({id:x.id,name:x.name,visible:x.visible,type:x.type,strokeWeight:x.strokeWeight,strokes:Array.isArray(x.strokes)?x.strokes:[],effects:x.effects})),strokes:Array.isArray(v.strokes)?v.strokes:[],strokeWeight:v.strokeWeight,effects:v.effects}));
  row.annotatedDescendants=n.findAll(x=>x.annotations&&x.annotations.length>0).length;
  (n.type==='COMPONENT_SET'?sets:standalone).push(row);
 }
}
const variables=(await figma.variables.getLocalVariablesAsync()).map(v=>({id:v.id,name:v.name,description:v.description,type:v.resolvedType,collection:v.variableCollectionId,values:v.valuesByMode,scopes:v.scopes}));
const collections=(await figma.variables.getLocalVariableCollectionsAsync()).map(c=>({id:c.id,name:c.name,modes:c.modes}));
const styles=[];
for(const method of ['getLocalTextStylesAsync','getLocalEffectStylesAsync','getLocalPaintStylesAsync','getLocalGridStylesAsync'])for(const s of await figma[method]())styles.push({id:s.id,name:s.name,description:s.description,type:s.type});
return JSON.parse(JSON.stringify({fileName:figma.root.name,fileKey:figma.fileKey,observedAt:new Date().toISOString(),sets,standalone,variables,collections,styles},(k,v)=>typeof v === 'symbol'?'MIXED':v));`;
const res=await fetch('http://localhost:9401/call',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'figma_execute',arguments:{code,timeout:60000}})}).then(r=>r.json());
fs.writeFileSync(`${dir}/figma-live-response.json`,JSON.stringify(res,null,2));
console.log(JSON.stringify(res).slice(0,1800));

