/**
 * plan.mjs — which Altitude atoms become Figma components, and with which variants.
 *
 * CURATED ON PURPOSE. A mechanical dump of every `@property accessor` produces a
 * matrix a designer would throw away, for three reasons:
 *
 *   1. Behavioural props have no pixels. `type` (button/submit/reset), `target`
 *      (_blank/_self/...), `href`, `name`, `value` — identical rendering.
 *   2. Semantic props have no pixels. `tagName` (h1..h6) on al-heading: the visual
 *      scale is `variant`; the tag is an a11y concern. `dateFormat` is content.
 *   3. Booleans multiply. al-menu-item declares 7 → 128 combinations. Only states a
 *      designer actually places on a canvas earn a variant axis.
 *
 * Each entry: `axes` are the Figma variant properties; `cases` is the explicit
 * cross-product rendered, measured, and turned into one Figma variant each.
 */

/** Props that never become a variant axis, on any component. */
export const BEHAVIOURAL = new Set([
  'type', 'target', 'href', 'name', 'value', 'label', 'tagName', 'dateFormat',
  'ariaControls', 'id', 'for', 'src', 'alt', 'placeholder', 'autoClose',
  'isDynamic', 'isInteractive', 'resetDates', 'resetTime', 'is24HourFormat',
  'isDayShortHand', 'startOnMonday', 'showMonthPopup', 'isTruncated',
]);

const text = (t) => () => [{ html: t }];

/**
 * @param {string} tag
 * @param {string} figmaName
 * @param {object} axes  Figma variant property -> values. `_attrs` maps a value to attrs.
 */
function atom(tag, figmaName, axes, opts = {}) {
  const keys = Object.keys(axes);
  const key = opts.key || tag; // unique per PLAN entry — two entries may share a tag (Button / Button (Icon))
  let rows = [{}];
  for (const k of keys) {
    const next = [];
    for (const row of rows) for (const v of axes[k].values) next.push({ ...row, [k]: v });
    rows = next;
  }
  rows = rows.filter((r) => !(opts.omit || []).some((f) => f(r)));

  let cases = rows.map((r) => {
    const attrs = {};
    for (const k of keys) {
      const got = axes[k].attrs ? axes[k].attrs(r[k], r) : (r[k] === 'default' ? {} : { [k.toLowerCase()]: r[k] });
      Object.assign(attrs, got || {});
    }
    return {
      id: keys.map((k) => `${k}=${r[k]}`).join(','),
      axisValues: r,
      attrs: { ...attrs, ...(opts.always || {}) },
      slots: opts.slots ? opts.slots(r) : undefined,
      // JS properties (arrays/objects) — attributes cannot carry them. See harness.
      props: opts.props ? opts.props(r) : undefined,
      fill: opts.fill ? opts.fill(r) : false,
    };
  });

  // stateCases — attribute-driven interaction states, per the library's own Toggle
  // convention (`Checked=Off, State=Disabled`): the DS models Disabled/Error/etc. as
  // values of the interaction State AXIS, while the code drives them via attributes
  // (`isdisabled`, `iserror`), not pseudo-classes. Each named state re-renders every
  // base case with the extra attrs; its DEFAULT-pseudo measurement replaces the
  // pseudo-rewritten one for that State value.
  const stateCases = opts.stateCases || {};
  const extra = [];
  for (const [stName, stAttrs] of Object.entries(stateCases)) {
    for (const c of cases) {
      extra.push({
        ...c,
        id: c.id ? `${c.id}, State=${stName}` : `State=${stName}`,
        attrs: { ...c.attrs, ...stAttrs },
        stateOf: stName,
      });
    }
  }
  cases = cases.concat(extra);

  return {
    tag, key, figmaName, axisNames: keys, cases, note: opts.note,
    // Rendered/measured only when false. Used to park a component that needs a bespoke
    // build rather than silently emitting a broken one.
    skip: opts.skip || undefined,
    stateCases: Object.keys(stateCases),
    // Figma variant-value spellings that differ from the code's. The library calls
    // Button's implicit default variant "Primary", not "Default".
    valueNames: opts.valueNames || {},
    // Which State variants (Default/Hover/Active/Focus/Disabled) the Figma set carries.
    // Omit -> build-component-ops emits all five and flags which ones actually differ.
    states: opts.states,
  };
}

/** Shorthand: a boolean state axis rendered as off/on. */
const boolAxis = (prop, offLabel = 'default', onLabel = 'on') => ({
  values: [offLabel, onLabel],
  attrs: (v) => (v === onLabel ? { [prop.toLowerCase()]: true } : {}),
});

/** Shorthand: an enum axis where `default` means "attribute omitted". */
const enumAxis = (prop, values) => ({
  values: ['default', ...values],
  attrs: (v) => (v === 'default' ? {} : { [prop.toLowerCase()]: v }),
});

export const PLAN = [
  atom('al-button', 'Button',
    {
      Variant: enumAxis('variant', ['secondary', 'tertiary', 'bare', 'danger']),
      Width: { values: ['hug', 'fill'], attrs: (v) => (v === 'fill' ? { fullwidth: true } : {}) },
    },
    {
      slots: text('Button'),
      fill: (r) => r.Width === 'fill',
      valueNames: { Variant: { default: 'Primary' } },
      // No Disabled axis: al-button never renders the native `disabled` attribute,
      // so its :disabled SCSS cannot match and a Disabled variant would be pixel-
      // identical to Default. See .mm/issues/al-button-disabled-state-is-unreachable*.
      note: 'Disabled axis withheld pending the al-button disabled bug.',
    }),

  // Icon-only is a SEPARATE Figma set (`Button (Icon)`, State-only), not an axis on Button.
  atom('al-button', 'Button (Icon)',
    { Variant: enumAxis('variant', ['secondary', 'tertiary', 'bare', 'danger']) },
    {
      key: 'al-button--icon',
      always: { hidetext: true, label: 'Icon button' },
      slots: () => [{ name: 'before', el: 'al-icon-add', html: '' }],
      valueNames: { Variant: { default: 'Primary' } },
      note: 'The existing Figma set is State-only (5 variants); Variant rows beyond Primary are reference data.',
    }),

  // Molecule, but a REPAIR TARGET: the Figma `🛠 Banner` page predates this pipeline.
  // Figma's axes are Expanded x Variant; the token truth per variant comes from here.
  atom('al-banner', 'Banner',
    {
      Variant: enumAxis('variant', ['success', 'warning', 'danger']),
      Dismissible: boolAxis('isDismissible', 'no', 'yes'),
    },
    {
      valueNames: { Variant: { default: 'Info' } },
      slots: text('Banner message'),
    }),

  atom('al-badge', 'Badge',
    {
      Variant: enumAxis('variant', ['info', 'success', 'warning', 'danger']),
      Shape: { values: ['label', 'dot'], attrs: (v) => (v === 'dot' ? { isdot: true } : {}) },
    },
    { slots: (r) => (r.Shape === 'dot' ? [] : [{ html: '8' }]) }),

  atom('al-chip', 'Chip',
    {
      Variant: enumAxis('variant', ['secondary', 'info', 'success', 'warning', 'danger']),
      Shape: enumAxis('type', ['squared']),
      Dismissible: boolAxis('isDismissible', 'no', 'yes'),
    },
    { slots: text('Chip') }),

  atom('al-alert', 'Alert',
    {
      Variant: enumAxis('variant', ['success', 'warning', 'danger']),
      Dismissible: boolAxis('isDismissible', 'no', 'yes'),
    },
    { always: { isactive: true }, slots: text('Alert message') }),

  atom('al-toast', 'Toast',
    {
      Variant: enumAxis('variant', ['info', 'success', 'warning', 'danger']),
      Dismissible: boolAxis('isDismissible', 'no', 'yes'),
    },
    { always: { isactive: true }, slots: text('Toast message') }),

  atom('al-heading', 'Heading',
    {
      Variant: enumAxis('variant', ['display-lg', 'display-md', 'display-sm', 'lg', 'md', 'sm']),
      Weight: boolAxis('isBold', 'regular', 'bold'),
    },
    { slots: text('Heading') }),

  atom('al-link', 'Link',
    { Size: enumAxis('variant', ['xs', 'sm', 'lg']) },
    {
      stateCases: { Disabled: { isdisabled: true } },
      always: { href: '#' }, slots: text('Link text'),
    }),

  // `State` is the INTERACTION axis everywhere (the library's own Toggle set is
  // `Checked=Off|On, State=Default|Hover|Focus|Disabled`). Semantic conditions get
  // their own axis; attribute-driven disabled/error become State values via stateCases.
  atom('al-checkbox', 'Checkbox',
    {
      Checked: {
        values: ['Off', 'On', 'Indeterminate'],
        attrs: (v) => ({ Off: {}, On: { ischecked: true }, Indeterminate: { isindeterminate: true } }[v]),
      },
      Label: boolAxis('hideLabel', 'shown', 'hidden'),
    },
    {
      stateCases: { Disabled: { isdisabled: true }, Error: { iserror: true } },
      slots: text('Checkbox label'),
      note: 'Error modelled as a State value alongside Disabled — revisit if the DS wants a separate Error axis.',
    }),

  atom('al-radio', 'Radio',
    {
      Checked: { values: ['Off', 'On'], attrs: (v) => (v === 'On' ? { ischecked: true } : {}) },
      Label: boolAxis('hideLabel', 'shown', 'hidden'),
    },
    {
      stateCases: { Disabled: { isdisabled: true }, Error: { iserror: true } },
      slots: text('Radio label'),
    }),

  atom('al-toggle', 'Toggle',
    { Checked: { values: ['Off', 'On'], attrs: (v) => (v === 'On' ? { ischecked: true } : {}) } },
    {
      stateCases: { Disabled: { isdisabled: true } },
      slots: text('Toggle label'),
    }),

  atom('al-toggle-button', 'Toggle Button',
    {
      Variant: enumAxis('variant', ['background']),
      Selected: boolAxis('isSelected', 'no', 'yes'),
      Size: { values: ['default', 'small'], attrs: (v) => (v === 'small' ? { issmall: true } : {}) },
    },
    { slots: text('Toggle') }),

  atom('al-tab', 'Tab',
    { Active: boolAxis('isActive', 'No', 'Yes') },
    {
      stateCases: { Disabled: { isdisabled: true } },
      slots: text('Tab label'),
    }),

  atom('al-avatar', 'Avatar',
    {
      Size: enumAxis('variant', ['sm']),
      Badge: {
        values: ['none', 'success', 'warning', 'danger'],
        attrs: (v) => (v === 'none' ? {} : { hasbadge: true, badgevariant: v }),
      },
    },
    { slots: text('AE') }),

  atom('al-divider', 'Divider',
    { Orientation: enumAxis('variant', ['vertical']) }),

  atom('al-skeleton', 'Skeleton',
    { Shape: enumAxis('variant', ['circle', 'square']) }),

  atom('al-spinner', 'Spinner',
    { Tone: boolAxis('inverted', 'default', 'inverted') }),

  atom('al-progress', 'Progress',
    {
      Shape: { values: ['bar', 'circle'], attrs: (v) => (v === 'circle' ? { iscircle: true } : {}) },
      Size: enumAxis('circleSize', ['md', 'lg', 'xl']),
      Label: boolAxis('showLabel', 'hidden', 'shown'),
    },
    {
      always: { value: '60', max: '100' },
      omit: [(r) => r.Shape === 'bar' && r.Size !== 'default'],
    }),

  atom('al-field-note', 'Field Note',
    {},
    {
      stateCases: { Error: { iserror: true }, Disabled: { isdisabled: true } },
      slots: text('Helper text'),
    }),

  atom('al-tooltip', 'Tooltip',
    {
      Position: enumAxis('position', ['top', 'bottom', 'left', 'right']),
      Arrow: boolAxis('hasArrow', 'no', 'yes'),
    },
    { always: { isactive: true }, slots: text('Tooltip text') }),

  atom('al-text-block', 'Text Block',
    { Width: enumAxis('maxWidth', ['sm']) },
    { slots: text('<p>A passage of body copy used to verify measure and rhythm.</p>') }),

  atom('al-list-item', 'List Item',
    {
      Variant: enumAxis('variant', ['static']),
      Current: boolAxis('isCurrent', 'No', 'Yes'),
    },
    {
      stateCases: {
        Active: { isactive: true }, Disabled: { isdisabled: true }, Error: { iserror: true },
      },
      slots: text('List item'),
      note: 'Code `isactive` maps to State=Active — the attribute IS the pressed state.',
    }),

  atom('al-menu-item', 'Menu Item',
    {
      Selected: boolAxis('isSelected', 'No', 'Yes'),
      Role: {
        values: ['item', 'header', 'expandable'],
        attrs: (v) => ({
          item: {}, header: { isheader: true },
          expandable: { isexpandableheader: true, isexpanded: true },
        }[v]),
      },
    },
    {
      stateCases: { Focus: { isfocused: true }, Disabled: { isdisabled: true } },
      slots: text('Menu item'),
      note: 'Code `isfocused` maps to State=Focus — the attribute drives the focus styling.',
    }),

  atom('al-pagination-item', 'Pagination Item',
    {
      Selected: boolAxis('isSelected', 'No', 'Yes'),
      Kind: boolAxis('isExpandable', 'number', 'expandable'),
    },
    {
      stateCases: { Disabled: { isdisabled: true } },
      slots: text('3'),
    }),

  atom('al-breadcrumbs-item', 'Breadcrumbs Item',
    {
      Current: boolAxis('isCurrent', 'No', 'Yes'),
      Separator: boolAxis('hasSeparator', 'no', 'yes'),
    },
    { always: { href: '#' }, slots: text('Crumb') }),

  atom('al-stepper-item', 'Stepper Item',
    {
      Orientation: enumAxis('variant', ['vertical']),
      Status: {
        values: ['Default', 'Active', 'Complete'],
        attrs: (v) => ({ Default: {}, Active: { isactive: true }, Complete: { iscomplete: true } }[v]),
      },
      Position: boolAxis('isLast', 'middle', 'last'),
    },
    { slots: text('Step') }),

  atom('al-accordion-panel', 'Accordion Panel',
    {
      Expanded: boolAxis('isActive', 'No', 'Yes'),
      Position: boolAxis('isLast', 'middle', 'last'),
    },
    {
      stateCases: { Disabled: { isdisabled: true } },
      slots: () => [{ name: 'header', html: 'Panel header' }, { html: 'Panel body content' }],
    }),

  atom('al-dropdown-panel', 'Dropdown Panel',
    {
      Header: boolAxis('hasHeader', 'no', 'yes'),
      Footer: boolAxis('hasFooter', 'no', 'yes'),
    },
    { slots: () => [{ html: 'Dropdown content' }] }),

  atom('al-tab-panel', 'Tab Panel',
    { Active: boolAxis('isActive', 'No', 'Yes') },
    {
      slots: text('Tab panel content'),
      note: 'Active=No is display:none in the browser — it measures as missing, by design.',
    }),

  atom('al-logo', 'Logo',
    { Brand: enumAxis('variant', ['southleft']) },
    { note: 'The southleft value is a LOGO ASSET, not the pruned Southleft brand theme.' }),

  atom('al-calendar', 'Calendar', { Default: { values: ['default'], attrs: () => ({}) } },
    { note: 'Single default variant — a full date grid, not a variant matrix.' }),

  atom('al-time-selector-list', 'Time Selector List',
    { Orientation: enumAxis('orientation', ['horizontal']) }),

  /* ======================= MOLECULES =======================================
   * Composites. The nested al-* children below are NOT re-drawn — measure-lib marks
   * each one as an instance boundary and the builder places a real Figma INSTANCE of
   * that atom's component set (see instance-map.mjs).
   *
   * Curation rule is unchanged from the atoms: an axis has to be something a designer
   * would place on a canvas. Molecule prop surfaces are 2-3x the atoms' (Input 23,
   * Range 20), so most props are deliberately fixed via `always` instead of multiplied
   * into variants.
   * ========================================================================= */

  // Deps: al-checkbox, al-field-note. Error/Disabled are CLASS hooks (.al-is-error /
  // .al-is-disabled), not pseudo-classes, so they are attribute-driven State values.
  atom('al-checkbox-group', 'Checkbox Group',
    {
      Orientation: enumAxis('variant', ['horizontal']),
      Legend: boolAxis('hideLegend', 'shown', 'hidden'),
    },
    {
      always: { label: 'Checkbox group legend label', fieldnote: 'This is a field note.' },
      stateCases: { Error: { iserror: true, errornote: 'This is an error note.' }, Disabled: { isdisabled: true } },
      slots: () => [{ html: '<al-checkbox>Checkbox 1</al-checkbox><al-checkbox>Checkbox 2</al-checkbox><al-checkbox>Checkbox 3</al-checkbox>' }],
    }),

  // Deps: al-radio, al-field-note. Identical prop surface and SCSS to Checkbox Group.
  atom('al-radio-group', 'Radio Group',
    {
      Orientation: enumAxis('variant', ['horizontal']),
      Legend: boolAxis('hideLegend', 'shown', 'hidden'),
    },
    {
      always: { label: 'Radio group legend label', fieldnote: 'This is a field note.' },
      stateCases: { Error: { iserror: true, errornote: 'This is an error note.' }, Disabled: { isdisabled: true } },
      slots: () => [{ html: '<al-radio>Radio 1</al-radio><al-radio>Radio 2</al-radio><al-radio>Radio 3</al-radio>' }],
    }),

  // Deps: al-breadcrumbs-item. isTruncated is WITHHELD: truncation renders al-popover +
  // al-menu, neither of which exists in Figma yet, so those children could only be
  // flattened — which would silently misrepresent the library as non-composing.
  atom('al-breadcrumbs', 'Breadcrumbs',
    {},
    {
      slots: () => [{ html: '<al-breadcrumbs-item href="#">Page One</al-breadcrumbs-item><al-breadcrumbs-item href="#">Page Two</al-breadcrumbs-item><al-breadcrumbs-item href="#">Page Three</al-breadcrumbs-item>' }],
      states: ['Default'],
      note: 'Truncated variant deferred to Wave B — needs Popover + Menu in Figma first.',
    }),

  // Deps: al-menu-item. All interaction state lives in the item, none in the menu.
  atom('al-menu', 'Menu',
    { Variant: enumAxis('variant', ['simple']) },
    {
      slots: () => [{ html: '<al-menu-item isheader>Header</al-menu-item><al-menu-item>Menu Item</al-menu-item><al-menu-item>Menu Item</al-menu-item><al-menu-item isdisabled>Menu Item</al-menu-item>' }],
      states: ['Default'],
    }),

  // Deps: al-tab, al-tab-panel, al-badge. States live in al-tab.
  atom('al-tabs', 'Tabs',
    { Variant: enumAxis('variant', ['stretch']) },
    {
      slots: () => [{ html: '<al-tab>Tab One</al-tab><al-tab>Tab Two<al-badge variant="danger">2</al-badge></al-tab><al-tab isdisabled>Tab Three</al-tab><al-tab-panel slot="panel">Tab panel content</al-tab-panel>' }],
      states: ['Default'],
    }),

  // Deps: al-field-note. Real pseudo states via the shared al-input mixin
  // (hover / focus-visible / disabled / read-only), so States are genuine here.
  atom('al-input', 'Input',
    { Label: boolAxis('hideLabel', 'shown', 'hidden') },
    {
      always: { label: 'Label', placeholder: 'Placeholder', fieldnote: 'This is a field note.' },
      stateCases: {
        Error: { iserror: true, errornote: 'This is an error note.' },
        Disabled: { isdisabled: true },
        Readonly: { isreadonly: true },
      },
    }),

  // Deps: al-field-note. Same mixin as Input; `rows` sets the box height.
  atom('al-textarea', 'Textarea',
    { Label: boolAxis('hideLabel', 'shown', 'hidden') },
    {
      always: { label: 'Label', placeholder: 'Placeholder', fieldnote: 'This is a field note.', rows: '3' },
      stateCases: {
        Error: { iserror: true, errornote: 'This is an error note.' },
        Disabled: { isdisabled: true },
        Readonly: { isreadonly: true },
      },
    }),

  // Deps: al-button (x2, bare + icon), al-field-note.
  atom('al-input-stepper', 'Input Stepper',
    { Label: boolAxis('hideLabel', 'shown', 'hidden') },
    {
      always: { label: 'Label', fieldnote: 'This is a field note.', count: '1', min: '0', max: '5' },
      stateCases: {
        Error: { iserror: true, errornote: 'This is an error note.' },
        Disabled: { isdisabled: true },
      },
    }),

  // Deps: al-field-note. Real pseudo states on the native thumb
  // (::-webkit-slider-thumb :hover/:active/:focus-visible/:disabled).
  atom('al-range', 'Range',
    {
      Behavior: enumAxis('behavior', ['range']),
      Output: boolAxis('hasOutput', 'no', 'yes'),
    },
    {
      always: { label: 'Label', fieldnote: 'This is a field note.', value: '50' },
      stateCases: {
        Error: { iserror: true, errornote: 'This is an error note.' },
        Disabled: { isdisabled: true },
      },
    }),

  // Deps: al-icon (slotted), al-button (slotted). No states of its own.
  atom('al-empty-state', 'Empty State',
    {},
    {
      always: { heading: 'No results found', description: 'Try adjusting your filters or search terms.' },
      slots: () => [
        { name: 'icon', el: 'al-icon-search', html: '' },
        { name: 'actions', el: 'al-button', html: 'Clear filters' },
      ],
      states: ['Default'],
      note: 'The icon and actions slots are conditionally rendered — they must be filled to appear.',
    }),

  // Deps: al-button, al-field-note, al-icon. al-progress only appears mid-upload
  // (uploadFiles), which is a runtime state, not a design variant — so it is not built.
  atom('al-file-upload', 'File Upload',
    { Label: boolAxis('hideLabel', 'shown', 'hidden') },
    {
      always: { label: 'File upload', fieldnote: 'Supported format: .xml' },
      stateCases: { Disabled: { isdisabled: true }, Error: { iserror: true, errornote: 'Upload failed.' } },
      slots: () => [{ html: '<al-icon-document size="xxl"></al-icon-document>Drag and Drop files here or <al-button variant="tertiary">Browse</al-button>' }],
      note: 'Dropzone hover is :hover:not(:active,.al-is-disabled); drag state is JS-driven.',
    }),

  // Deps: al-checkbox, al-icon. columns AND data are JS PROPERTIES — without both the
  // component renders a bare <slot> and measures as nothing. Hence `props`.
  atom('al-table', 'Table',
    {
      Selectable: boolAxis('isSelectable', 'no', 'yes'),
      Sort: {
        values: ['none', 'ascending'],
        attrs: (v) => (v === 'ascending' ? { sortkey: 'name', sortdirection: 'ascending' } : {}),
      },
    },
    {
      always: { caption: 'Team roster' },
      props: () => ({
        columns: [
          { key: 'name', label: 'Name', isSortable: true },
          { key: 'role', label: 'Role', isSortable: true },
          { key: 'team', label: 'Team' },
          { key: 'status', label: 'Status', align: 'end' },
        ],
        data: [
          { id: 1, name: 'Ada Lovelace', role: 'Engineer', team: 'Platform', status: 'Active' },
          { id: 2, name: 'Grace Hopper', role: 'Architect', team: 'Compiler', status: 'Active' },
          { id: 3, name: 'Margaret Hamilton', role: 'Lead', team: 'Flight', status: 'Invited' },
        ],
      }),
      states: ['Default'],
      note: 'Row hover and sort-button hover/focus-visible exist but are per-row, not a set-level State.',
    }),

  // Deps: al-pagination-item (in Figma). ALSO renders al-select / al-list / al-popover,
  // which are molecules not yet in Figma — the builder logs those as instance gaps
  // rather than pretending they composed.
  atom('al-pagination', 'Pagination',
    { Variant: enumAxis('variant', ['small']) },
    {
      always: { totalrecords: '200', pagesize: '20', currentitem: '1' },
      states: ['Default'],
      note: 'Ellipsis popover is closed until clicked, so its menu is not measured.',
    }),

  // Deps: al-icon. actions[] is a JS PROPERTY. position:fixed overlay — it only renders
  // at all with isActive set, and its box is viewport-anchored, not in flow.
  atom('al-command-palette', 'Command Palette',
    {
      Content: {
        values: ['populated', 'empty'],
        attrs: (v) => (v === 'empty' ? { emptytext: 'No commands registered.' } : {}),
      },
    },
    {
      always: { isactive: true },
      props: (r) => (r.Content === 'empty' ? { actions: [] } : {
        actions: [
          { id: 'new', label: 'New file', icon: 'add', group: 'Actions' },
          { id: 'open', label: 'Open file', icon: 'document', group: 'Actions' },
          { id: 'settings', label: 'Settings', icon: 'settings', group: 'Navigation' },
        ],
      }),
      states: ['Default'],
      skip: true,
      note: 'PARKED — needs a bespoke build. It is a position:fixed overlay whose shadow '
        + 'root element measures 0x0 in flow (verified 2026-08-21: both cases came back '
        + '0x0 with isActive set), so the generic from-ops builder would emit an empty '
        + 'component. Its content is also viewport-anchored (inset-block-start:15vh, '
        + 'translateX(-50%), max-width 560px) rather than laid out in the document.',
    }),
  // Deps: al-toggle-button (an ATOM already in Figma). No states of its own.
  atom('al-toggle-button-group', 'Toggle Button Group',
    {
      Variant: enumAxis('variant', ['background']),
      Orientation: enumAxis('orientation', ['vertical']),
      Gap: enumAxis('gap', ['sm']),
    },
    {
      slots: () => [{ html: '<al-toggle-button>One</al-toggle-button><al-toggle-button>Two</al-toggle-button><al-toggle-button>Three</al-toggle-button>' }],
      states: ['Default'],
    }),

  // Deps: al-input (a MOLECULE, instanced by name), al-icon, al-field-note.
  // Measured CLOSED: the open panel needs al-dropdown-panel + al-list, neither of which
  // is in Figma. Closed is a complete, real rendering — label, field, caret, field note.
  atom('al-combobox', 'Combobox',
    { Label: boolAxis('hideLabel', 'shown', 'hidden') },
    {
      always: { label: 'Fruit', placeholder: 'Search fruits', fieldnote: 'Type to filter.' },
      stateCases: {
        Error: { iserror: true, errornote: 'Pick a fruit.' },
        Disabled: { isdisabled: true },
      },
      note: 'Closed state only — the open dropdown needs al-dropdown-panel + al-list in Figma.',
    }),

];

/** Atoms deliberately NOT built as Figma components, with the reason. */
export const NOT_COMPONENTS = {
  'al-focus-trap': 'Behavioural wrapper — renders no visual surface of its own.',
  'al-icon': 'An icon LIBRARY (hundreds of glyphs), not one component. Needs its own icon-set pass.',
  'al-theme-switcher': 'Zero @property accessors and an EMPTY stylesheet (.al-c-theme-switcher {}). '
    + 'Everything visible about it is an al-button + al-popover + al-menu composition, and all '
    + 'its substance is behavioural (walk to <al-theme>, set brand/mode, dispatch). A Figma set '
    + 'would duplicate three existing components and own no pixels. Document it as a composition '
    + 'example instead.',

};
