// T5 (spec 2026-08-20-southleft-example-app) — the layout half of the AI
// theme pipeline. `buildTheme()` (imported from the SAME engine Storybook's
// console uses — one copy, see .altitude/AI-THEME.md and this module's
// sibling `apply.ts` import in `ai-theme-panel.ts`) returns a small,
// deterministic `ResolvedLayout` intent. This module is the ONLY thing that
// turns that intent into real DOM changes on the home page, and the ONLY
// place the structural invariants live:
//
//   - hero always first, footer always last — guaranteed by construction.
//     Neither is ever a member of the reorderable id set (see
//     `REORDERABLE_IDS` below, mirroring the engine's `SECTION_ORDER_IDS`),
//     so there is nothing to move and nothing to validate. The footer lives
//     outside `<main>` entirely (`Base.astro`: Header / `<main>` / Footer as
//     siblings), so it is structurally unreachable from here regardless of
//     what a layout carries.
//   - CTA never before featured work — enforced a second time here (the
//     engine already enforces it once before this module ever sees a
//     layout). Belt & suspenders costs nothing and protects a hand-built
//     `ResolvedLayout` reaching this module some other way later.
//   - heading hierarchy preserved — guaranteed by construction: whole
//     `<section>` subtrees move as a unit, including their own heading;
//     nothing here ever rewrites a tag name or lifts content out of one
//     section into another.
//   - reading order == DOM order (a11y) — guaranteed by construction:
//     sections move via real `appendChild` calls, never a CSS `order:`
//     property (which would desync visual order from reading order AND tab
//     order, exactly the a11y footgun this spec calls out).
//
// Invalid intent degrades to defaults and never throws — every exported
// function here is safe to call with an absent, partial, or malformed
// layout object.

// Deliberately NOT importing the whole `ResolvedLayout` type here (its
// definition lives four levels up, outside this app's package boundary —
// see the sibling import in `ai-theme-panel.ts` for the same relative-path
// pattern `vite-plugin-theme-api.ts` uses to reach `functions/api/theme.js`
// from an equivalent depth). A structural, app-local type keeps this module
// buildable even if the shared engine's export shape drifts additively.
export type SectionId = 'logos' | 'services' | 'work' | 'testimonials' | 'insights' | 'cta';
export type HeroComposition = 'centered' | 'split' | 'poster';
export type GridDensity = 'airy' | 'regular' | 'dense';
export type ContentWidth = 'narrow' | 'regular' | 'wide';
export type SectionEmphasis = 'services' | 'work' | 'none';

export interface ResolvedLayout {
  heroComposition: HeroComposition;
  sectionOrder: SectionId[];
  gridDensity: GridDensity;
  contentWidth: ContentWidth;
  sectionEmphasis: SectionEmphasis;
}

const REORDERABLE_IDS: readonly SectionId[] = ['logos', 'services', 'work', 'testimonials', 'insights', 'cta'];
const HERO_COMPOSITIONS: readonly HeroComposition[] = ['centered', 'split', 'poster'];
const GRID_DENSITIES: readonly GridDensity[] = ['airy', 'regular', 'dense'];
const CONTENT_WIDTHS: readonly ContentWidth[] = ['narrow', 'regular', 'wide'];
const SECTION_EMPHASIS: readonly SectionEmphasis[] = ['services', 'work', 'none'];

/** The home page's default order — what ships with no AI direction applied. */
export const DEFAULT_LAYOUT: ResolvedLayout = {
  heroComposition: 'split',
  sectionOrder: [...REORDERABLE_IDS],
  gridDensity: 'regular',
  contentWidth: 'regular',
  sectionEmphasis: 'none',
};

function isSectionPermutation(order: unknown): order is SectionId[] {
  return (
    Array.isArray(order) &&
    order.length === REORDERABLE_IDS.length &&
    new Set(order).size === REORDERABLE_IDS.length &&
    order.every((id) => REORDERABLE_IDS.includes(id as SectionId))
  );
}

/** Re-validates + re-enforces the CTA-after-work invariant regardless of
 *  whether the caller already ran it through the engine's own copy. Falls
 *  back to the default order on anything malformed. */
function sanitizeOrder(order: unknown): SectionId[] {
  let result: SectionId[] = isSectionPermutation(order) ? [...order] : [...DEFAULT_LAYOUT.sectionOrder];
  const ctaIdx = result.indexOf('cta');
  const workIdx = result.indexOf('work');
  if (ctaIdx !== -1 && workIdx !== -1 && ctaIdx < workIdx) {
    result = result.filter((id) => id !== 'cta');
    result.splice(result.indexOf('work') + 1, 0, 'cta');
  }
  return result;
}

function mainEl(): HTMLElement | null {
  return document.querySelector('main');
}

/** Reorder the home page's reorderable `<section data-section-id>` blocks to
 *  match `order`. Only ever touches nodes inside `<main>` — see the module
 *  doc comment for why that alone guarantees hero-first/footer-last. */
function applySectionOrder(order: SectionId[]): void {
  const root = mainEl();
  if (!root) return;
  const sections = new Map<SectionId, Element>();
  root.querySelectorAll<HTMLElement>(':scope > [data-section-id]').forEach((el) => {
    const id = el.dataset.sectionId as SectionId | undefined;
    if (id && REORDERABLE_IDS.includes(id)) sections.set(id, el);
  });
  // A page that doesn't render one of these sections (or renders extras)
  // degrades to "leave what's missing where it is" rather than throw.
  for (const id of order) {
    const el = sections.get(id);
    if (el) root.appendChild(el);
  }
}

function applyContentWidth(width: ContentWidth): void {
  document.querySelector('.sl-page')?.setAttribute('data-sl-content-width', width);
}

function applyGridDensity(density: GridDensity): void {
  document.querySelector('.sl-page')?.setAttribute('data-sl-grid-density', density);
}

/** Apply a fully-resolved (or partial/malformed) layout to the home page.
 *  Every field independently degrades to its `DEFAULT_LAYOUT` value, and
 *  the whole call is wrapped so a genuinely unexpected failure resets to
 *  the shipped default instead of leaving the page half-applied. */
export function applyLayout(layout: Partial<ResolvedLayout> | undefined | null): void {
  try {
    const resolved: ResolvedLayout = {
      heroComposition:
        layout?.heroComposition && HERO_COMPOSITIONS.includes(layout.heroComposition)
          ? layout.heroComposition
          : DEFAULT_LAYOUT.heroComposition,
      sectionOrder: sanitizeOrder(layout?.sectionOrder),
      gridDensity:
        layout?.gridDensity && GRID_DENSITIES.includes(layout.gridDensity)
          ? layout.gridDensity
          : DEFAULT_LAYOUT.gridDensity,
      contentWidth:
        layout?.contentWidth && CONTENT_WIDTHS.includes(layout.contentWidth)
          ? layout.contentWidth
          : DEFAULT_LAYOUT.contentWidth,
      sectionEmphasis:
        layout?.sectionEmphasis && SECTION_EMPHASIS.includes(layout.sectionEmphasis)
          ? layout.sectionEmphasis
          : DEFAULT_LAYOUT.sectionEmphasis,
    };

    applySectionOrder(resolved.sectionOrder);
    applyContentWidth(resolved.contentWidth);
    applyGridDensity(resolved.gridDensity);
  } catch (err) {
    // Never throw out to the caller — log and fall back to the shipped
    // default rather than leave the page in a half-applied state.
    console.warn('[layout-resolver] invalid layout, reverting to default', err);
    resetLayout();
  }
}

/** Restore the shipped default order/density/width. */
export function resetLayout(): void {
  applySectionOrder(DEFAULT_LAYOUT.sectionOrder);
  applyContentWidth(DEFAULT_LAYOUT.contentWidth);
  applyGridDensity(DEFAULT_LAYOUT.gridDensity);
}
