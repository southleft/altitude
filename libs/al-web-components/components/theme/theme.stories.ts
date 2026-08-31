import { html } from 'lit';
import { spread } from '../../directives/spread';
import './theme';
import '../button/button';
import '../badge/badge';
import '../card/card';
import '../heading/heading';
import '../layout/layout';
import '../text-block/text-block';

/**
 * `al-theme` is the scoped theming host. It resolves tokens onto `:host`
 * rather than `:root`, which is what lets more than one brand or mode coexist
 * in a single document — see `pnpm test:scoped-theming`.
 *
 * It paints nothing itself (`display: contents`); it only decides which token
 * values the components inside it resolve against.
 */
export default {
  title: 'Foundations/Theme',
  component: 'al-theme',
  tags: ['autodocs'],
  parameters: { status: { type: 'stable' } },
  argTypes: {
    brand: { control: 'radio', options: ['altitude', 'southleft'] },
    mode: { control: 'radio', options: ['light', 'dark'] },
    density: { control: 'radio', options: ['compact', 'cozy', 'comfortable'] },
    contrast: { control: 'radio', options: ['normal', 'more'] },
    motion: { control: 'radio', options: ['full', 'reduced', 'expressive'] },
    shape: { control: 'radio', options: ['default', 'sharp', 'pill'] },
  },
};

const Panel = () => html`
  <al-card>
    <al-heading slot="header" tagName="h3" variant="sm" ?isBold=${true}>Flat, minimal, type-first.</al-heading>
    <al-layout direction="column" gap="sm">
      <al-text-block>Same components, one refined blue, shadows reserved for overlays.</al-text-block>
      <al-layout direction="row" gap="sm" wrap>
        <al-badge variant="success">Stable</al-badge>
        <al-badge variant="warning">In review</al-badge>
        <al-badge variant="danger">Redesign</al-badge>
      </al-layout>
    </al-layout>
    <al-layout slot="footer" direction="row" gap="sm" align="center" justify="end">
      <al-button variant="bare" size="sm">Dismiss</al-button>
      <al-button size="sm">Continue</al-button>
    </al-layout>
  </al-card>
`;

export const Default = (args) => html`
  <al-theme ${spread(args)}>${Panel()}</al-theme>
`;
Default.args = { brand: 'altitude', mode: 'light' };

/**
 * Two themes, one document, one `:root`. Neither host leaks into the other —
 * this is the property the scoped-theming test pins.
 */
export const TwoThemesOneDocument = () => html`
  <al-layout variant="grid" .columns=${2} gutter="md">
    <al-theme brand="altitude" mode="light">${Panel()}</al-theme>
    <al-theme brand="altitude" mode="dark">${Panel()}</al-theme>
  </al-layout>
`;

/**
 * A second brand resolves the same components against its own ramps.
 */
export const Brands = () => html`
  <al-layout variant="grid" .columns=${2} gutter="md">
    <al-theme brand="altitude" mode="light">${Panel()}</al-theme>
    <al-theme brand="southleft" mode="light">${Panel()}</al-theme>
  </al-layout>
`;
