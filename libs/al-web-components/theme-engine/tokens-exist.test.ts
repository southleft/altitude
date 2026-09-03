import { describe, expect, it } from 'vitest';
import { buildTheme } from './engine';
import { MODE_SEMANTICS, ROLE_STOPS } from './ramps';
import tokens from '../styles/dist/tokens.json';
import themeCss from '../components/theme/theme.scss?raw';

/**
 * REGRESSION GUARD (2026-09-02) — every custom property the engine writes must
 * be a name the token pipeline actually emits.
 *
 * Three commits renamed the token tree out from under `ramps.ts` and nothing
 * caught it, because writing an inline custom property that no stylesheet reads
 * fails SILENTLY: `applyTheme()` sets it, the cascade ignores it, the receipts
 * still measure the hexes the solver produced, and every existing test stayed
 * green while a derived theme rendered as the stock palette. The engine was
 * writing `--al-color-neutral-{light,dark}-*` (tier-2 stopped reading those),
 * `--al-color-transparent-dark-{60,80}` and `--al-color-shadow-{dark,light}`
 * (never emitted at all).
 *
 * This file is the cheap, loud check that cannot rot the same way: it diffs the
 * engine's emitted key set against `styles/dist/tokens.json` — the artefact
 * Style Dictionary writes, i.e. the same names the shipped CSS declares.
 *
 * NOTE ON THE BUILD DEPENDENCY: `styles/dist/` is gitignored, so this test
 * requires `pnpm --filter @southleft/al-web-components build:tokens` (or any
 * full build) to have run first — the same precondition the `react` project in
 * `vitest.config.mts` already documents. A missing/empty tokens.json fails the
 * first assertion loudly rather than skipping.
 */

/**
 * The ONE documented exception. These nine role-axis properties deliberately
 * carry no tier-2 `:root` default — `components/theme/theme.scss` declares them
 * per `<al-theme shape>` / `<al-theme motion>` value and every consuming
 * component reads them as `var(--…-role-x, var(--…-legacy))`. See that file's
 * "shape axis" / "motion axis" comments. They are still verified below: each
 * one must appear in theme.scss, so this allowlist cannot quietly outlive the
 * declarations that justify it.
 */
const CSS_ONLY_ROLE_PROPERTIES = [
  '--al-theme-border-radius-role-action',
  '--al-theme-border-radius-role-control',
  '--al-theme-border-radius-role-surface',
  '--al-theme-border-radius-role-indicator',
  '--al-theme-animation-duration-role-fast',
  '--al-theme-animation-duration-role-base',
  '--al-theme-animation-duration-role-slow',
  '--al-theme-animation-timing-role-standard',
  '--al-theme-animation-timing-role-emphasized',
];

const PROMPTS = [
  'ocean editorial',
  'sunset playful bold',
  'midnight brutalist',
  'paper minimal quiet',
  'cyber neon',
  'forest luxury',
];

/** `--` + the Style Dictionary token name, e.g. `al-color-neutral-500`. */
const EMITTED_TOKENS = new Set(Object.keys(tokens as Record<string, unknown>).map((n) => `--${n}`));

/** Every distinct custom property the engine writes across a real spread. */
function emittedKeys(): Set<string> {
  const keys = new Set<string>();
  for (const prompt of PROMPTS) {
    for (const mode of ['light', 'dark'] as const) {
      for (const variant of [0, 1, 2, 3]) {
        const theme = buildTheme({ prompt, variant, direction: { mode } });
        for (const key of Object.keys(theme.palette)) keys.add(key);
      }
    }
  }
  return keys;
}

/** Custom-property names referenced inside a `var(...)` in a value string. */
function varRefs(value: string): string[] {
  return [...value.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((m) => m[1]);
}

describe('theme-engine emits only token names that exist', () => {
  it('has a non-empty emitted token set to check against', () => {
    // Guards the failure mode where tokens.json is missing/stale and every
    // assertion below trivially passes against an empty allow-set.
    expect(
      EMITTED_TOKENS.size,
      'styles/dist/tokens.json looks empty — run build:tokens before the suite'
    ).toBeGreaterThan(400);
    expect(EMITTED_TOKENS.has('--al-color-neutral-500')).toBe(true);
  });

  it('writes no custom property that tokens.json does not declare', () => {
    const allowed = new Set(CSS_ONLY_ROLE_PROPERTIES);
    const unknown = [...emittedKeys()].filter((k) => !EMITTED_TOKENS.has(k) && !allowed.has(k)).sort();
    expect(
      unknown,
      `the engine writes ${unknown.length} custom propert${unknown.length === 1 ? 'y' : 'ies'} ` +
        `that the token pipeline does not emit — these land inline on <html> and are ` +
        `silently ignored by every stylesheet:\n  ${unknown.join('\n  ')}`
    ).toEqual([]);
  });

  it('keeps the CSS-only role allowlist honest — each entry is declared in theme.scss', () => {
    for (const property of CSS_ONLY_ROLE_PROPERTIES) {
      expect(
        themeCss.includes(`${property}:`),
        `${property} is allowlisted as "declared in theme.scss, not in tokens.json" but ` +
          `components/theme/theme.scss never declares it`
      ).toBe(true);
    }
  });

  it('resolves every var() target in MODE_SEMANTICS to a real token', () => {
    // MODE_SEMANTICS values are indirections (`var(--al-color-neutral-800)`).
    // A dead target here is the exact defect that shipped: the property name on
    // the LEFT existed, so nothing complained, while the value pointed at a
    // primitive the rename had deleted.
    for (const mode of ['light', 'dark'] as const) {
      for (const [property, value] of Object.entries(MODE_SEMANTICS[mode])) {
        for (const ref of varRefs(value)) {
          expect(
            EMITTED_TOKENS.has(ref),
            `MODE_SEMANTICS.${mode}["${property}"] points at ${ref}, which tokens.json does not emit`
          ).toBe(true);
        }
      }
    }
  });

  it('points every ROLE_STOPS entry at a stop that exists', () => {
    for (const mode of ['light', 'dark'] as const) {
      const roles = ROLE_STOPS[mode];
      for (const [role, entry] of Object.entries(roles)) {
        const name =
          typeof entry === 'number'
            ? // `status` is a bare stop shared by the three status ramps.
              null
            : `--al-color-${entry.ramp}-${entry.stop}`;
        if (name) {
          expect(EMITTED_TOKENS.has(name), `ROLE_STOPS.${mode}.${role} -> ${name} does not exist`).toBe(true);
        } else {
          for (const ramp of ['danger', 'warning', 'success']) {
            const statusName = `--al-color-${ramp}-${entry as number}`;
            expect(
              EMITTED_TOKENS.has(statusName),
              `ROLE_STOPS.${mode}.${role} -> ${statusName} does not exist`
            ).toBe(true);
          }
        }
      }
    }
  });
});
