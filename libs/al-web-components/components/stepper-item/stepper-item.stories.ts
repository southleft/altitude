import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../field-note/field-note';
import '../icon/icons/emoji';
import './stepper-item';

export default {
  title: 'Atoms/Stepper Item',
  component: 'al-stepper-item',
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
  <al-stepper-item ${spread(args)}>
    <al-icon-emoji slot="icon"></al-icon-emoji>Label
    <div slot="description">Supporting text</div>
  </al-stepper-item>
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
