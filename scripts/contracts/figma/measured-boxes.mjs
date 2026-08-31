/**
 * measured-boxes.mjs — join the MEASURED browser geometry onto the contract
 * lane's variant matrix.
 *
 * Why this exists: two ops lanes each held half of what parity needs. The
 * contracts lane knows WHICH VARIANTS EXIST (it is what generate-figma.mjs
 * builds); the measurement lane knows HOW BIG each one is. They key variants
 * differently, so check-parity could compare only the 49 names that happened
 * to coincide and reported 221 variants as size-unverified.
 *
 * The two keyings, concretely:
 *
 *   measured (spec-light.json)  { tag, case: "Variant=default,Shape=label",
 *                                 state: "default", root: { w, h } }
 *   contract variant            { name: "Variant=Danger", state: "Default",
 *                                 axisValues: { Shape: "Label" } }
 *
 * A variant names only its OWN axes, while a measured record names the
 * component's FULL case — so the join starts from the contract's
 * `anatomyCase` (the case the anatomy was sampled at) and overrides it with
 * the variant's own axis values. Matching is exact after normalisation:
 * a near-miss returns nothing and the variant is reported unmeasured, which
 * is the honest answer. Guessing a box would hand the parity gate a number
 * that looks measured and is not.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Same shape of normalisation the contract differ uses: case- and
 * punctuation-insensitive, so "Label=Shown" and "label=shown" are one key. */
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** "A=b,C=d" -> Map(a -> b), normalised on both halves. */
function parseCase(caseStr) {
  const out = new Map();
  for (const part of String(caseStr ?? '').split(',')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    out.set(norm(part.slice(0, i)), norm(part.slice(i + 1)));
  }
  return out;
}

/** A stable key for a set of dimension/value pairs plus a state. */
function keyOf(dims, state) {
  return [...dims.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join(',') + '|' + norm(state);
}

let CACHE = null;

/**
 * Index the measured spec once: tag -> Map(key -> { w, h }).
 * Returns an empty index when the spec is absent — it is gitignored run
 * output, so a clone legitimately has none and every variant then reports
 * unmeasured rather than silently passing.
 */
export function loadMeasuredIndex(syncDir) {
  if (CACHE && CACHE.dir === syncDir) return CACHE.index;
  const index = new Map();
  const p = join(syncDir, 'spec-light.json');
  if (!existsSync(p)) { CACHE = { dir: syncDir, index }; return index; }
  let spec;
  try { spec = JSON.parse(readFileSync(p, 'utf8')); }
  catch { CACHE = { dir: syncDir, index }; return index; }
  for (const [state, records] of Object.entries(spec)) {
    if (!Array.isArray(records)) continue;
    for (const r of records) {
      if (!r?.tag || !r?.root) continue;
      const w = r.root.w, h = r.root.h;
      if (typeof w !== 'number' || typeof h !== 'number') continue;
      if (!index.has(r.tag)) index.set(r.tag, new Map());
      index.get(r.tag).set(keyOf(parseCase(r.case), r.state ?? state), { w, h });
    }
  }
  CACHE = { dir: syncDir, index };
  return index;
}

/**
 * The measured box for one contract variant, or null when nothing measured
 * that exact combination.
 *
 * @param {Map} byKey        this tag's measured index
 * @param {string} anatomyCase the contract's sampled case, e.g. "Variant=default,Shape=label"
 * @param {object} variant   a generated-ops variant ({ state, variant, axisValues })
 * @param {string} enumAxisName the name of the enum axis `variant` belongs to
 */
export function measuredBoxFor(byKey, anatomyCase, variant, enumAxisName) {
  if (!byKey) return null;
  // Start from the case the anatomy was sampled at, then let the variant's own
  // axes override it — a variant names only the dimensions it varies.
  const dims = parseCase(anatomyCase);
  if (enumAxisName && variant.variant != null) dims.set(norm(enumAxisName), norm(variant.variant));
  for (const [axis, value] of Object.entries(variant.axisValues ?? {})) dims.set(norm(axis), norm(value));
  return byKey.get(keyOf(dims, variant.state)) ?? null;
}
