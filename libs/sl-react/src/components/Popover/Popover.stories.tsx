import type { StoryObj } from '@storybook/react-webpack5';
import { SLPopover, SLButton, SLButtonGroup, SLTabs, SLTab, SLTabPanel, SLToggleButton, SLIconHelp } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Components/Popover',
  component: SLPopover,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['panelOpen', 'panelClose', 'panelCloseButton']
    },
    controls: {
      exclude: ['ariaLabelledBy']
    },
  },
  argTypes: {
    heading: {
      type: 'text'
    },
    position: {
      options: ['bottom-center', 'bottom-right', 'bottom-left', 'top-center', 'top-right', 'top-left', 'left', 'left-top', 'right', 'right-top'],
      control: { type: 'radio' }
    },
    isActive: {
      type: 'boolean'
    },
    isDismissible: {
      type: 'boolean'
    },
  },
  args: {
    heading: 'Panel heading',
    isDismissible: true,
    children: (
      <>
        <SLButton slot="trigger">Open Panel</SLButton>
        <Fpo>Panel content</Fpo>
      </>
    )
  },
};

function closePanel() {
  const panel = document.querySelector<any>('.c-panel').querySelector('*');
  if (panel) {
    panel.close();
  }
}

export const Default: StoryObj<typeof SLPopover> = { args: {} };

export const PositionBottomCenter: StoryObj<typeof SLPopover> = { args: {
  position: 'bottom-center',
} };

export const PositionBottomRight: StoryObj<typeof SLPopover> = { args: {
  position: 'bottom-right',
} };

export const PositionTopLeft: StoryObj<typeof SLPopover> = { args: {
  position: 'top-left',
} };

export const PositionTopCenter: StoryObj<typeof SLPopover> = { args: {
  position: 'top-center',
} };

export const PositionTopRight: StoryObj<typeof SLPopover> = { args: {
  position: 'top-right',
} };

export const PositionLeft: StoryObj<typeof SLPopover> = { args: {
  position: 'left',
} };

export const PositionLeftTop: StoryObj<typeof SLPopover> = { args: {
  position: 'left-top',
} };

export const PositionRight: StoryObj<typeof SLPopover> = { args: {
  position: 'right',
} };

export const PositionRightTop: StoryObj<typeof SLPopover> = { args: {
  position: 'right-top',
} };

export const WithSlottedContent: StoryObj<typeof SLPopover> = {
  args: {
    position: 'top-left',
    children: (
      <>
        <SLToggleButton slot="trigger"><SLIconHelp size="lg"></SLIconHelp></SLToggleButton>
        <SLTabs variant="stretch">
          <SLTab>Tab 1</SLTab>
          <SLTab>Tab 2</SLTab>
          <SLTab>Tab 3</SLTab>
          <SLTabPanel slot="panel">
            <Fpo>Tab panel 1 - Instance slot 1</Fpo>
            <Fpo>Tab panel 1 - Instance slot 2</Fpo>
          </SLTabPanel>
          <SLTabPanel slot="panel">
            <Fpo>Tab panel 2 - Instance slot 1</Fpo>
            <Fpo>Tab panel 2 - Instance slot 2</Fpo>
          </SLTabPanel>
          <SLTabPanel slot="panel">
            <Fpo>Tab panel 3 - Instance slot 1</Fpo>
            <Fpo>Tab panel 3 - Instance slot 2</Fpo>
          </SLTabPanel>
        </SLTabs>
        <SLButton slot="footer" variant="tertiary" onClick={closePanel}>Close</SLButton>
        <SLButtonGroup slot="footer" alignment="right">
          <SLButton variant="secondary">Label</SLButton>
          <SLButton>Label</SLButton>
        </SLButtonGroup>
      </>
    )
  },
  parameters: {
    layout: 'fullscreen'
  },
  decorators: [
    (Story) => (
      <div className="c-panel" style={{ position: 'fixed', insetBlockEnd: '1rem', insetInlineEnd: '1rem' }}>{Story()}</div>
    )
  ]
};