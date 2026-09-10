import fs from 'node:fs';
import {chromium} from 'playwright';
const dir='.altitude/audits/2026-09-08';
const live=JSON.parse(fs.readFileSync(`${dir}/figma-live.json`));
for(const name of ['Button','Input','Checkbox','Toggle','Accordion','Combobox']){
 const s=live.sets.find(x=>x.name===name);
 const v=s.variants.find(x=>/Focus/i.test(x.name))||s.variants[0];
 const code=`if(figma.fileKey!==${JSON.stringify(live.fileKey)}||figma.root.name!==${JSON.stringify(live.fileName)})throw new Error('Wrong file');const n=await figma.getNodeByIdAsync(${JSON.stringify(v.id)});return {base64:figma.base64Encode(await n.exportAsync({format:'PNG',constraint:{type:'SCALE',value:2}})),tree:JSON.parse(JSON.stringify([n,...n.findAll(()=>true)].map(x=>({name:x.name,type:x.type,visible:x.visible,width:x.width,height:x.height,strokes:x.strokes,strokeWeight:x.strokeWeight,effects:x.effects,fills:x.fills,boundVariables:x.boundVariables})),(k,v)=>typeof v==='symbol'?'MIXED':v))};`;
 const res=await fetch('http://localhost:9401/call',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'figma_execute',arguments:{code,timeout:30000}})}).then(r=>r.json());
 const data=JSON.parse(res.text);if(!data.success){console.log(name,data);continue;}
 const slug=name.toLowerCase();fs.writeFileSync(`${dir}/figma-${slug}.png`,Buffer.from(data.result.base64,'base64'));fs.writeFileSync(`${dir}/figma-${slug}-tree.json`,JSON.stringify(data.result.tree,null,2));console.log(name,v.name,v.id);
}
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1000,height:700}});
for(const slug of ['button','input','checkbox','toggle','combobox','list']){
 await page.goto(`http://127.0.0.1:6197/iframe.html?id=${slug}--Default&viewMode=story`);
 await page.waitForTimeout(900);
 await page.keyboard.press('Tab');
 await page.screenshot({path:`${dir}/browser-${slug}.png`});
}
await browser.close();
