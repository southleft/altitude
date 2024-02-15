import { expect, userEvent, waitFor, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../../.storybook/components/f-po/f-po';
import '../button-group/button-group';
import '../button/button';
import './dialog';

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
      exclude: ['ariaLabelledBy', 'transitionDelay', 'dialogContainer', 'dialogHeading', 'closeButton', 'slottedTrigger', 'externalTrigger', 'handleOnClickOutside']
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

function openDialog(e: MouseEvent) {
  const trigger = e.target as HTMLElement;
  const dialogId = trigger?.getAttribute('aria-controls') as string;
  const dialog = dialogId ? 
    document.getElementById(dialogId) as any :
    document.querySelector<any>('sl-dialog');

  if (dialog) {
    dialog.open(e);
  }
}

function closeDialog(e: MouseEvent, id?: string) {
  const dialog = id ? 
    document.getElementById(id) as any :
    document.querySelector<any>('sl-dialog');

  if (dialog) {
    dialog.close(e);
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

export const WithDisableClickOutside = Template.bind({});
WithDisableClickOutside.args = {
  disableClickOutside: true
};

const TemplateWithTriggerOutside = () => html`
  <sl-button aria-controls="dialog-1" @click=${openDialog}>Open Dialog 1</sl-button>
  <sl-button aria-controls="dialog-2" @click=${openDialog}>Open Dialog 2</sl-button>
  <sl-dialog id="dialog-1" heading="Dialog 1">
    <f-po>Dialog content</f-po>
    <sl-button aria-controls="dialog-1" slot="footer" variant="tertiary" @click=${(e) => closeDialog(e, 'dialog-1')}>Close</sl-button>
    <sl-button-group slot="footer" alignment="right">
      <sl-button variant="secondary">Label</sl-button>
      <sl-button>Label</sl-button>
    </sl-button-group>
  </sl-dialog>
  <sl-dialog id="dialog-2" heading="Dialog 2">
    <f-po>Dialog content</f-po>
    <sl-button slot="footer" variant="tertiary" @click=${(e) => closeDialog(e, 'dialog-2')}>Close</sl-button>
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

  await userEvent.type(dialog, '{Escape}');
  expect(dialog.isActive).toBe(false);

  await userEvent.type(dialogTrigger, '{Enter}');
  expect(dialog.isActive).toBe(true);

  await userEvent.type(dialogCloseButton, '{Enter}');
  expect(dialog.isActive).toBe(false);
  
  await userEvent.click(dialogTrigger);
  expect(dialog.isActive).toBe(true);

  await userEvent.click(canvasElement);
  expect(dialog.isActive).toBe(false);

  dialogTrigger.blur();
  await userEvent.click(canvasElement);
};
