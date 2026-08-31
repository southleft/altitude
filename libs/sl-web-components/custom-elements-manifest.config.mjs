// CEM analyzer config for the Southleft brand layer.
//
// This package needs its own manifest for the same reason Altitude has one:
// `libs/altitude-mcp/src/lib/parity.mjs` enumerates components from a CEM
// (`cem.mjs` keeps every declaration with `customElement && tagName`) and
// hashes the component directory behind each. That is exactly why the brand
// tier is COMPONENTS and not a pattern library — a pattern has neither a tag
// nor a directory, and could never enter the parity system without inventing a
// second, weaker check. See spec
// `2026-08-22-southleft-brand-design-system-as-a-linked-layer-on-altitude` R9.
//
// The two Altitude CEM plugins are IMPORTED, not copied: `al-conventions`
// surfaces `static el` as the tagName and parses the prose JSDoc for
// slots/events/csspart/cssproperty (without it every component here reports no
// tag at all), and `al-deterministic` must stay LAST — its packageLinkPhase
// strips CR and stable-sorts modules so the emitted JSON is byte-identical on
// Windows and Linux.

import altitudeConventions from '../al-web-components/cem-plugins/al-conventions.mjs';
import altitudeDeterministic from '../al-web-components/cem-plugins/al-deterministic.mjs';

export default {
  globs: ['components/**/*.ts'],
  exclude: ['components/**/*.stories.ts', 'components/bundle.ts'],
  outdir: '.',
  litelement: true,
  dev: false,
  plugins: [altitudeConventions(), altitudeDeterministic()],
};
