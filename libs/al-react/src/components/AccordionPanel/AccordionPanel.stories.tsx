import type { StoryObj } from '@storybook/react-webpack5';
import { ALAccordionPanel } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Atoms/Accordion Panel',
  component: ALAccordionPanel,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onAccordionPanelOpen', 'onAccordionPanelClose']
    },
  },
  args: {
    idx: 0,
    children: (
      <>
        <div slot="header">Label</div>
        <Fpo>Accordion Panel</Fpo>
      </>
    )
  },
};

export const Default: StoryObj<typeof ALAccordionPanel> = {};

export const Disabled: StoryObj<typeof ALAccordionPanel> = { args: {
  isDisabled: true,
} };

export const Last: StoryObj<typeof ALAccordionPanel> = { args: {
  isLast: true,
} };
