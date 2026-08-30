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
      // How wide to render a filling case. The harness defaults to 320px, which is a
      // MOBILE width: a page section measured there reports its stacked mobile layout
      // (the hero came out 1371px tall). Page sections declare a desktop width.
      fillWidth: opts.fillWidth || undefined,
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
    // Belongs to a BRAND layer package, not the shared library. A project without
    // that brand must not build it: the tag may not even exist there, and where it
    // does (card/header/footer) the brand API is a different component.
    brandOnly: opts.brandOnly || undefined,
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

/**
 * T25 (spec 2026-08-25-contract-backed-figma-parity-and-generation) — the
 * generated `<al-icon-*>` elements (ALIconBase, see icon-base.ts's own doc
 * comment) share ONE render body and expose no variant-worthy props: `size`
 * is a dimension, not a token-bearing structural fork, and `iconTitle` only
 * changes an ARIA attribute, never the DOM shape. A single default-case
 * `atom()` per tag is therefore not a "mechanical dump" in the sense this
 * file's own header warns against — there is genuinely nothing else to
 * cross-product — it is the SAME "single default variant" shape `al-calendar`
 * already uses above, applied to components with even less internal
 * structure.
 *
 * ONLY THESE 15 OF THE 37 GENERATED ICON TAGS ARE LISTED — verified live, not
 * assumed. Every `<al-icon-*>` element is `@deprecated` (see icon-base.ts /
 * icons/<name>.ts: "Use `<al-icon name=\"x\">`... will be removed in the next
 * major version") and bundle.ts does NOT import `./icon/icons/*` at all — a
 * deprecated tag's wrapper CLASS only ends up in the harness's esbuild output
 * (and therefore only upgrades to a real shadow root `__spec()` can measure)
 * when some OTHER already-rendered component still imports that specific
 * icon internally for its own use (alert/chip/dialog/drawer/file-upload/
 * popover/search/toast do, for exactly these 15 names — confirmed by grepping
 * `libs/al-web-components/components/**\/*.ts` for each import, then
 * confirming a real `spec-light.json` entry for the tag after a live
 * `measure-components.mjs` run). The other 22 (attachment, bell, bookmark,
 * check, chevron-up, clock, copy, dots-vertical, emoji, filter, help, home,
 * layout-masonry, list, menu, pin, send, sign-in, sign-out, star, support,
 * user) are used by NO currently-rendered component, so their custom element
 * never upgrades in this harness; `__spec()` skips a host with no
 * `shadowRoot` rather than recording anything — listing them here would add
 * PLAN entries that deterministically measure NOTHING, not broaden coverage.
 * Making all 37 reliably measurable would mean importing every
 * `icon/icons/*.ts` from the harness bundle directly — a real source change
 * to a deprecated code path, out of scope for a contracts-data task; left as
 * documented follow-up rather than attempted here.
 */
const ICON_TAGS = [
  'add', 'calendar', 'chevron-down', 'chevron-left', 'chevron-right', 'close', 'document',
  'dots-horizontal', 'info', 'minus', 'search', 'settings', 'success', 'warning-circle',
  'warning-triangle',
];

const ICON_ATOMS = ICON_TAGS.map((name) => {
  const figmaName = `Icon ${name.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join(' ')}`;
  return atom(`al-icon-${name}`, figmaName, { Default: { values: ['default'], attrs: () => ({}) } },
    { note: 'Generated icon element (ALIconBase) — one render body, no variant-worthy props; see plan.mjs ICON_TAGS comment.' });
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
  // al-banner carries NO tone variant (2026-08-28). A banner is one structural
  // shape whose only behavioural prop is isDismissible; its leading glyph and
  // that glyph's colour are slot/custom-property overrides, not axes, and the
  // message + CTA are content. So Dismissible is the whole matrix.
  atom('al-banner', 'Banner',
    {
      Dismissible: boolAxis('isDismissible', 'no', 'yes'),
    },
    {
      // Measured FULL-BLEED at the reference frame's own width. al-banner is
      // `inline-size: 100%` — a page-level bar, not a hugging card — so a
      // default (hug) measurement reported a ~245px stub that looked nothing
      // like "Banner example" (600px, message left, CTA hard right). fill +
      // fillWidth is the same mechanism the brand page sections use.
      fill: () => true,
      fillWidth: 600,
      // The reference frame's own copy and trailing CTA. The link slot is what
      // makes the inner layout's space-between visible at all; measuring with
      // a bare message could never produce the design's two-part body.
      slots: () => [
        { html: "We're rolling out a new theming engine this week — some screens may look slightly different." },
        { name: 'link', el: 'al-link', html: 'Learn more' },
      ],
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
    { Orientation: enumAxis('variant', ['vertical']) },
    {
      // A horizontal divider is width:100%, so in the harness's shrink-to-fit
      // `.case` it measured ZERO WIDE and its contract recorded a 0x1 root —
      // the repair skill's trap 12. Generating from that produced a bare
      // node, which is how the 2026-08-29 sweep degraded the Divider set.
      // The vertical one takes its width intrinsically and its HEIGHT from a
      // parent, which this mechanism cannot give it; that case is still
      // unmeasured and is deliberately not faked.
      fill: (r) => r.Orientation !== 'vertical',
    }),

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
      // The BAR is width:100% and measured zero wide in the shrink-to-fit
      // `.case`, so al-progress generated an EMPTY 100x100 frame in Figma
      // (trap 12, and the clearest casualty of the 2026-08-29 sweep). The
      // circle is intrinsically sized and must NOT be stretched, hence the
      // per-row predicate rather than a blanket fill.
      fill: (r) => r.Shape === 'bar',
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
    {
      always: { isactive: true },
      // al-tooltip positions its bubble against a TRIGGER. With only
      // default-slot text it rendered a childless inline-flex and measured
      // 0x0 — the last remaining "measured but got nothing" contract, and a
      // different cause from the width:100% cases (no sized parent would have
      // helped). Slots mirror the docs' own example, which is the acceptance
      // reference: a trigger, a prefix, and the tooltip text.
      slots: () => [
        { name: 'trigger', html: 'Hover me' },
        { name: 'prefix', html: '⌘ + C' },
        { html: 'Tooltip Text' },
      ],
    }),

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
      // `direction` forwards to the group's own nested <al-layout> (2026-08-28).
      // It used to measure `variant="horizontal"`, a prop that does not exist —
      // so both Orientation cases rendered identically and the axis was dropped
      // as un-backed, while the design library's "Horizontal" column kept
      // showing it. Now it is a real prop and a real axis.
      Orientation: { values: ['default', 'horizontal'], attrs: (v) => (v === 'horizontal' ? { direction: 'row' } : {}) },
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
      // `direction` forwards to the group's own nested <al-layout> (2026-08-28).
      // It used to measure `variant="horizontal"`, a prop that does not exist —
      // so both Orientation cases rendered identically and the axis was dropped
      // as un-backed, while the design library's "Horizontal" column kept
      // showing it. Now it is a real prop and a real axis.
      Orientation: { values: ['default', 'horizontal'], attrs: (v) => (v === 'horizontal' ? { direction: 'row' } : {}) },
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


  /* --- southleft scope: base components tiered but never planned --- */

  atom('al-list', 'List',
    { Direction: enumAxis('direction', ['row']) },
    {
      slots: () => [{ html: '<al-list-item>First item</al-list-item><al-list-item>Second item</al-list-item><al-list-item>Third item</al-list-item>' }],
      states: ['Default'],
      note: 'Deps: al-list-item. The list itself paints nothing; it owns direction and overflow only.',
    }),

  atom('al-stat', 'Stat',
    { Trend: enumAxis('trend', ['up', 'down']) },
    {
      always: { value: '128', label: 'Deployments', delta: '12%' },
      states: ['Default'],
      note: 'trend=none is the implicit default. delta only renders alongside a trend.',
    }),

  atom('al-testimonial', 'Testimonial',
    {},
    {
      always: { attribution: 'Jane Cooper', 'attribution-role': 'Design Lead', company: 'Northwind' },
      slots: () => [{ html: 'Altitude let us ship a coherent product surface in a quarter, not a year.' }],
      states: ['Default'],
    }),

  // al-layout owns ARRANGEMENT for everything else (AGENTS.md, 'Arrangement vs.
  // semantics'), so it has no paint of its own. Only the variants that change the
  // TRACK MODEL are worth a Figma variant; gap/align/justify are props on an instance.
  atom('al-layout', 'Layout',
    {
      Variant: enumAxis('variant', ['constrained', 'grid', 'bento']),
      Direction: enumAxis('direction', ['column']),
    },
    {
      always: { gap: 'md' },
      slots: () => [{ html: '<al-card>One</al-card><al-card>Two</al-card><al-card>Three</al-card>' }],
      states: ['Default'],
      note: 'Layout paints nothing. Variants exist for the track model only.',
    }),

  /* --- southleft BRAND layer (@southleft/sl-web-components) --- */

  atom('al-card', 'Card',
    { Variant: enumAxis('variant', ['bare', 'service', 'tool', 'article', 'work']) },
    {
      brandOnly: true,
      slots: () => [
        { name: 'header', html: 'Design systems' },
        { html: 'A single source of truth for product surface, shipped as code.' },
        { name: 'footer', html: 'Read more' },
      ],
      states: ['Default', 'Hover', 'Focus'],
      note: 'Brand implementation — supersedes the base al-card for this project.',
    }),

  atom('al-section-header', 'Section Header',
    { Link: { values: ['default', 'with-link'], attrs: (v) => (v === 'with-link' ? { 'link-href': '/insights', 'link-label': 'All insights' } : {}) } },
    {
      brandOnly: true,
      always: { index: '01', label: 'Insights', heading: 'What we have been thinking about', dek: 'Notes from the studio on design systems, tooling and craft.' },
      states: ['Default'],
      note: 'The rule is a ::before/::after background using a BORDER token at full strength.',
    }),

  atom('al-cta-band', 'CTA Band',
    {},
    {
      brandOnly: true,
      always: { kicker: '<cta>', heading: 'Ready to build a system your team will actually use?', dek: 'Tell us what you are working on.' },
      slots: () => [{ html: '<al-button>Start a project</al-button>' }],
      states: ['Default'],
      fill: () => true,
      fillWidth: 1280,
      note: 'Transparent — its only surface is the sl-grid-texture 72px lattice + radial mask.',
    }),

  atom('al-page-hero', 'Page Hero',
    {},
    {
      brandOnly: true,
      always: { label: 'Work', heading: 'Selected work', dek: 'A few of the systems we have designed, built and handed over.' },
      states: ['Default'],
      fill: () => true,
      fillWidth: 1280,
    }),

  atom('al-hero', 'Hero',
    {},
    {
      brandOnly: true,
      always: { kicker: 'Southleft', heading: 'Design systems that ship', lead: 'We design, build and hand over the system your product team builds on.' },
      slots: () => [
        { name: 'actions', el: 'al-button', html: 'Start a project' },
        { name: 'chips', html: '<al-chip>Design systems</al-chip><al-chip>Tooling</al-chip>' },
      ],
      states: ['Default'],
      fill: () => true,
      fillWidth: 1280,
      note: 'Transparent; texture is the grid mixin. The __murmur canvas is JS-painted and has no CSS paint.',
    }),

  atom('al-marquee', 'Marquee',
    { Paused: boolAxis('paused', 'running', 'paused') },
    {
      brandOnly: true,
      slots: () => [{ html: '<span>Design systems</span><span data-variant="solid">/</span><span>Tooling</span><span data-variant="mono">est. 2011</span>' }],
      states: ['Default'],
      fill: () => true,
      fillWidth: 1280,
      note: 'Items are read off slotted elements; the belt renders two copies for the seamless loop.',
    }),

  atom('al-logo-wall', 'Logo Wall',
    { Vivid: boolAxis('vivid', 'default', 'vivid') },
    {
      brandOnly: true,
      slots: () => [{ html: ['a', 'b', 'c', 'd'].map(() => `<img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='28'><rect width='120' height='28' fill='%23888'/></svg>" alt="Client">`).join('') }],
      states: ['Default'],
      fill: () => true,
      fillWidth: 1280,
      note: 'filter: brightness(0) invert(1) hardcodes a DARK context — no light-mode branch exists.',
    }),

  atom('al-header', 'Header',
    { Menu: boolAxis('menuOpen', 'closed', 'open') },
    {
      brandOnly: true,
      slots: () => [
        { name: 'brand', html: '<al-logo></al-logo>' },
        { name: 'nav', html: '<a href="/work" aria-current="page">Work</a><a href="/insights">Insights</a><a href="/about">About</a>' },
        { name: 'actions', el: 'al-button', html: 'Contact' },
      ],
      states: ['Default'],
      fill: () => true,
      fillWidth: 1280,
      note: 'Brand implementation. Translucent bar (85% color-mix) + backdrop-filter; active nav pill is an [aria-current] rule.',
    }),

  atom('al-footer', 'Footer',
    {},
    {
      brandOnly: true,
      always: { quote: 'Build the system once. Ship on it for years.', cite: 'Southleft', copyright: '(c) 2026 Southleft, LLC' },
      slots: () => [
        { name: 'brand', html: '<al-logo></al-logo>' },
        { name: 'columns', html: '<a href="/work">Work</a><a href="/insights">Insights</a><a href="/about">About</a>' },
        { name: 'legal', html: '<a href="/privacy">Privacy</a>' },
      ],
      states: ['Default'],
      fill: () => true,
      fillWidth: 1280,
      note: 'Brand implementation. Three hairlines, all $sl-border-faint (55% of border-default-weak).',
    }),

  ...ICON_ATOMS,

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
