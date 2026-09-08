import {call,parsePayload} from '../../../scripts/lib/figma-shim.mjs';
import {scope} from '../../../scripts/figma-atoms/project-scope.mjs';
import {fileGuardSnippet} from '../../../scripts/contracts/figma/plugin-snippets.mjs';
const result=parsePayload(await call('figma_execute',{code:`${fileGuardSnippet(scope('altitude'))}
await figma.loadAllPagesAsync();
const ids=['3705:13444','3705:13446','3705:13448','3705:13450','3705:13452','3705:13454','3705:13456','3705:13458','3705:13460','3705:13464'];
const nodes=await Promise.all(ids.map(id=>figma.getNodeByIdAsync(id)));
if(nodes.some(n=>!n||n.type!=='COMPONENT'||n.parent.type!=='PAGE'||n.parent.name!=='Contract Pilot'||!n.name.includes('State=Focus')))throw new Error('Unexpected recovery target');
for(const node of nodes){
 const name=node.name.includes('Selected=')?'Toggle Button':'Breadcrumbs Item';
 const set=figma.root.children.find(p=>p.name==='🛠 '+name).findOne(n=>n.type==='COMPONENT_SET'&&n.name===name);
 const x=node.x,y=node.y;set.appendChild(node);node.x=x;node.y=y;
}
return nodes.map(n=>({id:n.id,parent:n.parent.name}));`}));
if(result?.success===false)throw new Error(result.error);
console.log(JSON.stringify(result));
