// Real southleft.com CONTENT for the `Patterns/*` stories (`.storybook-sl/`).
//
// HOW THIS DIFFERS FROM `./southleft.ts`
// -------------------------------------
// `./southleft.ts` is the brand-flavoured replacement for `./lorem.ts`: a
// sentence corpus and a seeded PRNG, so any component story can be filled with
// text that sounds like Southleft. It answers "what does a Card look like with
// Southleft copy in it".
//
// This module answers a different question — "what is actually ON southleft.com"
// — and so it holds STRUCTURED, non-random records: the exact nav, the exact
// twelve logos on the proof strip, the three case studies and three articles the
// home page features, in the order the page puts them. The `Patterns/*` stories
// mirror the site's markup; filling that markup with generated text would
// document the shape and lose the thing being documented.
//
// PROVENANCE — every value below is traceable to one file in `apps/southleft/`,
// which is READ-ONLY source material for this Storybook:
//
//   NAV / CTA / SITE      re-exported from `src/lib/site.ts` — IMPORTED, so
//                         they cannot drift at all.
//   SITEMAP / ELSEWHERE   `src/components/Footer.astro` frontmatter.
//   LOGOS                 `src/pages/index.astro` `const logos`.
//   FEATURED_WORK         `src/content/work/{petsmart,stanford-d-school,
//                         ibm-investor-relations}.md` frontmatter — the three
//                         slugs `index.astro`'s `featuredSlugs` names, in order.
//   LATEST_INSIGHTS       the three newest `src/content/insights/*.md` by
//                         frontmatter `date`, which is what `index.astro`'s
//                         `getCollection('insights').sort(...).slice(0, 3)`
//                         resolves to.
//
// The last three groups are mirrored by hand because their source is markdown
// frontmatter behind Astro's content-collection loader, which a Storybook build
// cannot run. Re-check them with the `awk`/`grep` recipes named above; the
// blocks are small and each names its source file so a diff is one command.
//
// SCOPE: `.storybook/` is invisible to the library build — TypeScript's
// wildcard `include` skips dot-directories, and `vite.config.mjs` only takes
// `components/<name>/<name>.ts` as entries. Nothing here ships to consumers.

// The site's OWN constants, imported across the workspace rather than copied.
// `src/lib/site.ts` is a dependency-free TS module (no Astro imports, no
// `import.meta.env`), so Vite resolves and transpiles it like any other source
// file. `.storybook-sl/main.ts` names the repo root in `server.fs.allow` so the
// dev server will serve this cross-package read.
export { NAV, CTA, SITE } from '../../../../apps/southleft/src/lib/site';

/**
 * Where `apps/southleft/public/` is mounted in this Storybook.
 *
 * The app is served under `base: '/southleft'` (astro.config.mjs) and hardcodes
 * that prefix in `src/styles/fonts.css`, so `.storybook-sl/main.ts` mounts the
 * directory at the same path rather than forking the CSS. Asset URLs in the
 * pattern stories go through here so there is one place to change if that ever
 * moves.
 */
export const SL_PUBLIC = '/southleft';

/** `Footer.astro` column B — the six shared NAV entries plus seven footer-only
 *  ones. "AI + Design Systems" and "AI & Design Systems" both point at
 *  /ai-design-systems; that duplicate is verbatim in the reference. */
export const FOOTER_SITEMAP_EXTRA = [
  { label: 'Contact', href: '/contact' },
  { label: 'AI & Design Systems', href: '/ai-design-systems' },
  { label: 'Figma Design Systems Guide', href: '/figma-design-systems' },
  { label: 'Speaking & Teaching', href: '/speaking' },
  { label: 'AI-Ready Scorecard', href: '/scorecard' },
  { label: 'Aptitude Test', href: '/quiz' },
  { label: 'RSS', href: '/rss.xml' },
] as const;

/** `Footer.astro` column C — the three external profiles. */
export const FOOTER_ELSEWHERE = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/southleft/' },
  { label: 'Substack', href: 'https://southleft.substack.com' },
  { label: 'GitHub', href: 'https://github.com/southleft' },
] as const;

/** `Footer.astro` — the decorative, `aria-hidden` "this site annotates itself"
 *  chips. Static on the site too; see that component's header for why. */
export const FOOTER_STATE_CHIPS = [
  { label: 'inspect:', value: 'off', key: 'i' },
  { label: 'grid:', value: 'off', key: 'g' },
  { label: 'theme:', value: 'brand', key: undefined },
  { label: 'cursor:', value: 'on', key: undefined },
] as const;

/** The proof strip — `index.astro` `const logos`, in page order. Files exist in
 *  `apps/southleft/public/logos/`, served here under `SL_PUBLIC`. */
export const LOGOS = [
  { file: 'ibm.webp', name: 'IBM' },
  { file: 'google.webp', name: 'Google' },
  { file: 'petsmart.webp', name: 'PetSmart' },
  { file: 'toast.webp', name: 'Toast' },
  { file: 'caterpillar.webp', name: 'Caterpillar' },
  { file: 'cigna-health.webp', name: 'Cigna Health' },
  { file: 'conde-nast.webp', name: 'Condé Nast' },
  { file: 'docusign.webp', name: 'DocuSign' },
  { file: 'state-farm.webp', name: 'State Farm' },
  { file: 'ulta-beauty.webp', name: 'Ulta Beauty' },
  { file: 'chubb.webp', name: 'CHUBB' },
  { file: 'better-com.svg', name: 'Better.com' },
] as const;

/**
 * The prefix every `hero` in the content collections carries
 * (`apps/southleft/src/lib/media.mjs` `MEDIA_BASE`).
 *
 * That host is behind Cloudflare Access, so a browser asking for one of these
 * gets a 302 to a login page and the image never loads — on southleft.com's own
 * dev server too. See `resolveHero` for what is done about it.
 */
export const MEDIA_BASE = 'https://southleft.pages.dev/media';

/** Set by `.storybook-sl/main.ts` via Vite `define`: true when this machine has
 *  the sibling `southleft-v5` media checkout and the Storybook mounted it at
 *  `/media`. Declared here so the story files never touch the global. */
declare const __SL_LOCAL_MEDIA__: boolean | undefined;

/** True when hero images can actually be rendered. */
export const HERO_MEDIA_AVAILABLE: boolean =
  typeof __SL_LOCAL_MEDIA__ === 'boolean' ? __SL_LOCAL_MEDIA__ : false;

/**
 * The `hero` URL a story should actually put in `src`, or `null` when there is
 * no reachable image and the component's own no-hero branch should render.
 *
 * This is the same substitution `apps/southleft/src/layouts/Base.astro` applies
 * client-side in dev: swap the unreachable `MEDIA_BASE` prefix for the locally
 * served `/media`. Returning `null` rather than a broken URL is what keeps the
 * card stories from degrading into a wall of broken-image icons on a machine
 * without the checkout — `WorkCard` has an initial-glyph fallback and
 * `ArticleCard` omits the image block entirely, and both are worth documenting.
 */
export function resolveHero(hero: string | undefined): string | null {
  if (!hero) return null;
  if (!HERO_MEDIA_AVAILABLE) return null;
  return hero.startsWith(MEDIA_BASE) ? `/media${hero.slice(MEDIA_BASE.length)}` : hero;
}

export interface WorkEntry {
  slug: string;
  client: string;
  oneLiner: string;
  capabilities: readonly string[];
  hero: string;
  showHero: boolean;
}

/**
 * `index.astro` section 06 — the three `featuredSlugs`, in order.
 *
 * `hero` is the absolute URL the frontmatter carries
 * (`https://southleft.pages.dev/media/…`). It is a NETWORK dependency: the
 * media lives on the deployed site, not in this repo, so these images are blank
 * offline. `WorkCard`'s own `showHero` fallback (the `<C>` initial glyph) is
 * what a story renders instead — see the `Fallback` export in
 * `.storybook-sl/patterns/cards.stories.ts`.
 */
export const FEATURED_WORK: readonly WorkEntry[] = [
  {
    slug: 'petsmart',
    client: 'PetSmart',
    oneLiner:
      'Sparky, PetSmart’s design system — accessible components, documentation, and governance that unified a fragmented web presence.',
    capabilities: ['Design Systems', 'Front-End Development', 'React'],
    hero: 'https://southleft.pages.dev/media/xd.adobe_.com_view_e776c2b6-f1e4-4789-b475-e9922b2f2ade-b225_-1.webp',
    showHero: true,
  },
  {
    slug: 'stanford-d-school',
    client: 'Stanford d.school',
    oneLiner:
      'A Fractal-powered component library and front-end architecture that brought the d.school’s unconventional visual identity to the web on a tight deadline.',
    capabilities: ['Component Library', 'Craft CMS', 'Front-End Development'],
    hero: 'https://southleft.pages.dev/media/d-school-hompage.webp',
    showHero: true,
  },
  {
    slug: 'ibm-investor-relations',
    client: 'IBM',
    oneLiner:
      'Migrating IBM Investor Relations to Drupal while integrating the Carbon design system — trust-critical financial communications, modernized.',
    capabilities: ['Design Systems', 'Drupal Theming', 'Front-End Development'],
    hero: 'https://southleft.pages.dev/media/www.ibm_.com_investor_events.webp',
    showHero: true,
  },
];

export interface InsightEntry {
  slug: string;
  title: string;
  category: string;
  categoryName: string;
  /** ISO `YYYY-MM-DD`, exactly as the frontmatter carries it. */
  date: string;
  /** `toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })`,
   *  precomputed so a story is not at the mercy of the runner's locale. */
  dateLabel: string;
  excerpt: string;
  hero: string;
}

/** `index.astro` section 08 — the three newest posts. Same network caveat on
 *  `hero` as `FEATURED_WORK`. */
export const LATEST_INSIGHTS: readonly InsightEntry[] = [
  {
    slug: 'better-together-southleft-x-baseline-and-a-new-ceo',
    title: 'Better, together: Southleft x Baseline, and a new CEO',
    category: 'business',
    categoryName: 'Business',
    date: '2026-06-10',
    dateLabel: 'Jun 10, 2026',
    excerpt:
      'Southleft is partnering with Baseline, and Nicole Hampton is stepping in as CEO. Two announcements, one story: the next chapter of this company.',
    hero: 'https://southleft.pages.dev/media/image-62.webp',
  },
  {
    slug: 'context-based-design-systems-revisited',
    title: 'Context-Based Design Systems, Revisited',
    category: 'design-systems',
    categoryName: 'Design Systems',
    date: '2026-05-13',
    dateLabel: 'May 13, 2026',
    excerpt:
      'A year into the AI-driven design systems era, the framework holds up. Here’s what’s changed, what’s clearer, and why context still beats autonomy.',
    hero: 'https://southleft.pages.dev/media/two_abstract_geometric_form.webp',
  },
  {
    slug: 'designers-youre-not-at-the-kids-table-anymore',
    title: 'Designers, You’re Not at the Kids’ Table Anymore',
    category: 'design-systems',
    categoryName: 'Design Systems',
    date: '2026-03-30',
    dateLabel: 'Mar 30, 2026',
    excerpt:
      'There’s never been a better time for designers to ship real code, and you don’t need to “learn to code” to do it.',
    hero: 'https://southleft.pages.dev/media/tpitre_Isometric_illustration_of_two_hands_reaching_toward_ea_5a30ee45-9681-48dc-be16-31b72aa216e0_2.webp',
  },
];
