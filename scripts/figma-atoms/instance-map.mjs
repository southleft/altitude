/**
 * instance-map.mjs — nested al-* element  ->  Figma component INSTANCE.
 *
 * Molecules compose atoms. Built correctly, a molecule contains real INSTANCES of the
 * atom component sets, so fixing an atom propagates. This file is the join between the
 * two naming worlds: the code's ATTRIBUTES and Figma's VARIANT PROPERTIES.
 *
 * It is the inverse of `plan.mjs` — plan.mjs turned axis values into attributes to render;
 * this turns rendered attributes back into the axis values that pick a variant.
 *
 * Node ids were re-read live from `Altitude Design System` (y83n4o9LOGs74oAoguFcGS) on
 * 2026-08-31, when an audit found **18 of the 20 pinned ids were GHOSTS**: each still
 * RESOLVES via getNodeByIdAsync as a COMPONENT_SET with the right name and
 * `removed === false`, but its parent chain reaches no PAGE, so every molecule nesting
 * an atom was pointing at a deleted set. "It resolved" is not proof a node is in the
 * document — walk to a PAGE and check `figma.root.children` contains it. `al-skeleton`
 * and `al-text-block` have no live set on a 🛠 page and are `null`, which resolves BY
 * NAME instead. Original note follows; it was read live on 2026-08-21.
 *
 * (2026-08-21.) They are stable for a file; re-scan if a set is ever rebuilt rather than
 * repaired (rebuilding mints new ids — one more reason to repair in place).
 *
 * Every variant value below was verified against the set's live
 * `componentPropertyDefinitions`, so Figma will accept it. The builder drops a value
 * Figma does not offer with a warning rather than producing a broken instance.
 *
 * TEXT / BOOLEAN / INSTANCE_SWAP property KEYS are deliberately NOT hardcoded: Figma
 * suffixes them (`Text#4271:34`) and the suffix differs per set. The builder matches them
 * by the part before `#` at run time.
 */

/** Truthy in the DOM sense: presence of a boolean attribute counts, `="false"` does not. */
const on = (v) => v !== undefined && v !== null && v !== 'false';

/**
 * @param {string} figmaName  component set name in Figma
 * @param {string} id         node id of the COMPONENT_SET
 * @param {(a: Record<string,string>) => Record<string,string>} axes  attrs -> variant props
 * @param {object} [opts]     text: (attrs, hostText) => string for the TEXT property
 */
const set = (figmaName, id, axes, opts = {}) => ({ figmaName, id, axes, ...opts });

/** Shared interaction-state resolver — `State` is the interaction axis library-wide. */
const stateOf = (a, extra = {}) => {
  if (on(a.isdisabled) || a['aria-disabled'] === 'true') return 'Disabled';
  if (on(a.iserror)) return 'Error';
  for (const [attr, val] of Object.entries(extra)) if (on(a[attr])) return val;
  return 'Default';
};

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const INSTANCE_MAP = {
  // id re-read live 2026-08-31. The previous pin, `4271:9562`, was a GHOST: it still
  // RESOLVES via getNodeByIdAsync as a COMPONENT_SET named "Button" with 25 variants and
  // `removed === false`, but its parent chain reaches no PAGE — the set was rebuilt at some
  // point and this file kept the dead id. "It resolved" is not proof a node is in the
  // document; walk to a PAGE and check it is in figma.root.children.
  //
  // Size and Shape were missing from the axis map, so every expected variant name was
  // `State=…, Variant=…` and check-parity called all 20 of its own names missing and all
  // 120 real ones extra.
  'al-button': set('Button', '3538:36730',
    (a) => ({
      Variant: cap(a.variant) || 'Primary',
      Size: cap(a.size) || 'Default',
      Shape: on(a.ispill) ? 'Pill' : 'Default',
      State: stateOf(a),
    }),
    {
      text: (a, t) => t || 'Button',
      // Slot booleans MUST be set explicitly. Figma's default Button variant ships with
      // both icon slots ON, so a plain <al-button>Save</al-button> would otherwise render
      // with two icons the code never had.
      bools: (a, slots) => ({
        'Is Full Width': on(a.fullwidth),
        'Slot Before': slots.indexOf('before') !== -1,
        'Slot After': slots.indexOf('after') !== -1,
      }),
    }),

  'al-badge': set('Badge', '3538:35772',
    (a) => ({ Variant: cap(a.variant) || 'Default', Shape: on(a.isdot) ? 'Dot' : 'Label' }),
    { text: (a, t) => t || '8' }),

  'al-chip': set('Chip', '3540:43526',
    (a) => ({
      Variant: cap(a.variant) || 'Default',
      Shape: a.type === 'squared' ? 'Squared' : 'Default',
      Dismissible: on(a.isdismissible) ? 'Yes' : 'No',
      State: 'Default',
    })),

  'al-heading': set('Heading', '3543:47001',
    (a) => ({
      Variant: { 'display-lg': 'Display Lg', 'display-md': 'Display Md', 'display-sm': 'Display Sm', lg: 'Lg', md: 'Md', sm: 'Sm' }[a.variant] || 'Default',
      Weight: on(a.isbold) ? 'Bold' : 'Regular',
      State: 'Default',
    })),

  'al-link': set('Link', '3543:47075',
    (a) => ({ Size: cap(a.variant) || 'Default', State: stateOf(a) })),

  'al-checkbox': set('Checkbox', '3539:42167',
    (a) => ({
      Checked: on(a.isindeterminate) ? 'Indeterminate' : on(a.ischecked) ? 'On' : 'Off',
      Label: on(a.hidelabel) ? 'Hidden' : 'Shown',
      State: stateOf(a),
    })),

  'al-radio': set('Radio', '3543:47540',
    (a) => ({
      Checked: on(a.ischecked) ? 'On' : 'Off',
      Label: on(a.hidelabel) ? 'Hidden' : 'Shown',
      State: stateOf(a),
    })),

  'al-toggle': set('Toggle', '3543:48094',
    (a) => ({ Checked: on(a.ischecked) ? 'On' : 'Off', State: stateOf(a) })),

  'al-toggle-button': set('Toggle Button', '3543:47985',
    (a) => ({
      Variant: a.variant === 'background' ? 'Background' : 'Default',
      Selected: on(a.isselected) ? 'Yes' : 'No',
      Size: on(a.issmall) ? 'Small' : 'Default',
      State: 'Default',
    })),

  'al-tab': set('Tab', '3543:47793',
    (a) => ({ Active: on(a.isactive) ? 'Yes' : 'No', State: stateOf(a) })),

  'al-tab-panel': set('Tab Panel', '3543:47875',
    () => ({ Active: 'Yes', State: 'Default' })),

  'al-list-item': set('List Item', '3543:47175',
    (a) => ({
      Variant: a.variant === 'static' ? 'Static' : 'Default',
      Current: on(a.iscurrent) ? 'Yes' : 'No',
      State: stateOf(a, { isactive: 'Active' }),
    })),

  'al-menu-item': set('Menu Item', '3543:47347',
    (a) => ({
      Selected: on(a.isselected) ? 'Yes' : 'No',
      Role: on(a.isheader) ? 'Header' : on(a.isexpandable) ? 'Expandable' : 'Item',
      State: on(a.isdisabled) ? 'Disabled' : 'Default',
    })),

  'al-pagination-item': set('Pagination Item', '3543:47406',
    (a) => ({
      Selected: on(a.isselected) ? 'Yes' : 'No',
      Kind: on(a.isexpandable) ? 'Expandable' : 'Number',
      State: on(a.isdisabled) ? 'Disabled' : 'Default',
    })),

  'al-breadcrumbs-item': set('Breadcrumbs Item', '3538:36342',
    (a) => ({
      Current: on(a.iscurrent) ? 'Yes' : 'No',
      Separator: on(a.hasseparator) ? 'Yes' : 'No',
      State: 'Default',
    })),

  'al-field-note': set('Field Note', '3543:46961',
    (a) => ({ State: stateOf(a) })),

  'al-divider': set('Divider', '3543:46933',
    (a) => ({ Orientation: a.variant === 'vertical' ? 'Vertical' : 'Default', State: 'Default' })),

  'al-skeleton': set('Skeleton', null,
    (a) => ({ Shape: cap(a.variant) || 'Default', State: 'Default' })),

  'al-text-block': set('Text Block', null,
    (a) => ({ Width: a.maxwidth === 'sm' ? 'Sm' : 'Default', State: 'Default' })),

  'al-banner': set('Banner', '3570:1351',
    (a) => ({ Variant: cap(a.variant) || 'Info', Expanded: on(a.isexpanded) ? 'True' : 'False' })),
};

/**
 * MOLECULES that other molecules compose (Combobox contains an Input; Card contains a
 * Menu). Deliberately resolved BY NAME with `id: null`: a molecule page is deleted and
 * rebuilt on every iteration, which mints a NEW node id each time, so a pinned id would
 * go stale after the next build. The atom sets above are repaired in place and keep
 * their ids, which is why they can be pinned.
 */
const molSet = (figmaName, axes, opts = {}) => ({ figmaName, id: null, axes, ...opts });

Object.assign(INSTANCE_MAP, {
  'al-input': molSet('Input',
    (a) => ({
      Label: on(a.hidelabel) ? 'Hidden' : 'Shown',
      State: stateOf(a, { isreadonly: 'Readonly' }),
    })),

  'al-menu': molSet('Menu',
    (a) => ({ Variant: a.variant === 'simple' ? 'Simple' : 'Default', State: 'Default' })),

  'al-tabs': molSet('Tabs',
    (a) => ({ Variant: a.variant === 'stretch' ? 'Stretch' : 'Default', State: 'Default' })),

  'al-field-note-group': molSet('Field Note', (a) => ({ State: stateOf(a) })),
});

/** Component sets that do NOT exist in Figma yet — a molecule needing one is BLOCKED. */
export const MISSING_IN_FIGMA = new Set([
  'al-toast', 'al-accordion-panel', 'al-stepper-item', 'al-dropdown-panel',
  'al-tooltip', 'al-progress', 'al-spinner', 'al-logo', 'al-calendar',
  'al-time-selector-list', 'al-alert', 'al-avatar',
]);

/**
 * Icons are 71 FLAT components on the `🛠 Icons` page, named exactly as the code names
 * them (`search`, `document`, `add`). They are resolved BY NAME at build time rather
 * than by node id — there are too many to pin individually, and the page is stable.
 *
 * Two spellings reach us: the per-icon elements (`<al-icon-search>`) and the generic
 * `<al-icon name="search">`.
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
