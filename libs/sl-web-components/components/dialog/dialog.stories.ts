import { expect, userEvent, waitFor, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../../.storybook/components/f-po/f-po';
import '../button-group/button-group';
import '../button/button';
import './dialog';
import '../tab-panel/tab-panel';
import '../tab/tab';
import '../tabs/tabs';

export default {
  title: 'Molecules/Dialog',
  component: 'sl-dialog',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onDialogOpen', 'onDialogClose', 'onDialogCloseButton']
    },
    controls: {
      exclude: ['ariaLabelledBy']
    },
  },
  decorators: [ withActions ],
  argTypes: {
    heading: {
      type: 'text'
    },
    isActive: {
      type: 'boolean'
    },
  },
  args: {
    heading: 'Dialog heading',
  },
};

function closeDialog() {
  const dialog = document.querySelector<any>('sl-dialog');
  if (dialog) {
    dialog.close();
  }
}

function openDialog(id) {
  const dialog = document.getElementById(id) as any;
  if (dialog) {
    dialog.open();
  }
}

const Template = (args) => html`
  <sl-dialog ${spread(args)} data-testid="dialog">
    <sl-button slot="trigger">Open Dialog</sl-button>
    <f-po >Dialog content</f-po>
    <sl-button slot="footer" variant="tertiary" @click=${closeDialog}>Close</sl-button>
    <sl-button-group slot="footer" alignment="right">
      <sl-button variant="secondary">Label</sl-button>
      <sl-button>Label</sl-button>
    </sl-button-group>
  </sl-dialog>
`;

export const Default = Template.bind({});
Default.args = {};

export const WithWidth = Template.bind({});
WithWidth.args = {
  width: '600'
};

export const WithBackdrop = Template.bind({});
WithBackdrop.args = {
  hasBackdrop: true
};

export const WithDisableClickOutside = Template.bind({});
WithDisableClickOutside.args = {
  disableClickOutside: true,
  hasBackdrop: true
};

const TemplateWithTriggerOutside = () => html`
  <sl-button @click=${() => openDialog('dialog-1')}>Open Dialog 1</sl-button>
  <sl-button @click=${() => openDialog('dialog-2')}>Open Dialog 2</sl-button>
  <sl-dialog id="dialog-1" heading="Dialog 1" ?hasBackdrop=${true}>
    <f-po>Dialog content</f-po>
    <sl-button slot="footer" variant="tertiary" @click=${closeDialog}>Close</sl-button>
    <sl-button-group slot="footer" alignment="right">
      <sl-button variant="secondary">Label</sl-button>
      <sl-button>Label</sl-button>
    </sl-button-group>
  </sl-dialog>
  <sl-dialog id="dialog-2" heading="Dialog 2" ?hasBackdrop=${true}>
    <f-po>Dialog content</f-po>
    <sl-button slot="footer" variant="tertiary" @click=${closeDialog}>Close</sl-button>
    <sl-button-group slot="footer" alignment="right">
      <sl-button variant="secondary">Label</sl-button>
      <sl-button>Label</sl-button>
    </sl-button-group>
  </sl-dialog>
`;

export const WithTriggerOutside = TemplateWithTriggerOutside.bind({});
WithTriggerOutside.args = {};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

Default.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const dialog = canvas.queryByTestId('dialog') as any;
  const dialogTrigger = dialog.shadowRoot.querySelector('.sl-c-dialog__trigger') as HTMLElement;
  const dialogContainer = dialog.shadowRoot.querySelector('.sl-c-dialog__container') as HTMLElement;
  const dialogCloseButton = dialog.shadowRoot.querySelector('.sl-c-dialog__close-button') as HTMLElement;

  await userEvent.click(dialogTrigger);
  expect(dialog.isActive).toBe(true);

  await waitFor(() => expect(dialogContainer).toBeVisible(), {
    timeout: 400, // A long timeout to make sure it doesn't close
  });
  await userEvent.type(dialogCloseButton, '{Escape}');
  expect(dialog.isActive).toBe(false);

  await userEvent.type(dialogTrigger, '{Enter}');
  expect(dialog.isActive).toBe(true);

  await userEvent.click(dialogCloseButton);
  expect(dialog.isActive).toBe(false);

  await userEvent.click(dialogTrigger);
  expect(dialog.isActive).toBe(true);

  await userEvent.click(canvasElement);
  expect(dialog.isActive).toBe(false);

  dialogTrigger.blur();
  await userEvent.click(canvasElement);
};
