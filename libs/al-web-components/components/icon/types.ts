import type { SVGTemplateResult } from 'lit';

/**
 * Phosphor ships six weights. Only `regular` is generated today; the property
 * exists now so adding weights later is not a breaking API change for the
 * custom-elements manifest, the JSON schemas, or the usage validator.
 */
export type ALIconWeight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';

/**
 * A registered glyph.
 *
 * Keys are terse because this shape is repeated 1,512 times in the generated
 * catalog module and again in every lazy chunk.
 */
export interface AltitudeIconDef {
  /**
   * Inner SVG markup as a compiled lit template.
   *
   * Storing a pre-compiled template rather than a raw string keeps `unsafeSVG`
   * out of the default rendering path entirely, and lets lit clone a cached
   * `<template>` instead of re-parsing markup on every render.
   */
  c: SVGTemplateResult;
  /** viewBox. Phosphor is always `0 0 256 256`; third-party art may differ. */
  v: string;
}
