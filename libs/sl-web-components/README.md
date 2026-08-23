# @southleft/sl-web-components — the Southleft brand design system

**Altitude is the base. This is the layer of opinion on top of it.**

`al-*` components are generic, flexible and escapable — a component whose value
is *one brand's opinion* may not live there. This package is where that opinion
goes: the section shapes southleft.com actually ships, built **from** Altitude
primitives, never forking them.

The dependency arrow points one way. `@southleft/al-web-components` is a `workspace:*`
dependency here; nothing in `libs/al-web-components` may import from this
package.

## The contract every `sl-*` component follows

The template is Altitude's rebuilt `al-header` (`components/header/header.ts`) —
proof that a component can be opinionated *and* escapable. It owns the bar:
surface, minimum height, sticky/elevated. It owns **nothing** about where things
sit inside it.

So, for every component here:

1. **Arrangement is `<al-layout>`'s job, always.** No `display: flex` or
   `display: grid` arranging content. No `direction` / `gap` / `align` /
   `justify` / `wrap` props. If you reach for one, you want `<al-layout>`.
2. **A default slot that takes arbitrary content**, so a page can put something
   the component never anticipated into it.
3. **`::part()` on every region** the component renders, so the arrangement and
   type can be retuned from the page without forking the component.
4. **Reflected host attributes** for coarse variation (`<al-media-card variant>`),
   styled `:host([variant='…'])` — inspectable in devtools, targetable from
   both sides of the shadow boundary, and serialized through Declarative Shadow
   DOM.
5. **Content props carry content, not layout.** `heading` / `dek` / `label` are
   fine. A prop that decides where a box sits is not.

This is the failure `al-hero` shipped: six fixed named slots plus five layout
props, abandoned mid-build by its first real consumer because the shadow DOM
forced one composition with no opt-out. **That failure travels with the tag
prefix.** `al-hero` is only safe because of the rules above, not because of its
name.

## What earns a place here

Reuse, measured on the real site. `PageHero` appears on 19 of 24 pages,
`CTABand` on 16, `SectionHeader` on 2 more plus 5 pages that hand-re-inlined its
markup, and `.al-media-card` is shared by the article and work cards.

What does **not** belong here: one-off page furniture and brand art. The
generative canvas, the hero murmur field, the playground — those stay in
`apps/southleft`. A brand DS that absorbs every one-off is the app with extra
build steps.

## Storybook conventions

**Every Organism story sets `parameters.layout: 'fullscreen'`.** Organisms are
full-bleed page furniture — a header, a hero band, a CTA band, a marquee — and
Storybook's default centred canvas adds padding that makes a full-bleed band
look like it has margins it does not have. Molecules and Atoms keep the default
padded canvas, where the inset helps rather than lies.

There is no way to apply this by tier from `preview.ts` — Storybook resolves
`layout` from the CSF file before any decorator runs, and offers no
title-matcher for global parameters. So it is a per-component convention, and
this paragraph is the only thing keeping it honest. Set it when you add an
Organism.

## Brand primitives

`styles/_brand.scss` carries the four brand-level custom properties the site
defines on `.sl-page` (`--sl-border-faint`, `--sl-grid-line`, `--sl-font-mono`,
`--sl-text-lead`). They are consumed **as fallbacks** — `var(--sl-font-mono, …)`
— so the app's values win where the app sets them, and the components still
render correctly standalone in Storybook with no app CSS loaded.

## Build

This package **is** part of the root build: root `pnpm run build` runs
al-web-components → **sl-web-components** → al-react (sequential, because this
package compiles Altitude's *source*, not its dist). Consumers today:
`apps/southleft` (header/footer overrides via `layouts/Base.astro`) and
`apps/docs` (the whole bundle via `BrandRuntime.astro`). The Southleft Storybook
has been retired in favour of the docs site.

**After any JSDoc or API change here, regenerate the CEM** —
`pnpm --filter @southleft/sl-web-components build:custom-elements.json` — the
committed `custom-elements.json` is the sole source for the `/docs/southleft`
component pages. See `.altitude/BRAND-LAYER.md` for the full process.
