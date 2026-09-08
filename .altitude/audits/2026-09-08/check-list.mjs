import {chromium} from 'playwright';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const b=await chromium.launch({headless:true});const p=await b.newPage();const out=[];
for(const state of ['WithLinks','WithStatic']){
 await p.goto(`http://127.0.0.1:6197/iframe.html?id=list--${state}`);await p.waitForTimeout(500);await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 const r=await p.evaluate(async()=>await axe.run(document.querySelector('#storybook-root'),{runOnly:{type:'rule',values:['color-contrast']}}));
 out.push({state,violations:r.violations});
 await p.screenshot({path:`.altitude/audits/2026-09-08/list-${state}.png`});
}
fs.writeFileSync('.altitude/audits/2026-09-08/list-contrast.json',JSON.stringify(out,null,2));
console.log(JSON.stringify(out.map(x=>({state:x.state,nodes:x.violations.flatMap(v=>v.nodes.map(n=>({html:n.html,target:n.target,summary:n.failureSummary})))})),null,2));await b.close();
