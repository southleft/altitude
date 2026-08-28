import { html } from 'lit';
import { spread } from '../../directives/spread';
import './banner';
import '../link/link';
import '../icon/icons/warning-circle';

export default {
  title: 'Molecules/Banner',
  component: 'al-banner',
  tags: ['autodocs'],
  parameters: {
    status: { type: 'beta' },
    layout: 'fullscreen',
    actions: { handles: ['onBannerClose'] }
  },
  argTypes: {
    isDismissible: {
      control: 'boolean'
    }
  }
};

const Template = (args) => html`
  <al-banner ${spread(args)}>
    We're rolling out a new theming engine this week — some screens may look slightly different.
    <al-link slot="link" href="#" variant="sm">Learn more</al-link>
  </al-banner>
`;

export const Default = Template.bind({});
Default.args = {};

export const Dismissible = Template.bind({});
Dismissible.args = { isDismissible: true };

/**
 * The banner has no tone `variant`. Retone it by slotting a different glyph
 * and pointing `--al-banner-icon-fill` at another content token — the two
 * knobs, and nothing else, that change a banner's appearance.
 */
export const CustomIcon = () => html`
  <al-banner isDismissible style="--al-banner-icon-fill: var(--al-theme-color-content-danger-default);">
    <al-icon-warning-circle slot="icon"></al-icon-warning-circle>
    Payment failed — update your billing details to avoid an interruption.
    <al-link slot="link" href="#" variant="sm">Update billing</al-link>
  </al-banner>
`;
