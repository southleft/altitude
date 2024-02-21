import { expect, userEvent, waitFor, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../button/button';
import '../text-passage/text-passage';
import './alert';
import { ALAlert } from './alert';

export default {
  title: 'Atoms/Alert',
  component: 'al-alert',
  tags: [ 'autodocs' ],
  parameters: {
    status: 'beta',
    actions: {
      handles: ['keydown', 'onAlertOpen', 'onAlertClose']
    }
  },
  decorators: [ withActions ],
  argTypes: {
    variant: {
      options: ['default', 'success', 'warning', 'danger'],
      control: { type: 'radio' }
    },
    title: {
      control: 'text'
    },
    isActive: {
      control: 'boolean'
    },
    autoClose: {
      control: 'boolean'
    },
    autoCloseDelay: {
      control: 'number'
    },
    isDismissible: {
      control: 'boolean'
    }
  },
  args: {
    isActive: true
  }
};

function closeAlert() {
  const alert = document.querySelector<any>('al-alert');
  if (alert) {
    alert.close();
  }
}

function openAlert() {
  const alert = document.querySelector<any>('al-alert');
  if (alert) {
    alert.open();
  }
}

const Template = (args) =>
  html`<al-alert ${spread(args)} data-testid="alert">
    <al-text-passage>
      This is an alert. It is used to notify the user of something important.
    </al-text-passage>
  </al-alert>`;

const TemplateWithAction = (args) =>
html`<al-alert ${spread(args)} data-testid="alert">
  <al-text-passage>
    This is an alert. It is used to notify the user of something important.
  </al-text-passage>
  <al-button slot="action" data-testid="action" variant="secondary">Action</al-button>
</al-alert>`;

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

export const DefaultDismissible = Template.bind({});
DefaultDismissible.args = {  
  isDismissible: true
};

export const WithAction = TemplateWithAction.bind({});

export const WithActionDismissible = TemplateWithAction.bind({});
WithActionDismissible.args = {
  isDismissible: true
};

export const WithTitle = Template.bind({});
WithTitle.args = {
  title: 'Alert Title'
};

export const WithTitleAndAction = TemplateWithAction.bind({});
WithTitleAndAction.args = {
  title: 'Alert Title'
};

export const WithTitleAndActionDismissible = TemplateWithAction.bind({});
WithTitleAndActionDismissible.args = {
  title: 'Alert Title',
  isDismissible: true
};

const TemplateOpenAlert = (args) => html`
  <div>
    <al-button @click=${openAlert} data-testid="open-alert">Show Alert</al-button>
    <al-alert ${spread(args)} data-testid="alert">
      <al-text-passage>
        This is an alert. It is used to notify the user of something important.
      </al-text-passage>
      <al-button slot="action" data-testid="action" variant="secondary" @click=${closeAlert}>Action</al-button>
    </al-alert>
  </div>
`;
export const WithOpenButton = TemplateOpenAlert.bind({});
WithOpenButton.args = {
  isActive: false,
  isDismissible: true
};

export const WithAutoClose = Template.bind({});
WithAutoClose.args = {
  autoClose: true
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

WithAutoClose.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const alert = canvas.queryByTestId('alert') as any;
  const alertEl = alert.shadowRoot.querySelector('.al-c-alert');
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
  const alertEl = alert?.shadowRoot?.querySelector('.al-c-alert') as HTMLElement;
  const alertOpenButton = canvas.queryByTestId('open-alert') as any;
  const alertCloseButton = alert?.shadowRoot?.querySelector('.al-c-alert__close') as any;

  // Simulate a click event
  await userEvent.click(alertOpenButton);
  expect(alertEl).toHaveClass('al-is-active');
  await userEvent.click(alertCloseButton);
  expect(alertEl).not.toHaveClass('al-is-active');
};