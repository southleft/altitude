import type { StoryObj } from '@storybook/react-vite';
import React from 'react';
import { ALLayout, ALCard, ALHeading } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

/**
 * Layout is the single arrangement primitive. Rather than a story per
 * permutation, there is one story per **variant**, each driven by the controls
 * panel — every prop below is live, so a variant can be explored without
 * hunting for a matching story.
 *
 * Kept deliberately in sync with the web-component Layout stories.
 */
export default {
  title: 'Organisms/Layout',
  component: ALLayout,
  parameters: { status: { type: 'beta' } },
  argTypes: {
    variant: {
      control: 'radio',
      options: ['default', 'constrained', 'grid', 'bento'],
      description:
        'default = flow (stack/row). constrained = page measure with breakout. grid = N columns. bento = 12-col auto-row.',
    },
    direction: { control: 'radio', options: ['column', 'row'] },
    gap: {
      control: 'radio',
      options: ['default', 'none', 'xs', 'sm', 'md', 'lg', 'xl'],
    },
    align: {
      control: 'radio',
      options: ['default', 'start', 'center', 'end', 'stretch'],
    },
    justify: {
      control: 'radio',
      options: ['default', 'start', 'center', 'end', 'between'],
    },
    size: {
      control: 'radio',
      options: ['default', 'sm', 'md', 'lg', 'xl', 'xxl', 'full'],
      description: 'constrained only — the content column measure',
    },
    gutter: {
      control: 'radio',
      options: ['default', 'none', 'sm', 'md', 'lg'],
      description: 'constrained only — the gutter track width',
    },
    columns: {
      control: { type: 'number', min: 1, max: 12 },
      description: 'grid only — column count',
    },
    noCollapse: {
      control: 'boolean',
      description: 'grid only — keep columns at every width',
    },
    wrap: { control: 'boolean' },
    grow: { control: 'boolean' },
    stretchItems: { control: 'boolean' },
    responsive: { control: 'boolean' },
    fullHeight: { control: 'boolean' },
  },
};

/**
 * **Flow** — the default. A column, or a row with `direction="row"`.
 *
 * A row of buttons is `<ALLayout direction="row" justify="end" grow>`.
 */
export const Flow: StoryObj<typeof ALLayout> = {
  args: {
    children: (
      <>
        <Fpo>One</Fpo>
        <Fpo>Two</Fpo>
        <Fpo>Three</Fpo>
      </>
    ),
  },
};

/**
 * **Constrained** — the page measure. Children sit in a centred content column
 * capped at `size`, with gutter tracks either side. A child marked `bleed`
 * breaks out and runs edge-to-edge, which is what removes the need for a
 * container wrapper around every section.
 *
 * A section needs no container wrapper of its own.
 */
export const Constrained: StoryObj<typeof ALLayout> = {
  parameters: { layout: 'fullscreen' },
  args: {
    variant: 'default',

    children: (
      <>
        <Fpo>Inside the measure</Fpo>
        <div {...{ bleed: '' }}>
          <Fpo>bleed — breaks out edge to edge</Fpo>
        </div>
        <Fpo>Back inside the measure</Fpo>
      </>
    ),

    direction: 'column',
  },
};

/**
 * **Grid** — an N-column grid. Children span with the SAME
 * `al-u-grid__item col:N` classes the `.al-u-grid` utility uses, so the design
 * system has only one span system.
 *
 * A theme can override the track list entirely with `--al-layout-template`
 * (paired with `noCollapse`) — that is how a fixed-width sidebar shell is
 * built.
 */
export const Grid: StoryObj<typeof ALLayout> = {
  args: {
    variant: 'grid',
    columns: 12,
    children: (
      <>
        <Fpo styleModifier="al-u-grid__item col:6">col:6</Fpo>
        <Fpo styleModifier="al-u-grid__item col:6">col:6</Fpo>
        <Fpo styleModifier="al-u-grid__item col:4">col:4</Fpo>
        <Fpo styleModifier="al-u-grid__item col:8">col:8</Fpo>
      </>
    ),
  },
};

/**
 * **Bento** — the asymmetric feature grid.
 *
 * A tile is just an `<ALCard>` (or any component) carrying the SHARED
 * `al-u-grid__item col:N` classes. `col:12 col:8@md` means full-width on small
 * screens, eight columns at `md` and up —
 * the items own the responsive story, so the container does not force a
 * collapse.
 */
export const Bento: StoryObj<typeof ALLayout> = {
  args: {
    variant: 'bento',
    children: (
      <>
        <ALCard className="al-u-grid__item col:12 col:8@md">
          <ALHeading tagName="h3" variant="sm">
            col:8@md
          </ALHeading>
        </ALCard>
        <ALCard className="al-u-grid__item col:12 col:4@md">
          <ALHeading tagName="h3" variant="sm">
            col:4@md
          </ALHeading>
        </ALCard>
        <ALCard className="al-u-grid__item col:12 col:4@md">
          <ALHeading tagName="h3" variant="sm">
            col:4@md
          </ALHeading>
        </ALCard>
        <ALCard className="al-u-grid__item col:12 col:8@md">
          <ALHeading tagName="h3" variant="sm">
            col:8@md
          </ALHeading>
        </ALCard>
      </>
    ),
  },
};
