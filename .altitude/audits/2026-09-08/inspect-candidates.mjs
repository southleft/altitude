import {call,parsePayload} from '../../../scripts/lib/figma-shim.mjs';
import {scope} from '../../../scripts/figma-atoms/project-scope.mjs';
import {fileGuardSnippet} from '../../../scripts/contracts/figma/plugin-snippets.mjs';
const result=parsePayload(await call('figma_execute',{code:`${fileGuardSnippet(scope('altitude'))}
const p=figma.root.children.find(p=>p.name==='Contract Pilot');
function tree(n,d=0){return {name:n.name,type:n.type,w:n.width,h:n.height,x:n.x,y:n.y,visible:n.visible,fills:n.fills,paths:n.vectorPaths,pad:[n.paddingTop,n.paddingRight,n.paddingBottom,n.paddingLeft],layout:n.layoutMode,sizing:[n.layoutSizingHorizontal,n.layoutSizingVertical],children:d<7 && n.children?n.children.map(c=>tree(c,d+1)):[]};}
const out=['Card','Dialog'].map(name=>tree(p.findOne(n=>n.type==='COMPONENT_SET'&&n.name===name).children[0]));
const glyph=p.findOne(n=>n.type==='COMPONENT_SET'&&n.name==='Dialog').findOne(n=>n.type==='INSTANCE'&&n.name==='X');
out.push(tree(await glyph.getMainComponentAsync()));
return out;`,timeout:60000}));
console.log(JSON.stringify(result,null,2));
