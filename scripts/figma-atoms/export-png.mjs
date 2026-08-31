#!/usr/bin/env node
/**
 * export-png.mjs — render a Figma node to a local PNG for eyeballing.
 *
 *   node scripts/figma-atoms/export-png.mjs <nodeId> <outFile> [--scale 1]
 *
 * figma_get_component_image needs a REST token this setup does not have; the plugin
 * sandbox can export bytes directly, so the image comes back base64 over the bridge.
 */
import { shimPortFromArgv } from '../lib/figma-shim.mjs';

const SHIM = shimPortFromArgv();
const [nodeId, outFile] = process.argv.slice(2);
if (!nodeId || !outFile) { console.error('usage: export-png.mjs <nodeId> <outFile> [--scale N]'); process.exit(1); }
const si = process.argv.indexOf('--scale');
const scale = si > -1 ? Number(process.argv[si + 1]) : 1;

const code = `
const n = await figma.getNodeByIdAsync(${JSON.stringify(nodeId)});
if (!n) return 'ERR: no node ' + ${JSON.stringify(nodeId)};
const bytes = await n.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: ${scale} } });
if (figma.base64Encode) return figma.base64Encode(bytes);
let s = '';
const CH = 8192;
for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
return btoa(s);
`;

const res = await fetch(`http://127.0.0.1:${SHIM}/call`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'figma_execute', arguments: { code, timeout: 180000 } }),
});
const out = await res.json();
if (out.isError) { console.error(String(out.text).slice(0, 300)); process.exit(1); }
const inner = JSON.parse(out.text);
if (!inner.success) { console.error(String(inner.error).slice(0, 300)); process.exit(1); }
if (String(inner.result).startsWith('ERR:')) { console.error(inner.result); process.exit(1); }
const { writeFileSync } = await import('node:fs');
const buf = Buffer.from(inner.result, 'base64');
writeFileSync(outFile, buf);
console.log(`${outFile}  ${buf.length} bytes`);
