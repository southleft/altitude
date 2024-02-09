import { expect, userEvent, waitFor, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../button/button';
import '../icon/icons/check';
import '../toast/toast';
import './toast-group';

export default {
  title: 'Molecules/Toast Group',
  component: 'sl-toast-group',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onToastGroupOpen', 'onToastGroupClose', 'onToastClose']
    },
    controls: {
      exclude: ['toastList']
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
    }
  },
  args: {
    isActive: true
  },
};

let toastCount = 0;
function addToast(e: MouseEvent) { 
  const toastGroup = document.querySelector<any>('sl-toast-group');
  const toastToAdd = document.querySelector<any>(`sl-toast[data-testid="toast-0${toastCount + 1}"]`);

  if (toastGroup && !toastGroup.isActive) {
    toastGroup.open();
  }

  if (toastToAdd) {
    toastToAdd.open();
    toastCount++;
  }
  if (toastCount === 4) {
    e.target.isDisabled = true;
    toastCount = 0;
  }
}

const Template = (args) => html`
  <sl-toast-group ${spread(args)} data-testid="toast-group">
    <sl-toast ?isActive=${true} description="This is toast" isActive=${true} data-testid="toast-01">
      Toast title A
      <sl-button slot="actions" variant="secondary"><sl-icon-check slot="before"></sl-icon-check>Label</sl-button>
      <sl-button slot="actions"><sl-icon-check slot="before"></sl-icon-check>Label</sl-button>
    </sl-toast>
    <sl-toast ?isActive=${true} description="This is a toast" data-testid="toast-02">
      Toast title B
      <sl-button slot="actions" variant="secondary"><sl-icon-check slot="before"></sl-icon-check>Label</sl-button>
      <sl-button slot="actions"><sl-icon-check slot="before"></sl-icon-check>Label</sl-button>
    </sl-toast>
    <sl-toast ?isActive=${true} description="This is a toast" data-testid="toast-03">
      Toast title C
      <sl-button slot="actions" variant="secondary"><sl-icon-check slot="before"></sl-icon-check>Label</sl-button>
      <sl-button slot="actions"><sl-icon-check slot="before"></sl-icon-check>Label</sl-button>
    </sl-toast>
    <sl-toast ?isActive=${true} description="This is a toast" data-testid="toast-04">
      Toast title D
      <sl-button slot="actions" variant="secondary"><sl-icon-check slot="before"></sl-icon-check>Label</sl-button>
      <sl-button slot="actions"><sl-icon-check slot="before"></sl-icon-check>Label</sl-button>
    </sl-toast>
  </sl-toast-group>
`;

const TemplateDismissible = (args) => html`
  <sl-toast-group ${spread(args)} data-testid="toast-group">
    <sl-toast ?isActive=${true} ?isDismissible=${true} description="This is a toast" data-testid="toast-01">Toast title A</sl-toast>
    <sl-toast ?isActive=${true} ?isDismissible=${true} description="This is a toast" data-testid="toast-02">Toast title B</sl-toast>
    <sl-toast ?isActive=${true} ?isDismissible=${true} description="This is a toast" data-testid="toast-03">Toast title C</sl-toast>
    <sl-toast ?isActive=${true} ?isDismissible=${true} description="This is a toast" data-testid="toast-04">Toast title D</sl-toast>
  </sl-toast-group>
`;

const TemplateAutoClose = (args) => html`
  <sl-toast-group ${spread(args)} data-testid="toast-group">
    <sl-toast ?isActive=${true} ?autoClose=${true} description="This toast will auto close in 3 seconds" data-testid="toast-01">Toast title A</sl-toast>
    <sl-toast ?isActive=${true} ?autoClose=${true} autoCloseDelay=${4} description="This toast will auto close in 4 seconds" data-testid="toast-02">Toast title B</sl-toast>
    <sl-toast ?isActive=${true} ?autoClose=${true} description="This toast will auto close in 5 seconds" data-testid="toast-03" autoCloseDelay=${5} >Toast title C</sl-toast>
    <sl-toast ?isActive=${true} ?autoClose=${true} description="This toast will auto close in 6 seconds" data-testid="toast-04" autoCloseDelay=${6}>Toast title D</sl-toast>
  </sl-toast-group>
`;

export const Default = Template.bind({});
Default.args = {};

export const WithDismissible = TemplateDismissible.bind({});
WithDismissible.args = {};

export const WithAutoClose = TemplateAutoClose.bind({});
WithAutoClose.args = {};

const TemplatePositionTop = (args) => html`
  <div style="display: flex; flex-direction: column; gap: 1rem;">
    <sl-button @click=${addToast} data-testid="add-toast" style="position: absolute; bottom: 16px; right: 16px;">Add Toast</sl-button>
    <sl-toast-group ${spread(args)} data-testid="toast-group">
      <sl-toast ?isDismissible=${true} description="This is a toast" data-testid="toast-01">Toast title A</sl-toast>
      <sl-toast ?isDismissible=${true} description="This is a toast" data-testid="toast-02">Toast title B</sl-toast>
      <sl-toast ?isDismissible=${true} description="This is a toast" data-testid="toast-03">Toast title C</sl-toast>
      <sl-toast ?isDismissible=${true} description="This is a toast" data-testid="toast-04">Toast title D</sl-toast>
    </sl-toast-group>
  </div>
`;

export const WithPositionTop = TemplatePositionTop.bind({});
WithPositionTop.args = {
  position: 'top'
};

const TemplatePositionBottom = (args) => html`
  <div style="display: flex; flex-direction: column; gap: 1rem;">
    <sl-button @click=${addToast} data-testid="add-toast">Add Toast</sl-button>
    <sl-toast-group ${spread(args)} data-testid="toast-group">
      <sl-toast ?isDismissible=${true} description="This is a toast" data-testid="toast-01">Toast title A</sl-toast>
      <sl-toast ?isDismissible=${true} description="This is a toast" data-testid="toast-02">Toast title B</sl-toast>
      <sl-toast ?isDismissible=${true} description="This is a toast" data-testid="toast-03">Toast title C</sl-toast>
      <sl-toast ?isDismissible=${true} description="This is a toast" data-testid="toast-04">Toast title D</sl-toast>
    </sl-toast-group>
  </div>
`;

export const WithPositionBottom = TemplatePositionBottom.bind({});
WithPositionBottom.args = {
  isActive: false,
  hasControls: true,
  position: 'bottom'
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

WithPositionBottom.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const toastGroup = canvas.queryByTestId('toast-group') as any;
  const addToastButton = canvas.queryByTestId('add-toast') as any;
  const toasts = canvas.queryAllByTestId(/^toast-0/) as any;
  const firstToast = toasts[0];
  const firstToastCloseButton = firstToast.shadowRoot.querySelector('.sl-c-toast__close-button').shadowRoot.querySelector('button') as HTMLButtonElement;

  expect(toastGroup.isActive).toBe(false);

  // Simulate a user click on the add toast button
  await userEvent.click(addToastButton);
  expect(firstToast.isActive).toBe(true);
  expect(toastGroup.isActive).toBe(true);

  // Simulate a user click to close the added toast
  await userEvent.click(firstToastCloseButton);
  expect(toastGroup.isActive).toBe(false);

  // Reset count for click handler
  toastCount = 0;
}