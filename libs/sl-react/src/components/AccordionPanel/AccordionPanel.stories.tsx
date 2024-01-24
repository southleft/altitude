import type { StoryObj } from '@storybook/react-webpack5';
import { SLAccordionPanel } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Boilerplate/Accordion Panel',
  component: SLAccordionPanel,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['open', 'close']
    },
  },
  args: {
    children: (
      <>
        <div slot="header">Label</div>
        <Fpo>Accordion Panel</Fpo>
      </>
    )
  },
};

export const Default: StoryObj<typeof SLAccordionPanel> = { args: {} };

export const Disabled: StoryObj<typeof SLAccordionPanel> = { args: {
  isDisabled: true,
} };

export const Last: StoryObj<typeof SLAccordionPanel> = { args: {
  isLast: true,
} };
