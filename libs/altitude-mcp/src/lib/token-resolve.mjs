// INTENT -> ONE TOKEN. The thing `altitude_get_tokens` could not do.
//
// THE PROBLEM THIS EXISTS FOR. `altitude_get_tokens` is a SUBSTRING FILTER. Ask
// it for "neutral" and it hands back 30 names; ask it for "a slightly stronger
// neutral surface" and it cannot be asked at all. So a model picks between
// `weak`, `default`, `strong` and `bold` by reading the words — and the words
// are not a reliable guide, because the ladder is not monotonic:
//
//   altitude / light   background.neutral  weak=#f1f0ea  default=#ffffff
//                                          strong=#f1f0ea  bold=#e7e5de
//
// `weak` and `strong` are THE SAME COLOUR. A model that "steps up" from weak to
// strong renders an identical pixel and has no way to find out. There are 35
// such collapses across the four brand+mode bundles this repo emits. That is a
// fact about the token set — NOT something this module fixes, and NOT something
// it hides. `resolveTokenIntent()` walks PAST a collapsed rung to the next one
// that actually moves, and says in `reason` that it did.
//
// WHY IT READS THE DIGEST AND NOT THE CSS. Every fact here — resolved value per
// brand+mode, which ladders collapse, the measured ink/fill contrast, the
// derived one-sentence description — is computed by
// `scripts/lib/token-describe.mjs` and baked into
// `.altitude/ai-readiness/tokens-digest.json` by
// `scripts/ai-readiness/build-tokens-digest.mjs`. This package CANNOT import
// that module: `package.json`'s `files` ships `src/` only, so `scripts/lib` is
// not published with it (same constraint token-detail.mjs documents). Copying
// the WCAG maths and the ladder walk in here would be a second implementation
// of the same facts, free to drift — exactly what this server's "never a second
// source of truth" rule forbids. So it reads the artifact, and a checkout with
// no digest gets a structured error naming the command that writes one.
//
// VOCABULARY IS DERIVED, NEVER LISTED. The surfaces, roles and emphasis steps a
// caller may ask for are read off the emitted token set at call time. The only
// hand-written tables below are INTENT ALIASES ("fill" -> background, "error"
// -> danger, "hover" -> one step stronger) — words a human or model uses that
// the token tree does not. Those map onto whatever the derived vocabulary
// turns out to contain; an alias pointing at a role that stopped existing
// simply stops resolving, and says so.

import { PATHS, HINTS } from './paths.mjs';
// The digest readers live in token-detail.mjs, not here, so the dependency runs
// one way (resolve -> detail) and there is no import cycle: `queryTokensDetailed`
// needs the same derived descriptions this module needs, and a cycle between two
// modules that both read at call time is a footgun waiting for the first eager
// top-level read.
import { loadTokenMetadata, loadTokenDigest, loadTokenDescriptions } from './token-detail.mjs';

export { loadTokenDigest, loadTokenDescriptions };

/** Weakest to strongest, as the token tree names it. Order is load-bearing. */
export const EMPHASIS_ORDER = Object.freeze(['faint', 'weak', 'default', 'strong', 'bold']);

/**
 * INTENT ALIASES — the words a caller uses for a surface, mapped to the segment
 * the token names use. Not a token list: the right-hand side is checked against
 * the DERIVED surface set, so an alias for a surface that no longer ships
 * resolves to nothing rather than to a name that does not exist.
 */
const SURFACE_ALIASES = Object.freeze({
  fill: 'background',
  bg: 'background',
  surface: 'background',
  canvas: 'background',
  'background-color': 'background',
  text: 'content',
  ink: 'content',
  foreground: 'content',
  fg: 'content',
  label: 'content',
  icon: 'content',
  color: 'content',
  stroke: 'border',
  outline: 'border',
  divider: 'border',
  rule: 'border',
  'border-color': 'border',
  elevation: 'shadow',
});

/** Same idea for roles: the vocabulary a caller reaches for, not a token list. */
const ROLE_ALIASES = Object.freeze({
  error: 'danger',
  destructive: 'danger',
  negative: 'danger',
  critical: 'danger',
  positive: 'success',
  ok: 'success',
  caution: 'warning',
  alert: 'warning',
  informational: 'info',
  note: 'info',
  accent: 'primary',
  brand: 'primary',
  action: 'primary',
  grey: 'neutral',
  gray: 'neutral',
  muted: 'neutral',
  subdued: 'neutral',
  base: 'neutral',
});

/**
 * Emphasis words that are RELATIVE (a direction to walk) rather than a rung.
 * `null` marks "walk to the end in this direction".
 */
const RELATIVE_EMPHASIS = Object.freeze({
  stronger: 1,
  louder: 1,
  heavier: 1,
  more: 1,
  darker: 1,
  weaker: -1,
  softer: -1,
  lighter: -1,
  quieter: -1,
  subtler: -1,
  less: -1,
  strongest: Infinity,
  boldest: Infinity,
  weakest: -Infinity,
  faintest: -Infinity,
});

/**
 * Interaction states, as an emphasis DELTA.
 *
 * Derived from what the components actually do — `button.scss` paints hover
 * with `background-<role>-strong` over a rest of `background-<role>-default`,
 * one rung up (the same pairs `scripts/check-palette-contrast.mjs` gates). A
 * state is therefore a movement along the ladder, not a separate token family;
 * `disabled` is the exception, because the tree ships a literal `disabled` role.
 */
const STATE_DELTA = Object.freeze({
  rest: 0,
  default: 0,
  focus: 0,
  hover: 1,
  active: 2,
  pressed: 2,
  selected: 1,
  visited: -1,
});

/** CSS properties that only make sense on one surface. Used to flag a contradiction. */
const PROPERTY_SURFACE = Object.freeze({
  'background-color': 'background',
  background: 'background',
  color: 'content',
  fill: 'content',
  stroke: 'content',
  'border-color': 'border',
  border: 'border',
  'outline-color': 'border',
  outline: 'border',
  'box-shadow': 'shadow',
});

/**
 * The `palette` block, or a structured error.
 *
 * A digest built in a checkout with no `build:tokens` output carries
 * `palette.available === false` and the reason — that degradation is passed
 * through with the ORIGINAL hint (`build:tokens`), not flattened into "run the
 * digest again", which would send the caller in a loop.
 */
export function loadPalette() {
  const digest = loadTokenDigest();
  const palette = digest.palette;
  if (!palette) {
    const e = new Error(
      `The token digest at ${PATHS.aiReadinessTokensDigest} predates the palette block (no per-mode ` +
        'values, ladders or contrast facts). Rebuild it.',
    );
    e.code = 'ERR_STALE_TOKEN_DIGEST';
    e.path = PATHS.aiReadinessTokensDigest;
    e.hint = HINTS.aiReadinessTokensDigest;
    throw e;
  }
  if (palette.available === false) {
    const e = new Error(palette.reason);
    e.code = 'ERR_MISSING_ARTIFACT';
    e.path = 'libs/al-web-components/styles/dist-v5/css/brand/';
    e.hint = palette.hint ?? HINTS.tokens;
    throw e;
  }
  return palette;
}

/** `al-theme-color-<surface>-<role>-<emphasis>` -> its parts, or null. */
function parseColourToken(name) {
  const m = /^al-theme-color-([a-z]+)-(.+)-(faint|weak|default|strong|bold)$/.exec(name);
  if (!m) return null;
  return { surface: m[1], role: m[2], emphasis: m[3] };
}

/**
 * The surface / role / emphasis vocabulary the emitted token set ACTUALLY
 * contains, for one brand.
 *
 * Built by walking the names in the palette, never from a list in this file —
 * so a role added to the token tree becomes askable the next time the digest is
 * rebuilt, with no change here.
 */
export function buildVocabulary(palette, brand) {
  const modes = palette.scopes.filter((id) => id.startsWith(`${brand}:`)).map((id) => id.split(':')[1]);
  const surfaces = new Map(); // surface -> Map(role -> Set(emphasis))
  for (const mode of modes) {
    for (const name of Object.keys(palette.values[`${brand}:${mode}`] ?? {})) {
      const p = parseColourToken(name);
      if (!p) continue;
      if (!surfaces.has(p.surface)) surfaces.set(p.surface, new Map());
      const roles = surfaces.get(p.surface);
      if (!roles.has(p.role)) roles.set(p.role, new Set());
      roles.get(p.role).add(p.emphasis);
    }
  }
  return { modes, surfaces };
}

/** Every brand the digest carries a bundle for. */
export function knownBrands(palette) {
  return [...new Set(palette.scopes.map((id) => id.split(':')[0]))].sort();
}

/** Plain-object view of a vocabulary, for an error response a caller can act on. */
function describeVocabulary(vocab) {
  const out = {};
  for (const [surface, roles] of vocab.surfaces) {
    out[surface] = {};
    for (const [role, steps] of roles) out[surface][role] = EMPHASIS_ORDER.filter((e) => steps.has(e));
  }
  return out;
}

const norm = (v) => (v == null ? null : String(v).trim().toLowerCase());
const sameValue = (a, b) => a != null && b != null && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

/**
 * Resolve an INTENT to exactly one token.
 *
 * @param {object} intent
 * @param {string} intent.role      e.g. "neutral", "danger" (aliases accepted)
 * @param {string} intent.surface   e.g. "background", "content", "border" (aliases accepted)
 * @param {string} [intent.emphasis] a rung ("weak") or a direction ("stronger")
 * @param {string} [intent.state]   "rest" | "hover" | "active" | "selected" | "disabled" | "focus"
 * @param {string} [intent.property] the CSS property the token will set
 * @param {string} [intent.mode]    "light" | "dark"; omit to require both
 * @param {string} [intent.brand]   defaults to the digest's description brand
 */
export function resolveTokenIntent(intent = {}) {
  const palette = loadPalette();
  const brand = norm(intent.brand) ?? palette.descriptionBrand ?? knownBrands(palette)[0];
  if (!knownBrands(palette).includes(brand)) {
    return {
      error: `Unknown brand "${intent.brand}".`,
      code: 'ERR_UNKNOWN_BRAND',
      knownBrands: knownBrands(palette),
    };
  }

  const vocab = buildVocabulary(palette, brand);
  const modes = intent.mode ? [norm(intent.mode)] : vocab.modes.slice().sort();
  const unknownMode = modes.find((m) => !vocab.modes.includes(m));
  if (unknownMode) {
    return { error: `Unknown mode "${unknownMode}".`, code: 'ERR_UNKNOWN_MODE', knownModes: vocab.modes };
  }

  // --- surface -----------------------------------------------------------
  const rawSurface = norm(intent.surface);
  const surface = vocab.surfaces.has(rawSurface) ? rawSurface : SURFACE_ALIASES[rawSurface];
  if (!surface || !vocab.surfaces.has(surface)) {
    return {
      error: `No colour surface "${intent.surface}" in the ${brand} token set.`,
      code: 'ERR_UNKNOWN_TOKEN_SURFACE',
      knownSurfaces: [...vocab.surfaces.keys()].sort(),
      acceptedAliases: SURFACE_ALIASES,
    };
  }
  const roles = vocab.surfaces.get(surface);

  // --- role --------------------------------------------------------------
  const warnings = [];
  const rawRole = norm(intent.role);
  let role = roles.has(rawRole) ? rawRole : ROLE_ALIASES[rawRole];

  // `state: "disabled"` is the one state the tree models as its own ROLE
  // rather than as a rung — so it overrides the requested role when it exists.
  const state = norm(intent.state) ?? 'rest';
  if (state === 'disabled' && roles.has('disabled')) {
    if (role && role !== 'disabled') {
      warnings.push(
        `state "disabled" overrides role "${role}": the token tree ships a literal "disabled" role for ` +
          `${surface}, and a disabled control must not keep its ${role} colour.`,
      );
    }
    role = 'disabled';
  }
  if (!role || !roles.has(role)) {
    return {
      error: `No role "${intent.role}" on the ${surface} surface of the ${brand} token set.`,
      code: 'ERR_UNKNOWN_TOKEN_ROLE',
      knownRoles: [...roles.keys()].sort(),
      acceptedAliases: ROLE_ALIASES,
      vocabulary: describeVocabulary(vocab),
    };
  }

  const present = EMPHASIS_ORDER.filter((e) => roles.get(role).has(e));
  const ladderKey = `al-theme-color-${surface}-${role}`;
  const valueOf = (step, mode) => palette.values[`${brand}:${mode}`]?.[`${ladderKey}-${step}`];
  const valuesFor = (step) => Object.fromEntries(modes.map((m) => [m, valueOf(step, m)]));

  // --- baseline rung ------------------------------------------------------
  const rawEmphasis = norm(intent.emphasis);
  let baselineStep;
  let relativeDelta = 0;
  if (rawEmphasis && present.includes(rawEmphasis)) {
    baselineStep = rawEmphasis;
  } else if (rawEmphasis && rawEmphasis in RELATIVE_EMPHASIS) {
    baselineStep = present.includes('default') ? 'default' : present[Math.floor(present.length / 2)];
    relativeDelta = RELATIVE_EMPHASIS[rawEmphasis];
  } else if (rawEmphasis && EMPHASIS_ORDER.includes(rawEmphasis)) {
    // A real rung name, but this role does not ship it.
    warnings.push(
      `${ladderKey} has no "${rawEmphasis}" rung (it ships ${present.join(', ')}); started from ` +
        `"${present.includes('default') ? 'default' : present[0]}" instead.`,
    );
    baselineStep = present.includes('default') ? 'default' : present[0];
  } else if (rawEmphasis) {
    return {
      error: `Unrecognised emphasis "${intent.emphasis}".`,
      code: 'ERR_UNKNOWN_EMPHASIS',
      knownEmphasis: present,
      relativeWords: Object.keys(RELATIVE_EMPHASIS),
    };
  } else {
    baselineStep = present.includes('default') ? 'default' : present[Math.floor(present.length / 2)];
  }

  // --- state delta --------------------------------------------------------
  let stateDelta = 0;
  if (state !== 'disabled') {
    if (!(state in STATE_DELTA)) {
      return {
        error: `Unrecognised state "${intent.state}".`,
        code: 'ERR_UNKNOWN_STATE',
        knownStates: [...Object.keys(STATE_DELTA), 'disabled'],
      };
    }
    stateDelta = STATE_DELTA[state];
  }

  // --- walk the ladder, skipping rungs that do not move -------------------
  const nearMisses = [];
  const collapsedSkips = [];
  let index = present.indexOf(baselineStep);
  const totalDelta = relativeDelta + stateDelta;
  const direction = totalDelta === 0 ? 0 : totalDelta > 0 ? 1 : -1;
  const wanted = Math.abs(totalDelta);
  let hitCeiling = false;

  let moved = 0;
  if (direction !== 0) {
    // The anchor is the last rung that ACTUALLY MOVED, not simply the previous
    // index — otherwise a run of two collapsed rungs would each be compared to
    // its collapsed neighbour and both would look like real steps.
    let anchorStep = present[index];
    let anchorValues = valuesFor(anchorStep);
    while (moved < wanted) {
      const next = index + direction;
      if (next < 0 || next >= present.length) {
        hitCeiling = true;
        break;
      }
      const candidateStep = present[next];
      const candidateValues = valuesFor(candidateStep);
      // "Same in every requested mode" is the only definition of a rung that
      // does not move. A rung identical in ONE mode still moves in the other,
      // so it is taken — with a warning, because half a step is a real trap.
      const identicalModes = modes.filter((m) => sameValue(candidateValues[m], anchorValues[m]));
      index = next;
      if (identicalModes.length === modes.length) {
        collapsedSkips.push({ step: candidateStep, sameAs: anchorStep, modes: identicalModes });
        nearMisses.push({
          token: `${ladderKey}-${candidateStep}`,
          values: candidateValues,
          why:
            `identical to ${ladderKey}-${anchorStep} in ${identicalModes.join(' and ')} — ` +
            'this rung of the ladder does not move, so choosing it would be a no-op',
        });
        continue; // does not count as a step
      }
      if (identicalModes.length > 0) {
        warnings.push(
          `${ladderKey}-${candidateStep} is a real step in ${modes.filter((m) => !identicalModes.includes(m)).join(' and ')} ` +
            `but identical to ${ladderKey}-${anchorStep} in ${identicalModes.join(' and ')} — ` +
            'the emphasis change is invisible in that mode.',
        );
      }
      anchorStep = candidateStep;
      anchorValues = candidateValues;
      moved += 1;
    }
    if (hitCeiling && Number.isFinite(wanted) && moved < wanted) {
      warnings.push(
        `${ladderKey} has no further rung beyond "${present[index]}" in that direction; returned the end of the ladder.`,
      );
    }
  }

  const chosenStep = present[index];
  const token = `${ladderKey}-${chosenStep}`;
  const values = valuesFor(chosenStep);

  // --- the property allow-list -------------------------------------------
  let propertyCheck = null;
  const property = norm(intent.property);
  if (property) {
    const allow = loadTokenMetadata().get(token)?.cssProperties ?? [];
    const allowed = allow.length === 0 ? null : allow.includes(property);
    const expectedSurface = PROPERTY_SURFACE[property];
    propertyCheck = {
      property,
      inAllowList: allowed,
      allowList: allow,
      note:
        allowed === null
          ? 'this token carries no derived cssProperties allow-list, so the property could not be checked'
          : allowed
            ? null
            : `"${property}" is not in this token's allow-list — it may not be legal here`,
    };
    if (allowed === false) {
      warnings.push(`"${property}" is not in ${token}'s cssProperties allow-list.`);
    }
    if (expectedSurface && expectedSurface !== surface) {
      warnings.push(
        `surface "${surface}" contradicts property "${property}", which paints the ${expectedSurface} surface — ` +
          `did you mean al-theme-color-${expectedSurface}-${role}-${chosenStep}?`,
      );
      nearMisses.push({
        token: `al-theme-color-${expectedSurface}-${role}-${chosenStep}`,
        values: Object.fromEntries(
          modes.map((m) => [m, palette.values[`${brand}:${m}`]?.[`al-theme-color-${expectedSurface}-${role}-${chosenStep}`]]),
        ),
        why: `the surface implied by property "${property}", which is not the surface that was asked for`,
      });
    }
  }

  // --- the `content-<hue>-weak` trap --------------------------------------
  // `misleadingName` is a fact recorded in the digest by token-describe.mjs's
  // `inkPair()`, from the SHAPE of the ladder — it is true for the hue roles
  // whose `-weak` is a button/badge label, false for neutral/inverse/disabled
  // where `-weak` really is a muted tint. Re-deciding that here would be the
  // second implementation this module exists to avoid.
  const ink = palette.inkContrast?.[token];
  if (ink?.misleadingName) {
    warnings.push(
      `${token} reads backwards: across 26 call sites it is the INK PAINTED ON ${ink.fill} (button and ` +
        'badge labels), not a muted tint of the hue. For muted body text ask for role "neutral" with ' +
        'emphasis "weaker" instead.',
    );
  }

  // --- the chosen rung's own collisions, said out loud --------------------
  // Even when the walk did not have to step over a collapse, the rung it landed
  // on may be indistinguishable from another one. A caller who later "adjusts"
  // to that neighbour would change nothing and have no way to tell.
  for (const m of modes) {
    for (const l of palette.collapsedLadders?.[`${brand}:${m}`] ?? []) {
      if (l.ladder !== ladderKey) continue;
      for (const c of l.collisions) {
        if (!c.steps.includes(chosenStep)) continue;
        const others = c.steps.filter((s) => s !== chosenStep);
        warnings.push(
          `in ${m}, ${token} is the SAME value (${c.value}) as ${others.map((s) => `"${s}"`).join(', ')} — ` +
            'that part of the ladder does not step, so those rungs are interchangeable there.',
        );
      }
    }
  }

  // --- the immediate neighbours, as declared near misses ------------------
  for (const offset of [-1, 1]) {
    const nIdx = index + offset;
    if (nIdx < 0 || nIdx >= present.length) continue;
    const nToken = `${ladderKey}-${present[nIdx]}`;
    if (nToken === token) continue;
    if (nearMisses.some((n) => n.token === nToken)) continue;
    const nValues = valuesFor(present[nIdx]);
    const identical = modes.every((m) => sameValue(nValues[m], values[m]));
    nearMisses.push({
      token: nToken,
      values: nValues,
      why: identical
        ? `resolves to the same value as ${token} in ${modes.join(' and ')} — indistinguishable`
        : `one rung ${offset > 0 ? 'stronger' : 'weaker'}; ${offset > 0 ? 'more' : 'less'} emphasis than the intent asked for`,
    });
  }

  // --- the reason, assembled from what actually happened ------------------
  const reasonParts = [
    `${surface} + ${role} narrows to the ${ladderKey} ladder, which ships ${present.length} rung(s): ${present.join(' → ')}`,
  ];
  if (relativeDelta || stateDelta) {
    const moves = [];
    if (relativeDelta) moves.push(`emphasis "${rawEmphasis}"`);
    if (stateDelta) moves.push(`state "${state}"`);
    reasonParts.push(
      `${moves.join(' + ')} moved ${moved} effective step(s) ${direction > 0 ? 'up' : 'down'} from "${baselineStep}"`,
    );
  } else {
    reasonParts.push(`no relative movement was asked for, so the rung is "${chosenStep}"`);
  }
  for (const skip of collapsedSkips) {
    reasonParts.push(
      `"${skip.step}" was SKIPPED because it resolves to the same value as "${skip.sameAs}" in ` +
        `${skip.modes.join(' and ')} — that rung of the ladder does not move, so selecting it would have changed nothing`,
    );
  }
  if (hitCeiling) reasonParts.push(`the ladder ends at "${chosenStep}" in that direction`);
  if (ink) {
    const byScope = modes
      .map((m) => {
        const r = ink.byScope?.[`${brand}:${m}`];
        return r ? `${r.ratio}:1 in ${m}${r.passes ? '' : ' (BELOW AA)'}` : null;
      })
      .filter(Boolean);
    if (byScope.length) reasonParts.push(`measured against ${ink.fill}: ${byScope.join(', ')} (AA floor ${ink.min}:1)`);
  }

  return {
    token,
    cssVar: `var(--${token})`,
    values,
    brand,
    modes,
    description: loadTokenDescriptions().get(token) ?? null,
    reason: `${reasonParts.join('; ')}.`,
    ladder: {
      key: ladderKey,
      rungs: present,
      chosen: chosenStep,
      index: index + 1,
      of: present.length,
      // Every collision on THIS ladder in the requested scopes — reported even
      // when the walk did not have to step over one, because a caller choosing
      // a different rung later needs to know the ladder is not monotonic.
      collapsed: modes.flatMap((m) =>
        (palette.collapsedLadders?.[`${brand}:${m}`] ?? [])
          .filter((l) => l.ladder === ladderKey)
          .flatMap((l) => l.collisions.map((c) => ({ mode: m, steps: c.steps, value: c.value }))),
      ),
    },
    // A rung skipped for collapsing can still end up being the answer, when the
    // walk then runs off the end of the ladder. It is the recommendation at that
    // point, not a near miss — listing it as both is a contradiction.
    nearMisses: nearMisses.filter((n) => n.token !== token),
    warnings,
    propertyCheck,
    intent: {
      surface,
      role,
      emphasis: rawEmphasis ?? null,
      state,
      property: property ?? null,
      mode: intent.mode ? norm(intent.mode) : null,
      brand,
    },
    source: `${PATHS.aiReadinessTokensDigest} (palette derived from ${palette.source})`,
  };
}

/**
 * Every emphasis ladder that collapses, per brand+mode scope.
 *
 * REPORTED, NOT FIXED. Re-pointing a rung changes every component that reads it;
 * this server reads generated artifacts and never edits the token tree. What it
 * can do is make the collapse impossible to miss.
 */
export function collapsedLadderReport({ brand, mode } = {}) {
  const palette = loadPalette();
  const wantBrand = norm(brand);
  const wantMode = norm(mode);
  const scopes = palette.scopes.filter((id) => {
    const [b, m] = id.split(':');
    return (!wantBrand || b === wantBrand) && (!wantMode || m === wantMode);
  });
  if (scopes.length === 0) {
    return {
      error: `No emitted bundle for brand "${brand ?? '*'}" mode "${mode ?? '*'}".`,
      code: 'ERR_UNKNOWN_SCOPE',
      knownScopes: palette.scopes,
    };
  }
  const byScope = {};
  let ladderTotal = 0;
  let collisionTotal = 0;
  for (const id of scopes) {
    const ladders = palette.collapsedLadders?.[id] ?? [];
    ladderTotal += ladders.length;
    collisionTotal += ladders.reduce((n, l) => n + l.collisions.length, 0);
    byScope[id] = {
      collapsedLadders: ladders.length,
      collidingStepGroups: ladders.reduce((n, l) => n + l.collisions.length, 0),
      ladders: ladders.map((l) => ({
        ladder: l.ladder,
        rungs: l.present,
        distinctValues: l.distinctValues,
        collisions: l.collisions,
      })),
    };
  }
  return {
    what:
      'Emphasis ladders where two rungs resolve to the SAME value. The ladder advertises a distinction the ' +
      'palette does not make, so stepping between those rungs renders an identical pixel. This is a fact ' +
      'about the token set, reported here rather than silently worked around.',
    scopes,
    totals: { collapsedLadders: ladderTotal, collidingStepGroups: collisionTotal },
    byScope,
    source: `${PATHS.aiReadinessTokensDigest} (palette derived from ${palette.source})`,
  };
}
