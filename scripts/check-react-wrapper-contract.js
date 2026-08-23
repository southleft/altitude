#!/usr/bin/env node
/**
 * al-react wrapper SURFACE check (static).
 *
 * NAMING, HONESTLY. CI runs this file under the job name "T4.7 React 19 wrapper
 * contract" (.github/workflows/v2-checks.yml). It is not a contract test: it
 * never mounts a component, never renders, and never dispatches an event. It
 * reads source files. The behavioural contract is asserted elsewhere and by
 * different things — `tests/wrapper-contract.spec.ts` (mounting, refs, form
 * association) and `scripts/check-preset-parity.mjs` (the five theming axes
 * reaching ATTRIBUTES, which only a browser can observe). Read a green run here
 * as "the surface is intact", nothing more.
 *
 * WHAT IT ASSERTS.
 *   1. React 19 + @lit/react are pinned in al-react's package.json.
 *   2. Every pilot has a wrapper that calls createComponent with an elementClass.
 *   3. EVENT MAPS ARE NOT DEAD. Every event name a wrapper maps must actually be
 *      dispatched by some component in al-web-components. This is the check that
 *      was missing: `Calendar.tsx` mapped `onChange: 'change'` while calendar.ts
 *      only ever dispatched `onCalendarChange`, and `CheckboxGroup.tsx` mapped
 *      `onChange: 'change'` at a component that dispatched nothing at all — two
 *      React props that could never fire, for as long as this file has existed.
 *   4. NO SILENTLY DROPPED EVENTS. If a wrapper's own web component dispatches
 *      anything, the wrapper must declare a non-empty `events` map. `@lit/react`
 *      surfaces nothing that is not listed there.
 *   5. Every wrapper module opens with a `'use client'` directive. Without it
 *      Next.js App Router / RSC cannot import al-react at all — every wrapper
 *      calls `customElements.define` at module scope.
 *
 * KNOWN LIMIT of check 3: Altitude events bubble and compose
 * (`ALElement.dispatch()` defaults to `bubbles: true, composed: true`), so a
 * wrapper may legitimately map an event its own component never dispatches —
 * `Menu.tsx` maps `onMenuItemSelect`, which `menu-item.ts` fires and `<al-menu>`
 * receives by bubbling. The check therefore requires the event to exist SOMEWHERE
 * in the library rather than in one specific file. Only a browser test can prove
 * a given event reaches a given host.
 *
 * Exit codes:
 *   0 — surface intact
 *   1 — violation found
 *   2 — internal error
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const REACT_PKG = path.join(REPO, 'libs/al-react/package.json');
const REACT_SRC = path.join(REPO, 'libs/al-react/src/components');
const WC_COMPONENTS = path.join(REPO, 'libs/al-web-components/components');
// `Theme` joined the list when `.altitude/migration.json` flipped
// `theme.react19` to true (spec 2026-07-28-react-storybook-preset-switcher).
const PILOTS = ['Button', 'Input', 'Select', 'Dialog', 'ThemeSwitcher', 'Theme'];

const problems = [];
const fail = (msg) => problems.push(msg);

/**
 * Strip `//` line comments from a WRAPPER module before pattern-matching.
 *
 * Not cosmetic: the fixed Calendar/CheckboxGroup wrappers explain the old dead
 * mapping in a comment, and without this the checker reported the very bug it
 * had just been used to fix.
 *
 * Deliberately NOT applied to al-web-components sources, and deliberately not
 * touching block comments: `file-upload.ts:348` contains the string literal
 * `'/*'`, which a regex-based block-comment stripper reads as an opening
 * delimiter and then swallows everything up to the next `* /` — including the
 * `onFileUploadFileUpload` dispatch at :367. Wrapper modules are ~20 lines of
 * generated code with no such literals. A comment in a web component that
 * happens to contain `eventName: '…'` would only widen the allow-list, which is
 * the harmless direction.
 */
function stripLineComments(src) {
  // `[^:]` before `//` so a `https://` inside a string survives.
  return src.replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Every event name dispatched anywhere in al-web-components. */
function collectDispatchedEvents(dir, out = new Set()) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      collectDispatchedEvents(p, out);
      continue;
    }
    if (!entry.name.endsWith('.ts') || entry.name.endsWith('.stories.ts')) continue;
    const src = fs.readFileSync(p, 'utf8');
    for (const m of src.matchAll(/eventName:\s*['"`]([^'"`]+)['"`]/g)) out.add(m[1]);
    for (const m of src.matchAll(/new CustomEvent\(\s*['"`]([^'"`]+)['"`]/g)) out.add(m[1]);
  }
  return out;
}

/** `events: { onFoo: 'onFoo' }` → [['onFoo', 'onFoo']]. */
function parseEventMap(rawSrc) {
  const src = stripLineComments(rawSrc);
  const block = src.match(/events\s*:\s*\{([\s\S]*?)\n\s*\}/);
  if (!block) return null;
  return [...block[1].matchAll(/([A-Za-z0-9_]+)\s*:\s*['"`]([^'"`]+)['"`]/g)].map((m) => [m[1], m[2]]);
}

function main() {
  const pkg = JSON.parse(fs.readFileSync(REACT_PKG, 'utf8'));

  // 1. React 19 pinned
  const reactSpec = pkg.dependencies?.react;
  if (!reactSpec || !/^\^?19/.test(reactSpec)) fail(`al-react react dep is '${reactSpec}', expected ^19.*`);
  const reactDomSpec = pkg.dependencies?.['react-dom'];
  if (!reactDomSpec || !/^\^?19/.test(reactDomSpec)) fail(`al-react react-dom dep is '${reactDomSpec}', expected ^19.*`);
  if (!pkg.dependencies?.['@lit/react']) fail('al-react missing @lit/react');

  // 2. Every pilot has a wrapper
  for (const name of PILOTS) {
    const tsx = path.join(REACT_SRC, name, `${name}.tsx`);
    if (!fs.existsSync(tsx)) {
      fail(`missing pilot wrapper: ${name}/${name}.tsx`);
      continue;
    }
    const src = fs.readFileSync(tsx, 'utf8');
    if (!src.includes('createComponent(')) fail(`${name}.tsx does not call createComponent`);
    if (!src.includes('elementClass')) fail(`${name}.tsx does not specify elementClass`);
  }

  // 3–5. Every wrapper in the library.
  const dispatched = collectDispatchedEvents(WC_COMPONENTS);
  let wrappers = 0;
  let mappedEvents = 0;

  for (const entry of fs.readdirSync(REACT_SRC, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const tsx = path.join(REACT_SRC, entry.name, `${entry.name}.tsx`);
    if (!fs.existsSync(tsx)) continue;
    const src = fs.readFileSync(tsx, 'utf8');
    if (!src.includes('createComponent(')) continue;
    wrappers += 1;
    const rel = path.relative(REPO, tsx).split(path.sep).join('/');

    // 5. 'use client'
    if (!/^\s*(['"])use client\1\s*;?/.test(src)) {
      fail(`${rel} does not start with a 'use client' directive (blocks Next.js App Router / RSC)`);
    }

    // 3. Mapped events must exist somewhere in al-web-components.
    const map = parseEventMap(src);
    for (const [prop, eventName] of map ?? []) {
      mappedEvents += 1;
      if (!dispatched.has(eventName)) {
        fail(
          `${rel} maps React prop '${prop}' to event '${eventName}', which no al-web-components ` +
            'component dispatches — the prop can never fire.'
        );
      }
    }

    // 4. A dispatching component must have its events surfaced.
    const importMatch = src.match(/from\s+'al-web-components\/components\/([^']+)'/);
    if (!importMatch) continue;
    const slug = importMatch[1];
    const wcFile = path.join(WC_COMPONENTS, slug, `${slug.split('/').pop()}.ts`);
    if (!fs.existsSync(wcFile)) continue;
    const wcSrc = fs.readFileSync(wcFile, 'utf8');
    const ownEvents = [...wcSrc.matchAll(/eventName:\s*['"`]([^'"`]+)['"`]/g)].map((m) => m[1]);
    if (ownEvents.length > 0 && (map === null || map.length === 0)) {
      fail(
        `${rel} declares no events map, but ${slug} dispatches ${[...new Set(ownEvents)].join(', ')} — ` +
          '@lit/react surfaces only what is listed, so those events are dropped.'
      );
    }
  }

  if (problems.length > 0) {
    for (const msg of problems) console.error('[r-surface] FAIL —', msg);
    console.error(`[r-surface] ${problems.length} problem(s).`);
    process.exit(1);
  }

  console.log(
    `[r-surface] PASS — al-react@R19, ${PILOTS.length} pilot wrappers, ${wrappers} wrappers checked, ` +
      `${mappedEvents} event mappings all backed by a real dispatch, 'use client' on every wrapper.`
  );
}

try {
  main();
} catch (err) {
  console.error('[r-surface] internal error —', err?.stack || err);
  process.exit(2);
}
