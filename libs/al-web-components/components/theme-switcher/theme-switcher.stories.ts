import { html } from 'lit';
import { spread } from '../../directives/spread';
import './theme-switcher';

export default {
  title: 'Components/Theme-Switcher',
  component: 'al-theme-switcher',
  parameters: { status: { type: 'beta' }, layout: 'centered' },
  tags: [ 'autodocs' ],
};

const Template = (args) => html`<al-theme-switcher ${spread(args)} data-testid="theme-switcher">Hello world</al-theme-switcher>`;

export const Default = Template.bind({});
Default.args = {};