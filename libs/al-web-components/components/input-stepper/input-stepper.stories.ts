import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../icon/icons/help';
import '../icon/icons/warning-circle';
import './input-stepper';

export default {
  title: 'Molecules/Input Stepper',
  component: 'al-input-stepper',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onInputStepperChange']
    }
  },
  decorators: [ withActions ],
  args: {
    count: '1',
    min: '0',
    max: '5',
    label: 'Label',
    fieldNote: 'This is a field note.',
    name: 'Input Stepper',
  }
};

const Template = (args) => html`<al-input-stepper ${spread(args)} data-testid="input-stepper"></al-input-stepper>`;

export const Default = Template.bind({});
Default.args = {};

export const Error = Template.bind({});
Error.args = {
  isError: true,
  errorNote: 'This is an error note.',
};

export const Disabled = Template.bind({});
Disabled.args = {
  isDisabled: true,
};

export const HiddenLabel = Template.bind({});
HiddenLabel.args = {
  hideLabel: true,
};

const TemplateSlottedFieldNote = (args) => html`
  <al-input-stepper ${spread(args)}>
    <al-field-note slot="field-note"><al-icon-help></al-icon-help>This is a field note.</al-field-note>
  </al-input-stepper>`;

export const SlottedFieldNote = TemplateSlottedFieldNote.bind({});
SlottedFieldNote.args = {
};

const TemplateSlottedErrorNote = (args) => html`
  <al-input-stepper ${spread(args)}>
    <al-field-note slot="error"><al-icon-warning-circle></al-icon-warning-circle>This is an error note.</al-field-note>
  </al-input-stepper>`;

export const SlottedErrorNote = TemplateSlottedErrorNote.bind({});
SlottedErrorNote.args = {
  isError: true,
  fieldNote: false,
};
