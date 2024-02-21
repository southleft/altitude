import { expect, userEvent, within, waitFor } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../button/button';
import '../alert/alert';
import '../icon/icons/success';
import './toast';

export default {
  title: 'Atoms/Toast',
  component: 'al-toast',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onToastClose']
    }
  },
  decorators: [ withActions ],
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['default', 'info', 'success', 'warning', 'danger'],
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
    autoClose: {
      control: 'boolean'
    },
    autoCloseDelay: {
      control: 'number'
    },
    showProgress: {
      control: 'boolean',
    },
  },
  args: {
    isActive: true,
    description: 'A description should go here'
  },
};

const Template = (args) => html`<al-toast data-testid="toast" ${spread(args)}>Toast title</al-toast>`;

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

export const WithoutDescription = Template.bind({});
WithoutDescription.args = {
  description: false
};

const TemplateWithActions = (args) => html`
  <al-toast ${spread(args)} data-testid="toast">
    Toast title
    <al-button slot="actions" variant="secondary"><al-icon-success slot="before"></al-icon-success>Label</al-button>
    <al-button slot="actions"><al-icon-success slot="before"></al-icon-success>Label</al-button>
  </al-toast>
`;

export const WithActions = TemplateWithActions.bind({});
WithActions.args = {};

export const WithDismissible = TemplateWithActions.bind({});
WithDismissible.args = {
  isDismissible: true,
};

export const WithAutoClose = Default.bind({});
WithAutoClose.args = {
  autoClose: true
};

export const WithAutoCloseWithProgress = TemplateWithActions.bind({});
WithAutoCloseWithProgress.args = {
  ...WithAutoClose.args,
  autoClose: true,
  showProgress: true,
  variant: 'info'
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

WithDismissible.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const toast = canvas.queryByTestId('toast') as any;
  const toastCloseButton = toast.shadowRoot?.querySelector('.al-c-toast__close-button').shadowRoot.querySelector('.al-c-button') as HTMLButtonElement;

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

WithAutoClose.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const toast = canvas.queryByTestId('toast') as any;
  const toastEl = toast.shadowRoot.querySelector('.al-c-toast');
  expect(toast.isActive).toBe(true);
  await userEvent.hover(toastEl);
  await userEvent.unhover(toastEl);

  // Wait for a duration that should be longer than the expected autoClose delay
  await waitFor(() => expect(toast.isActive).toBe(false), {
    timeout: 6000, // A long timeout to make sure it doesn't close
  });
};
