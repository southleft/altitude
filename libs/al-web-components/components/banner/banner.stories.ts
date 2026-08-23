import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from 'storybook/actions/decorator';
import './banner';
import '../link/link';

export default {
  title: 'Molecules/Banner',
  component: 'al-banner',
  tags: ['autodocs'],
  parameters: {
    status: { type: 'beta' },
    layout: 'fullscreen',
    actions: { handles: ['onBannerClose'] }
  },
  decorators: [withActions],
  argTypes: {
    variant: {
      control: 'radio',
      options: ['default', 'success', 'warning', 'danger']
    },
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

export const Success = Template.bind({});
Success.args = { variant: 'success' };

export const Warning = Template.bind({});
Warning.args = { variant: 'warning' };

export const Danger = Template.bind({});
Danger.args = { variant: 'danger' };

export const Dismissible = Template.bind({});
Dismissible.args = { isDismissible: true };
