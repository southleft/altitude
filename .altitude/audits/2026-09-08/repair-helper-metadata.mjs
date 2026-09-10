import fs from 'node:fs';
import {call,parsePayload} from '../../../scripts/lib/figma-shim.mjs';
import {scope} from '../../../scripts/figma-atoms/project-scope.mjs';
import {fileGuardSnippet} from '../../../scripts/contracts/figma/plugin-snippets.mjs';
const sc=scope('altitude');
const base=sc.project.docs.productionBase;
const rows=[
 ['101:29248','Documentation Header','Reusable introduction for library documentation pages. Present the page purpose and its reference link. This is a Figma documentation helper, not a shipped web component.',base],
 ['3669:25520','Swatch Row','Documentation row presenting a named color family and its token swatches. Color values remain bound to the shared variables. This is a Figma documentation helper.',base+'/foundations/'],
 ['358:839','Swatch','Documentation tile displaying a color token and its label. Preserve its variable binding when reusing the tile. This is a Figma documentation helper.',base+'/foundations/'],
 ['111:29861','Header - Colors','Reusable heading for the color reference page. Describes the token family shown below it. This is a Figma documentation helper.',base+'/foundations/'],
 ['111:29868','Row - Colors','Reusable row in the color reference page. Keeps token names and their displayed swatches together. This is a Figma documentation helper.',base+'/foundations/'],
 ['3598:836','Icon','Reusable icon glyph component used inside Altitude controls. Choose the glyph for its meaning and inherit semantic content color. In code, use al-icon and the documented icon catalog. Decorative icons should be hidden from assistive technology; meaningful icon-only actions need an accessible label on their control.',base+'/icons/']
];
await call('figma_navigate',{url:sc.project.figma.urlBase.replace('{fileKey}',sc.fileKey),lock:true});
const result=parsePayload(await call('figma_execute',{timeout:60000,code:`${fileGuardSnippet(sc)}
const rows=${JSON.stringify(rows)};
const nodes=[];
for(const [id,name] of rows){const n=await figma.getNodeByIdAsync(id);if(!n||n.type!=='COMPONENT'||n.name!==name)throw new Error('Identity mismatch '+id);nodes.push(n);}
for(let i=0;i<rows.length;i++){const [id,name,description,uri]=rows[i];nodes[i].description=description+'\\n\\nDocumentation: '+uri;nodes[i].documentationLinks=[{uri}];}
return nodes.map(n=>({id:n.id,name:n.name,description:!!n.description.trim(),links:n.documentationLinks}));`}));
if(result?.success===false)throw new Error(result.error);
fs.writeFileSync('.altitude/audits/2026-09-08/helper-metadata.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
