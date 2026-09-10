import {chromium} from 'playwright';
import fs from 'node:fs';
import {call,parsePayload} from '../../../scripts/lib/figma-shim.mjs';
import {scope} from '../../../scripts/figma-atoms/project-scope.mjs';
import {fileGuardSnippet} from '../../../scripts/contracts/figma/plugin-snippets.mjs';
const out='.altitude/audits/2026-09-08';
const mode=process.argv.includes('--light')?'light':'dark';
const cases={Card:'Variant=default',Dialog:'Footer=yes',Drawer:'Alignment=right',Select:'Label=hidden',Popover:'Position=default',Tooltip:'Position=top,Arrow=yes'};
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 for(const [name,c] of Object.entries(cases)) {
  const tag='al-'+name.toLowerCase();
  await page.goto('http://localhost:7346/?'+new URLSearchParams({mode,component:tag,case:c}));
  await page.waitForFunction(()=>window.__ATOMS_READY__);
  await page.evaluate(async()=>{
   document.querySelector('#root').style.padding='300px';
   const h=document.querySelector('.case').firstElementChild;
   if('isActive' in h){h.isActive=true;await h.updateComplete;}
  });
  const selector=['Card','Select'].includes(name)?`.al-c-${name.toLowerCase()}`:`.al-c-${name.toLowerCase()}__container`;
  const el=page.locator(tag).locator(selector).first();
  await el.waitFor({state:'visible'});
  await page.waitForFunction(sel=>getComputedStyle(document.querySelector('.case').firstElementChild.shadowRoot.querySelector(sel)).opacity==='1',selector);
  await el.screenshot({path:`${out}/reference-${mode}-${name.toLowerCase()}.png`});
  const result=parsePayload(await call('figma_execute',{timeout:60000,code:`${fileGuardSnippet(scope('altitude'))}
   const p=figma.root.children.find(p=>p.name==='Contract Pilot');
   const s=p.findOne(n=>n.type==='COMPONENT_SET'&&n.name===${JSON.stringify(name)});
   const collection=(await figma.variables.getLocalVariableCollectionsAsync()).find(c=>c.name==='Tier 2 | Theme');
   const targetMode=collection?.modes.find(m=>m.name.toLowerCase()===${JSON.stringify(mode)});
   if(!targetMode)throw new Error('Missing theme mode');
   const previous=s.explicitVariableModes[collection.id];
   s.setExplicitVariableModeForCollection(collection,targetMode.modeId);
   try{return {png:figma.base64Encode(await s.exportAsync({format:'PNG',constraint:{type:'SCALE',value:1}})),variants:s.children.map(n=>({name:n.name,w:n.width,h:n.height}))};}
   finally{if(previous)s.setExplicitVariableModeForCollection(collection,previous);else s.clearExplicitVariableModeForCollection(collection);}`}));
  if(result?.success===false)throw new Error(result.error);
  fs.writeFileSync(`${out}/candidate-${mode}-${name.toLowerCase()}.png`,Buffer.from(result.png,'base64'));
  console.log(name,JSON.stringify(result.variants));
 }
}finally{await browser.close();}
