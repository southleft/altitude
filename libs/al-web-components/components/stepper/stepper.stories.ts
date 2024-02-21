import { html } from 'lit';
import { spread } from '../../directives/spread';
import './stepper';
import '../stepper-item/stepper-item';
import '../icon/icons/emoji';

export default {
  title: 'Molecules/Stepper',
  component: 'al-stepper',
  tags: [ 'autodocs' ],
  parameters: {
    status: {
      type: 'beta'
    },
    controls: {
      exclude: ['StepperItems']
    }
  },
  argTypes: {
    variant: {
      type: 'radio',
      options: ['default', 'vertical']
    }
  }
};

const Template = (args) => html`
  <al-stepper ${spread(args)}>
    <al-stepper-item ?isComplete=${true}>
      <al-icon-emoji slot="icon"></al-icon-emoji>Label
      <div slot="description">Supporting text</div>
    </al-stepper-item>
    <al-stepper-item ?isActive=${true}>
      <al-icon-emoji slot="icon"></al-icon-emoji>Label
      <div slot="description">Supporting text</div>
    </al-stepper-item>
    <al-stepper-item>
      <al-icon-emoji slot="icon"></al-icon-emoji>Label
      <div slot="description">Supporting text</div>
    </al-stepper-item>
    <al-stepper-item>
      <al-icon-emoji slot="icon"></al-icon-emoji>Label
      <div slot="description">Supporting text</div>
    </al-stepper-item>
  </al-stepper>
`;

export const Default = Template.bind({});
Default.args = {};

export const Vertical = Template.bind({});
Vertical.args = {
  variant: 'vertical'
};
