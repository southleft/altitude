import { describe, expect, it } from 'vitest';
import { buildTheme } from './engine';
import { TARGETS } from './ramps';

/**
 * T (2026-08-22-token-debt-and-machine-readable-metadata) — WCAG enforcement
 * coverage for the theme-engine solver.
 *
 * Before this spec, `enforce()` covered exactly four pairings
 * (content/default, content/weak, primary/500, on-accent) and `TARGETS.border`
 * was declared in ramps.ts but never read anywhere in engine.ts. These tests
 * assert the newly-wired pairings (border/default, content/{danger,warning,
 * success}, focus-ring/bg-weak) actually clear their targets — not just that
 * `enforce()` ran, but that every receipt's measured ratio is >= its target,
 * for a real spread of prompts/modes/variants, the same way a human auditing
 * the console's receipt log would check it.
 */

const PROMPTS = [
  'ocean editorial',
  'sunset playful bold',
  'midnight brutalist',
  'paper minimal quiet',
  'cyber neon',
  'forest luxury',
  'desert terracotta',
  'violet zen',
];

const EXPECTED_LABELS = [
  'content/default',
  'content/weak',
  'border/default',
  'content/danger',
  'content/warning',
  'content/success',
  'primary/500',
  'focus-ring/bg-weak',
  'on-accent',
];

describe('theme-engine WCAG enforcement', () => {
  it('emits a receipt for every enforced pairing, on both seed-chosen modes', () => {
    // No `direction.mode` override — this exercises the SAME seed-selection
    // path a bare prompt takes in production (functions/api/theme.js falls
    // back to the seed engine whenever the AI endpoint is unreachable).
    for (const prompt of PROMPTS) {
      const theme = buildTheme({ prompt });
      const labels = theme.receipts.map((r) => r.label);
      for (const expected of EXPECTED_LABELS) {
        expect(labels, `${prompt} (${theme.mode}) is missing a "${expected}" receipt`).toContain(expected);
      }
    }
  });

  it('clears every receipt target for a spread of prompts x modes x variants', () => {
    let checked = 0;
    for (const prompt of PROMPTS) {
      for (const mode of ['light', 'dark'] as const) {
        for (const variant of [0, 1, 2, 3]) {
          const theme = buildTheme({ prompt, variant, direction: { mode } });
          for (const receipt of theme.receipts) {
            checked++;
            expect(
              receipt.ratio,
              `${prompt} variant=${variant} mode=${mode}: "${receipt.label}" measured ` +
                `${receipt.ratio}:1 against a ${receipt.target}:1 target`
            ).toBeGreaterThanOrEqual(receipt.target);
          }
        }
      }
    }
    // Sanity floor so a future refactor that silently drops the enforcement
    // loop (empty `receipts`, everything trivially "passes") cannot go green.
    expect(checked).toBeGreaterThan(PROMPTS.length * 2 * 4 * (EXPECTED_LABELS.length - 1));
  });

  it('wires the previously-declared TARGETS.border into a real border/default receipt', () => {
    // Regression guard for the exact defect this spec fixes: TARGETS.border
    // existed in ramps.ts with nothing in engine.ts ever reading it.
    const theme = buildTheme({ prompt: 'paper minimal quiet' });
    const border = theme.receipts.find((r) => r.label === 'border/default');
    expect(border, 'border/default should be a recorded receipt').toBeDefined();
    expect(border!.target).toBe(TARGETS.border);
    expect(border!.ratio).toBeGreaterThanOrEqual(TARGETS.border);
  });

  it('fixes status text that was previously unenforced and measurably inaccessible', () => {
    // "paper minimal quiet" in light mode is the concrete case measured
    // before this fix: content/danger ~3.29:1, content/warning ~3.24:1,
    // content/success ~2.97:1 against TARGETS.statusText's 4.5:1 (WCAG SC
    // 1.4.3) — all three below AA for normal text, one below even the 3:1
    // non-text floor. Enforcing must not merely record that fact; it must
    // correct it.
    const theme = buildTheme({ prompt: 'paper minimal quiet' });
    for (const label of ['content/danger', 'content/warning', 'content/success']) {
      const receipt = theme.receipts.find((r) => r.label === label);
      expect(receipt, `${label} should be a recorded receipt`).toBeDefined();
      expect(receipt!.target).toBe(TARGETS.statusText);
      expect(receipt!.ratio).toBeGreaterThanOrEqual(TARGETS.statusText);
    }
  });

  it('does not let the looser focus-ring/bg-weak pairing regress the stricter primary/500 one', () => {
    // enforceAll() solves both pairings on the SAME `--al-color-brand-blue-500`
    // stop and keeps whichever candidate is more extreme, specifically so a
    // later, looser fix (focus-ring/bg-weak, 3:1) can never undo an earlier,
    // stricter one (primary/500, 4.5:1). Assert both hold at once, not just
    // whichever ran last.
    for (const prompt of PROMPTS) {
      for (const mode of ['light', 'dark'] as const) {
        const theme = buildTheme({ prompt, direction: { mode } });
        const primary = theme.receipts.find((r) => r.label === 'primary/500')!;
        const focusRing = theme.receipts.find((r) => r.label === 'focus-ring/bg-weak')!;
        expect(primary.ratio).toBeGreaterThanOrEqual(TARGETS.accent);
        expect(focusRing.ratio).toBeGreaterThanOrEqual(TARGETS.focusRing);
        // Both receipts describe the same solved hex.
        expect(primary.hex).toBe(focusRing.hex);
      }
    }
  });
});
