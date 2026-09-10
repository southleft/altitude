/**
 * al-literal-types plugin — the alias resolution the CEM build depends on.
 *
 * NOT part of `test:scripts`. That chain is contractually zero-dependency (it
 * runs in the gate-self-test job, which deliberately skips `pnpm install`), and
 * this test needs the real TypeScript parser: a stubbed `ts` would prove the
 * plugin's bookkeeping and nothing about its use of the API it is written
 * against. It runs in the CEM job instead, beside the build it protects.
 *
 * typescript is a workspace dependency, not a root one, so it is resolved
 * through the package that declares it rather than by a hardcoded node_modules
 * path — pnpm's layout is not a public interface.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import literalTypes from '../../libs/al-web-components/cem-plugins/al-literal-types.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require_ = createRequire(join(ROOT, 'libs', 'al-web-components', 'package.json'));
const ts = require_('typescript');

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
