/**
 * Utility-class data — parsed out of the stylesheets that emit the classes.
 *
 * The utilities are pure SCSS. They produce no custom elements, so the CEM
 * knows nothing about them, and they carry no token names of their own, so
 * `tokens.json` knows nothing about them either. The only statement of what
 * exists is `libs/al-web-components/styles/core/utilities/*.scss` — which is
 * why this module reads those four files rather than restating them.
 *
 * That choice is not just tidiness. The Storybook pages this replaces listed
 * their rows by hand, and the lists had already drifted: `visibility.scss` had
 * never been documented at all, and `.al-u-gap-xxxl` read
 * `var(--al-theme-space-xxl)` even though `--al-theme-space-xxxl` exists in the
 * token layer — so a class silently delivered one step less spacing than its
 * name promised. A hand-written table hides both. A parsed one shows the first
 * for free and flagged the second (`mismatch` below), because the token each
 * class actually reads is resolved against the same built token layer
 * Foundations reads.
 *
 * That second one is now FIXED at `styles/core/utilities/spacing.scss` (it had
 * zero call sites, so correcting it changed no rendered page), and the flag it
 * tripped cleared itself — which is the point of deriving the mismatch rather
 * than annotating it. `mismatch` stays because the next drift of this kind
 * will be found the same way, without anyone remembering to look.
 *
 * The parsing is deliberately shallow — top-level selectors and simple
 * declarations, no SCSS evaluation. Where a file GENERATES classes from a loop
 * (`grid.scss`'s `column-generator`), the loop's inputs are read (`$grid-cols`,
 * the breakpoint variables) and the pattern is described from them, because
 * enumerating 12 × 7 generated selectors would be a worse page than naming the
 * rule that makes them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from './repo-root.mjs';
import { TOKENS, resolve } from './tokens.mjs';

const STYLES = path.join(repoRoot(), 'libs', 'al-web-components', 'styles', 'core');
const UTILITIES = path.join(STYLES, 'utilities');

const read = (file) => fs.readFileSync(path.join(UTILITIES, file), 'utf8');

/** Strip block comments so a commented-out selector is never read as a class. */
const uncomment = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '');

/* ------------------------------------------------------------- breakpoints */

/**
 * The breakpoint ladder, read from `core/variables.scss`. Every `@md` / `@lg`
 * suffix on this page means one of these and nothing else, so the ladder is
 * shown rather than left as folklore.
 */
export function breakpoints() {
  const source = fs.readFileSync(path.join(STYLES, 'variables.scss'), 'utf8');
  return [...source.matchAll(/\$al-breakpoint-([a-z]+):\s*([^;]+);/g)].map((match) => ({
    id: match[1],
    value: match[2].trim(),
  }));
}

/* ----------------------------------------------------------------- spacing */

/**
 * The gap utilities: `$sizes` in `spacing.scss`, in declaration order.
 *
 * `mismatch` is set when the class's own name implies a token the declaration
 * does not use — the `-xxxl` case above. Reported, never corrected here: this
 * module documents what the stylesheet does, and silently showing the token a
 * reader expects would make the page a nicer lie.
 */
export function gapClasses() {
  const source = uncomment(read('spacing.scss'));
  const map = /\$sizes:\s*\(([\s\S]*?)\);/.exec(source);
  if (!map) return [];

  return [...map[1].matchAll(/^\s*"?([a-z-]*)"?:\s*([^,\n]+),?\s*$/gm)].map((match) => {
    const suffix = match[1];
    const declared = match[2].trim();
    const className = `al-u-gap${suffix}`;
    const token = /^var\(--([a-z0-9-]+)\)$/.exec(declared)?.[1] ?? null;
    // The token the CLASS NAME implies. `al-u-gap-lg` implies
    // `--al-theme-space-lg`; a class whose declaration points elsewhere is a
    // drift worth seeing.
    const implied = `al-theme-space${suffix}`;
    return {
      className,
      declared,
      token,
      value: token ? resolve(TOKENS[token] ?? declared) : declared,
      mismatch: token !== null && token !== implied && TOKENS[implied] !== undefined ? implied : null,
    };
  });
}

/** The row/column modifier on the gap utilities — a second axis, not a size. */
export function gapModifiers() {
  const source = uncomment(read('spacing.scss'));
  return [...source.matchAll(/^\.(al-u-gap--[a-z-]+)\s*\{([^}]*)\}/gm)].map((match) => ({
    className: match[1],
    declarations: declarationsOf(match[2]),
  }));
}

/* -------------------------------------------------------------- typography */

/**
 * Every typography utility, split by TIER — which is the whole point of the
 * pair. A tier-1 class (`al-typography-preset-16`) pins a literal ramp step; a
 * tier-2 class (`al-u-theme-typography-body-md`) names a ROLE, and the role is
 * what a brand or a density setting is allowed to repoint. Prefer tier 2.
 *
 * The token behind each class is resolved so the table shows a size, not just a
 * name — `al-u-theme-typography-body-md` resolving through
 * `--al-theme-typography-body-md` → `--al-typography-preset-16` → the font
 * shorthand is exactly the chain a reader is trying to see.
 */
export function typographyClasses() {
  const source = uncomment(read('typography.scss'));
  const classes = [...source.matchAll(/^\.([a-z0-9-]+)\s*\{/gm)].map((match) => match[1]);

  return classes.map((className) => {
    // Tier 2's class prefix is `al-u-theme-`, its token's is `al-theme-`.
    const token = className.startsWith('al-u-theme-')
      ? className.replace('al-u-theme-', 'al-theme-')
      : className;
    const raw = TOKENS[token];
    return {
      className,
      tier: className.startsWith('al-u-theme-') ? 2 : 1,
      /** `body` / `heading` / `display` for tier 2; `preset` for tier 1. */
      family: className.startsWith('al-u-theme-typography-')
        ? className.slice('al-u-theme-typography-'.length).split('-')[0]
        : 'preset',
      token: raw === undefined ? null : `--${token}`,
      value: raw === undefined ? null : resolve(raw),
    };
  });
}

/* -------------------------------------------------------------------- grid */

/** `prop: value;` pairs in a rule body, `!important` kept — it is load-bearing. */
function declarationsOf(body) {
  return [...body.matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)].map((match) => ({
    property: match[1],
    value: match[2].trim(),
  }));
}

/**
 * The hand-written grid classes: alignment, justification and the flex-direction
 * escape hatch. Their DECLARATIONS are shown rather than a prose gloss —
 * "aligns items to the center of the cross axis" is a paraphrase of
 * `align-items: center`, and the paraphrase is the part that can go stale.
 */
export function gridAlignmentClasses() {
  const source = uncomment(read('grid.scss'));
  return [...source.matchAll(/^\.(al-u-(?:grid--|flex-)[a-z-]+)\s*\{([^}]*)\}/gm)].map((match) => ({
    className: match[1],
    declarations: declarationsOf(match[2]),
  }));
}

/**
 * The GENERATED half of the grid, described by its rule rather than enumerated.
 *
 * `column-generator($suffix)` runs once bare and once inside each breakpoint
 * media query, emitting four families over 1..$grid-cols. Listing all of them
 * would be 12 × 7 × 4 rows of the same fact; naming the pattern and the two
 * inputs it is generated from says the same thing and stays true when
 * `$grid-cols` changes.
 */
export function gridPatterns() {
  const source = uncomment(read('grid.scss'));
  const columns = Number(/\$grid-cols:\s*(\d+)/.exec(source)?.[1] ?? 12);
  const suffixes = breakpoints().map((breakpoint) => breakpoint.id);

  return {
    columns,
    suffixes,
    families: [
      {
        pattern: 'cols:N',
        on: 'the grid container',
        emits: 'grid-template-columns',
        summary:
          `Implicit uniform columns: every child takes N of the ${columns} tracks, so \`cols:${columns / 2}\` ` +
          'is two-up. No per-item class, and no row wrapper element.',
      },
      {
        pattern: 'col:N',
        on: '.al-u-grid__item',
        emits: 'grid-column: span N',
        summary: 'Explicit span, declared on the item that spans it.',
      },
      {
        pattern: 'row:N',
        on: '.al-u-grid__item',
        emits: 'grid-row: span N',
        summary: 'The same, vertically — a cell that is taller than one row.',
      },
      {
        pattern: 'offset:N',
        on: '.al-u-grid__item',
        emits: 'grid-column-start: N',
        summary: 'Start the item in track N, leaving the tracks before it empty.',
      },
    ],
  };
}

/* -------------------------------------------------------------- visibility */

/**
 * The visibility utilities — undocumented until now, which is the argument for
 * parsing rather than transcribing in one line.
 *
 * `al-u-is-vishidden` expands a mixin rather than declaring properties inline,
 * so the mixin's own body is followed one level: the class list would otherwise
 * report it as having no effect.
 */
export function visibilityClasses() {
  const source = uncomment(read('visibility.scss'));
  const general = fs.readFileSync(path.join(STYLES, 'mixins', 'general.scss'), 'utf8');

  return [...source.matchAll(/^\.(al-u-is-[a-z-]+)\s*\{([^}]*)\}/gm)].map((match) => {
    const body = match[2];
    const include = /@include\s+([a-z0-9-]+)/.exec(body);
    if (!include) return { className: match[1], declarations: declarationsOf(body), via: null };
    const mixin = new RegExp(`@mixin\\s+${include[1]}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(general);
    return {
      className: match[1],
      declarations: mixin ? declarationsOf(uncomment(mixin[1])) : [],
      via: include[1],
    };
  });
}

/* ------------------------------------------------------------ the headline */

/** Every utility class this system publishes — the number the page leads with. */
export function utilityCount() {
  return (
    gapClasses().length +
    gapModifiers().length +
    typographyClasses().length +
    gridAlignmentClasses().length +
    visibilityClasses().length
  );
}
