import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALAccordion, ALAccordionPanel } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Molecules/Accordion',
  component: ALAccordion,
  subcomponents: { ALAccordionPanel },
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onAccordionPanelOpen', 'onAccordionPanelClose']
    },
  },
  args: {
    children: (
      <>
        <ALAccordionPanel>
          <div slot="header">Label</div>
          <Fpo>Accordion Panel</Fpo>
        </ALAccordionPanel>
        <ALAccordionPanel>
          <div slot="header">Label</div>
          <Fpo>Accordion Panel</Fpo>
        </ALAccordionPanel>
        <ALAccordionPanel>
          <div slot="header">Label</div>
          <Fpo>Accordion Panel</Fpo>
        </ALAccordionPanel>
        <ALAccordionPanel>
          <div slot="header">Label</div>
          <Fpo>Accordion Panel</Fpo>
        </ALAccordionPanel>
      </>
    )
  },
};

export const Default: StoryObj<typeof ALAccordion> = { args: {} };

export const ExpandOneOnly: StoryObj<typeof ALAccordion> = { args: {
  expandOneOnly: true
} };

export const ExpandAll: StoryObj<typeof ALAccordion> = { args: {
  expandAll: true
} };

