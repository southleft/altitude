import assert from 'node:assert/strict';
import {PLAN} from '../figma-atoms/plan.mjs';
import {scope,scopePlan} from '../figma-atoms/project-scope.mjs';
import {buildAnatomyNode} from '../contracts/emit-contracts.mjs';
import {readFileSync} from 'node:fs';
import {buildOps} from '../contracts/figma/derive-ops.mjs';
import {DEFAULT_COMPONENT_CONFIG} from '../contracts/figma/component-config.mjs';
for(const project of ['altitude','southleft']) {
 const cards=scopePlan(PLAN,scope(project)).filter(x=>x.tag==='al-card');
 assert.equal(cards.length,1,`${project} must select exactly its own card implementation`);
 assert.equal(Boolean(cards[0].brandOnly),project==='southleft');
}
const base=scopePlan(PLAN,scope('altitude'));
for(const name of ['dialog','drawer','popover','tooltip']) {
 assert.ok(base.find(x=>x.tag===`al-${name}`).cases.every(c=>c.measureRoot===`.al-c-${name}__container`));
}
const full=buildAnatomyNode({tag:'div',computed:{display:'flex'},authored:{width:'100%'},kids:[]});
assert.equal(full.layout.fillInline,true);
const hug=buildAnatomyNode({tag:'div',computed:{display:'flex'},authored:{width:'max-content'},kids:[]});
assert.equal(hug.layout.fillInline,undefined);
assert.deepEqual(base.find(x=>x.tag==='al-drawer').cases.map(c=>c.attrs.alignment),[undefined,'right']);
const text=buildAnatomyNode({tag:'span',text:'Example',computed:{fs:12,lh:20,ff:'Public Sans',fw:'400'},kids:[]});
assert.equal(text.fsPx,12); assert.equal(text.lhPx,20); assert.equal(text.ffCss,'Public Sans');
const border=buildAnatomyNode({tag:'div',computed:{bw4:[0,0,1,0]},kids:[]});
assert.deepEqual(border.bw4,[0,0,1,0]);
const dialog=JSON.parse(readFileSync(new URL('../../.altitude/contracts/altitude/al-dialog.contract.json',import.meta.url)));
const axesFor=slot=>buildOps(dialog,{config:{...DEFAULT_COMPONENT_CONFIG,caseAxes:[{dimension:'Footer',slot,property:'Footer'}]}}).axes;
assert.ok(axesFor('footer').some(a=>a.name==='Footer'));
assert.ok(!axesFor('invented-slot').some(a=>a.name==='Footer'));
console.log('measurement-plan: project-specific cards, overlay roots and authored fill verified');
