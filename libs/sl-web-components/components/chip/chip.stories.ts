import { expect, userEvent, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import './chip';
import '../icon/icons/emoji';

export default {
  title: 'Atoms/Chip',
  component: 'sl-chip',
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
      options: ['default', 'info', 'success', 'warning', 'danger'],
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
  chip.isDismissed = true;

  // Simulate a keyboard event (pressing Escape key)
  await userEvent.type(chip, '{Escape}');
  expect(chip.isDismissed).toBe(true);

  // Set the chip to active
  chip.isDismissed = false;
  chip.blur();
};

