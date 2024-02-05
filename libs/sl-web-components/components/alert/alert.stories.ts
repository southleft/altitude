import { expect, userEvent, waitFor, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../button/button';
import '../text-passage/text-passage';
import './alert';
import { SLAlert } from './alert';

export default {
  title: 'Atoms/Alert',
  component: 'sl-alert',
  tags: [ 'autodocs' ],
  parameters: {
    status: 'beta',
    actions: {
      handles: ['keydown', 'onAlertOpen', 'onAlertClose', 'onAlertExpand', 'onAlertCollapse']
    },
    controls: {
      exclude: ['hasPanel', 'ariaControls', 'ariaLabelledBy']
    }
  },
  decorators: [ withActions ],
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
  const alert = document.getElementById('alert-close-panel') as SLAlert;
  if (alert) {
    alert.toggleExpanded();
  }
}

function closeAlert(evt: Event) {
  const target = evt.target as HTMLElement;
  const alertId = target.dataset.alertid || '';
  const alert = document.getElementById(alertId) as SLAlert;
  if (alert) {
    alert.close();
  }
}

function openAlert() {
  const alert = document.getElementById('alert-open-alert') as SLAlert;
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
  <sl-alert ${spread(args)} id="alert-close-panel">
    Alert title
    <sl-text-passage slot="panel">
      Something longer like a description should go here, and maybe a brief on what triggered this alert.
    </sl-text-passage>
    <sl-button slot="panel" @click=${closePanel}>OK</sl-button>
  </sl-alert>
`;
export const WithClosePanel = TemplateClosePanel.bind({});

const TemplateCloseAlert = (args) => html`
  <sl-alert ${spread(args)} id="alert-close-alert">
    Alert title
    <sl-text-passage slot="panel">
      Something longer like a description should go here, and maybe a brief on what triggered this alert.
    </sl-text-passage>
    <sl-button slot="panel" @click=${closeAlert} data-alertid="alert-close-alert" >Dismiss</sl-button>
  </sl-alert>
`;
export const WithCloseButton = TemplateCloseAlert.bind({});

const TemplateOpenAlert = (args) => html`
  <div>
    <sl-button @click=${openAlert} data-testid="open-alert">Show Alert</sl-button>
    <sl-alert ${spread(args)} data-testid="alert" id="alert-open-alert">
      Alert title
      <sl-text-passage slot="panel">
        Something longer like a description should go here, and maybe a brief on what triggered this alert.
      </sl-text-passage>
      <sl-button slot="panel" @click=${closeAlert} data-alertid="alert-open-alert" data-testid="close-alert">Dismiss</sl-button>
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
  const alert = canvas.queryByTestId('alert') as any;
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
  await userEvent.type(alertEl, '{Escape}');
  //expect(alertEl).not.toHaveClass('sl-is-expanded');

  // Simulate a keyboard event (pressing Enter key)
  await userEvent.keyboard('{Enter}');
  expect(alertEl).toHaveClass('sl-is-expanded');

  // Simulate a keyboard event (pressing Escape key) and remove the focus
  await userEvent.keyboard('{Escape}');
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
