import { html } from 'lit';
import { spread } from '../../directives/spread';
import './layout';
import '../card/card';
import '../heading/heading';
import '../../.storybook/components/f-po/f-po';

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
    stretchItems: { control: 'boolean' },
    responsive: { control: 'boolean' },
    fullHeight: { control: 'boolean' }
  }
};

/**
 * **Flow** — the default. A column, or a row with `direction="row"`. Use the
 * controls to explore `direction`, `gap`, `align`, `justify`, `wrap`,
 * `responsive` and `stretchItems`.
 *
 * A row of buttons is `<al-layout direction="row" justify="end" grow>`.
 */
export const Flow = (args) => html`
  <al-layout ${spread(args)}>
    <f-po>One</f-po>
    <f-po>Two</f-po>
    <f-po>Three</f-po>
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
