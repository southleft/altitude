// Wraps the deterministic OKLCH theme engine at
// libs/al-web-components/theme-engine/ — the SAME solver apps/southleft's AI
// direction panel and functions/api/theme.js use. This module never calls the
// Anthropic API: it either takes an already-decided art-direction object (the
// same shape functions/api/theme.js's SCHEMA describes) and runs it straight
// through the solver, or takes a bare text prompt and lets the engine's own
// keyless PRNG + keyword dictionary seed a direction. Either way the same
// WCAG-enforcing solver runs.
//
// HOW THE ENGINE IS LOADED — and why there are still two paths
// ------------------------------------------------------------
// Preferred: `import()` the BUILT barrel, `al-web-components/dist/theme-engine/
// index.js`. Plain ES modules, no loader hook, no TypeScript at runtime, and
// byte-for-byte the artifact a published consumer would resolve through the
// package's `"./theme-engine"` export. This is what the engine's move out of
// `.storybook/ai-theme/` bought.
//
// Fallback: the TypeScript SOURCE barrel, via the resolve hook in
// `./ts-loader-hook.mjs`. This is NOT vestigial. `dist/` is gitignored
// (.gitignore:4), and this server is routinely started against a checkout
// that has not been built — `pnpm --filter al-web-components start` boots the
// MCP on port 6017 concurrently with Storybook, with no build step in front
// of it. Every other artifact this server reads is generated and it throws a
// MissingArtifactError naming the command that produces it; the theme engine
// is the one subsystem whose source ships in git, so degrading to source is
// strictly better than refusing to run. The two are the same module graph, so
// results are identical either way.

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { PATHS } from './paths.mjs';
import { existsSync } from 'node:fs';

let hookRegistered = false;
let enginePromise = null;

function ensureHook() {
  if (hookRegistered) return;
  register('./ts-loader-hook.mjs', import.meta.url);
  hookRegistered = true;
}

function loadEngine() {
  if (!enginePromise) {
    if (existsSync(PATHS.themeEngineDist)) {
      enginePromise = import(pathToFileURL(PATHS.themeEngineDist));
    } else if (existsSync(PATHS.themeEngineSrc)) {
      ensureHook();
      enginePromise = import(pathToFileURL(PATHS.themeEngineSrc));
    } else {
      return Promise.reject(
        new Error(
          `Missing the Altitude theme engine. Looked for the built barrel at ${PATHS.themeEngineDist} ` +
            `and the TypeScript source at ${PATHS.themeEngineSrc}. The source ships in git, so both ` +
            'being absent means the checkout is incomplete rather than a build-step gap.'
        )
      );
    }
  }
  return enginePromise;
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number(n)));
const hue = (v) => (v == null || Number.isNaN(Number(v)) ? undefined : (((Number(v) % 360) + 360) % 360));

/** Sanitize a caller-supplied direction the same way functions/api/theme.js clamps the AI's. */
function sanitizeDirection(direction, enums) {
  if (!direction) return undefined;
  const { PERSONALITIES, RADII, ELEVATIONS, MOTIONS, BORDER_WEIGHTS, BG_TINTS, MODES } = enums;
  const pick = (v, allowed) => (allowed.includes(v) ? v : undefined);
  const out = {
    accentHue: hue(direction.accentHue),
    secondaryHue: hue(direction.secondaryHue),
    neutralHue: hue(direction.neutralHue),
    chroma: direction.chroma == null ? undefined : clamp(direction.chroma, 0.02, 0.27),
    personality: pick(direction.personality, PERSONALITIES),
    mode: pick(direction.mode, MODES),
    bgTint: pick(direction.bgTint, BG_TINTS),
    radius: pick(direction.radius, RADII),
    elevation: pick(direction.elevation, ELEVATIONS),
    motion: pick(direction.motion, MOTIONS),
    borderWeight: pick(direction.borderWeight, BORDER_WEIGHTS),
    name: direction.name ? String(direction.name).slice(0, 40) : undefined,
    quip: direction.quip ? String(direction.quip).slice(0, 90) : undefined,
  };
  // Drop undefined keys so buildTheme's seed engine can fill the gaps.
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}

/**
 * @param {{prompt?: string, direction?: object, variant?: number}} input
 */
export async function generateTheme({ prompt, direction, variant = 0 } = {}) {
  // One barrel now carries both halves — `buildTheme` and the enum tuples the
  // sanitizer validates against. They used to be two separate `.ts` files
  // imported side by side; `theme-engine/index.ts` re-exports both.
  const engine = await loadEngine();
  const cleanDirection = sanitizeDirection(direction, engine);
  const theme = engine.buildTheme({
    prompt: prompt?.trim() || cleanDirection?.name || 'altitude',
    variant,
    direction: cleanDirection,
  });
  return {
    name: theme.name,
    quip: theme.quip,
    mode: theme.mode,
    personality: theme.personality,
    palette: theme.palette,
    receipts: theme.receipts,
    direction: cleanDirection ?? null,
    source: cleanDirection ? 'direction' : 'prompt-seed',
  };
}
