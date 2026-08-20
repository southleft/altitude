// Wraps the deterministic OKLCH theme engine at
// libs/al-web-components/.storybook/ai-theme/engine.ts — the SAME solver
// Storybook's token console and functions/api/theme.js use. This module
// never calls the Anthropic API: it either takes an already-decided
// art-direction object (the same shape functions/api/theme.js's SCHEMA
// describes) and runs it straight through the solver, or takes a bare text
// prompt and lets the engine's own keyless PRNG + keyword dictionary seed a
// direction. Either way the same WCAG-enforcing solver runs.

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { PATHS, requireFile } from './paths.mjs';
import { existsSync } from 'node:fs';

let hookRegistered = false;
let enginePromise = null;

function ensureHook() {
  if (hookRegistered) return;
  register('./ts-loader-hook.mjs', import.meta.url);
  hookRegistered = true;
}

function loadEngine() {
  ensureHook();
  if (!enginePromise) {
    const enginePath = join(PATHS.aiThemeDir, 'engine.ts');
    const typesPath = join(PATHS.aiThemeDir, 'types.ts');
    requireFile(enginePath, '(shipped in git — this is not a generated artifact; check the checkout)');
    enginePromise = Promise.all([import(pathToFileURL(enginePath)), import(pathToFileURL(typesPath))]);
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
  if (!existsSync(PATHS.aiThemeDir)) {
    throw new Error(
      `Missing ${PATHS.aiThemeDir} — the deterministic OKLCH theme engine ships in git, so this ` +
        'means the checkout is incomplete rather than a build-step gap.'
    );
  }
  const [engineMod, typesMod] = await loadEngine();
  const cleanDirection = sanitizeDirection(direction, typesMod);
  const theme = engineMod.buildTheme({
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
