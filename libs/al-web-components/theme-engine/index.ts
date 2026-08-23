/**
 * Public entry point for Altitude's deterministic OKLCH theme engine.
 *
 * WHY THIS DIRECTORY EXISTS AT ALL
 * -------------------------------
 * The engine used to live in `.storybook/ai-theme/`, which made it invisible
 * to every real consumer: `.storybook` is a dot-directory, so TypeScript's
 * wildcard `include` skips it, `tsc` never emitted a declaration for it, Vite
 * never built it into `dist/`, and the `exports` map could not point at it.
 * The practical fallout was three-fold and all of it real:
 *
 *   1. No consumer of the published package could derive a theme — the code
 *      shipped in git but never in the tarball.
 *   2. `apps/southleft` reached into the library through four levels of
 *      relative path (`../../../../libs/al-web-components/.storybook/...`),
 *      compiling the library's TypeScript inside the app's own build.
 *   3. `libs/altitude-mcp` had to register a custom ESM resolve hook and
 *      hot-strip TypeScript off disk at runtime to call `buildTheme`.
 *
 * `theme-engine/` is a top-level, built, exported directory in the same
 * spirit as `motion/` and `controllers/`: one Vite entry, one `.d.ts`, one
 * `"./theme-engine"` subpath export. Nothing about the math changed.
 *
 * WHAT IS AND IS NOT HERE
 * -----------------------
 * Everything in this directory is browser-safe and dependency-free. The
 * dev-server half of the AI console (the Vite middleware that proxies
 * `POST /api/theme` to `functions/api/theme.js`) is Node-only and lives at
 * `../vite-plugins/theme-api.mjs` instead — it must not be reachable from a
 * browser entry point.
 */

export { buildTheme } from './engine';
export type { BuildOptions } from './engine';

export { applyTheme, resetTheme } from './apply';

// Only `THEME_API` is re-exported. `ADDON_ID` / `TOOL_ID` / `EVENTS` /
// `STORAGE_KEY` in `./constants` served the Storybook addon panel that used to
// drive this engine; that panel is gone (nothing in the repo references them —
// see the note in that file) and promoting dead ids into the package's public
// API would make them look supported. They stay in the module, unexported here.
export { THEME_API } from './constants';

export {
  PERSONALITIES,
  RADII,
  ELEVATIONS,
  MOTIONS,
  BORDER_WEIGHTS,
  BG_TINTS,
  MODES,
  HERO_COMPOSITIONS,
  SECTION_ORDER_IDS,
  GRID_DENSITIES,
  CONTENT_WIDTHS,
  SECTION_EMPHASIS,
} from './types';
export type {
  ApplyPayload,
  BgTint,
  BorderWeight,
  ContentWidth,
  Direction,
  Elevation,
  GridDensity,
  HeroComposition,
  Mode,
  Motion,
  Personality,
  Radius,
  Receipt,
  ResolvedLayout,
  SectionEmphasis,
  SectionId,
  Theme,
} from './types';

// The OKLCH/WCAG primitives, exported so a consumer can solve a single pair
// (or audit a contrast claim) without re-deriving a whole theme.
export { bestInk, contrast, luminance, luminanceGuess, oklchToLinearSrgb, solve, toHex } from './oklch';
export type { RGB } from './oklch';
