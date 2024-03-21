import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import './theme-switcher';

export default {
  title: 'Components/Theme-Switcher',
  component: 'al-theme-switcher',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onThemeSwitcherChange']
    },
    layout: 'centered'
  },
  decorators: [ withActions ],
};

const Template = (args) => html`<al-theme-switcher ${spread(args)} data-testid="theme-switcher">Hello world</al-theme-switcher>`;

export const Default = Template.bind({});
Default.args = {};