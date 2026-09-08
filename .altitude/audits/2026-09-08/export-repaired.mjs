import fs from 'node:fs';
import {call,parsePayload} from '../../../scripts/lib/figma-shim.mjs';
import {scope} from '../../../scripts/figma-atoms/project-scope.mjs';
import {fileGuardSnippet} from '../../../scripts/contracts/figma/plugin-snippets.mjs';
const sc=scope('altitude');
for(const name of ['Combobox','Button','Input','Card','Dialog']){
 const result=parsePayload(await call('figma_execute',{timeout:60000,code:`${fileGuardSnippet(sc)}
 const p=figma.root.children.find(p=>p.name===${JSON.stringify(['Card','Dialog'].includes(name)?'Contract Pilot':'🛠 '+name)});
 const set=p.findOne(n=>n.type==='COMPONENT_SET'&&n.name===${JSON.stringify(name)});
 return {png:figma.base64Encode(await set.exportAsync({format:'PNG',constraint:{type:'SCALE',value:1}}))};`}));
 fs.writeFileSync('.altitude/audits/2026-09-08/repaired-'+name.toLowerCase()+'.png',Buffer.from(result.png,'base64'));
}
