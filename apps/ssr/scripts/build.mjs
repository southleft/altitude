#!/usr/bin/env node
// T5.2 — SSR fixture build.
//
// Server-renders each pilot component using `@lit-labs/ssr` with Declarative
// Shadow DOM. Emits one HTML page per pilot under `dist/` along with a
// client-side hydration entry that loads the component definitions so the
// browser upgrades the elements without remeasuring the DOM.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
  // The scoped-theming pilot, and the only one that opts into real DSD (see
  // `ssr:` below). `brand` + `mode` are set so the generated
  // `:host([brand='odyssey'])` block is what gets serialized, and the probe
  // paragraph reads two brand-owned custom properties so "renders branded with
  // JavaScript disabled" is something a screenshot can actually show.
  //
  // The probe is a plain `<p>`, not an `<al-button>`, for the reason in `ssr:`.
  {
    tag: 'al-theme',
    ssr: true,
    attrs: `brand="odyssey" mode="dark"`,
    innerHTML:
      '<p style="color: var(--al-theme-color-background-primary-default); font: var(--al-typography-preset-16)">' +
      'Branded with JavaScript disabled.</p>',
  },
];

/**
 * `@lit-labs/ssr` can only serialize a Declarative Shadow DOM template for an
 * element whose class is REGISTERED IN THIS PROCESS. Nothing here imported the
 * component definitions, so every pilot page rendered a bare unknown element
 * with no `<template shadowrootmode>` at all — including `al-theme`, which is
 * why `.altitude/migration.json` recording `theme` as `ssr: true` was
 * aspirational rather than measured.
 *
 * OPT-IN, one pilot at a time (`ssr: true`), because registering a definition
 * is not free: once lit-ssr knows the class it renders it, and five of the six
 * pilots throw `this.querySelector is not a function` under lit-ssr's DOM shim
 * — `ALElement.slotEmpty()` (`components/ALElement.ts:92`) calls it during
 * render. That would swap their current "plain element, hydrates later" output
 * for an EMPTY shadow-root stub that hides the light DOM until JS lands, i.e.
 * strictly worse. Making `slotEmpty` SSR-safe is real work and is not this
 * spec's; `al-theme` renders `<slot>` and nothing else, so it opts in cleanly.
 */
globalThis.alAutoRegistry = true;
const LIB = resolve(ROOT, '../../libs/al-web-components/dist/components');
const registered = new Set();
async function define(tag) {
  if (registered.has(tag)) return;
  const name = tag.replace(/^al-/, '');
  try {
    await import(pathToFileURL(resolve(LIB, name, `${name}.js`)).href);
    registered.add(tag);
  } catch (err) {
    console.warn(`[ssr] could not load ${tag}: ${err?.message || err}`);
  }
}

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
    if (pilot.ssr) await define(pilot.tag);
    // Use static-html so the tag name comes from a string at runtime.
    const tag = unsafeStatic(pilot.tag);
    // `innerHTML` goes through `unsafeStatic` as well. Interpolated as an
    // ordinary expression it was HTML-ESCAPED, so `al-theme`'s child rendered
    // as the literal text `<al-button>Theme inside</al-button>` and the pilot
    // could not have demonstrated anything crossing a shadow boundary.
    const attrs = unsafeStatic(pilot.attrs ? ` ${pilot.attrs}` : '');
    const children = unsafeStatic(pilot.innerHTML);
    const tpl = html`<${tag}${attrs}>${children}</${tag}>`;
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
    <!-- Three levels up: the pages land in apps/ssr/dist/, so ../../ resolved
         to apps/ and this link had always 404'd. It matters more than it used
         to: al-theme's scoped blocks are DELTAS over the base :root bundle, so
         with this sheet missing, a brand's literal values (type ramp, radii)
         still apply while every var(--al-color-*) reference in it dangles --
         odyssey rendered Georgia 18/32 in black. -->
    <link rel="stylesheet" href="../../../libs/al-web-components/dist/css/main.css" />
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
      import('../../../libs/al-web-components/dist/components/${pilot.tag.replace(/^al-/, '')}/${pilot.tag.replace(/^al-/, '')}.js')
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
