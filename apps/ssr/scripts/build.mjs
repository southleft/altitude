#!/usr/bin/env node
// T0.3 SSR placeholder. Emits static HTML pages — one per pilot component —
// so CI verifies the SSR fixture builds even before T5.2 wires Lit SSR.
// At T5.2 this becomes a real Declarative Shadow DOM renderer.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'dist');

const PILOTS = ['button', 'input', 'select', 'dialog', 'theme-switcher'];

const pageHtml = (name) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Altitude SSR placeholder — ${name}</title>
  </head>
  <body>
    <main>
      <h1>${name}</h1>
      <al-${name}></al-${name}>
      <p>
        T0.3 placeholder. T5.2 will render this via Lit SSR with Declarative
        Shadow DOM so the browser hydrates without FOUC.
      </p>
    </main>
  </body>
</html>
`;

await mkdir(OUT, { recursive: true });
for (const name of PILOTS) {
  await writeFile(resolve(OUT, `${name}.html`), pageHtml(name));
}
await writeFile(
  resolve(OUT, 'index.html'),
  `<!doctype html><html><body><ul>${PILOTS.map((n) => `<li><a href="./${n}.html">${n}</a></li>`).join('')}</ul></body></html>`
);
console.log(`[ssr] wrote ${PILOTS.length + 1} placeholder pages to ${OUT}`);
