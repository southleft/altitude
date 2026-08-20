import type { StoryObj } from '@storybook/react-vite';
import { ALBentoGrid, ALBentoItem } from '../..';

export default {
  title: 'Organisms/Bento Item',
  component: ALBentoItem,
  parameters: {
    status: { type: 'beta' }
  },
  argTypes: {
    colSpan: { control: { type: 'number', min: 1, max: 12 } },
    rowSpan: { control: { type: 'number', min: 1, max: 4 } }
  },
  args: {
    colSpan: 6,
    rowSpan: 1
  }
};

export const Default: StoryObj<typeof ALBentoItem> = {
  render: (args) => (
    <ALBentoGrid>
      <ALBentoItem {...args}>
        <div style={{ height: '100%', background: 'var(--al-theme-color-background-default-weak)' }}>Item</div>
      </ALBentoItem>
      <ALBentoItem colSpan={6}>
        <div style={{ height: '100%', background: 'var(--al-theme-color-background-default-weak)' }}>Item</div>
      </ALBentoItem>
    </ALBentoGrid>
  )
};
