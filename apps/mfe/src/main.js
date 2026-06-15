// T0.3 MFE fixture — minimal until T4.6 lands `registerAltitude({ mode: 'versioned' })`.
// For now we just import the pilot components so the build verifies module shape.
import 'al-web-components/dist/components/button/button.js';
import 'al-web-components/dist/components/theme-switcher/theme-switcher.js';

// Marker that downstream tests can use to assert this fixture loaded.
window.__ALTITUDE_MFE_FIXTURE__ = true;
