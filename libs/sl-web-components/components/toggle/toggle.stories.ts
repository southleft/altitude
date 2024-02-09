import { expect, userEvent, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import './toggle';

export default {
  title: 'Atoms/Toggle',
  component: 'sl-toggle',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onToggleChange']
    }
  },
  decorators: [ withActions ],
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
    label: 'Toggle label',
    name: 'Toggle name'
  },
};

const Template = (args) => html`<sl-toggle data-testid="sl-toggle" ${spread(args)}></sl-toggle> `;

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
  const toggleComponent = canvas.queryByTestId('sl-toggle');
  const checkbox = toggleComponent?.shadowRoot?.querySelector('input') as HTMLInputElement;

  // Make assertions
  expect(toggleComponent).toBeInTheDocument();
  expect(checkbox).toBeInTheDocument();

  // Simulate a keyboard event (pressing Enter key)
  await userEvent.type(checkbox, '{Enter}');

  // Validate that the checkbox is checked
  expect(checkbox.checked).toBe(true);

  // Remove the focus after all tests have been run
  checkbox.blur();
}
