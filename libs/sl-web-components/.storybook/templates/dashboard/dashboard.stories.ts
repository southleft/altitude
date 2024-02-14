import {html} from 'lit';
import { spread } from '../../../directives/spread';
import './dashboard';

export default {
  title: 'Templates/Dashboard',
  component: 'sl-dashboard',
  parameters: {
    status: { type: 'beta' },
    layout: 'fullscreen'
  },
  tags: [ 'autodocs' ]
};

const Template = (args) => html`<sl-dashboard ${spread(args)} data-testid="dashboard"></sl-dashboard>`;

export const Default = Template.bind({});
Default.args = {};