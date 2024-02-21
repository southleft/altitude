import { expect, userEvent, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import './chip';
import '../icon/icons/warning-triangle';

export default {
  title: 'Atoms/Chip',
  component: 'al-chip',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['click', 'onChipClose']
    }
  },
  decorators: [ withActions ],
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['default', 'secondary', 'info', 'success', 'warning', 'danger'],
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

const Template = (args) => html`<al-chip ${spread(args)}>Label</al-chip>`;

export const Default = Template.bind({});
Default.args = {};

export const Secondary = Template.bind({});
Secondary.args = {
  variant: 'secondary'
};

export const Info = Template.bind({});
Info.args = {
  variant: 'info'
};

export const Success = Template.bind({});
Success.args = {
  variant: 'success'
};

export const Warning = Template.bind({});
Warning.args = {
  variant: 'warning'
};

export const Danger = Template.bind({});
Danger.args = {
  variant: 'danger'
};

const TemplateIcon = (args) => html`<al-chip ${spread(args)} data-testid="chip"><al-icon-warning-triangle></al-icon-warning-triangle>Label</al-chip>`;

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
  const chipClose = chip?.shadowRoot?.querySelector('.al-c-chip__close') as HTMLElement;

  // Make assertions
  expect(chip).toBeInTheDocument();
  expect(chipClose).toBeInTheDocument();

  // Simulate a click event
  await userEvent.click(chipClose);
  expect(chip.isDismissed).toBe(true);

  // Set the chip to active
  chip.isDismissed = true;

  // Simulate a keyboard event (pressing Escape key)
  await userEvent.type(chip, '{Escape}');
  expect(chip.isDismissed).toBe(true);

  // Set the chip to active
  chip.isDismissed = false;
  chip.blur();
};

