import {html} from 'lit';
import { spread } from '../../../directives/spread';
import './dashboard';

export default {
  title: 'Templates/Dashboard',
  component: 'al-dashboard',
  parameters: {
    status: { type: 'beta' },
    layout: 'fullscreen'
  },
  tags: [ 'autodocs' ]
};

const Template = (args) => html`<al-dashboard ${spread(args)} data-testid="dashboard"></al-dashboard>`;

export const Default = Template.bind({});
Default.args = {};