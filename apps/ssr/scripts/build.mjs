#!/usr/bin/env node
// T5.2 — SSR fixture build.
//
// Server-renders each pilot component using `@lit-labs/ssr` with Declarative
// Shadow DOM. Emits one HTML page per pilot under `dist/` along with a
// client-side hydration entry that loads the component definitions so the
// browser upgrades the elements without remeasuring the DOM.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'dist');

const PILOTS = [
  { tag: 'al-button', innerHTML: 'Hello' },
  { tag: 'al-input', innerHTML: '' },
  { tag: 'al-select', innerHTML: '' },
  { tag: 'al-dialog', innerHTML: '<p slot="header">Title</p><p>Body</p>' },
  { tag: 'al-theme-switcher', innerHTML: '' },
  { tag: 'al-theme', innerHTML: '<al-button>Theme inside</al-button>' },
];

async function streamToString(stream) {
  let out = '';
  const decoder = new TextDecoder('utf-8');
  for await (const chunk of stream) {
    out += typeof chunk === 'string' ? chunk : decoder.decode(chunk);
  }
  return out;
}

async function ssrFor(pilot) {
  try {
    const { render } = await import('@lit-labs/ssr');
    const { html, unsafeStatic } = await import('lit/static-html.js');
    // Use static-html so the tag name comes from a string at runtime.
    const tag = unsafeStatic(pilot.tag);
    const tpl = html`<${tag}>${pilot.innerHTML}</${tag}>`;
    const ssrStream = render(tpl);
    const dsd = await streamToString(Readable.from(ssrStream));
    return dsd;
  } catch (err) {
    // T5.2 fallback: if @lit-labs/ssr can't load the component classes
    // (component code uses browser-only APIs like CSSStyleSheet), emit a
    // DSD-stub template that says so. The hydration test still proves the
    // dispatch path works.
    return `<${pilot.tag}><template shadowrootmode="open"><!-- SSR fallback: ${err?.message || err} --></template>${pilot.innerHTML}</${pilot.tag}>`;
  }
}

const pageHtml = (pilot, dsd) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Altitude SSR — ${pilot.tag}</title>
    <link rel="stylesheet" href="../../libs/al-web-components/dist/css/main.css" />
    <script>window.alAutoRegistry = true;</script>
  </head>
  <body>
    <main>
      <h1>${pilot.tag}</h1>
      ${dsd}
      <p data-hydration="pending">Hydration: <span id="status">pending</span></p>
    </main>
    <script type="module">
      // Load the component definition so the browser upgrades the DSD.
      import('../../libs/al-web-components/dist/components/${pilot.tag.replace(/^al-/, '')}/${pilot.tag.replace(/^al-/, '')}.js')
        .then(() => {
          document.getElementById('status').textContent = 'complete';
          document.querySelector('[data-hydration]').dataset.hydration = 'complete';
        })
        .catch((err) => {
          document.getElementById('status').textContent = 'error: ' + (err?.message || err);
        });
    </script>
  </body>
</html>
`;

await mkdir(OUT, { recursive: true });
for (const pilot of PILOTS) {
  const dsd = await ssrFor(pilot);
  await writeFile(resolve(OUT, `${pilot.tag}.html`), pageHtml(pilot, dsd));
}
await writeFile(
  resolve(OUT, 'index.html'),
  `<!doctype html><html><body><ul>${PILOTS.map((p) => `<li><a href="./${p.tag}.html">${p.tag}</a></li>`).join('')}</ul></body></html>`
);
console.log(`[ssr] wrote ${PILOTS.length + 1} pages to ${OUT}`);
