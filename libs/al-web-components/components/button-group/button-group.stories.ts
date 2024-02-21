import { html } from 'lit';
import { spread } from '../../directives/spread';
import './button-group';

export default {
  title: 'Molecules/Button Group',
  component: 'al-button-group',
  tags: [ 'autodocs' ],
  parameters: { status: { type: 'beta' } },
  argTypes: {
    behavior: {
      type: 'radio',
      options: ['default', 'stacked', 'stretched', 'responsive']
    },
    alignment: {
      type: 'radio',
      options: ['default', 'center', 'right']
    },
  },
};

const Template = (args) => html`
  <al-button-group ${spread(args)} data-testid="button-group">
    <al-button variant="secondary">Button</al-button>
    <al-button>Button</al-button>
  </al-button-group>
`;

export const Default = Template.bind({});
Default.args = {};

export const AlignmentCenter = Template.bind({});
AlignmentCenter.args = {
  alignment: 'center',
};

export const AlignmentRight = Template.bind({});
AlignmentRight.args = {
  alignment: 'right',
};

export const BehaviorStacked = Template.bind({});
BehaviorStacked.args = {
  behavior: 'stacked'
};

export const BehaviorStretched = Template.bind({});
BehaviorStretched.args = {
  behavior: 'stretched'
};

export const BehaviorResponsive = Template.bind({});
BehaviorResponsive.args = {
  behavior: 'responsive'
};