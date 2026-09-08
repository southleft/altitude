import assert from 'node:assert/strict';
import ts from '../../libs/al-web-components/node_modules/typescript/lib/typescript.js';
import literalTypes from '../../libs/al-web-components/cem-plugins/al-literal-types.mjs';
const plugin=literalTypes();
for(const [path,source] of [['components/model.ts',"export type Order = 'ascending' | 'descending' | 'none'; export type Row = Record<string,unknown>;"],['components/table.ts',"import {Order as SortOrder,Row} from './model';"]]){
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true);
 const visit=node=>{plugin.analyzePhase({ts,node,moduleDoc:{path}});ts.forEachChild(node,visit);};visit(file);
}
const members=[{type:{text:'SortOrder'}},{type:{text:'Row'}},{type:{text:'Unresolved'}}];
const manifest={modules:[{path:'components/table.ts',declarations:[{members}]}]};
plugin.packageLinkPhase({customElementsManifest:manifest});
assert.equal(members[0].type.text,"'ascending' | 'descending' | 'none'");
assert.equal(members[1].type.text,'Row');assert.equal(members[2].type.text,'Unresolved');
console.log('cem-literal-types: imported literal unions resolve; structural and unknown aliases stay untouched');
