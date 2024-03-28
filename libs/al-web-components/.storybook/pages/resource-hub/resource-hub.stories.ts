import {html} from 'lit';
import { spread } from '../../../directives/spread';
import './resource-hub';

export default {
  title: 'Pages/Resource Hub',
  component: 'al-resource-hub',
  parameters: {
    status: { type: 'beta' },
    layout: 'fullscreen'
  },
  tags: [ 'autodocs' ]
};

const Template = (args) => html`<al-resource-hub ${spread(args)} data-testid="resource-hub">Hello world</al-resource-hub>`;

export const Default = Template.bind({});
Default.args = {};