import type { StoryObj } from '@storybook/react-webpack5';
import { SLFocusTrap, SLButton, SLButtonGroup, SLDialog, SLTab, SLTabs, SLTabPanel } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Atoms/Focus-Trap',
  component: SLDialog,
  parameters: { status: { type: 'beta' } },
  args: {
    isActive: true, 
    disableClickOutside: true,
    heading: 'Dialog with Focus Trap',
    children: (
      <>
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
        <SLButton slot="footer" variant="tertiary">Close</SLButton>
        <SLButtonGroup slot="footer">
          <SLButton variant="secondary">Label</SLButton>
          <SLButton>Label</SLButton>
        </SLButtonGroup>
      </>
    )
  },
};

export const Default: StoryObj<typeof SLDialog> = { args: {} };
