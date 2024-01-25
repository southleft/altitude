import { html } from 'lit';
import { spread } from '../../directives/spread';
import './slider';

export default {
  title: 'Components/Slider',
  component: 'sl-slider',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'padded',
    actions: {
      handles: ['slide', 'outputValueChange']
    }
  },
  args: {
    label: 'Label',
    fieldNote: 'This is a field note.'
  }
};

const Template = (args) => html`<sl-slider ${spread(args)} data-testid="slider"></sl-slider>`;

export const Default = Template.bind({});
Default.args = {};

export const Error = Template.bind({});
Error.args = {
  isError: true,
  errorNote: 'This is an error note.',
};

export const Disabled = Template.bind({});
Disabled.args = {
  isDisabled: true
};

export const HiddenLabel = Template.bind({});
HiddenLabel.args = {
  hideLabel: true
};

export const WithTooltip = Template.bind({});
WithTooltip.args = {
  hasTooltip: true
};

export const WithOutput = Template.bind({});
WithOutput.args = {
  hasOutput: true
};

export const WithStep = Template.bind({});
WithStep.args = {
  step: '10'
};

export const Range = Template.bind({});
Range.args = {
  behavior: 'range'
};

export const RangeWithOutput = Template.bind({});
RangeWithOutput.args = {
  behavior: 'range',
  hasOutput: true
};