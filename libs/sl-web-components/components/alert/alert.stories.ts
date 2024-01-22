import { expect } from '@storybook/jest';
import { userEvent, waitFor, within } from '@storybook/testing-library';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../button/button';
import '../text-passage/text-passage';
import './alert';

export default {
  title: 'Components/Alert',
  component: 'sl-alert',
  tags: [  'autodocs' ],
  parameters: {
    status: 'beta',
    actions: {
      handles: ['click', 'keydown', 'close', 'expanded']
    },
    controls: {
      exclude: ['hasPanel', 'ariaControls', 'ariaLabelledBy']
    }
  },
  argTypes: {
    variant: {
      options: ['default', 'success', 'warning', 'danger'],
      control: { type: 'radio' }
    },
    isActive: {
      control: 'boolean'
    },
    isExpanded: {
      control: 'boolean'
    },
    autoClose: {
      control: 'boolean'
    },
    autoCloseDelay: {
      control: 'number'
    }
  },
  args: {
    isActive: true
  },
};

function closePanel() {
  const alert = document.querySelector<any>('sl-alert');
  if (alert) {
    alert.toggleExpanded();
  }
}

function closeAlert() {
  const alert = document.querySelector<any>('sl-alert');
  if (alert) {
    alert.close();
  }
}

function openAlert() {
  const alert = document.querySelector<any>('sl-alert');
  if (alert) {
    alert.open();
  }
}

const Template = (args) =>
  html`<sl-alert ${spread(args)} data-testid="alert">
    Alert title
    <sl-text-passage slot="panel">
      Something longer like a description should go here, and maybe a brief on what triggered this alert.
    </sl-text-passage>
  </sl-alert>`;

export const Default = Template.bind({});

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
  variant: 'danger',
};

export const WithoutPanel = (args) => html`<sl-alert ${spread(args)}>Alert title</sl-alert>`;
WithoutPanel.args = {
  hasPanel: false
};

export const WithAutoClose = Template.bind({});
WithAutoClose.args = {
  autoClose: true
};

const TemplateClosePanel = (args) => html`
  <sl-alert ${spread(args)}>
    Alert title
    <sl-text-passage slot="panel">
      Something longer like a description should go here, and maybe a brief on what triggered this alert.
    </sl-text-passage>
    <sl-button slot="panel" @click=${closePanel}>OK</sl-button>
  </sl-alert>
`;
export const WithClosePanel = TemplateClosePanel.bind({});

const TemplateCloseAlert = (args) => html`
  <sl-alert ${spread(args)}>
    Alert title
    <sl-text-passage slot="panel">
      Something longer like a description should go here, and maybe a brief on what triggered this alert.
    </sl-text-passage>
    <sl-button slot="panel" @click=${closeAlert}>Dismiss</sl-button>
  </sl-alert>
`;
export const WithCloseButton = TemplateCloseAlert.bind({});

const TemplateOpenAlert = (args) => html`
  <div>
    <sl-button @click=${openAlert} data-testid="open-alert">Show Alert</sl-button>
    <sl-alert ${spread(args)} data-testid="alert">
      Alert title
      <sl-text-passage slot="panel">
        Something longer like a description should go here, and maybe a brief on what triggered this alert.
      </sl-text-passage>
      <sl-button slot="panel" @click=${closeAlert} data-testid="close-alert">Dismiss</sl-button>
    </sl-alert>
  </div>
`;
export const WithOpenButton = TemplateOpenAlert.bind({});
WithOpenButton.args = {
  isActive: false
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

Default.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const alert = canvas.queryByTestId('alert');
  const alertEl = alert?.shadowRoot?.querySelector('.sl-c-alert') as HTMLElement;
  const alertHeader = alert?.shadowRoot?.querySelector('.sl-c-alert__header') as HTMLElement;
  const alertPanel = alert?.shadowRoot?.querySelector('slot') as HTMLSlotElement;

  // Make assertions
  expect(alert).toBeInTheDocument();
  expect(alertPanel).toBeInTheDocument();

  // Simulate a click event
  await userEvent.click(alertHeader);

  // Check that the alert is expanded
  expect(alertEl).toHaveClass('sl-is-expanded');

  // Simulate a keyboard event (pressing Escape key)
  await userEvent.type(alertEl, '{escape}');
  expect(alertEl).not.toHaveClass('sl-is-expanded');

  // Simulate a keyboard event (pressing Enter key)
  await userEvent.type(alertEl, '{enter}');
  expect(alertEl).toHaveClass('sl-is-expanded');

  // Simulate a keyboard event (pressing Escape key) and remove the focus
  await userEvent.type(alertEl, '{escape}');
  alertHeader.blur();
};

WithAutoClose.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const alert = canvas.queryByTestId('alert') as any;
  const alertEl = alert.shadowRoot.querySelector('.sl-c-alert');
  expect(alert.isActive).toBe(true);
  await userEvent.hover(alertEl);
  await userEvent.unhover(alertEl);

  // Wait for a duration that should be longer than the expected autoClose delay
  await waitFor(() => expect(alert.isActive).toBe(false), {
    timeout: 6000 // A long timeout to make sure it doesn't close
  });
};

WithOpenButton.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const alert = canvas.queryByTestId('alert') as any;
  const alertEl = alert?.shadowRoot?.querySelector('.sl-c-alert') as HTMLElement;
  const alertOpenButton = canvas.queryByTestId('open-alert') as any;
  const alertCloseButton = canvas.queryByTestId('close-alert') as any;

  // Simulate a click event
  await userEvent.click(alertOpenButton);
  expect(alertEl).toHaveClass('sl-is-active');
  await userEvent.click(alertCloseButton);
  expect(alertEl).not.toHaveClass('sl-is-active');
};
