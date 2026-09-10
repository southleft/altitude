#!/usr/bin/env node
// Exercise the actual gates in an isolated repository using this Node runtime.
// `bash` on Windows can resolve WSL's obsolete Node even when pnpm uses Node 22.
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const tempRoot = realpathSync(tmpdir());
const work = mkdtempSync(join(tempRoot, 'altitude-gate-test-'));
const git = (...args) => {
  const r = spawnSync('git', ['-c', 'user.name=Gate test', '-c', 'user.email=gate@example.test', ...args], {cwd:work,encoding:'utf8'});
  if(r.status !== 0) throw new Error(r.stderr || r.error?.message);
  return r.stdout.trim();
};
const write = (path, text) => { const dest=join(work,path);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,text); };
const commit = () => {git('add','.');git('commit','-qm','fixture');return git('rev-parse','HEAD');};
const manifest = (state) => write('.altitude/migration.json', JSON.stringify({components:{button:{state,react19:state==='scoped-complete',headless:false,ssr:false}}}));
let passed=0;
const check = (script, base, expected, label) => {
 const r=spawnSync(process.execPath,[join(work,'scripts',script),`--base=${base}`],{cwd:work,encoding:'utf8'});
 if(r.status!==expected)throw new Error(`${label}: expected ${expected}, got ${r.status}\n${r.stdout}\n${r.stderr}`);
 console.log(`PASS ${label}`);passed++;
};
try {
 git('init','-q');
 for(const name of ['check-migration-gate.js','check-baselines-gate.js'])write(`scripts/${name}`,readFileSync(join(root,'scripts',name),'utf8'));
 write('libs/al-web-components/components/button/button.ts','// fixture\n');
 for(const path of ['libs/al-web-components/vite.config.mjs','libs/al-web-components/styles/tokens-config.v5.mjs']){
  readFileSync(join(root,path)); // Do not test a watch for a nonexistent source file.
  write(path,'// fixture\n');
 }
 manifest('scoped-complete');const base=commit();
 check('check-migration-gate.js',base,0,'clean migration');check('check-baselines-gate.js',base,0,'clean baselines');
 manifest('legacy');const legacy=commit();
 write('libs/al-web-components/components/button/button.ts','// changed\n');commit();
 check('check-migration-gate.js',legacy,1,'legacy change refused');
 manifest('dual');commit();check('check-migration-gate.js',legacy,0,'migration accepted');
 for(const path of ['libs/al-web-components/vite.config.mjs','libs/al-web-components/styles/tokens-config.v5.mjs']){
  git('reset','--hard',base);write(path,'// changed\n');commit();
  check('check-baselines-gate.js',base,1,`${path} without baseline refused`);
  write('.altitude/baselines/tokens/snapshot.json','{}\n');commit();
  check('check-baselines-gate.js',base,0,`${path} with baseline accepted`);
 }
 git('reset','--hard',base);manifest('dual');commit();
 check('check-migration-gate.js',base,1,'state regression refused');
 console.log(`Self-test: ${passed} passed, 0 failed`);
} finally {
 const resolved=realpathSync(work);const within=relative(tempRoot,resolved);
 if(!within||within.startsWith('..')||isAbsolute(within)||!within.startsWith('altitude-gate-test-'))throw new Error('Unsafe cleanup target');
 rmSync(resolved,{recursive:true,force:true});
}
