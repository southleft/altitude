import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../layout/layout';
import '../button/button';
import './dialog';

export default {
  title: 'Molecules/Dialog',
  component: 'al-dialog',
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
  argTypes: {
    heading: {
      type: 'text'
    },
    isActive: {
      type: 'boolean'
    },
  },
  args: {
    heading: 'Delete component?',
  },
};

function openDialog(e: MouseEvent) {
  const trigger = e.target as HTMLElement;
  const dialogId = trigger?.getAttribute('aria-controls') as string;
  const dialog = dialogId ? 
    document.getElementById(dialogId) as any :
    document.querySelector<any>('al-dialog');

  if (dialog) {
    dialog.open(e);
  }
}

function closeDialog(e: MouseEvent, id?: string) {
  const dialog = id ? 
    document.getElementById(id) as any :
    document.querySelector<any>('al-dialog');

  if (dialog) {
    dialog.close(e);
  }
}

const Template = (args) => html`
  <al-dialog ${spread(args)} data-testid="dialog">
    <al-button slot="trigger">Delete component</al-button>
    <p>"al-input-stepper" will be removed from the library. This can't be undone.</p>
    <al-button slot="footer" variant="bare" @click=${closeDialog}>Close</al-button>
    <al-layout slot="footer" direction="row" justify="end" grow>
      <al-button variant="tertiary">Cancel</al-button>
      <al-button>Delete</al-button>
    </al-layout>
  </al-dialog>
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
  <al-button aria-controls="dialog-1" @click=${openDialog}>Delete component</al-button>
  <al-button aria-controls="dialog-2" @click=${openDialog}>Remove owner</al-button>
  <al-dialog id="dialog-1" heading="Delete component?">
    <p>"al-input-stepper" will be removed from the library. This can't be undone.</p>
    <al-button aria-controls="dialog-1" slot="footer" variant="bare" @click=${(e) => closeDialog(e, 'dialog-1')}>Close</al-button>
    <al-layout slot="footer" direction="row" justify="end" grow>
      <al-button variant="tertiary">Cancel</al-button>
      <al-button>Delete</al-button>
    </al-layout>
  </al-dialog>
  <al-dialog id="dialog-2" heading="Remove owner?">
    <p>M. Kim will lose edit access to al-input. They keep read access.</p>
    <al-button slot="footer" variant="bare" @click=${(e) => closeDialog(e, 'dialog-2')}>Close</al-button>
    <al-layout slot="footer" direction="row" justify="end" grow>
      <al-button variant="tertiary">Cancel</al-button>
      <al-button>Delete</al-button>
    </al-layout>
  </al-dialog>
`;

export const WithTriggerOutside = TemplateWithTriggerOutside.bind({});
WithTriggerOutside.args = {};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

