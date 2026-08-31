/**
 * tiers.mjs — which ops keys are ATOMS and which are MOLECULES.
 *
 * Placement depends on it: build-page.mjs inserts an atom page BEFORE the
 * `----- MOLECULES -----` divider and a molecule page AFTER it. Getting this wrong is
 * silent — the page builds fine and simply lands in the wrong section of the file.
 *
 * Tier follows the CODE (the Storybook title), not Figma. `al-banner` is
 * `Molecules/Banner` in Storybook even though its Figma page long predated this pipeline
 * and sat under ATOMS; the page was moved to match the code on 2026-08-21.
 */
export const MOLECULE_KEYS = new Set([
  'al-banner',
  'al-breadcrumbs', 'al-checkbox-group', 
  'al-empty-state', 'al-file-upload', 'al-input', 'al-input-stepper', 'al-menu',
  'al-pagination', 'al-radio-group', 'al-range', 'al-table', 'al-tabs', 'al-textarea',
  // Parked / deferred, listed so they place correctly when they are eventually built.
  'al-command-palette', 'al-combobox', 'al-accordion', 'al-card', 'al-dialog',
  'al-drawer', 'al-list', 'al-popover', 'al-search', 'al-select', 'al-stat',
  'al-stepper', 'al-testimonial',
  // al-layout is the library's single layout primitive: it owns arrangement for
  // every other component (AGENTS.md 'Arrangement vs. semantics'), so it composes
  // rather than being composed. Absent from this set it defaulted to ATOM silently.
  'al-layout',
]);

/**
 * ORGANISMS — whole page SECTIONS, not reusable widgets. Southleft's brand layer
 * (@southleft/sl-web-components) is all of them: each owns a band of the page,
 * sets its own measure/gutter, and composes molecules inside it.
 *
 * al-card is deliberately NOT here — it is a molecule that organisms arrange.
 */
export const ORGANISM_KEYS = new Set([
  'al-header', 'al-footer', 'al-hero', 'al-page-hero',
  'al-cta-band', 'al-section-header', 'al-marquee', 'al-logo-wall',
]);

export const isMolecule = (key) => MOLECULE_KEYS.has(key);
export const isOrganism = (key) => ORGANISM_KEYS.has(key);

/** 'atom' | 'molecule' | 'organism' — atom is the default, as it always was. */
export const tierOf = (key) =>
  (ORGANISM_KEYS.has(key) ? 'organism' : MOLECULE_KEYS.has(key) ? 'molecule' : 'atom');
