import type { StoryObj } from '@storybook/react-webpack5';
import { SLAccordion, SLAccordionPanel } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Boilerplate/Accordion',
  component: SLAccordion,
  subcomponents: { SLAccordionPanel },
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['open', 'close']
    },
  },
  args: {
    children: (
      <>
        <SLAccordionPanel>
          <div slot="header">Label</div>
          <Fpo>Accordion Panel</Fpo>
        </SLAccordionPanel>
        <SLAccordionPanel>
          <div slot="header">Label</div>
          <Fpo>Accordion Panel</Fpo>
        </SLAccordionPanel>
        <SLAccordionPanel>
          <div slot="header">Label</div>
          <Fpo>Accordion Panel</Fpo>
        </SLAccordionPanel>
        <SLAccordionPanel>
          <div slot="header">Label</div>
          <Fpo>Accordion Panel</Fpo>
        </SLAccordionPanel>
      </>
    )
  },
};

export const Default: StoryObj<typeof SLAccordion> = { args: {} };

export const ExpandOneOnly: StoryObj<typeof SLAccordion> = { args: {
  expandOneOnly: true
} };

export const ExpandAll: StoryObj<typeof SLAccordion> = { args: {
  expandAll: true
} };

