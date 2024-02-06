import {html} from 'lit';
import { spread } from '../../../directives/spread';
import './home';

export default {
  title: 'Pages/Home',
  component: 'sl-home',
  parameters: {
    status: { type: 'beta' },
    layout: 'fullscreen'
  },
  tags: [ 'autodocs' ]
};

const Template = (args) => html`<sl-home ${spread(args)} data-testid="home-page"></sl-home>`;

export const Default = Template.bind({});
Default.args = {};