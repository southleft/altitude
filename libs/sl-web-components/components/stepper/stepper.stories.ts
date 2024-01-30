import { html } from 'lit';
import { spread } from '../../directives/spread';
import './stepper';
import '../stepper-item/stepper-item';
import '../icon/icons/emoji';

export default {
  title: 'Components/Stepper',
  component: 'sl-stepper',
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
  <sl-stepper ${spread(args)}>
    <sl-stepper-item ?isComplete=${true}>
      <sl-icon-emoji slot="icon"></sl-icon-emoji>Label
      <div slot="description">Supporting text</div>
    </sl-stepper-item>
    <sl-stepper-item ?isActive=${true}>
      <sl-icon-emoji slot="icon"></sl-icon-emoji>Label
      <div slot="description">Supporting text</div>
    </sl-stepper-item>
    <sl-stepper-item>
      <sl-icon-emoji slot="icon"></sl-icon-emoji>Label
      <div slot="description">Supporting text</div>
    </sl-stepper-item>
    <sl-stepper-item>
      <sl-icon-emoji slot="icon"></sl-icon-emoji>Label
      <div slot="description">Supporting text</div>
    </sl-stepper-item>
  </sl-stepper>
`;

export const Default = Template.bind({});
Default.args = {};

export const Vertical = Template.bind({});
Vertical.args = {
  variant: 'vertical'
};
