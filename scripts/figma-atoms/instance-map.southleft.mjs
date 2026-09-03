/**
 * instance-map.southleft.mjs — nested al-* element -> Figma component INSTANCE,
 * for the `Southleft V5` file (jwNINBLB0oBnxx3MQK9gr3).
 *
 * Same contract as instance-map.mjs (which is Altitude's). The two CANNOT be shared:
 * node ids are file-scoped, and ds-project.mjs refuses to fall back to another
 * project's map for exactly that reason.
 *
 * Node ids read live from `Southleft V5` on 2026-09-03, against the file the owner
 * re-duplicated from Altitude (jwNINBLB0oBnxx3MQK9gr3). Rebuilding a set mints a NEW
 * id, so re-scan after any rebuild — repair in place where you can.
 *
 * `id: null` means the set does not exist in this file YET. Text Block, List, Stat,
 * Testimonial and Logo are mapped in code but were never moved into the new file, so a
 * hardcoded id would deep-link at nothing; null lets them resolve by name if and when
 * they land, and keeps the docs site from rendering a dead "OPEN IN FIGMA" link.
 *
 * WHY this matters, concretely: without a map every nested al-* child resolves to
 * `null`, and build-page falls through to a "flattened" build using the child's own
 * captured subtree. For a component reached through a <slot> that subtree is EMPTY,
 * so the child renders as a blank box — the Hero shipped with no lead, no actions and
 * no chips until this file existed.
 *
 * DELIBERATELY ABSENT: `al-layout`. It is a transparent arrangement wrapper that owns
 * no pixels; its children ARE captured, so leaving it unmapped lets it flatten and its
 * real content render. Mapping it would replace a hero's content with an instance of
 * the Layout demo set.
 */

/** Truthy in the DOM sense: presence of a boolean attribute counts, `="false"` does not. */
const on = (v) => v !== undefined && v !== null && v !== 'false';
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Title Case a hyphenated attribute value: `display-lg` -> `Display Lg`. */
const title = (s) => (s ? String(s).split(/[-_\s]+/).map(cap).join(' ') : s);

const set = (figmaName, id, axes, opts = {}) => ({ figmaName, id, axes, ...opts });

/** Shared interaction-state resolver — `State` is the interaction axis library-wide. */
const stateOf = (a) => {
  if (on(a.isdisabled) || a['aria-disabled'] === 'true') return 'Disabled';
  if (on(a.iserror)) return 'Error';
  return 'Default';
};

export const INSTANCE_MAP = {
  'al-button': set('Button', '3538:36730',
    (a) => ({ Variant: cap(a.variant) || 'Primary', State: stateOf(a), Width: on(a.fullwidth) ? 'Fill' : 'Hug' }),
    { text: (a, t) => t || 'Button' }),

  'al-chip': set('Chip', '3540:43526',
    (a) => ({
      Variant: cap(a.variant) || 'Default',
      State: on(a.isdisabled) ? 'Default' : 'Default',
      Shape: a.shape === 'squared' ? 'Squared' : 'Default',
      Dismissible: on(a.isdismissible) || on(a.dismissible) ? 'Yes' : 'No',
    }),
    { text: (a, t) => t || 'Chip' }),

  'al-heading': set('Heading', '3543:47001',
    (a) => ({ Variant: title(a.variant) || 'Default', Weight: cap(a.weight) === 'Bold' ? 'Bold' : 'Regular', State: 'Default' }),
    { text: (a, t) => t || 'Heading' }),

  'al-link': set('Link', '3543:47075',
    (a) => ({ Size: cap(a.size) || 'Default', State: stateOf(a) }),
    { text: (a, t) => t || 'Link' }),

  'al-text-block': set('Text Block', null,
    (a) => ({ Width: cap(a.width) || 'Default', State: 'Default' }),
    { text: (a, t) => t || undefined }),

  'al-list-item': set('List Item', '3543:47175',
    (a) => ({
      Variant: on(a.isstatic) ? 'Static' : 'Default',
      Current: a['aria-current'] ? 'Yes' : 'No',
      State: stateOf(a),
    }),
    { text: (a, t) => t || 'List item' }),

  'al-breadcrumbs-item': set('Breadcrumbs Item', '3538:36342',
    (a) => ({
      Current: a['aria-current'] ? 'Yes' : 'No',
      Separator: on(a.hasseparator) ? 'Yes' : 'No',
      State: 'Default',
    }),
    { text: (a, t) => t || 'Item' }),

  'al-logo': set('Logo', null,
    (a) => ({ Brand: cap(a.brand) === 'Southleft' ? 'Southleft' : 'Default', State: 'Default' })),

  'al-input': set('Input', '3544:48650',
    (a) => ({ Label: on(a.hidelabel) ? 'Hidden' : 'Shown', State: stateOf(a) })),

  'al-list': set('List', null,
    (a) => ({ Direction: a.direction === 'row' ? 'Row' : 'Default', State: 'Default' })),

  'al-stat': set('Stat', null,
    (a) => ({ Trend: cap(a.trend) === 'Up' ? 'Up' : cap(a.trend) === 'Down' ? 'Down' : 'Default', State: 'Default' })),

  'al-testimonial': set('Testimonial', null, () => ({ State: 'Default' })),

  'al-card': set('Card', '5301:276',
    (a) => ({ Variant: cap(a.variant) || 'Default', State: 'Default' })),

  'al-table': set('Table', '3558:62965',
    (a) => ({
      Selectable: on(a.isselectable) ? 'Yes' : 'No',
      Sort: a.sort === 'ascending' ? 'Ascending' : 'None',
      State: 'Default',
    })),

  'al-breadcrumbs': set('Breadcrumbs', '3558:60804', () => ({ State: 'Default' })),

  /*
   * The brand organisms (@southleft/sl-web-components). They live in this file
   * like everything else, and their ids are what the docs site's "OPEN IN FIGMA"
   * chip and the generated contract docs deep-link to. Axes read live from each
   * set on 2026-09-03 rather than assumed: three carry State=Default only, and
   * Logo Wall carries `Vivid` INSTEAD of State, driven by its `vivid` boolean.
   *
   * "Footer" was named "Sl Footer" in Figma until 2026-09-03, the one brand set
   * that carried the prefix while Card / Hero / Section Header / Logo Wall did
   * not. It was renamed to match its siblings and the name the code already
   * expected, rather than teaching the code about the outlier.
   */
  'al-footer': set('Footer', '5301:1484', () => ({ State: 'Default' })),
  'al-hero': set('Hero', '5301:1427', () => ({ State: 'Default' })),
  'al-section-header': set('Section Header', '5301:1242', () => ({ State: 'Default' })),
  'al-logo-wall': set('Logo Wall', '5301:1263', (a) => ({ Vivid: on(a.vivid) ? 'Vivid' : 'Default' })),
};

/**
 * Component sets that do NOT exist in `Southleft V5`. A component needing one of these
 * falls back to a flattened build, which is reported rather than silent.
 *
 * al-drawer is in the project roster but is an OVERLAY (`:host { display: contents }`
 * over a position:fixed container), so it measures trigger-sized and needs the
 * per-entry `measureRoot` the pipeline does not implement yet (skill trap 31).
 */
export const MISSING_IN_FIGMA = new Set([
  'al-drawer', 'al-field-note', 'al-checkbox', 'al-icon',
]);

/**
 * Icons resolve BY NAME against flat components on an `Icons` page. Southleft V5 has
 * no such page yet, so every icon currently flattens — tracked as its own task.
 */
export function iconNameOf(tag, hostAttrs = {}) {
  if (tag === 'al-icon') return hostAttrs.name || null;
  const m = /^al-icon-(.+)$/.exec(tag);
  return m ? m[1] : null;
}

export function resolveInstance(tag, hostAttrs = {}, hostText, hostSlots = []) {
  const icon = iconNameOf(tag, hostAttrs);
  if (icon) return { tag, figmaName: icon, icon, id: null, props: {} };
  const entry = INSTANCE_MAP[tag];
  if (!entry) return null;
  return {
    tag,
    figmaName: entry.figmaName,
    id: entry.id,
    props: entry.axes(hostAttrs, hostSlots) || {},
    text: entry.text ? entry.text(hostAttrs, hostText, hostSlots) : undefined,
    bools: entry.bools ? entry.bools(hostAttrs, hostSlots) : undefined,
  };
}
