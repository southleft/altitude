// MACHINE-DERIVED TOKEN DESCRIPTIONS.
//
// WHY THIS IS DERIVED AND NOT AUTHORED. Zero of the tokens in
// `libs/al-web-components/styles/tokens-dtcg/**` carry a DTCG `$description`,
// and the handful that carry an `org.primer.llm.usage` string carry PROSE — a
// sentence a human wrote once, about a value that has since moved. Prose about
// a number rots the moment the number changes, and this repo has already paid
// for that twice (the AI-readiness digest asserted font sizes ran 10..36 when
// they run to 112, and listed three tokens as non-existent that ship today).
//
// So nothing here is written per token. Every clause of every sentence is
// COMPUTED from four inputs the build already has — the token's NAME, its
// authored `cssType`, its tier, and its value RESOLVED PER MODE — plus a
// `lookup(name, mode)` accessor so a clause can state a fact about a sibling
// token (the next rung of the emphasis ladder, or the fill an ink sits on)
// without this module owning a second copy of the token set.
//
// THE THREE FACTS THAT ARE WORTH SAYING, and why each one exists:
//
//  1. SURFACE + ROLE + EMPHASIS STEP. `--al-theme-color-background-neutral-strong`
//     is decomposable, but no consumer decomposes it; an agent asked for "a
//     slightly stronger neutral surface" has to guess. Naming the step and its
//     position in the ladder ("3 of 4: weak -> default -> strong -> bold")
//     turns the guess into a lookup.
//
//  2. THE LADDER IS NOT MONOTONIC, AND SAYING SO IS THE POINT. In Altitude's
//     LIGHT mode `background.neutral` resolves weak=200, default=100,
//     strong=200, bold=300 — so `weak` and `strong` are THE SAME COLOUR, and a
//     model that "steps up" from weak to strong changes nothing. This is a fact
//     about the token set, not a bug to fix here; the honest thing a
//     description can do is state it. `findCollapsedLadders()` finds every such
//     case mechanically.
//
//  3. `content.<hue>-weak` READS BACKWARDS. Across all 26 call sites (see
//     scripts/check-palette-contrast.mjs's header) `content.<hue>-weak` is THE
//     INK THAT SITS ON `background.<hue>-default` — a button label, a badge
//     label — not a muted version of the hue. That is the single most
//     misleading name in the set, and the description says so, with the
//     measured contrast ratio against the fill it is actually painted on.
//
// PURE. No filesystem, no network, no config; every input is passed in. That is
// what lets both consumers use it: `scripts/ai-readiness/build-tokens-digest.mjs`
// (which has the emitted per-mode CSS on disk) and the MCP's token detail
// (which reads the digest this produces).

/** The emphasis ladder, weakest to strongest, as the token tree names it. */
export const EMPHASIS_ORDER = Object.freeze(['faint', 'weak', 'default', 'strong', 'bold']);

/** Human-readable noun for each colour surface, keyed by the name segment. */
const SURFACE_NOUN = Object.freeze({
  background: 'Background fill',
  content: 'Foreground (text/icon) colour',
  border: 'Border/stroke colour',
  shadow: 'Shadow colour',
});

/** WCAG 2.1 AA floors — the same three `check-palette-contrast.mjs` gates on. */
export const WCAG = Object.freeze({ TEXT: 4.5, LARGE: 3.0, VISIBLE: 1.2 });

/**
 * Split a `--al-*` token name into the parts the naming scheme encodes.
 *
 * Returns `null` for anything that is not a `al-theme-color-<surface>-<role>-<emphasis>`
 * shaped name — deliberately, so a caller can tell "this token has no ladder"
 * from "this token's ladder collapsed". Non-colour tokens get the
 * `{family, rest}` half filled in and `surface`/`role`/`emphasis` left null.
 */
export function parseTokenName(name) {
  const bare = String(name).replace(/^--/, '');
  if (!bare.startsWith('al-')) return null;
  const segs = bare.slice(3).split('-');

  // `theme` prefix marks the semantic layer; everything else is a primitive.
  const isTheme = segs[0] === 'theme';
  const body = isTheme ? segs.slice(1) : segs;
  const family = body[0] ?? null;

  const out = {
    name: bare,
    layer: isTheme ? 'theme' : 'primitive',
    family,
    surface: null,
    role: null,
    emphasis: null,
    rest: body.slice(1).join('-') || null,
  };

  if (!isTheme || family !== 'color') return out;

  const surface = body[1] ?? null;
  if (!(surface in SURFACE_NOUN)) return out;
  const tail = body.slice(2);
  if (tail.length === 0) return out;

  const last = tail[tail.length - 1];
  if (EMPHASIS_ORDER.includes(last) && tail.length >= 2) {
    out.surface = surface;
    out.role = tail.slice(0, -1).join('-');
    out.emphasis = last;
  } else {
    // e.g. `al-theme-color-shadow-primary` — a surface + role with no ladder.
    out.surface = surface;
    out.role = tail.join('-');
  }
  return out;
}

/** The ladder key a token belongs to: everything left of its emphasis step. */
export function ladderKey(name) {
  const p = parseTokenName(name);
  if (!p?.surface || !p?.role || !p?.emphasis) return null;
  return `al-theme-color-${p.surface}-${p.role}`;
}

/** Case/whitespace-normalised value, so `#FFF` and `#ffffff ` compare equal. */
export function normalizeValue(value) {
  if (value === undefined || value === null) return null;
  let v = String(value).trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,8})$/.exec(v);
  if (hex && hex[1].length === 3) v = '#' + [...hex[1]].map((c) => c + c).join('');
  return v;
}

/** `#rrggbb` (or #rgb / #rrggbbaa) -> [r,g,b]; null for anything else. */
export function hexToRgb(value) {
  const v = normalizeValue(value);
  const m = v && /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/.exec(v);
  if (!m) return null;
  const h = m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function relativeLuminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colour values; null if either is not a hex literal. */
export function contrastRatio(a, b) {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return null;
  const [hi, lo] = [relativeLuminance(ra), relativeLuminance(rb)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The fill an "ink" token is actually painted on, or null.
 *
 * Derived from ONE rule, the one `check-palette-contrast.mjs` documents from
 * 26 real call sites: `content.<role>-weak` is the foreground for
 * `background.<role>-default`. `content-inverse-default` on
 * `background-inverse-default` is the same relationship spelled without the
 * misleading `-weak`. Nothing else is asserted — a rule invented past the
 * evidence would be exactly the rot this module exists to avoid.
 */
export function inkPair(name, { rungs } = {}) {
  const p = parseTokenName(name);
  if (p?.surface !== 'content' || !p.role) return null;
  if (p.emphasis === 'weak') {
    return {
      fill: `al-theme-color-background-${p.role}-default`,
      minRatio: WCAG.TEXT,
      // The "reads backwards" warning applies to the HUE roles only, and the
      // discriminator is derived, not listed: every role the gate traced (primary,
      // secondary, tertiary, info, success, warning, danger) ships the FULL
      // faint→bold content ladder, and every role where `-weak` really is a muted
      // tint (neutral, inverse, disabled) ships a partial one. So the flag is set
      // by the shape of the ladder the caller passes in. Pass no `rungs` and it
      // stays false — an unproven claim is not made.
      misleadingName: Array.isArray(rungs) && rungs.length === EMPHASIS_ORDER.length,
    };
  }
  if (p.role === 'inverse' && p.emphasis === 'default') {
    return {
      fill: 'al-theme-color-background-inverse-default',
      minRatio: WCAG.TEXT,
      misleadingName: false,
    };
  }
  return null;
}

/**
 * Every emphasis ladder in `values` that does NOT strictly step.
 *
 * `values` is a name -> resolved-value map for ONE (brand, mode) scope. A
 * "collapse" is two DIFFERENT emphasis steps of the same ladder resolving to
 * the same value: the ladder claims a distinction the palette does not make,
 * so an agent stepping between them changes nothing and cannot tell.
 *
 * Returns one entry per ladder that has at least one collapse, each listing the
 * colliding step groups. Ladders that step cleanly are omitted — the caller
 * wants the exceptions, and the total is `Object.keys` of the full index.
 */
export function findCollapsedLadders(values) {
  const entries = values instanceof Map ? [...values.entries()] : Object.entries(values ?? {});
  const ladders = new Map();

  for (const [name, value] of entries) {
    const key = ladderKey(name);
    if (!key) continue;
    const emphasis = parseTokenName(name).emphasis;
    const norm = normalizeValue(value);
    if (norm === null) continue;
    if (!ladders.has(key)) ladders.set(key, new Map());
    ladders.get(key).set(emphasis, norm);
  }

  const collapsed = [];
  for (const [key, steps] of ladders) {
    const present = EMPHASIS_ORDER.filter((e) => steps.has(e));
    const byValue = new Map();
    for (const e of present) {
      const v = steps.get(e);
      if (!byValue.has(v)) byValue.set(v, []);
      byValue.get(v).push(e);
    }
    const collisions = [...byValue.entries()]
      .filter(([, group]) => group.length > 1)
      .map(([value, group]) => ({ steps: group, value }));
    if (collisions.length === 0) continue;
    const p = parseTokenName(`${key}-default`);
    collapsed.push({
      ladder: key,
      surface: p?.surface ?? null,
      role: p?.role ?? null,
      present,
      collisions,
      // The count of DISTINCT values the ladder actually offers, versus the
      // number of rungs it advertises. This is the number that matters to a
      // caller: `4 rungs, 3 distinct` means one step is a no-op.
      rungs: present.length,
      distinctValues: byValue.size,
    });
  }
  return collapsed.sort((a, b) => a.ladder.localeCompare(b.ladder));
}

/** Format a ratio the way the contrast gate prints it. */
const ratio = (n) => `${n.toFixed(2)}:1`;

/** `{light: '#a', dark: '#b'}` -> "#a in light and #b in dark" / "#a in both modes". */
function phraseModeValues(modeValues) {
  const modes = Object.keys(modeValues ?? {}).filter((m) => modeValues[m] != null);
  if (modes.length === 0) return null;
  const distinct = new Set(modes.map((m) => normalizeValue(modeValues[m])));
  if (modes.length > 1 && distinct.size === 1) {
    return `${modeValues[modes[0]]} in ${modes.join(' and ')} alike`;
  }
  return modes.map((m) => `${modeValues[m]} in ${m}`).join(' and ');
}

/**
 * The structured facts behind a description — the same computation, before it
 * is flattened to prose. Callers that want to REASON (the resolver tool) use
 * this; callers that want to SHOW (the digest, the MCP's `description` field)
 * use `describeToken()`, which is a formatter over it.
 *
 * @param {object} input
 * @param {string} input.name          `al-theme-color-background-neutral-strong`
 * @param {string|null} [input.cssType]  authored CSS surface (`color`, `spacing`, …)
 * @param {string|null} [input.dtcgType] the coarse DTCG `$type`
 * @param {number|null} [input.tier]
 * @param {string[]} [input.cssProperties] the derived allow-list
 * @param {Record<string,string>} input.modeValues  resolved value per mode
 * @param {(name: string, mode: string) => (string|undefined)} [input.lookup]
 *        resolves a SIBLING token in a given mode; omit it and the ladder and
 *        contrast clauses are simply not produced (never guessed).
 */
export function analyzeToken({
  name,
  cssType = null,
  dtcgType = null,
  tier = null,
  cssProperties = [],
  modeValues = {},
  lookup,
} = {}) {
  const parsed = parseTokenName(name);
  const modes = Object.keys(modeValues).filter((m) => modeValues[m] != null);
  const facts = {
    name: String(name).replace(/^--/, ''),
    ...parsed,
    cssType,
    dtcgType,
    tier,
    cssProperties,
    modeValues,
    ladder: null,
    collapsedWith: [],
    contrast: null,
    inkOn: null,
  };

  if (!parsed?.emphasis || typeof lookup !== 'function') return facts;

  // --- ladder position, and whether this rung actually moves ---------------
  const key = ladderKey(name);
  const present = [];
  const rungValues = {};
  for (const step of EMPHASIS_ORDER) {
    const perMode = {};
    let any = false;
    for (const m of modes) {
      const v = lookup(`${key}-${step}`, m);
      if (v != null) {
        perMode[m] = v;
        any = true;
      }
    }
    if (any) {
      present.push(step);
      rungValues[step] = perMode;
    }
  }
  if (present.length) {
    facts.ladder = { key, present, index: present.indexOf(parsed.emphasis) + 1, of: present.length };
    for (const step of present) {
      if (step === parsed.emphasis) continue;
      const sameIn = modes.filter(
        (m) =>
          normalizeValue(rungValues[step]?.[m]) != null &&
          normalizeValue(rungValues[step]?.[m]) === normalizeValue(modeValues[m]),
      );
      if (sameIn.length) facts.collapsedWith.push({ step, modes: sameIn });
    }
  }

  // --- the contrast pair, when this token is an ink -----------------------
  // `facts.ladder.present` is what decides whether the `-weak` name is
  // misleading (see inkPair) — so the ladder walk above must run first.
  const pair = inkPair(name, { rungs: facts.ladder?.present });
  if (pair) {
    const perMode = {};
    for (const m of modes) {
      const fillValue = lookup(pair.fill, m);
      const r = contrastRatio(modeValues[m], fillValue);
      if (r != null) perMode[m] = { fill: fillValue, ratio: r, passes: r >= pair.minRatio };
    }
    if (Object.keys(perMode).length) {
      facts.contrast = { against: pair.fill, min: pair.minRatio, byMode: perMode };
    }
    facts.inkOn = pair.misleadingName ? pair.fill : null;
  }

  return facts;
}

/**
 * ONE SENTENCE describing a token, assembled from `analyzeToken()`'s facts.
 *
 * Clauses are joined with semicolons and em dashes so the result is literally
 * one sentence — it is consumed as a `description` field, and a paragraph in
 * that slot is a paragraph in every tool response that carries a token.
 */
export function describeToken(input, precomputedFacts) {
  // `precomputedFacts` is the one-walk optimisation for `describeScope()`: the
  // facts are already computed there, and re-deriving them per token would walk
  // the ladder a second time for no new information.
  const f = precomputedFacts ?? analyzeToken(input);
  const clauses = [];

  // --- opening clause: what it is for ------------------------------------
  if (f.surface && f.role) {
    const noun = SURFACE_NOUN[f.surface] ?? 'Colour';
    let open = `${noun} for the ${f.role} role`;
    if (f.emphasis) {
      open += f.ladder
        ? ` at emphasis step ${f.ladder.index} of ${f.ladder.of} (${f.ladder.present.join(' → ')})`
        : ` at the "${f.emphasis}" emphasis step`;
    }
    clauses.push(open);
  } else {
    const what = f.cssType ? `${f.cssType} token` : f.dtcgType ? `${f.dtcgType} token` : 'Token';
    const where = f.layer === 'theme' ? 'semantic theme layer' : 'primitive layer';
    clauses.push(
      `${what[0].toUpperCase()}${what.slice(1)} in the ${where}${f.tier ? ` (tier ${f.tier})` : ''}` +
        (f.cssProperties?.length
          ? `, legal in ${f.cssProperties.slice(0, 3).join('/')}${f.cssProperties.length > 3 ? ` and ${f.cssProperties.length - 3} more` : ''}`
          : ''),
    );
  }

  // --- the `-weak`-reads-backwards warning, where it applies --------------
  if (f.inkOn) {
    clauses.push(
      `despite the name this is the ink painted ON ${f.inkOn}, not a muted tint of the hue ` +
        '(26 call sites; see scripts/check-palette-contrast.mjs)',
    );
  }

  // --- what it actually resolves to --------------------------------------
  const values = phraseModeValues(f.modeValues);
  if (values) clauses.push(`resolves to ${values}`);

  // --- the rung that does not move ---------------------------------------
  for (const c of f.collapsedWith) {
    clauses.push(
      `in ${c.modes.join(' and ')} it is the SAME value as "${c.step}", so stepping between them changes nothing`,
    );
  }

  // --- the measured contrast pair ----------------------------------------
  if (f.contrast) {
    const parts = Object.entries(f.contrast.byMode).map(([m, r]) => `${ratio(r.ratio)} in ${m}`);
    const allPass = Object.values(f.contrast.byMode).every((r) => r.passes);
    clauses.push(
      `against ${f.contrast.against} that measures ${parts.join(' and ')}, ` +
        `${allPass ? 'clearing' : 'BELOW'} the ${f.contrast.min}:1 WCAG AA floor`,
    );
  }

  return `${clauses.join('; ')}.`;
}

/**
 * Describe an entire scope in one pass: `values` is a name -> resolved-value
 * map per mode, e.g. `{ light: {...}, dark: {...} }`.
 *
 * Returns `{ descriptions: {name: sentence}, collapsed: {mode: [...]}} `. This
 * is the shape both build consumers want, and it guarantees the `lookup` a
 * description's ladder clause uses is the same map the collapse report was
 * computed from — one source, one walk.
 */
export function describeScope({ valuesByMode, metadata = {} } = {}) {
  const modes = Object.keys(valuesByMode ?? {});
  const lookup = (n, m) => valuesByMode?.[m]?.[n];

  const names = new Set();
  for (const m of modes) for (const n of Object.keys(valuesByMode[m])) names.add(n);

  const descriptions = {};
  for (const name of names) {
    const modeValues = {};
    for (const m of modes) if (valuesByMode[m][name] != null) modeValues[m] = valuesByMode[m][name];
    const meta = metadata[name] ?? {};
    descriptions[name] = describeToken({
      name,
      cssType: meta.cssType ?? null,
      dtcgType: meta.dtcgType ?? null,
      tier: meta.tier ?? null,
      cssProperties: meta.cssProperties ?? [],
      modeValues,
      lookup,
    });
  }

  const collapsed = {};
  for (const m of modes) collapsed[m] = findCollapsedLadders(valuesByMode[m]);

  return { descriptions, collapsed };
}
