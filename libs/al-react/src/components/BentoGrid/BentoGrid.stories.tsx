import type { StoryObj } from '@storybook/react-vite';
import { ALBentoGrid, ALBentoItem } from '../..';

export default {
  title: 'Organisms/Bento Grid',
  component: ALBentoGrid,
  parameters: {
    status: { type: 'beta' }
  }
};

export const Default: StoryObj<typeof ALBentoGrid> = {
  render: (args) => (
    <ALBentoGrid {...args}>
      <ALBentoItem colSpan={8} rowSpan={2}>
        <div style={{ height: '100%', background: 'var(--al-theme-color-background-default-weak)' }}>8x2</div>
      </ALBentoItem>
      <ALBentoItem colSpan={4}>
        <div style={{ height: '100%', background: 'var(--al-theme-color-background-default-weak)' }}>4x1</div>
      </ALBentoItem>
      <ALBentoItem colSpan={4}>
        <div style={{ height: '100%', background: 'var(--al-theme-color-background-default-weak)' }}>4x1</div>
      </ALBentoItem>
    </ALBentoGrid>
  )
};
