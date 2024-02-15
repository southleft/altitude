import type { StoryObj } from '@storybook/react-webpack5';
import { SLDialog, SLButton, SLButtonGroup } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Molecules/Dialog',
  component: SLDialog,
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
        <SLButton slot="trigger">Open Dialog</SLButton>
        <Fpo>Dialog content</Fpo>
        <SLButton slot="footer" variant="tertiary" onClick={closeDialog}>Close</SLButton>
        <SLButtonGroup slot="footer" alignment="right">
          <SLButton variant="secondary">Label</SLButton>
          <SLButton>Label</SLButton>
        </SLButtonGroup>
      </>
    )
  }
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

function closeDialog(e: MouseEvent, id?: string): void {
  const dialog = id ? 
    document.getElementById(id) as any :
    document.querySelector<any>('sl-dialog');

  if (dialog) {
    dialog.close(e);
  }
}

export const Default: StoryObj<typeof SLDialog> = {
  args: {},
  decorators: [
    (Story) => (
      <div className="c-dialog">{Story()}</div>
    )
  ]
};

export const WithWidth: StoryObj<typeof SLDialog> = { args: {
  width: '600'
} };

export const WithDisableClickOutside: StoryObj<typeof SLDialog> = { args: {
  disableClickOutside: true,
  hasBackdrop: true
} };

export const WithTriggerOutside: StoryObj<typeof SLDialog> = {
  args: {
    id: "dialog-1",
    children: (
      <>
        <Fpo>Dialog content</Fpo>
        <SLButton slot="footer" variant="tertiary" onClick={(e: MouseEvent) => closeDialog(e, 'dialog-1')}>Close</SLButton>
        <SLButtonGroup slot="footer" alignment="right">
          <SLButton variant="secondary">Label</SLButton>
          <SLButton>Label</SLButton>
        </SLButtonGroup>
      </>
    )
  },
  decorators: [
    (Story) => (
      <div>
        <SLButton aria-controls="dialog-1" onClick={openDialog}>Open Dialog 1</SLButton>
        <div>{Story()}</div>
      </div>
    )
  ],
};
