import { expect, userEvent, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import './switch';

export default {
  title: 'Atoms/Switch',
  component: 'sl-switch',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onSwitchChange']
    }
  },
  decorators: [withActions],
  argTypes: {
    label: {
      control: 'text'
    },
    name: {
      control: 'text'
    },
    isChecked: {
      control: 'boolean'
    },
    isDisabled: {
      control: 'boolean'
    },
    fieldId: {
      control: 'text'
    }
  },
  args: {
    label: 'Switch label',
    name: 'Switch name'
  },
};

const Template = (args) => html`<sl-switch data-testid="sl-switch" ${spread(args)}></sl-switch> `;

export const Default = Template.bind({});
Default.args = {};

export const Checked = Template.bind({});
Checked.args = {
  isChecked: true
};

export const Disabled = Template.bind({});
Disabled.args = {
  isDisabled: true
};

export const DisabledChecked = Template.bind({});
DisabledChecked.args = {
  isDisabled: true,
  isChecked: true
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

Default.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const switchComponent = canvas.queryByTestId('sl-switch');
  const checkbox = switchComponent?.shadowRoot?.querySelector('input') as HTMLInputElement;

  // Make assertions
  expect(switchComponent).toBeInTheDocument();
  expect(checkbox).toBeInTheDocument();

  // Simulate a keyboard event (pressing Enter key)
  await userEvent.type(checkbox, '{Enter}');

  // Validate that the checkbox is checked
  expect(checkbox.checked).toBe(true);

  // Remove the focus after all tests have been run
  checkbox.blur();
}
