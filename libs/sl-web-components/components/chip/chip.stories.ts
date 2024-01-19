import { expect } from '@storybook/jest';
import { userEvent, within } from '@storybook/testing-library';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import './chip';

export default {
  title: 'Components/Chip',
  component: 'sl-chip',
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['click', 'close']
    }
  },
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['default', 'secondary', 'tertiary', 'success', 'red', 'info', 'warning'],
    },
    type: {
      control: { type: 'radio' },
      options: ['default', 'squared'],
    },
    isDismissible: {
      control: 'boolean',
    },
  },
};

const Template = (args) => html`<sl-chip ${spread(args)}>Label</sl-chip>`;

export const Default = Template.bind({});
Default.args = {};

export const Secondary = Template.bind({});
Secondary.args = {
  variant: 'secondary'
};

export const Tertiary = Template.bind({});
Tertiary.args = {
  variant: 'tertiary'
};

export const Success = Template.bind({});
Success.args = {
  variant: 'success'
};

export const Danger = Template.bind({});
Danger.args = {
  variant: 'danger'
};

export const Info = Template.bind({});
Info.args = {
  variant: 'info'
};

export const Warning = Template.bind({});
Warning.args = {
  variant: 'warning'
};

const TemplateIcon = (args) => html`<sl-chip ${spread(args)} data-testid="chip"><sl-icon-emoji></sl-icon-emoji>Label</sl-chip>`;

export const WithIcon = TemplateIcon.bind({});
WithIcon.args = {};

export const WithIconDismissible = TemplateIcon.bind({});
WithIconDismissible.args = {
  isDismissible: true
};

export const WithDismissible = Template.bind({});
WithDismissible.args = {
  isDismissible: true
};

export const Squared = Template.bind({});
Squared.args = {
  type: 'squared'
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

WithIconDismissible.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const chip = canvas.queryByTestId('chip') as any;
  const chipClose = chip?.shadowRoot?.querySelector('.sl-c-chip__close') as HTMLElement;

  // Make assertions
  expect(chip).toBeInTheDocument();
  expect(chipClose).toBeInTheDocument();

  // Simulate a click event
  await userEvent.click(chipClose);
  expect(chip.isDismissed).toBe(true);

  // Set the chip to active
  chip.isDismissed = false;

  // Simulate a keyboard event (pressing Escape key)
  await userEvent.type(chip, '{escape}');
  expect(chip.isDismissed).toBe(true);

  // Set the chip to active
  chip.isDismissed = false;

  // Simulate a keyboard event (pressing Enter key) and remove the focus
  await userEvent.type(chip, '{enter}');
  expect(chip.isDismissed).toBe(false);;
  chip.blur();
};