import {html} from 'lit';
import { spread } from '../../../directives/spread';
import './home';

export default {
  title: 'Pages/Home',
  component: 'al-home',
  parameters: {
    status: { type: 'beta' },
    layout: 'fullscreen'
  },
  tags: [ 'autodocs' ]
};

const Template = (args) => html`<al-home ${spread(args)} data-testid="home-page"></al-home>`;

export const Default = Template.bind({});
Default.args = {};