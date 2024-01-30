import { expect } from '@storybook/jest';
import { userEvent, within } from '@storybook/testing-library';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../button/button';
import '../icon/icons/done';
import './toast';

export default {
  title: 'Atoms/Toast',
  component: 'sl-toast',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onToastClose']
    },
    controls: {
      exclude: ['idx']
    }
  },
  decorators: [withActions],
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['default', 'success', 'warning', 'danger'],
    },
    description: {
      control: 'text'
    },
    isActive: {
      control: 'boolean',
    },
    isDismissible: {
      control: 'boolean',
    },
  },
  args: {
    isActive: true,
    description: 'A description should go here'
  },
};

const Template = (args) => html`<sl-toast data-testid="toast" ${spread(args)}>Toast title</sl-toast>`;

export const Default = Template.bind({});
Default.args = {};

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

export const WithoutDescription = Template.bind({});
WithoutDescription.args = {
  description: false
};

const TemplateWithActions = (args) => html`
  <sl-toast ${spread(args)} data-testid="toast">
    Toast title
    <sl-button slot="actions" variant="secondary"><sl-icon-done slot="before"></sl-icon-done>Label</sl-button>
    <sl-button slot="actions"><sl-icon-done slot="before"></sl-icon-done>Label</sl-button>
  </sl-toast>
`;

export const WithActions = TemplateWithActions.bind({});
WithActions.args = {};

export const WithDismissible = TemplateWithActions.bind({});
WithDismissible.args = {
  isDismissible: true,
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

WithDismissible.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const toast = canvas.queryByTestId('toast') as any;
  const toastCloseButton = toast.shadowRoot?.querySelector('.sl-c-toast__close-button').shadowRoot.querySelector('.sl-c-button') as HTMLButtonElement;

  // Make assertions
  expect(toast).toBeInTheDocument();
  expect(toastCloseButton).toBeInTheDocument();
  expect(toast.isDismissible).toBe(true);

  // Focus on the close button and simulate a keyboard event (pressing Escape key)
  toastCloseButton.focus();
  await userEvent.type(toastCloseButton, '{Escape}');

  // Check to make sure the toast is no longer active
  expect(toast.isActive).toBe(false);

  // Remove focus from button and reset the toast
  toastCloseButton.blur();
  toast.isActive = true;
};
