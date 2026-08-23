// T0.3 + T4.6 MFE fixture — proves two Altitude versions coexist on the
// same page via the `versioned` registry mode.
//
// Both sides register the same class under distinct suffixed tags; the
// Playwright acceptance (tests/mfe.spec.ts) asserts `customElements.get`
// returns two distinct entries.
//
// Once a real second copy of `al-web-components` is published, replace the
// shared import with the version-pinned packages; the rest of this wiring
// stays the same.
//
// The page chrome (`<al-theme>`, the outer `<al-layout>`, the header
// `<al-heading>`) belongs to neither simulated app — it's the fixture's own
// host shell — so it gets its own versioned registration under a `shell`
// suffix rather than borrowing either app's suffix. Each simulated app
// registers its own card/heading alongside its button, exactly like a real
// MFE deployment would bring its own copy of every component it renders.

import { ALButton } from 'al-web-components/components/button';
import { ALTheme } from 'al-web-components/components/theme';
import { ALLayout } from 'al-web-components/components/layout';
import { ALCard } from 'al-web-components/components/card';
import { ALHeading } from 'al-web-components/components/heading';
import { registerAltitude } from 'al-web-components/directives/register';

const HOST_SUFFIX = 'shell';
const LEFT_SUFFIX = '1-0-0';
const RIGHT_SUFFIX = '2-0-0';

/**
 * Simulate a separately-bundled copy of a component.
 *
 * A REAL multi-version deployment ships two bundles, so each version owns a
 * DISTINCT constructor. This fixture has one bundle and therefore one class per
 * component — and `customElements.define` rejects the same constructor under a
 * second name:
 *
 *   NotSupportedError: this constructor has already been used with this registry
 *
 * `defineSafely` catches that and logs, so the page LOOKED fine while
 * `al-button-2-0-0`, `al-card-2-0-0`, `al-heading-1-0-0` and `al-heading-2-0-0`
 * were never defined at all — the right-hand app rendered an inert unknown
 * element. tests/mfe.spec.ts could not see it because it asserted against an
 * inline reimplementation of `registerAltitude` instead of this page.
 *
 * An empty subclass is the faithful stand-in: a distinct constructor with
 * identical behavior, exactly what two published copies would give you.
 */
const asCopy = (entries) => entries.map(([tag, Klass]) => [tag, class extends Klass {}]);

registerAltitude({ mode: 'versioned', suffix: HOST_SUFFIX }, asCopy([
  [ALTheme.el, ALTheme],
  [ALLayout.el, ALLayout],
  [ALHeading.el, ALHeading],
]));

const leftMap = registerAltitude({ mode: 'versioned', suffix: LEFT_SUFFIX }, asCopy([
  [ALButton.el, ALButton],
  [ALCard.el, ALCard],
  [ALHeading.el, ALHeading],
]));
const rightMap = registerAltitude({ mode: 'versioned', suffix: RIGHT_SUFFIX }, asCopy([
  [ALButton.el, ALButton],
  [ALCard.el, ALCard],
  [ALHeading.el, ALHeading],
]));

const leftTag = leftMap.get(ALButton.el);
const rightTag = rightMap.get(ALButton.el);

// Render via the suffixed tag names so the page can be visually inspected.
document.getElementById('left-mount').innerHTML = `<${leftTag}>Left button</${leftTag}>`;
document.getElementById('right-mount').innerHTML = `<${rightTag}>Right button</${rightTag}>`;

// Markers the Playwright test reads.
//
// `registerAltitude` is re-exposed deliberately: tests/mfe.spec.ts drives the
// REAL bundled implementation through it (stable / manual / missing-suffix
// paths) instead of reimplementing the semantics inside `page.evaluate`, which
// is what the previous version of that test did. If the export is deleted or
// its mode handling regresses, the test fails.
window.__ALTITUDE_MFE_FIXTURE__ = { leftTag, rightTag, registerAltitude };
