#!/usr/bin/env node
/**
 * check-palette-contrast.mjs — WCAG contrast gate for the SEMANTIC palette.
 *
 * Written during the v2 restyle (canvas "Altitude v2 Components", 2026-08-28),
 * which shipped four light-mode pairs below AA and six on-colour inks that were
 * unreadable on their own fills. Every one of those was invisible to the gates
 * that already existed:
 *
 *   - `verify-contrast-axis.mjs` tests the CONTRAST AXIS (the opacity step the
 *     `contrast="more"` attribute switches to) against hardcoded colours. It
 *     never reads the emitted palette, so re-pointing every semantic token in
 *     the theme cannot fail it.
 *   - `check-token-usage.mjs` proves a token is DECLARED and READ. A token can
 *     be perfectly wired and still be illegible.
 *   - VRT proves pixels did not move. After a deliberate restyle they all move,
 *     so the baselines get recaptured and a contrast regression is baked in.
 *
 * WHAT THIS CHECKS, and why the pairing matters more than the values:
 * a colour is never inaccessible on its own — only against the thing it is
 * actually rendered on. So the pairs below are not "sensible combinations",
 * they are the combinations the COMPONENTS ACTUALLY PRODUCE, each traced to the
 * call site that produces it. When you add a semantic colour token, add its
 * pairing here or it is not covered.
 *
 * The v2 form-control rework (spec 2026-08-30) added three new text roles —
 * the inset label, the field placeholder and the stepper value — and NONE of
 * them needed a new row: each resolves to a token pair already listed. They are
 * named in the descriptions below rather than duplicated as rows, because a
 * second row over the same two tokens measures the same number twice and makes
 * the pass count look like coverage it is not.
 *
 * The `-weak` naming deserves a warning, because it reads backwards: across all
 * 26 call sites `content.<hue>-weak` is THE INK THAT SITS ON
 * `background.<hue>-default` (button.scss:27, badge.scss:61-85, chip.scss:88-112,
 * checkbox.scss:128, radio.scss:127, calendar.scss:167 …), not a muted version
 * of the hue. Re-point it as a foreground for its own fill, never as body text.
 *
 * Thresholds are WCAG 2.1 AA: 4.5:1 for normal text, 3:1 for large text and for
 * non-text elements that carry meaning (focus rings, status dots). Structural
 * hairlines are held to a floor that only proves they did not vanish into their
 * ground — a 1px divider is decorative and WCAG exempts it.
 *
 * Usage:
 *   node scripts/check-palette-contrast.mjs            # both modes, exit 1 on any fail
 *   node scripts/check-palette-contrast.mjs --mode light
 *   node scripts/check-palette-contrast.mjs --quiet    # only failures
 */
'use strict';

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(REPO, 'libs/al-web-components/styles/dist-v5/css/theme');

const argv = process.argv.slice(2);
const QUIET = argv.includes('--quiet');
const ONLY = argv.includes('--mode') ? argv[argv.indexOf('--mode') + 1] : null;

/* ------------------------------------------------------------------ colour */

const hex2rgb = (h) => {
  h = h.replace('#', '').trim();
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const relLum = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Read one emitted theme bundle and resolve `var(--x)` chains to literals. */
function loadTheme(mode) {
  const file = join(DIST, `tokens-${mode}.css`);
  if (!existsSync(file)) {
    console.error(
      `[palette-contrast] MISSING ${file}\n` +
        '  styles/dist-v5/ is a build artifact and is gitignored. Run:\n' +
        '    pnpm --filter @southleft/al-web-components build:tokens'
    );
    process.exit(2);
  }
  const css = readFileSync(file, 'utf8');
  const vars = {};
  for (const m of css.matchAll(/(--al-[a-z0-9-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  const deref = (v, depth = 0) => {
    if (depth > 16) return v;
    const m = /^var\(\s*(--al-[a-z0-9-]+)\s*\)$/.exec(String(v).trim());
    return m && vars[m[1]] !== undefined ? deref(vars[m[1]], depth + 1) : String(v).trim();
  };
  return (token) => deref(vars['--al-theme-color-' + token]);
}

/* ------------------------------------------------------------------- pairs */

const TEXT = 4.5; // WCAG AA, normal text
const LARGE = 3.0; // WCAG AA, large text / meaningful non-text
const VISIBLE = 1.2; // a hairline must merely not vanish; WCAG exempts decoration

/** [foreground, background, minimum, what renders it] */
const PAIRS = [
  // --- body copy -----------------------------------------------------------
  ['content-neutral-default', 'background-neutral-default', TEXT, 'body text on a card/surface; stepper value (input-stepper__input)'],
  ['content-neutral-default', 'background-neutral-weak', TEXT, 'body text on the page'],
  ['content-neutral-default', 'background-neutral-strong', TEXT, 'body text on a recessed fill'],
  ['content-neutral-weak', 'background-neutral-default', TEXT, 'muted text on a surface; inset label (input.scss .al-has-inset-label)'],
  ['content-neutral-weak', 'background-neutral-weak', TEXT, 'muted text on the page'],
  ['content-neutral-faint', 'background-neutral-default', TEXT, 'mono metadata (table__cell--header); field placeholder (input/textarea ::placeholder)'],
  ['content-primary-default', 'background-neutral-default', TEXT, 'link text (link.scss)'],
  // WCAG 1.4.3 explicitly exempts "inactive user interface components", so the
  // disabled label is held only to "still visible", not to a text ratio — the
  // same reading `verify-contrast-axis.mjs` applies to the contrast axis.
  ['content-disabled-default', 'background-neutral-default', VISIBLE, 'disabled label (WCAG-exempt)'],

  // --- on-colour inks: content.<hue>-weak ON background.<hue>-default -------
  // See the header note: `-weak` is the ink, not a muted tint.
  ['content-primary-weak', 'background-primary-default', TEXT, 'primary button label (button.scss:27)'],
  ['content-primary-weak', 'background-primary-strong', TEXT, 'primary button label, hover (button.scss:36)'],
  ['content-secondary-weak', 'background-secondary-default', TEXT, 'secondary button label (button.scss:60)'],
  ['content-danger-weak', 'background-danger-default', TEXT, 'danger button label (button.scss:109)'],
  ['content-danger-weak', 'background-danger-strong', TEXT, 'danger button label, hover (button.scss:115)'],
  ['content-info-weak', 'background-info-default', TEXT, 'info badge/chip (badge.scss:61)'],
  ['content-success-weak', 'background-success-default', TEXT, 'success badge/chip (badge.scss:69)'],
  ['content-warning-weak', 'background-warning-default', TEXT, 'warning badge/chip (badge.scss:77)'],
  ['content-danger-weak', 'background-danger-default', TEXT, 'danger badge/chip (badge.scss:85)'],
  ['content-inverse-default', 'background-inverse-default', TEXT, 'tooltip / inverse surface'],

  // --- status text on its own soft tint (alert.scss tone surfaces) ----------
  ['content-success-default', 'background-success-weak', TEXT, 'success alert text'],
  ['content-warning-default', 'background-warning-weak', TEXT, 'warning alert text'],
  ['content-danger-default', 'background-danger-weak', TEXT, 'danger alert text'],
  ['content-info-default', 'background-info-weak', TEXT, 'info alert text'],
  ['content-primary-default', 'background-primary-weak', TEXT, 'tonal button label'],
  ['content-danger-default', 'background-neutral-default', TEXT, 'error note on a surface (field-note)'],

  // --- meaningful non-text -------------------------------------------------
  ['border-primary-default', 'background-neutral-default', LARGE, 'focus ring (al-focus mixin)'],
  ['border-danger-default', 'background-neutral-default', LARGE, 'error field border'],

  // --- structure -----------------------------------------------------------
  ['border-neutral-default', 'background-neutral-default', VISIBLE, 'control border'],
  ['border-neutral-weak', 'background-neutral-default', VISIBLE, 'hairline divider'],
  ['border-neutral-default', 'background-neutral-weak', VISIBLE, 'control border on the page'],
];

/* -------------------------------------------------------------------- run */

let failures = 0;
let checked = 0;
/** Every row across every mode, so the aggregate below can see unresolved ones. */
const allRows = [];
const modes = ONLY ? [ONLY] : ['light', 'dark'];

for (const mode of modes) {
  const get = loadTheme(mode);
  const rows = [];
  for (const [fgT, bgT, min, what] of PAIRS) {
    const fg = get(fgT);
    const bg = get(bgT);
    if (!fg || !bg || !fg.startsWith('#') || !bg.startsWith('#')) {
      rows.push({ ok: null, what, detail: `unresolved (${fgT}=${fg} / ${bgT}=${bg})` });
      continue;
    }
    const r = contrast(hex2rgb(fg), hex2rgb(bg));
    const ok = r + 1e-9 >= min;
    checked++;
    if (!ok) failures++;
    rows.push({
      ok,
      r,
      min,
      what,
      detail: `${fg} on ${bg}   ${fgT} / ${bgT}`,
    });
  }
  allRows.push(...rows);
  if (!QUIET || rows.some((x) => x.ok === false)) console.log(`\n=== ${mode} ===`);
  for (const row of rows) {
    if (QUIET && row.ok !== false) continue;
    if (row.ok === null) {
      console.log(`  SKIP        ${row.what}\n              ${row.detail}`);
      continue;
    }
    console.log(
      `  ${row.ok ? 'PASS' : 'FAIL'} ${row.r.toFixed(2).padStart(6)}:1 (min ${row.min})  ${row.what}\n` +
        `              ${row.detail}`
    );
  }
}

/**
 * AN UNRESOLVED PAIRING IS A FAILURE, not a skip.
 *
 * Until 2026-09-03 it was a skip, and the consequence was the worst kind of
 * green: the 2026-09-01 colour rename (`*.default*` -> `*.neutral-*`) left 28 of
 * 58 pairings naming tokens that no longer existed, so they resolved to
 * `undefined` and were skipped. The gate printed "30 pairings — PASS" while
 * every body-text-on-surface pairing, the link colour, the focus ring and every
 * border went unchecked. Restoring the names immediately surfaced two real
 * WCAG failures that had been hidden for two days.
 *
 * A contrast gate that cannot resolve a pairing has not checked it, and must
 * not report as though it had. This is the repo's own rule: silence is the only
 * forbidden failure.
 */
const unresolved = allRows.filter((row) => row.ok === null);
if (unresolved.length > 0) {
  console.log(
    `\n[palette-contrast] ${unresolved.length} pairing(s) could not be resolved. ` +
      'A pairing that names a token which does not exist has NOT been checked — ' +
      'usually a token rename that this table did not follow. Fix the names ' +
      'rather than letting them skip.'
  );
}

const total = failures + unresolved.length;
console.log(
  `\n[palette-contrast] ${checked} pairings across ${modes.length} mode(s) — ` +
    (total === 0
      ? 'PASS'
      : `${failures} FAILURE(S)${unresolved.length ? `, ${unresolved.length} UNRESOLVED` : ''}`)
);
process.exit(total === 0 ? 0 : 1);
