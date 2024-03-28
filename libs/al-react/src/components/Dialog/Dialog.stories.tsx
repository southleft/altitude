import type { StoryObj } from '@storybook/react-webpack5';
import { ALDialog, ALButton, ALButtonGroup } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Molecules/Dialog',
  component: ALDialog,
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
    heading: 'Dialog heading',
    children: (
      <>
        <ALButton slot="trigger">Open Dialog</ALButton>
        <Fpo>Dialog content</Fpo>
        <ALButton slot="footer" variant="bare" onClick={closeDialog}>Close</ALButton>
        <ALButtonGroup slot="footer" alignment="right">
          <ALButton variant="tertiary">Label</ALButton>
          <ALButton>Label</ALButton>
        </ALButtonGroup>
      </>
    )
  }
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

function closeDialog(e: MouseEvent, id?: string): void {
  const dialog = id ? 
    document.getElementById(id) as any :
    document.querySelector<any>('al-dialog');

  if (dialog) {
    dialog.close(e);
  }
}

export const Default: StoryObj<typeof ALDialog> = {
  args: {},
  decorators: [
    (Story) => (
      <div className="c-dialog">{Story()}</div>
    )
  ]
};

export const WithWidth: StoryObj<typeof ALDialog> = { args: {
  width: '600'
} };

export const WithDisableClickOutside: StoryObj<typeof ALDialog> = { args: {
  disableClickOutside: true,
  hasBackdrop: true
} };

export const WithTriggerOutside: StoryObj<typeof ALDialog> = {
  args: {
    id: "dialog-1",
    children: (
      <>
        <Fpo>Dialog content</Fpo>
        <ALButton slot="footer" variant="bare" onClick={(e: MouseEvent) => closeDialog(e, 'dialog-1')}>Close</ALButton>
        <ALButtonGroup slot="footer" alignment="right">
          <ALButton variant="tertiary">Label</ALButton>
          <ALButton>Label</ALButton>
        </ALButtonGroup>
      </>
    )
  },
  decorators: [
    (Story) => (
      <div>
        <ALButton aria-controls="dialog-1" onClick={openDialog}>Open Dialog 1</ALButton>
        <div>{Story()}</div>
      </div>
    )
  ],
};
