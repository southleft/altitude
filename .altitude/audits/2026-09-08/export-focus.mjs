import fs from 'node:fs';
import {call,parsePayload} from '../../../scripts/lib/figma-shim.mjs';
import {scope} from '../../../scripts/figma-atoms/project-scope.mjs';
import {fileGuardSnippet} from '../../../scripts/contracts/figma/plugin-snippets.mjs';
for(const name of ['Toggle Button','Breadcrumbs Item']){
 const result=parsePayload(await call('figma_execute',{timeout:60000,code:`${fileGuardSnippet(scope('altitude'))}
 const p=figma.root.children.find(p=>p.name===${JSON.stringify('🛠 '+name)});
 await p.loadAsync();
 const s=p.findOne(n=>n.type==='COMPONENT_SET'&&n.name===${JSON.stringify(name)});
 const v=s.children.find(n=>n.name.includes('State=Focus'));
 if(!v)throw new Error('Focus state missing');
 return {png:figma.base64Encode(await v.exportAsync({format:'PNG',constraint:{type:'SCALE',value:2}}))};`}));
 if(!result.png)throw new Error(JSON.stringify(result));
 fs.writeFileSync('.altitude/audits/2026-09-08/focus-'+name.toLowerCase().replaceAll(' ','-')+'.png',Buffer.from(result.png,'base64'));
}
