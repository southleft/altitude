import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALFocusTrap, ALButton, ALButtonGroup, ALDialog, ALTab, ALTabs, ALTabPanel } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Atoms/Focus Trap',
  component: ALDialog,
  parameters: { status: { type: 'beta' } },
  args: {
    isActive: true,
    disableClickOutside: true,
    heading: 'Dialog with Focus Trap',
    children: (
      <>
        <ALTabs variant="stretch">
          <ALTab>Tab 1</ALTab>
          <ALTab>Tab 2</ALTab>
          <ALTab>Tab 3</ALTab>
          <ALTabPanel slot="panel">
            <Fpo>Tab panel 1 - Instance slot 1</Fpo>
            <Fpo>Tab panel 1 - Instance slot 2</Fpo>
          </ALTabPanel>
          <ALTabPanel slot="panel">
            <Fpo>Tab panel 2 - Instance slot 1</Fpo>
            <Fpo>Tab panel 2 - Instance slot 2</Fpo>
          </ALTabPanel>
          <ALTabPanel slot="panel">
            <Fpo>Tab panel 3 - Instance slot 1</Fpo>
            <Fpo>Tab panel 3 - Instance slot 2</Fpo>
          </ALTabPanel>
        </ALTabs>
        <ALButton slot="footer" variant="tertiary">Close</ALButton>
        <ALButtonGroup slot="footer">
          <ALButton variant="secondary">Label</ALButton>
          <ALButton>Label</ALButton>
        </ALButtonGroup>
      </>
    )
  },
};

export const Default: StoryObj<typeof ALDialog> = { args: {} };
