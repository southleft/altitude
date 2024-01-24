import type { StoryObj } from '@storybook/react-webpack5';
import { SLDialog, SLButton, SLButtonGroup } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Components/Dialog',
  component: SLDialog,
  parameters: {
    status: { type: 'beta' },
    layout: 'padded',
    actions: {
      handles: ['dialogOpen', 'dialogClose', 'dialogCloseButton']
    },
    controls: {
      exclude: ['ariaLabelledBy']
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

function closeDialog() {
  const dialog = document.querySelector<any>('.c-dialog').querySelector('*');
  if (dialog) {
    dialog.close();
  }
}

function openDialog(id) {
  const dialogWrapper = document.getElementById(id) as any;
  const dialog = dialogWrapper.querySelector('*') as any;
  if (dialog) {
    dialog.open();
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

export const WithBackdrop: StoryObj<typeof SLDialog> = { args: {
  hasBackdrop: true
} };

export const WithDisableClickOutside: StoryObj<typeof SLDialog> = { args: {
  disableClickOutside: true,
  hasBackdrop: true
} };

export const WithTriggerOutside: StoryObj<typeof SLDialog> = {
  args: {
    children: (
      <>
        <Fpo>Dialog content</Fpo>
        <SLButton slot="footer" variant="tertiary" onClick={closeDialog}>Close</SLButton>
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
        <SLButton onClick={() => openDialog('dialog-1')}>Open Dialog 1</SLButton>
        <SLButton onClick={() => openDialog('dialog-2')}>Open Dialog 2</SLButton>
        <div id="dialog-1">{Story()}</div>
        <div id="dialog-2">{Story()}</div>
      </div>
    )
  ],
};
