import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createRequire} from 'node:module';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),require=createRequire(path.join(root,'libs/al-web-components/package.json'));
const {createServer}=await import(pathToFileURL(path.join(path.dirname(require.resolve('vite/package.json')),'dist/node/index.js')));
const server=await createServer({root,configFile:false,logLevel:'error',server:{port:6312,strictPort:true}});
await server.listen();const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto('http://localhost:6312/.altitude/audits/2026-09-08/brand-contract.html');await page.waitForFunction(()=>window.ready);
 const actual=await page.evaluate(()=>{
  const header=document.querySelector('al-header'),footer=document.querySelector('al-footer');
  const chrome=getComputedStyle(header.shadowRoot.querySelector('header'));
  return {headerSlot:document.querySelector('#header-content').assignedSlot?.name,footerSlot:document.querySelector('#footer-content').assignedSlot?.name,headerVisible:document.querySelector('#header-content').getBoundingClientRect().width>0,footerVisible:document.querySelector('#footer-content').getBoundingClientRect().width>0,minHeight:chrome.minHeight,padding:chrome.padding,shadow:chrome.boxShadow,blur:chrome.backdropFilter,footerBorder:getComputedStyle(footer).borderTopStyle,footerBackground:getComputedStyle(footer.shadowRoot.querySelector('footer')).backgroundColor};
 });
 assert.equal(actual.headerSlot,'');assert.equal(actual.footerSlot,'');assert.ok(actual.headerVisible&&actual.footerVisible);
 assert.equal(actual.minHeight,'128px');assert.equal(actual.padding,'12px');assert.notEqual(actual.shadow,'none');assert.equal(actual.blur,'none');assert.equal(actual.footerBorder,'none');
 assert.notEqual(actual.footerBackground,'rgba(0, 0, 0, 0)');
 await page.screenshot({path:'.altitude/audits/2026-09-08/brand-compatibility.png'});
 console.log('PASS',JSON.stringify(actual));
}finally{await browser.close();await server.close();}
