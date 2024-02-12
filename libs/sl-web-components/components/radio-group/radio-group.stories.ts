import { expect, userEvent, within, waitFor } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../field-note/field-note';
import '../icon/icons/help';
import '../icon/icons/warning-circle';
import '../radio/radio';
import './radio-group';

export default {
  title: 'Molecules/Radio Group',
  component: 'sl-radio-group',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onRadioGroupChange']
    }
  },
  decorators: [ withActions ],
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
    variant: {
      control: 'radio',
      options: ['default', 'horizontal']
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
  <sl-radio-group ${spread(args)} data-testid="radio-group">
    <sl-radio data-testid="radio-1" name="radio-name" value="radio-value-1">Radio 1</sl-radio>
    <sl-radio data-testid="radio-2" name="radio-name" value="radio-value-2">Radio 2</sl-radio>
    <sl-radio data-testid="radio-3" name="radio-name" value="radio-value-3">Radio 3</sl-radio>
    <sl-radio data-testid="radio-4" name="radio-name" value="radio-value-4" ?isDisabled=${true}>Radio 4</sl-radio>
  </sl-radio-group>`;

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

export const Horizontal = Template.bind({});
Horizontal.args = {
  variant: 'horizontal'
};

const TemplateSlottedFieldNote = (args) =>
  html` <sl-radio-group ${spread(args)}>
    <sl-radio name="radio-name" value="radio-value-1">Radio 1</sl-radio>
    <sl-radio name="radio-name" value="radio-value-2">Radio 2</sl-radio>
    <sl-radio name="radio-name" value="radio-value-3">Radio 3</sl-radio>
    <sl-radio name="radio-name" value="radio-value-4" ?isDisabled=${true}>Radio 4</sl-radio>
    <sl-field-note slot="field-note"><sl-icon-help></sl-icon-help>This is a field note.</sl-field-note>
  </sl-radio-group>`;

export const SlottedFieldNote = TemplateSlottedFieldNote.bind({});
SlottedFieldNote.args = {};

const TemplateSlottedErrorNote = (args) =>
  html` <sl-radio-group ${spread(args)}>
    <sl-radio name="radio-name" value="radio-value-1">Radio 1</sl-radio>
    <sl-radio name="radio-name" value="radio-value-2">Radio 2</sl-radio>
    <sl-radio name="radio-name" value="radio-value-3">Radio 3</sl-radio>
    <sl-radio name="radio-name" value="radio-value-4" ?isDisabled=${true}>Radio 4</sl-radio>
    <sl-field-note slot="error"><sl-icon-warning-circle></sl-icon-warning-circle>This is an error note.</sl-field-note>
  </sl-radio-group>`;

export const SlottedErrorNote = TemplateSlottedErrorNote.bind({});
SlottedErrorNote.args = {
  isError: true,
  isRequired: true,
  fieldNote: false
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

Default.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const radioGroup = canvas.getByTestId('radio-group') as any;
  const radioItems = canvas.queryAllByTestId(/^radio-/) as any;
  const radioItemInput1 = radioItems[0]?.shadowRoot?.querySelector('input') as HTMLInputElement;
  const radioItemInput2 = radioItems[1]?.shadowRoot?.querySelector('input') as HTMLInputElement;
  const radioItemInput3 = radioItems[2]?.shadowRoot?.querySelector('input') as HTMLInputElement;
  const radioItemInput4 = radioItems[3]?.shadowRoot?.querySelector('input') as HTMLInputElement;

  // Make assertions
  expect(radioGroup).toBeInTheDocument();
  expect(radioItemInput1).toBeInTheDocument();
  expect(radioItemInput2).toBeInTheDocument();
  expect(radioItemInput3).toBeInTheDocument();
  expect(radioItemInput4).toBeInTheDocument();

  await userEvent.click(radioItemInput3);
  // await userEvent.keyboard('[ArrowUp]');
  // await userEvent.keyboard('[ArrowDown]');
  // await userEvent.keyboard('[ArrowDown]');
  // await waitFor(() => expect(radioItemInput1.checked).toBe(true), {
  //   timeout: 6000
  // });
};

