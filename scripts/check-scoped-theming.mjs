#!/usr/bin/env node
/** Verify the supported project stylesheet + scoped mode/axis contract.
 * Cross-project brand identity is covered by test:brands and brands:compare.
 * ALTheme no longer accepts brand: one project stylesheet defines the DS.
 */
import {chromium} from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(root,'libs/al-web-components/package.json'));
const {createServer}=await import(pathToFileURL(path.join(path.dirname(require.resolve('vite/package.json')),'dist/node/index.js')));
const css=path.join(root,'libs/al-web-components/dist/css/css/project/altitude.css');
if(!fs.existsSync(css))throw new Error('Build the project stylesheet before checking scoped theming: '+css);
const server=await createServer({root,configFile:false,logLevel:'warn',server:{port:5198,strictPort:true}});
await server.listen();
const browser=await chromium.launch();
let failed=0;
const check=(ok,message)=>{console.log(`${ok?'PASS':'FAIL'} ${message}`);if(!ok)failed++;};
try {
 const page=await browser.newPage({viewport:{width:1600,height:1400},reducedMotion:'no-preference'});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5198/.altitude/visual-compare/harness/scoped.html',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>document.documentElement.dataset.ready==='true',null,{timeout:120000});
 const values=await page.evaluate(()=>{
  const out={};
  for(const el of document.querySelectorAll('[data-probe]')) {
   const cs=getComputedStyle(el),button=el.querySelector('al-button').shadowRoot.querySelector('.al-c-button');
   out[el.dataset.probe]={tag:el.localName,mode:el.getAttribute('data-al-mode'),
    bg:cs.getPropertyValue('--al-theme-color-background-neutral-default').trim(),
    border:cs.getPropertyValue('--al-theme-color-border-neutral-default').trim(),
    paint:getComputedStyle(el.querySelector('.surface')).backgroundColor,
    button:getComputedStyle(button).backgroundColor,
    duration:getComputedStyle(button).transitionDuration};
  }return out;
 });
 check(values.dark.mode==='dark'&&values.light.mode==='light','mode mirrors to the project selector');
 for(const key of ['bg','border','paint','button'])check(Boolean(values.dark[key])&&values.dark[key]!==values.light[key],`mode changes ${key} on the rendered subtree`);
 check(values.outer.paint===values.dark.paint&&values.inner.paint===values.light.paint,'inner mode overrides the outer mode');
 check(values.versioned.tag==='al-theme-9-9-9'&&values.versioned.paint===values.light.paint,'mode works under versioned registration');
 check(/^0s(,\s*0s)*$/.test(values['motion-reduced'].duration)&&!/^0s(,\s*0s)*$/.test(values.dark.duration),'reduced motion removes the real button transition');
 await page.evaluate(async()=>{const el=document.querySelector('[data-probe="light"]');el.mode='dark';await el.updateComplete;});
 const changed=await page.locator('[data-probe="light"] .surface').evaluate(el=>getComputedStyle(el).backgroundColor);
 check(changed===values.dark.paint,'changing mode after render updates the painted surface');
 check(errors.length===0,'no browser errors: '+errors.join('; '));
 if(!process.argv.includes('--no-screenshot'))await page.screenshot({path:path.join(root,'.altitude/visual-compare/brands.scoped.png'),fullPage:true});
} finally {await browser.close();await server.close();}
if(failed)process.exitCode=1;
