# Semver Policy — Altitude v2

Altitude follows [Semantic Versioning 2.0](https://semver.org/). Both
`@southleft/al-web-components` and `@southleft/al-react` ship as a unit and share a version line.

(`@southleft/sl-web-components`, the brand layer, is outside this policy for now — it is on
the changeset ignore list and whether it publishes is an open decision. Note that its
`al-header`/`al-footer` overrides capture *base* tags, so a base semver-major on those tags
has brand-layer implications — see `.altitude/BRAND-LAYER.md`.)

## Major (X.0.0)

Reserved for changes that break consumers:

- Removal or renaming of a public component tag (`<al-button>` etc.).
- Removal of a documented prop, slot, event, or CSS part.
- Removal of a CSS custom property listed in the v1 token surface
  (or changing its semantic meaning without a working alias).
- Breaking change to the `registerAltitude({mode,suffix})` factory contract.
- React API breaks visible to consumers of `@southleft/al-react`.

> The v1 → v2 publish (T6.4) is itself a major; the migration plan exists
> to *avoid* additional majors for the lifetime of v2.

## Minor (1.X.0)

- New component tags.
- New props, slots, events, CSS parts, CSS custom properties.
- New registry modes, themes, or token axes.
- New consumer-visible behavior on existing components, gated behind a new
  prop default.
- Migrating a component's `migration.json` state from `legacy` to `dual`
  (no consumer-visible break required because `dual` is back-compat).

## Patch (1.0.X)

- Bug fixes that do not change documented behavior.
- Token value tweaks within an existing axis (e.g. brand color refinement)
  *that do not change downstream CSS variable names*.
- Internal refactors (controllers, build, tests) with no consumer surface.

## Migration-state interaction

| State change | Min bump |
|---|---|
| `legacy → dual` | minor |
| `dual → scoped-complete` | minor (when alias is removed → next major) |
| Alias removal past `compatBudget.deprecateAliasesBy` | major |

## Tools

We use [changesets](https://github.com/changesets/changesets). Each PR
that affects the public surface ships a changeset; CI aggregates them
into `CHANGELOG.md` at release time.
