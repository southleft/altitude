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

import { ALButton } from 'al-web-components/components/button';
import { registerAltitude } from 'al-web-components/directives/register';

const LEFT_SUFFIX = '1-0-0';
const RIGHT_SUFFIX = '2-0-0';

const leftMap = registerAltitude({ mode: 'versioned', suffix: LEFT_SUFFIX }, [
  [ALButton.el, ALButton],
]);
const rightMap = registerAltitude({ mode: 'versioned', suffix: RIGHT_SUFFIX }, [
  [ALButton.el, ALButton],
]);

const leftTag = leftMap.get(ALButton.el);
const rightTag = rightMap.get(ALButton.el);

// Render via the suffixed tag names so the page can be visually inspected.
document.getElementById('left-mount').innerHTML = `<${leftTag}>Left button</${leftTag}>`;
document.getElementById('right-mount').innerHTML = `<${rightTag}>Right button</${rightTag}>`;

// Markers the Playwright test reads.
window.__ALTITUDE_MFE_FIXTURE__ = { leftTag, rightTag };
