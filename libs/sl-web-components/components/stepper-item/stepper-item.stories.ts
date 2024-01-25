import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../field-note/field-note';
import '../icon/icons/emoji';
import './stepper-item';

export default {
  title: 'Components/Stepper Item',
  component: 'sl-stepper-item',
  tags: [ 'autodocs' ],
  parameters: {
    status: {
      type: 'beta'
    },
    layout: 'centered',
    controls: {
      exclude: ['stepNumber']
    }
  },
  argTypes: {
    variant: {
      type: 'radio',
      options: ['default', 'vertical']
    },
    isActive: {
      type: 'boolean'
    },
    isComplete: {
      type: 'boolean'
    },
    isLast: {
      type: 'boolean'
    }
  }
};

const Template = (args) => html`
  <sl-stepper-item ${spread(args)}>
    <sl-icon-emoji slot="icon"></sl-icon-emoji>Label
    <div slot="description">Supporting text</div>
  </sl-stepper-item>
`;

export const Default = Template.bind({});
Default.args = {};

export const Active = Template.bind({});
Active.args = {
  isActive: true
};

export const Completed = Template.bind({});
Completed.args = {
  isComplete: true
};

export const Last = Template.bind({});
Last.args = {
  isLast: true
};

export const Vertical = Template.bind({});
Vertical.args = {
  variant: 'vertical'
};

export const VerticalActive = Template.bind({});
VerticalActive.args = {
  variant: 'vertical',
  isActive: true
};

export const VerticalCompleted = Template.bind({});
VerticalCompleted.args = {
  variant: 'vertical',
  isComplete: true
};

export const VerticalLast = Template.bind({});
VerticalLast.args = {
  variant: 'vertical',
  isLast: true
};
