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

registerAltitude({ mode: 'versioned', suffix: HOST_SUFFIX }, [
  [ALTheme.el, ALTheme],
  [ALLayout.el, ALLayout],
  [ALHeading.el, ALHeading],
]);

const leftMap = registerAltitude({ mode: 'versioned', suffix: LEFT_SUFFIX }, [
  [ALButton.el, ALButton],
  [ALCard.el, ALCard],
  [ALHeading.el, ALHeading],
]);
const rightMap = registerAltitude({ mode: 'versioned', suffix: RIGHT_SUFFIX }, [
  [ALButton.el, ALButton],
  [ALCard.el, ALCard],
  [ALHeading.el, ALHeading],
]);

const leftTag = leftMap.get(ALButton.el);
const rightTag = rightMap.get(ALButton.el);

// Render via the suffixed tag names so the page can be visually inspected.
document.getElementById('left-mount').innerHTML = `<${leftTag}>Left button</${leftTag}>`;
document.getElementById('right-mount').innerHTML = `<${rightTag}>Right button</${rightTag}>`;

// Markers the Playwright test reads.
window.__ALTITUDE_MFE_FIXTURE__ = { leftTag, rightTag };
