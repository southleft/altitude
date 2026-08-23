import type { StoryObj } from '@storybook/react-vite';
import { loremParagraphs } from '../../../../al-web-components/.storybook/fixtures';
import { ALTabPanel, ALTextBlock, ALButton } from '../..';

export default {
  title: 'Atoms/Tab Panel',
  component: ALTabPanel,
  parameters: {
    status: { type: 'beta' },
    controls: {
      exclude: ['ariaLabelledBy', 'idx', 'ariaId', 'tabPanelEl']
    },
  },
  argTypes: {
    isActive: {
      control: 'boolean',
    },
  },
  args: {
    isActive: true,
    children: (
      <>
        <ALTextBlock>
          {loremParagraphs(2, 'tab-panel').map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </ALTextBlock>
        <ALButton>Button</ALButton>
      </>
    ),
  },
};

export const Default: StoryObj<typeof ALTabPanel> = { args: {} };
