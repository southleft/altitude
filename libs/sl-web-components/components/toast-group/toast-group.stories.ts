import { expect, userEvent, waitFor, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../button/button';
import '../icon/icons/done';
import '../toast/toast';
import './toast-group';
import '../progress/progress';

export default {
  title: 'Molecules/Toast Group',
  component: 'sl-toast-group',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onToastGroupOpen', 'onToastGroupClose', 'onToastGroupPrevious', 'onToastGroupNext', 'onToastClose']
    },
    controls: {
      exclude: ['activeToastIdx', 'prevActiveIdx', 'toasts', 'toastsVisible', 'controlPrev', 'controlNext']
    }
  },
  decorators: [ withActions ],
  argTypes: {
    position: {
      control: { type: 'radio' },
      options: ['default', 'top', 'bottom']
    },
    isActive: {
      control: 'boolean'
    },
    isGroup: {
      control: 'boolean'
    },
    hasControls: {
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

function openToastGroup() {
  const toastGroup = document.querySelector<any>('sl-toast-group');
  if (toastGroup) {
    toastGroup.open();
  }
}

function closeToastGroup() {
  const toastGroup = document.querySelector<any>('sl-toast-group');
  if (toastGroup) {
    toastGroup.close();
  }
}

const Template = (args) => html`
  <sl-toast-group ${spread(args)} data-testid="toast-group">
    <sl-toast description="This is a toast" data-testid="toast-01">
      Toast title A
      <sl-button slot="actions" variant="secondary"><sl-icon-done slot="before"></sl-icon-done>Label</sl-button>
      <sl-button slot="actions"><sl-icon-done slot="before"></sl-icon-done>Label</sl-button>
    </sl-toast>
    <sl-toast variant="success" description="This is a success toast" data-testid="toast-02">
      Toast title B
      <sl-button slot="actions" variant="secondary"><sl-icon-done slot="before"></sl-icon-done>Label</sl-button>
      <sl-button slot="actions"><sl-icon-done slot="before"></sl-icon-done>Label</sl-button>
    </sl-toast>
    <sl-toast variant="warning" description="This is a warning toast" data-testid="toast-03">
      Toast title C
      <sl-button slot="actions" variant="secondary"><sl-icon-done slot="before"></sl-icon-done>Label</sl-button>
      <sl-button slot="actions"><sl-icon-done slot="before"></sl-icon-done>Label</sl-button>
    </sl-toast>
    <sl-toast variant="danger" description="This is a danger toast" data-testid="toast-04">
      Toast title D
      <sl-button slot="actions" variant="secondary"><sl-icon-done slot="before"></sl-icon-done>Label</sl-button>
      <sl-button slot="actions"><sl-icon-done slot="before"></sl-icon-done>Label</sl-button>
    </sl-toast>
  </sl-toast-group>
`;

const TemplateDismissible = (args) => html`
  <sl-toast-group ${spread(args)} data-testid="toast-group">
    <sl-toast ?isDismissible=${true} description="This is a toast" data-testid="toast-01">Toast title A</sl-toast>
    <sl-toast ?isDismissible=${true} variant="success" description="This is a success toast" data-testid="toast-02">Toast title B</sl-toast>
    <sl-toast ?isDismissible=${true} variant="warning" description="This is a warning toast" data-testid="toast-03">Toast title C</sl-toast>
    <sl-toast ?isDismissible=${true} variant="danger" description="This is a danger toast" data-testid="toast-04">Toast title D</sl-toast>
  </sl-toast-group>
`;

const TemplateWithAutoCloseWithProgress = (args) => html`
  <sl-toast-group ${spread(args)} autoCloseDelay="4">
    <sl-toast description="This is a toast">
      Toast title A
      <sl-button slot="actions" variant="secondary"><sl-icon-done slot="before"></sl-icon-done>Label</sl-button>
      <sl-button slot="actions"><sl-icon-done slot="before"></sl-icon-done>Label</sl-button>
    </sl-toast>
    <sl-progress currentProgress="100", endProgress="0" duration="4"></sl-progress>
  </sl-toast-group>
`;

export const Default = Template.bind({});
Default.args = {};

export const WithDismissible = TemplateDismissible.bind({});
WithDismissible.args = {};

export const WithAutoClose = Default.bind({});
WithAutoClose.args = {
  autoClose: true,
};

export const WithAutoCloseWithProgress = TemplateWithAutoCloseWithProgress.bind({});
WithAutoCloseWithProgress.args = {
  autoClose: true
};

export const WithPositionTop = TemplateDismissible.bind({});
WithPositionTop.args = {
  position: 'top'
};

export const WithPositionBottom = TemplateDismissible.bind({});
WithPositionBottom.args = {
  position: 'bottom'
};

export const WithGroup = Template.bind({});
WithGroup.args = {
  isGroup: true
};

export const WithGroupPositionTop = TemplateDismissible.bind({});
WithGroupPositionTop.args = {
  isGroup: true,
  position: 'top'
};

export const WithGroupPositionBottom = TemplateDismissible.bind({});
WithGroupPositionBottom.args = {
  isGroup: true,
  position: 'bottom'
};

export const WithGroupControls = Template.bind({});
WithGroupControls.args = {
  isGroup: true,
  hasControls: true
};

export const WithGroupControlsPositionTop = TemplateDismissible.bind({});
WithGroupControlsPositionTop.args = {
  isGroup: true,
  hasControls: true,
  position: 'top'
};

export const WithGroupControlsPositionBottom = TemplateDismissible.bind({});
WithGroupControlsPositionBottom.args = {
  isGroup: true,
  hasControls: true,
  position: 'bottom'
};

const TemplateWithTriggers = (args) => html`
  <div style="display: flex; flex-direction: column; gap: 1rem;">
    <div style="display: flex; gap: 1rem;">
      <sl-button @click=${openToastGroup} data-testid="open-toast">Open Toast Group</sl-button>
      <sl-button @click=${closeToastGroup} data-testid="close-toast" variant="secondary">Close Toast Group</sl-button>
    </div>
    <sl-toast-group ${spread(args)} data-testid="toast-group">
      <sl-toast ?isDismissible=${true} description="This is a toast" data-testid="toast-01">Toast title A</sl-toast>
      <sl-toast ?isDismissible=${true} variant="success" description="This is a success toast" data-testid="toast-02">Toast title B</sl-toast>
      <sl-toast ?isDismissible=${true} variant="warning" description="This is a warning toast" data-testid="toast-03">Toast title C</sl-toast>
      <sl-toast ?isDismissible=${true} variant="danger" description="This is a danger toast" data-testid="toast-04">Toast title D</sl-toast>
    </sl-toast-group>
  </div>
`;

export const WithTriggers = TemplateWithTriggers.bind({});
WithTriggers.args = {
  isActive: false,
  isGroup: true,
  hasControls: true
};

export const StorybookTests = TemplateDismissible.bind({});
StorybookTests.args = {
  isGroup: true,
  hasControls: true,
  position: 'bottom'
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

// Helper function to wait for the buttons to load
async function waitForButtons(toastGroup: any) {
  // Create a promise that resolves after 1 ms
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  await delay(1); // Wait for 1 ms

  return toastGroup.shadowRoot?.querySelectorAll('sl-button');
}

WithAutoClose.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const toastGroup = canvas.queryByTestId('toast-group') as any;
  const toastGroupEl = toastGroup.shadowRoot.querySelector('.sl-c-toast-group');
  expect(toastGroup.isActive).toBe(true);
  await userEvent.hover(toastGroupEl);
  await userEvent.unhover(toastGroupEl);

  // Wait for a duration that should be longer than the expected autoClose delay
  await waitFor(() => expect(toastGroup.isActive).toBe(false), {
    timeout: 6000, // A long timeout to make sure it doesn't close
  });
};

WithGroupPositionBottom.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const toastGroup = canvas.queryByTestId('toast-group') as any;
  const toasts = canvas.queryAllByTestId(/^toast-0/) as any;
  const toast1CloseButton = toasts[0].shadowRoot.querySelector('.sl-c-toast__close-button') as HTMLButtonElement;
  const toast2CloseButton = toasts[1].shadowRoot.querySelector('.sl-c-toast__close-button') as HTMLButtonElement;
  const toast3CloseButton = toasts[2].shadowRoot.querySelector('.sl-c-toast__close-button') as HTMLButtonElement;
  const toast4CloseButton = toasts[3].shadowRoot.querySelector('.sl-c-toast__close-button') as HTMLButtonElement;

  // Make assertions
  expect(toastGroup).toBeInTheDocument();
  expect(toasts[0]).toBeInTheDocument();
  expect(toasts[1]).toBeInTheDocument();
  expect(toasts[2]).toBeInTheDocument();
  expect(toasts[3]).toBeInTheDocument();

  await waitFor(() => {
    expect(toast1CloseButton).toBeVisible();
  });
  await userEvent.click(toast1CloseButton);
  expect(toasts[1].isActive).toBe(true);

  await waitFor(() => {
    expect(toast2CloseButton).toBeVisible();
  });
  await userEvent.click(toast2CloseButton);
  expect(toasts[2].isActive).toBe(true);

  await waitFor(() => {
    expect(toast3CloseButton).toBeVisible();
  });
  await userEvent.click(toast3CloseButton);
  expect(toasts[3].isActive).toBe(true);

  await waitFor(() => {
    expect(toast4CloseButton).toBeVisible();
  });
  await userEvent.click(toast4CloseButton);
  expect(toastGroup.isActive).toBe(false);

  // Reset the story
  toastGroup.isActive = true;
  toasts[0].isActive = true;
  toasts[1].isActive = false;
  toasts[2].isActive = false;
  toasts[3].isActive = false;
};

WithTriggers.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const toastGroup = canvas.queryByTestId('toast-group') as any;
  const toastOpenButton = canvas.queryByTestId('open-toast') as any;
  const toastCloseButton = canvas.queryByTestId('close-toast') as any;

  // Simulate a user click on the open button
  await userEvent.click(toastOpenButton);
  expect(toastGroup.isActive).toBe(true);

  // Simulate a user click on the close button
  await userEvent.click(toastCloseButton);
  expect(toastGroup.isActive).toBe(false);
};

StorybookTests.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const toastGroup = canvas.queryByTestId('toast-group') as any;
  const toasts = canvas.queryAllByTestId(/^toast-0/) as any;
  const buttons = await waitForButtons(toastGroup);
  const prevButton = buttons[0];
  const nextButton = buttons[1];
  const toast1CloseButton = toasts[0].shadowRoot.querySelector('.sl-c-toast__close-button') as HTMLButtonElement;
  const toast2CloseButton = toasts[1].shadowRoot.querySelector('.sl-c-toast__close-button') as HTMLButtonElement;
  const toast3CloseButton = toasts[2].shadowRoot.querySelector('.sl-c-toast__close-button') as HTMLButtonElement;
  const toast4CloseButton = toasts[3].shadowRoot.querySelector('.sl-c-toast__close-button') as HTMLButtonElement;

  expect(toasts[0].isActive).toBe(true);

  // Simulate a user click on the next button
  await userEvent.click(nextButton);
  expect(toasts[1].isActive).toBe(true);

  await userEvent.click(nextButton);
  expect(toasts[2].isActive).toBe(true);

  await userEvent.click(nextButton);
  expect(toasts[3].isActive).toBe(true);

  // Simulate a user click on the prev button
  await userEvent.click(prevButton);
  expect(toasts[2].isActive).toBe(true);

  await userEvent.click(prevButton);
  expect(toasts[1].isActive).toBe(true);

  await userEvent.click(prevButton);
  expect(toasts[0].isActive).toBe(true);

  // Simulate a user click on the close buttons
  await waitFor(() => {
    expect(toast1CloseButton).toBeVisible();
  });
  await userEvent.click(toast1CloseButton);
  expect(toasts[1].isActive).toBe(true);

  await waitFor(() => {
    expect(toast2CloseButton).toBeVisible();
  });
  await userEvent.click(toast2CloseButton);
  expect(toasts[2].isActive).toBe(true);

  await waitFor(() => {
    expect(toast3CloseButton).toBeVisible();
  });
  await userEvent.click(toast3CloseButton);
  expect(toasts[3].isActive).toBe(true);
  expect(toastGroup.hasControls).toBe(false);

  await waitFor(() => {
    expect(toast4CloseButton).toBeVisible();
  });
  await userEvent.click(toast4CloseButton);
  expect(toastGroup.isActive).toBe(false);
  toast4CloseButton.blur();

  // Reset toast group
  toastGroup.isActive = true;
  toastGroup.hasControls = false;
  toasts[0].isActive = true;
  toasts[0].hasControls = false;
  toasts[1].isActive = true;
  toasts[1].hasControls = false;
  toasts[2].isActive = true;
  toasts[2].hasControls = false;
  toasts[3].isActive = true;
  toasts[3].hasControls = false;
};
