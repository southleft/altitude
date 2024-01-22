import { html } from 'lit';
import { spread } from '../../directives/spread';
import './time-selector-list';

export default {
  title: 'Components/Time Selector List',
  component: 'sl-time-selector-list',
  tags: [  'autodocs' ],
  parameters: { status: { type: 'beta' } },
};

const Template = (args) => html`<sl-time-selector-list ${spread(args)} data-testid="time-selector-list">Hello world</sl-time-selector-list>`;

export const Default = Template.bind({});
Default.args = {};

export const Horizontal = Template.bind({});
Horizontal.args = {
  orientation: 'horizontal'
};