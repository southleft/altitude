import { html } from 'lit';
import { spread } from '../../directives/spread';
import './time-selector-list';

export default {
  title: 'Atoms/Form/Time Selector List',
  component: 'al-time-selector-list',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onTimeSelectorListChange']
    }
  },
};

const Template = (args) => html`<al-time-selector-list ${spread(args)} data-testid="time-selector-list">Hello world</al-time-selector-list>`;

export const Default = Template.bind({});
Default.args = {};

export const Horizontal = Template.bind({});
Horizontal.args = {
  direction: 'row'
};