#!/usr/bin/env node
/**
 * delete-page.mjs — remove a `🛠 <Name>` page so build-page.mjs can rebuild it.
 *
 *   node scripts/figma-atoms/delete-page.mjs "Button Group" [--shim 9401]
 *
 * build-page.mjs deliberately aborts when the page already exists, so iterating on a
 * build means removing the previous attempt first. Two traps are handled here:
 *   - a page cannot be removed while it is the CURRENT page (setCurrentPageAsync first)
 *   - `documentAccess: dynamic-page` needs loadAllPagesAsync before the tree is readable
 *
 * Refuses to touch anything that is not a `🛠 ` page, so a typo cannot delete Cover,
 * a divider, or the Playground.
 */
import { shimPortFromArgv } from '../lib/figma-shim.mjs';

const name = process.argv[2];
if (!name) { console.error('usage: delete-page.mjs "<Component Name>"'); process.exit(1); }
const SHIM = shimPortFromArgv(); // --port canonical, --shim legacy alias (scripts/lib/figma-shim.mjs)

const code = `
await figma.loadAllPagesAsync();
const target = '\\u{1F6E0} ' + ${JSON.stringify(name)};
const page = figma.root.children.find((p) => p.name === target);
if (!page) return JSON.stringify({ removed: false, reason: 'no such page: ' + target });
if (figma.root.children.length < 2) return JSON.stringify({ removed: false, reason: 'only one page' });
// A page cannot be removed while it is current.
if (figma.currentPage.id === page.id) {
  const other = figma.root.children.find((p) => p.id !== page.id);
  await figma.setCurrentPageAsync(other);
}
page.remove();
return JSON.stringify({ removed: true, page: target });
`;

const res = await fetch(`http://localhost:${SHIM}/call`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'figma_execute', arguments: { code, timeout: 120000 } }),
});
const out = await res.json();
if (out.isError) { console.error(out.text); process.exit(1); }
const inner = JSON.parse(out.text);
if (!inner.success) { console.error(inner.error); process.exit(1); }
console.log(inner.result);
