import { html } from 'lit';
import { spread } from '../../directives/spread';
import './icon';
import './icons/add'; // the deprecated element, for the last story
import { registerIcons } from './registry';
import { plus, caretDown, magnifyingGlass, trash, heart } from './glyphs';

// Explicit registration — the recommended production pattern. Tree-shakeable,
// synchronous, SSR-safe. Only these five glyphs are pulled into the story bundle.
registerIcons({ plus, 'caret-down': caretDown, 'magnifying-glass': magnifyingGlass, trash, heart });

export default {
  title: 'Atoms/Icon',
  component: 'al-icon',
  tags: ['autodocs'],
  parameters: { status: { type: 'beta' } },
  argTypes: {
    name: {
      control: 'select',
      options: ['plus', 'caret-down', 'magnifying-glass', 'trash', 'heart'],
      description: 'Phosphor glyph name. All 1,512 are available — see Foundations/Icons.',
    },
    size: {
      control: 'radio',
      options: ['default', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'],
    },
    iconTitle: {
      control: 'text',
    },
  },
};

const Template = (args) => html` <al-icon ${spread(args)}></al-icon> `;

export const Default = Template.bind({});
Default.args = { name: 'plus' };

export const SizeXs = Template.bind({});
SizeXs.args = { name: 'plus', size: 'xs' };

export const SizeSm = Template.bind({});
SizeSm.args = { name: 'plus', size: 'sm' };

export const SizeMd = Template.bind({});
SizeMd.args = { name: 'plus', size: 'md' };

export const SizeLg = Template.bind({});
SizeLg.args = { name: 'plus', size: 'lg' };

export const SizeXl = Template.bind({});
SizeXl.args = { name: 'plus', size: 'xl' };

export const SizeXxl = Template.bind({});
SizeXxl.args = { name: 'plus', size: 'xxl' };

export const SizeXxxl = Template.bind({});
SizeXxxl.args = { name: 'plus', size: 'xxxl' };

/** `iconTitle` becomes the accessible name and exposes the icon as `role="img"`. */
export const WithAccessibleName = Template.bind({});
WithAccessibleName.args = { name: 'magnifying-glass', size: 'lg', iconTitle: 'Search' };

/** The deprecated per-glyph elements still work, and now render Phosphor artwork. */
export const DeprecatedElement = () => html`
  <al-icon-add size="lg"></al-icon-add>
  <p><small>Prefer <code>&lt;al-icon name="plus"&gt;</code>.</small></p>
`;
