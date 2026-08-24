/**
 * instance-map.southleft.mjs — nested al-* element -> Figma component INSTANCE,
 * for the `Southleft V5` file (rdhBS9t89V42E7EfiPjmSa).
 *
 * Same contract as instance-map.mjs (which is Altitude's). The two CANNOT be shared:
 * node ids are file-scoped, and ds-project.mjs refuses to fall back to another
 * project's map for exactly that reason.
 *
 * Node ids read live from `Southleft V5` on 2026-08-24, immediately after the 25 sets
 * were built. Rebuilding a set mints a NEW id, so re-scan after any rebuild — repair
 * in place where you can.
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
  'al-button': set('Button', '22:3434',
    (a) => ({ Variant: cap(a.variant) || 'Primary', State: stateOf(a), Width: on(a.fullwidth) ? 'Fill' : 'Hug' }),
    { text: (a, t) => t || 'Button' }),

  'al-chip': set('Chip', '22:3296',
    (a) => ({
      Variant: cap(a.variant) || 'Default',
      State: on(a.isdisabled) ? 'Default' : 'Default',
      Shape: a.shape === 'squared' ? 'Squared' : 'Default',
      Dismissible: on(a.isdismissible) || on(a.dismissible) ? 'Yes' : 'No',
    }),
    { text: (a, t) => t || 'Chip' }),

  'al-heading': set('Heading', '22:3531',
    (a) => ({ Variant: title(a.variant) || 'Default', Weight: cap(a.weight) === 'Bold' ? 'Bold' : 'Regular', State: 'Default' }),
    { text: (a, t) => t || 'Heading' }),

  'al-link': set('Link', '22:3569',
    (a) => ({ Size: cap(a.size) || 'Default', State: stateOf(a) }),
    { text: (a, t) => t || 'Link' }),

  'al-text-block': set('Text Block', '22:3577',
    (a) => ({ Width: cap(a.width) || 'Default', State: 'Default' }),
    { text: (a, t) => t || undefined }),

  'al-list-item': set('List Item', '22:3733',
    (a) => ({
      Variant: on(a.isstatic) ? 'Static' : 'Default',
      Current: a['aria-current'] ? 'Yes' : 'No',
      State: stateOf(a),
    }),
    { text: (a, t) => t || 'List item' }),

  'al-breadcrumbs-item': set('Breadcrumbs Item', '22:3772',
    (a) => ({
      Current: a['aria-current'] ? 'Yes' : 'No',
      Separator: on(a.hasseparator) ? 'Yes' : 'No',
      State: 'Default',
    }),
    { text: (a, t) => t || 'Item' }),

  'al-logo': set('Logo', '22:3781',
    (a) => ({ Brand: cap(a.brand) === 'Southleft' ? 'Southleft' : 'Default', State: 'Default' })),

  'al-input': set('Input', '19:2137',
    (a) => ({ Label: on(a.hidelabel) ? 'Hidden' : 'Shown', State: stateOf(a) })),

  'al-list': set('List', '19:2561',
    (a) => ({ Direction: a.direction === 'row' ? 'Row' : 'Default', State: 'Default' })),

  'al-stat': set('Stat', '19:2580',
    (a) => ({ Trend: cap(a.trend) === 'Up' ? 'Up' : cap(a.trend) === 'Down' ? 'Down' : 'Default', State: 'Default' })),

  'al-testimonial': set('Testimonial', '19:2589', () => ({ State: 'Default' })),

  'al-card': set('Card', '25:8878',
    (a) => ({ Variant: cap(a.variant) || 'Default', State: 'Default' })),

  'al-table': set('Table', '19:2527',
    (a) => ({
      Selectable: on(a.isselectable) ? 'Yes' : 'No',
      Sort: a.sort === 'ascending' ? 'Ascending' : 'None',
      State: 'Default',
    })),

  'al-breadcrumbs': set('Breadcrumbs', '19:2021', () => ({ State: 'Default' })),
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
