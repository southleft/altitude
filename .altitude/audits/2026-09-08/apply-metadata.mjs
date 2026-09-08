import fs from 'node:fs';
import {call,parsePayload} from '../../../scripts/lib/figma-shim.mjs';
const code=fs.readFileSync('.altitude/figma-sync/altitude-metadata-ops-apply.js','utf8');
const result=parsePayload(await call('figma_execute',{code,timeout:60000}));
if(result?.success===false)throw new Error(result.error);
fs.writeFileSync('.altitude/audits/2026-09-08/metadata-applied-final.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
