import { expect } from '@storybook/jest';
import { userEvent, within, waitFor } from '@storybook/testing-library';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../field-note/field-note';
import '../icon/icons/help';
import '../icon/icons/warning-circle';
import '../radio-item/radio-item';
import './radio';

export default {
  title: 'Components/Radio',
  component: 'sl-radio',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onRadioChange']
    }
  },
  decorators: [withActions],
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
    label: 'Radio legend label',
    fieldNote: 'This is a field note.'
  }
};

const Template = (args) => html`
  <sl-radio ${spread(args)} data-testid="radio">
    <sl-radio-item data-testid="radio-item-1" name="radio-name" value="radio-value-1">Radio item 1</sl-radio-item>
    <sl-radio-item data-testid="radio-item-2" name="radio-name" value="radio-value-2">Radio item 2</sl-radio-item>
    <sl-radio-item data-testid="radio-item-3" name="radio-name" value="radio-value-3">Radio item 3</sl-radio-item>
    <sl-radio-item data-testid="radio-item-4" name="radio-name" value="radio-value-4" ?isDisabled=${true}>Radio item 4</sl-radio-item>
  </sl-radio>`;

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
  html` <sl-radio ${spread(args)}>
    <sl-radio-item name="radio-name" value="radio-value-1">Radio item 1</sl-radio-item>
    <sl-radio-item name="radio-name" value="radio-value-2">Radio item 2</sl-radio-item>
    <sl-radio-item name="radio-name" value="radio-value-3">Radio item 3</sl-radio-item>
    <sl-radio-item name="radio-name" value="radio-value-4" ?isDisabled=${true}>Radio item 4</sl-radio-item>
    <sl-field-note slot="field-note"><sl-icon-help></sl-icon-help>This is a field note.</sl-field-note>
  </sl-radio>`;

export const SlottedFieldNote = TemplateSlottedFieldNote.bind({});
SlottedFieldNote.args = {};

const TemplateSlottedErrorNote = (args) =>
  html` <sl-radio ${spread(args)}>
    <sl-radio-item name="radio-name" value="radio-value-1">Radio item 1</sl-radio-item>
    <sl-radio-item name="radio-name" value="radio-value-2">Radio item 2</sl-radio-item>
    <sl-radio-item name="radio-name" value="radio-value-3">Radio item 3</sl-radio-item>
    <sl-radio-item name="radio-name" value="radio-value-4" ?isDisabled=${true}>Radio item 4</sl-radio-item>
    <sl-field-note slot="error"><sl-icon-warning-circle></sl-icon-warning-circle>This is an error note.</sl-field-note>
  </sl-radio>`;

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
  const radio = canvas.getByTestId('radio') as any;
  const radioItems = canvas.queryAllByTestId(/^radio-item-/) as any;
  const radioItemInput1 = radioItems[0]?.shadowRoot?.querySelector('input') as HTMLInputElement;
  const radioItemInput2 = radioItems[1]?.shadowRoot?.querySelector('input') as HTMLInputElement;
  const radioItemInput3 = radioItems[2]?.shadowRoot?.querySelector('input') as HTMLInputElement;
  const radioItemInput4 = radioItems[3]?.shadowRoot?.querySelector('input') as HTMLInputElement;

  // Make assertions
  expect(radio).toBeInTheDocument();
  expect(radioItems).toHaveLength(4);

  await userEvent.click(radioItemInput3);
  // await userEvent.keyboard('[ArrowUp]');
  // await userEvent.keyboard('[ArrowDown]');
  // await userEvent.keyboard('[ArrowDown]');
  // await waitFor(() => expect(radioItemInput1.checked).toBe(true), {
  //   timeout: 6000
  // });
};

