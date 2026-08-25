import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../field-note/field-note';
import '../icon/icons/help';
import '../icon/icons/warning-circle';
import '../radio/radio';
import './radio-group';
import '../layout/layout';

export default {
  title: 'Molecules/Form/Radio Group',
  component: 'al-radio-group',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onRadioGroupChange']
    }
  },
  argTypes: {
    isError: {
      control: 'boolean'
    },
    isDisabled: {
      control: 'boolean'
    },
    isRequired: {
      control: 'boolean'
    },
    hideLegend: {
      control: 'boolean'
    },
    label: {
      control: 'text'
    },
    errorNote: {
      control: 'text'
    },
    fieldNote: {
      control: 'text'
    },
    fieldId: {
      control: 'text'
    },
    ariaDescribedBy: {
      control: 'text'
    },
    onRadioChange: {
      control: 'text'
    }
  },
  args: {
    label: 'Radio group legend label',
    fieldNote: 'This is a field note.'
  }
};

const Template = (args) => html`
  <al-radio-group ${spread(args)} data-testid="radio-group">
    <al-radio data-testid="radio-1" name="radio-name" value="radio-value-1">Radio 1</al-radio>
    <al-radio data-testid="radio-2" name="radio-name" value="radio-value-2">Radio 2</al-radio>
    <al-radio data-testid="radio-3" name="radio-name" value="radio-value-3">Radio 3</al-radio>
    <al-radio data-testid="radio-4" name="radio-name" value="radio-value-4" ?isDisabled=${true}>Radio 4</al-radio>
  </al-radio-group>`;

export const Default = Template.bind({});
Default.args = {};

export const Error = Template.bind({});
Error.args = {
  isError: true,
  isRequired: true,
  fieldNote: false,
  errorNote: 'This is an error note.'
};

export const Disabled = Template.bind({});
Disabled.args = {
  isDisabled: true
};

export const HiddenLegend = Template.bind({});
HiddenLegend.args = {
  hideLegend: true
};

/**
 * Arrangement belongs to `<al-layout>`. Nest the items in an
 * `<al-layout direction="row" wrap>`; the group owns only the fieldset
 * semantics, the field note, and the required/disabled cascade.
 */
const TemplateHorizontal = (args) =>
  html` <al-radio-group ${spread(args)}>
    <al-layout direction="row" wrap gap="md">
      <al-radio name="radio-name" value="radio-value-1">Radio 1</al-radio>
      <al-radio name="radio-name" value="radio-value-2">Radio 2</al-radio>
      <al-radio name="radio-name" value="radio-value-3">Radio 3</al-radio>
    </al-layout>
  </al-radio-group>`;

export const Horizontal = TemplateHorizontal.bind({});
Horizontal.args = {};

const TemplateSlottedFieldNote = (args) =>
  html` <al-radio-group ${spread(args)}>
    <al-radio name="radio-name" value="radio-value-1">Radio 1</al-radio>
    <al-radio name="radio-name" value="radio-value-2">Radio 2</al-radio>
    <al-radio name="radio-name" value="radio-value-3">Radio 3</al-radio>
    <al-radio name="radio-name" value="radio-value-4" ?isDisabled=${true}>Radio 4</al-radio>
    <al-field-note slot="field-note"><al-icon-help></al-icon-help>This is a field note.</al-field-note>
  </al-radio-group>`;

export const SlottedFieldNote = TemplateSlottedFieldNote.bind({});
SlottedFieldNote.args = {};

const TemplateSlottedErrorNote = (args) =>
  html` <al-radio-group ${spread(args)}>
    <al-radio name="radio-name" value="radio-value-1">Radio 1</al-radio>
    <al-radio name="radio-name" value="radio-value-2">Radio 2</al-radio>
    <al-radio name="radio-name" value="radio-value-3">Radio 3</al-radio>
    <al-radio name="radio-name" value="radio-value-4" ?isDisabled=${true}>Radio 4</al-radio>
    <al-field-note slot="error"><al-icon-warning-circle></al-icon-warning-circle>This is an error note.</al-field-note>
  </al-radio-group>`;

export const SlottedErrorNote = TemplateSlottedErrorNote.bind({});
SlottedErrorNote.args = {
  isError: true,
  isRequired: true,
  fieldNote: false
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

