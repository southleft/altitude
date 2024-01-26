import { html } from 'lit';
import { spread } from '../../directives/spread';
import './button-group';

export default {
  title: 'Components/Button Group',
  component: 'sl-button-group',
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
  <sl-button-group ${spread(args)} data-testid="button-group">
    <sl-button variant="secondary">Button</sl-button>
    <sl-button>Button</sl-button>
  </sl-button-group>
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