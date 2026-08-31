#!/usr/bin/env node
/**
 * fig.mjs — run a snippet of plugin code against a PROJECT's Figma file via the shim.
 *
 * The shim proxies to whichever file the Desktop Bridge has focused unless a
 * fileKey is passed, so every ad-hoc probe needs the same three lines of
 * boilerplate. This is that boilerplate, once, with the project's fileKey filled
 * in from the registry rather than pasted.
 *
 *   node scripts/figma-atoms/fig.mjs --project southleft -e "return figma.root.name"
 *   node scripts/figma-atoms/fig.mjs --project southleft -f probe.js
 *   node scripts/figma-atoms/fig.mjs --project southleft --rm-page "🛠 Heading"
 */
import { readFileSync } from 'node:fs';
import { scope, projectArg } from './project-scope.mjs';
import { shimPortFromArgv } from '../lib/figma-shim.mjs';

const SC = scope(projectArg());
const argv = process.argv;
const arg = (flag) => { const i = argv.indexOf(flag); return i > -1 ? argv[i + 1] : null; };
const SHIM = shimPortFromArgv(argv); // --port canonical, --shim legacy alias

let code = arg('-e');
const file = arg('-f');
const rmPage = arg('--rm-page');
const listPages = argv.includes('--pages');

if (file) code = readFileSync(file, 'utf8');
if (rmPage) {
  code = `await figma.loadAllPagesAsync();
const target = ${JSON.stringify(rmPage)};
const p = figma.root.children.find((x) => x.name === target);
if (!p) return 'NO SUCH PAGE: ' + target;
// trap 16: a page cannot be removed while it is the CURRENT page.
const other = figma.root.children.find((x) => x.id !== p.id);
if (other) await figma.setCurrentPageAsync(other);
p.remove();
return 'removed ' + target;`;
}
if (listPages) {
  code = `await figma.loadAllPagesAsync();
return figma.root.children.map((p) => ({
  page: p.name,
  sets: p.children.filter((n) => n.type === 'COMPONENT_SET').map((n) => ({ name: n.name, variants: n.children.length })),
}));`;
}
if (!code) { console.error('usage: fig.mjs [--project id] (-e <code> | -f <file> | --rm-page <name> | --pages)'); process.exit(1); }

const res = await fetch(`http://localhost:${SHIM}/call`, {
  method: 'POST',
  body: JSON.stringify({
    name: 'figma_execute',
    arguments: { code, fileKey: SC.fileKey, timeout: 30000 },
  }),
});
const out = await res.json();
let payload;
try { payload = JSON.parse(out.text); } catch { console.log(out.text ?? out); process.exit(0); }
if (payload.success === false || payload.error) {
  console.error('FIGMA ERROR:', payload.error || payload);
  process.exit(1);
}
console.log(JSON.stringify(payload.result, null, 1));
