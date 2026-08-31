import { html } from 'lit';
import { spread } from '../../directives/spread';
import './layout';
import '../card/card';
import '../heading/heading';
import '../text-block/text-block';
import '../button/button';
import '../badge/badge';
import '../avatar/avatar';
import '../chip/chip';
import '../popover/popover';
import '../menu/menu';
import '../menu-item/menu-item';
import '../icon/icons/dots-horizontal';
import '../../fixtures/f-po/f-po';

/**
 * Layout is the single arrangement primitive. Rather than a story per
 * permutation, there is one story per **variant**, each driven by the controls
 * panel — every prop below is live, so a variant can be explored without
 * hunting for a matching story.
 */
export default {
  title: 'Foundations/Layout',
  component: 'al-layout',
  tags: ['autodocs'],
  parameters: { status: { type: 'beta' } },
  argTypes: {
    variant: {
      control: 'radio',
      options: ['default', 'constrained', 'grid', 'bento'],
      description: 'default = flow (stack/row). constrained = page measure with breakout. grid = N columns. bento = 12-col auto-row.'
    },
    direction: { control: 'radio', options: ['column', 'row'] },
    gap: { control: 'radio', options: ['default', 'none', 'xs', 'sm', 'md', 'lg', 'xl'] },
    align: { control: 'radio', options: ['default', 'start', 'center', 'end', 'stretch'] },
    justify: { control: 'radio', options: ['default', 'start', 'center', 'end', 'between'] },
    size: { control: 'radio', options: ['default', 'sm', 'md', 'lg', 'xl', 'xxl', 'full'], description: 'constrained only — the content column measure' },
    gutter: { control: 'radio', options: ['default', 'none', 'sm', 'md', 'lg'], description: 'constrained only — the gutter track width' },
    columns: { control: { type: 'number', min: 1, max: 12 }, description: 'grid only — column count' },
    noCollapse: { control: 'boolean', description: 'grid only — keep columns at every width' },
    wrap: { control: 'boolean' },
    grow: { control: 'boolean' },
    responsive: { control: 'boolean' },
    fullHeight: { control: 'boolean' }
  }
};

/**
 * **Flow** — the default. A column, or a row with `direction="row"`. Use the
 * controls to explore `direction`, `gap`, `align`, `justify`, `wrap` and
 * `responsive`.
 *
 * A row of buttons is `<al-layout direction="row" justify="end" grow>`.
 */
export const Flow = (args) => html`
  <al-layout ${spread(args)}>
    <al-card><al-heading tagName="h3" variant="sm">Components</al-heading></al-card>
    <al-card><al-heading tagName="h3" variant="sm">Tokens</al-heading></al-card>
    <al-card><al-heading tagName="h3" variant="sm">Patterns</al-heading></al-card>
  </al-layout>
`;
Flow.args = {};

/**
 * **Constrained** — the page measure. Children sit in a centred content column
 * capped at `size`, with gutter tracks either side. A child marked `bleed`
 * breaks out and runs edge-to-edge, so a section needs no container wrapper of
 * its own.
 */
export const Constrained = (args) => html`
  <al-layout ${spread(args)}>
    <f-po>Inside the measure</f-po>
    <f-po bleed>bleed — breaks out edge to edge</f-po>
    <f-po>Back inside the measure</f-po>
  </al-layout>
`;
Constrained.args = { variant: 'constrained' };
Constrained.parameters = { layout: 'fullscreen' };

/**
 * **Grid** — an N-column grid. Children span with the SAME
 * `al-u-grid__item col:N` classes the `.al-u-grid` utility uses, so the design
 * system has only one span system.
 *
 * A page can override the track list entirely with `--al-layout-template`
 * (paired with `noCollapse`) — that is how a fixed-width sidebar shell is
 * built.
 */
export const Grid = (args) => html`
  <al-layout ${spread(args)}>
    <f-po class="al-u-grid__item col:6">col:6</f-po>
    <f-po class="al-u-grid__item col:6">col:6</f-po>
    <f-po class="al-u-grid__item col:4">col:4</f-po>
    <f-po class="al-u-grid__item col:8">col:8</f-po>
  </al-layout>
`;
Grid.args = { variant: 'grid', columns: 12 };

/**
 * **Bento** — the asymmetric feature grid.
 *
 * A tile is just an `<al-card>` (or any component) carrying the SHARED
 * `al-u-grid__item col:N` classes. `col:12 col:8@md` means full-width on small
 * screens, eight columns at `md` and up — the items own the responsive story,
 * so the container does not force a collapse.
 */
export const Bento = (args) => html`
  <al-layout ${spread(args)}>
    <al-card class="al-u-grid__item col:12 col:8@md"><al-heading tagName="h3" variant="sm">col:8@md</al-heading></al-card>
    <al-card class="al-u-grid__item col:12 col:4@md"><al-heading tagName="h3" variant="sm">col:4@md</al-heading></al-card>
    <al-card class="al-u-grid__item col:12 col:4@md"><al-heading tagName="h3" variant="sm">col:4@md</al-heading></al-card>
    <al-card class="al-u-grid__item col:12 col:8@md"><al-heading tagName="h3" variant="sm">col:8@md</al-heading></al-card>
  </al-layout>
`;
Bento.args = { variant: 'bento' };

/**
 * **Composition** (the documented default) — three real cards in a grid, each one built the way the
 * library intends: the COMPONENT owns its chrome, LAYOUT owns the arrangement.
 *
 * This story exists to answer a fair question: if arrangement lives in
 * `<al-layout>` rather than in each component's slots, does every consumer end
 * up rebuilding a card by hand every time?
 *
 * No — and the split is worth being precise about:
 *
 * - `<al-card>` still owns everything that makes a card a card: the hairline
 *   border, the radius, the region padding, the header rule, the tinted footer.
 *   None of that is retyped here, and none of it can drift between usages.
 * - `<al-layout>` only arranges the caller's OWN content inside a region —
 *   "title left, overflow menu right", "these three chips in a row". That
 *   genuinely differs per usage, which is exactly why it is not baked in.
 *
 * The part that IS repeated is the small recurring pattern below (a title row
 * with a trailing control). The answer to that is a documented recipe like this
 * one, not a new `al-card-header` wrapper component — a wrapper that owns no
 * behaviour, ARIA relationship or state is `<al-layout>` with props, and
 * shipping one is what the arrangement rule in AGENTS.md exists to prevent.
 *
 * One sharp edge worth copying carefully: the header row needs `grow` on the
 * slotted layout AND on the title's own layout. `<al-popover>` is
 * `display: contents`, so it never becomes a flex item — its trigger and menu
 * are hoisted into the row as two separate items, and `justify="between"`
 * alone would distribute three items instead of two.
 */
export const Default = (args) => html`
  <al-layout ${spread(args)}>
    ${[
      { title: 'Flat, minimal, type-first.', owner: 'MK', name: 'M. Kim', when: '4h ago', status: 'success', label: 'Stable' },
      { title: 'Floating labels, retired.', owner: 'TC', name: 'T. Chen', when: '2d ago', status: 'warning', label: 'In review' },
      { title: 'A segmented stepper.', owner: 'JR', name: 'J. Ruiz', when: 'now', status: 'danger', label: 'Redesign' },
    ].map(
      (card, i) => html`
        <al-card class="al-u-grid__item col:12 col:4@md">
          <al-layout slot="header" direction="row" gap="sm" align="center" grow>
            <al-layout grow>
              <al-heading tagName="h3" variant="sm" ?isBold=${true}>${card.title}</al-heading>
            </al-layout>
            <al-popover menuId=${`composition-menu-${i}`} variant="menu">
              <al-button slot="trigger" variant="bare" size="sm" ?hideText=${true} label="Card actions">
                <al-icon-dots-horizontal slot="before"></al-icon-dots-horizontal>
              </al-button>
              <al-menu id=${`composition-menu-${i}`}>
                <al-menu-item>Duplicate</al-menu-item>
                <al-menu-item>Favorite</al-menu-item>
                <al-menu-item>Remove</al-menu-item>
              </al-menu>
            </al-popover>
          </al-layout>

          <al-layout direction="column" gap="sm">
            <al-layout direction="row" gap="sm" align="center">
              <al-avatar variant="sm">${card.owner}</al-avatar>
              <al-text-block>${card.name} · ${card.when}</al-text-block>
              <al-badge variant=${card.status}>${card.label}</al-badge>
            </al-layout>
            <al-text-block>
              Hairline borders on warm paper neutrals, one refined blue, shadows reserved for overlays.
            </al-text-block>
            <al-layout direction="row" gap="sm" wrap>
              <al-chip>Design</al-chip>
              <al-chip variant="secondary">Engineering</al-chip>
            </al-layout>
          </al-layout>

          <al-layout slot="footer" direction="row" gap="sm" align="center" justify="end">
            <al-button variant="bare" size="sm">Dismiss</al-button>
            <al-button size="sm">Continue</al-button>
          </al-layout>
        </al-card>
      `,
    )}
  </al-layout>
`;
Default.args = { variant: 'grid', columns: 12, gutter: 'md' };
