/**
 * Stylelint — the two rules that catch what a human reviewer and a type system
 * both miss in generated CSS.
 *
 * WHY ONLY TWO RULES. This is not a house-style linter; ESLint and Prettier are
 * not being replaced. These two exist because they catch the two specific
 * failure modes the AI-native distribution work is about, and neither is
 * catchable any other way:
 *
 *   scale-unlimited/declaration-strict-value
 *     A literal colour. `color: #4375ff` renders identically to
 *     `color: var(--al-theme-color-content-primary)` and is invisible in review,
 *     but it does not move with a brand, a mode, or a contrast setting. This
 *     rule requires a `var()` on the colour properties.
 *
 *   csstools/value-no-unknown-custom-properties
 *     A HALLUCINATED token name. `var(--al-theme-focus-ring-color)` is not an
 *     error in CSS — it resolves to the inherited value or to the declaration's
 *     fallback, so the page renders and is quietly wrong. This is the classic
 *     agent failure mode, and the reason the tokens digest carries an explicit
 *     `notExistDoNotInvent` list. The rule is fed the REAL token set below.
 *
 * WHERE THE KNOWN TOKEN NAMES COME FROM. `.altitude/ai-readiness/tokens-digest.json`
 * — the COMMITTED digest, not `dist/css/tokens.json`. Both hold the same names,
 * but the digest is tracked, so this config lints correctly in a bare clone with
 * no build; pointing it at a build artifact would make the rule silently
 * degrade to "everything is unknown" (or crash) on a fresh checkout, which is
 * exactly the class of failure the rule exists to prevent.
 *
 * SCOPE. Whatever file list is passed on the command line; `ignoreFiles` below
 * only removes generated output. The npm scripts define the two real scopes.
 *
 * HOW IT RUNS, and the split that keeps it honest (measured 2026-08-23):
 *
 *   pnpm lint:styles          143 SCSS files across both component libraries and
 *                             every example app — 0 violations. A HARD GATE:
 *                             there is no debt to grandfather here.
 *   pnpm lint:styles:report   the same plus the sites' hand-written .css —
 *                             21 PRE-EXISTING violations that are NOT gated and
 *                             NOT disabled. See scripts/check-styles-changed.mjs
 *                             for what they are and why they stay visible.
 *   pnpm lint:styles:fix      autofix; both rules support it for the
 *                             mechanically fixable cases.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('.', import.meta.url));

/**
 * Every `--al-*` name the token pipeline emits, in the shape the plugin's
 * `importFrom` wants. A missing digest is a hard failure rather than an empty
 * set: an empty set would make the rule flag every token in the repo, and the
 * obvious "fix" for that is to turn the rule off.
 */
function knownCustomProperties() {
  const digestPath = path.join(REPO_ROOT, '.altitude', 'ai-readiness', 'tokens-digest.json');
  if (!fs.existsSync(digestPath)) {
    throw new Error(
      `stylelint.config.mjs cannot find the committed token digest at ${digestPath}. ` +
        'It is tracked in git — restore it, or regenerate it with `node scripts/ai-readiness/build-tokens-digest.mjs`.',
    );
  }
  const digest = JSON.parse(fs.readFileSync(digestPath, 'utf8'));
  const customProperties = {};
  for (const tokens of Object.values(digest.groups)) {
    for (const token of tokens) customProperties[token.name] = token.value;
  }
  return { 'custom-properties': customProperties };
}

/**
 * The properties a literal colour must never appear in.
 *
 * LONGHANDS ONLY, deliberately. Listing a shorthand such as `border` makes the
 * rule check the shorthand's whole value, so `border: 1px solid var(--al-…)`
 * fails on `1px` and on `solid` — 37 reports of it in this repo, none of them a
 * colour. `expandShorthand: true` is the supported route: `/color$/` matches the
 * expanded `border-color`, so `border: 1px solid #ccc` is caught while the
 * non-colour parts of the same declaration are left alone.
 *
 * `box-shadow` / `text-shadow` are NOT here for the same reason. They are
 * multi-value properties the plugin reads front to back, so
 * `box-shadow: 0px 0px 0px 1px var(--al-theme-color-border-primary-default)`
 * is reported for its first offset — a false positive, and the only two the
 * shadow properties produced in this library. A literal colour inside a shadow
 * is consequently NOT caught by this rule; it is caught by review, and by
 * `pnpm gate:token-usage` when the shadow token it should have used goes unread.
 */
const COLOR_PROPERTIES = ['/color$/', 'fill', 'stroke'];

export default {
  customSyntax: 'postcss-scss',
  ignoreFiles: [
    '**/node_modules/**',
    '**/dist/**',
    '**/dist-v5/**',
    '**/storybook-static/**',
    'coverage/**',
    '.claude/**',
    // The scoped-theming harness is a TEST FIXTURE, and its hardcoded page
    // chrome is deliberate. Its own first line says "Page chrome only.
    // Everything inside a column comes from `<al-theme>`" — the test asserts
    // that two brands resolve to DIFFERENT computed styles, so drawing the
    // surrounding page from the same token layer under test would make the
    // assertion partly circular. It is never shipped and never imported by a
    // component.
    '.altitude/visual-compare/**',
  ],
  plugins: ['stylelint-declaration-strict-value', 'stylelint-value-no-unknown-custom-properties'],
  rules: {
    'scale-unlimited/declaration-strict-value': [
      COLOR_PROPERTIES,
      {
        // NOTE THE POLARITY — `ignoreVariables: true` means a variable SATISFIES
        // the rule, which is the whole point: `color: var(--al-…)` is the
        // required form.
        ignoreVariables: true,
        // `ignoreFunctions: false` is the strict half, and it is what makes
        // `color: rgb(0 0 0)` and `color: darken(#fff, 10%)` failures — both are
        // literal colours wearing a function, and accepting functions wholesale
        // would let them through.
        ignoreFunctions: false,
        expandShorthand: true,
        ignoreValues: [
          // Keywords with no colour of their own: they cannot drift from a brand
          // because they do not name a colour.
          'currentColor',
          'currentcolor',
          'inherit',
          'initial',
          'unset',
          'revert',
          'none',
          'transparent',
          // GRADIENTS are the one function that must be allowed. The colour stops
          // inside `linear-gradient(…, var(--al-…) 100%)` ARE tokens, and the
          // rule cannot see into a function to say so — with `ignoreFunctions`
          // off and no exception here, the four gradients in this library are
          // reported and nothing is learned. Named here rather than by turning
          // functions back on, so `rgb()` stays a failure.
          '/^linear-gradient\\(/',
          '/^radial-gradient\\(/',
          '/^conic-gradient\\(/',
          '/^repeating-linear-gradient\\(/',
          // `color-mix()` is the same case one level down: its arguments are
          // token references or `currentColor`, and mixing them is the point.
          '/^color-mix\\(/',
        ],
        disableFix: false,
      },
    ],
    'csstools/value-no-unknown-custom-properties': [
      true,
      {
        importFrom: [knownCustomProperties(), componentLocalCustomProperties()],
      },
    ],
  },
};

/**
 * COMPONENT-LOCAL custom properties — the ones a component declares on its own
 * `:host` and a sibling reads.
 *
 * `--al-menu-item-height` is the live example: declared at
 * `components/menu-item/menu-item.scss:13`, read by `button.scss` and
 * `link.scss`. It is not a design token and is correctly absent from the token
 * digest, but it is not unknown either.
 *
 * WHY THIS IS SCANNED HERE RATHER THAN HANDED TO `importFrom` AS FILES. The
 * plugin's `importFrom` handles CSS, JS and JSON — pointing it at a `.scss` file
 * silently yields NOTHING (verified: a `.scss` file declaring `--probe-height`,
 * passed as `importFrom`, still reports `var(--probe-height)` as unknown). Every
 * component-local property would then be reported, the rule would look broken,
 * and the obvious response would be to delete it. So the declarations are
 * collected here with a regex over the same tree instead — narrow, but it is
 * reading the real sources and it is honest about what it does.
 */
function componentLocalCustomProperties() {
  const roots = [
    path.join(REPO_ROOT, 'libs', 'al-web-components', 'components'),
    path.join(REPO_ROOT, 'libs', 'al-web-components', 'styles'),
    // The second component library is linted too, so its locals must be known
    // here as well or its own cross-file reads would report as unknown.
    path.join(REPO_ROOT, 'libs', 'sl-web-components'),
    path.join(REPO_ROOT, 'apps'),
  ];
  const customProperties = {};

  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      // The `dist` trees are generated output; importing the built bundle back
      // in would hide exactly the drift this rule exists to surface.
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('dist') && entry.name !== 'node_modules') walk(full);
      } else if (entry.name.endsWith('.scss') || entry.name.endsWith('.css')) {
        const source = fs.readFileSync(full, 'utf8');
        for (const [, name, value] of source.matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/gm)) {
          customProperties[name] ??= value.trim();
        }
      }
    }
  };
  for (const root of roots) walk(root);

  return { 'custom-properties': customProperties };
}
