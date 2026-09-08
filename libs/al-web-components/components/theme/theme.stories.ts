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
 * `al-theme` is the scoped axis host. It resolves `mode`, `density`,
 * `contrast`, `motion` and `shape` onto `:host` rather than `:root`, which is
 * what lets two subtrees of one document sit at different settings — see
 * `pnpm test:scoped-theming`.
 *
 * It carries no palette. A design system's LOOK is the token bundle the page
 * loads (`@southleft/al-web-components/project/<id>.css`), one file per system,
 * and this element mirrors `mode` onto the host as `data-al-mode` so that
 * bundle's blocks can match. There is no `brand` attribute: this fixture
 * renders Altitude because it loaded Altitude's tokens.
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
Default.args = { mode: 'light' };

/**
 * Two modes, one document, one `:root`. Neither host leaks into the other —
 * this is the property the scoped-theming test pins.
 */
export const TwoThemesOneDocument = () => html`
  <al-layout variant="grid" .columns=${2} gutter="md">
    <al-theme mode="light">${Panel()}</al-theme>
    <al-theme mode="dark">${Panel()}</al-theme>
  </al-layout>
`;

/**
 * A second design system is a second STYLESHEET, not a second attribute value.
 * Its bundle is `:root, [data-al-project='<id>']`, so loading two of them in
 * one document means scoping each subtree with `data-al-project` — the page
 * below loads Altitude's only, which is why this story shows one system rather
 * than pretending to show two. `pnpm test:brands` and `pnpm run brands:compare`
 * load both, properly scoped, and are where cross-system identity is proven.
 */
export const Brands = () => html`
  <al-theme mode="light" data-al-project="altitude">${Panel()}</al-theme>
`;
