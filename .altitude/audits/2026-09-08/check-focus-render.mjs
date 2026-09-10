import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:900,height:700}});
 for(const [tag,caseName,selector] of [['al-toggle-button','Variant=default,Selected=no,Size=default','.al-c-toggle-button'],['al-breadcrumbs-item','Current=No,Separator=no','.al-c-breadcrumbs-item__label']]){
  await page.goto('http://localhost:7346/?'+new URLSearchParams({mode:'dark',component:tag,case:caseName}));await page.waitForFunction(()=>window.__ATOMS_READY__);
  await page.evaluate(()=>document.querySelector('#root').style.padding='100px');
  await page.keyboard.press('Tab');
  const target=page.locator(tag).locator(selector);
  const actual=await target.evaluate(n=>{const s=getComputedStyle(n);return{focused:n.matches(':focus-visible'),width:s.outlineWidth,style:s.outlineStyle,color:s.outlineColor,role:n.getAttribute('role')}});
  assert.ok(actual.focused);assert.equal(actual.width,'2px');assert.equal(actual.style,'solid');
  const r=await target.boundingBox();await page.screenshot({path:`.altitude/audits/2026-09-08/reference-focus-${tag}.png`,clip:{x:r.x-6,y:r.y-6,width:r.width+12,height:r.height+12}});
  console.log('PASS',tag,JSON.stringify(actual));
 }
}finally{await browser.close();}
