import type { StoryObj } from '@storybook/react-vite';
import { ALBanner, ALLink } from '../..';

export default {
  title: 'Molecules/Banner',
  component: ALBanner,
  parameters: {
    status: { type: 'beta' },
    actions: { handles: ['onBannerClose'] }
  }
};

export const Default: StoryObj<typeof ALBanner> = {
  render: (args) => (
    <ALBanner {...args}>
      We're rolling out a new theming engine this week — some screens may look slightly different.
      <ALLink slot="link" href="#" variant="sm">
        Learn more
      </ALLink>
    </ALBanner>
  )
};

export const Dismissible: StoryObj<typeof ALBanner> = {
  args: { isDismissible: true },
  render: (args) => (
    <ALBanner {...args}>
      We're rolling out a new theming engine this week — some screens may look slightly different.
      <ALLink slot="link" href="#" variant="sm">
        Learn more
      </ALLink>
    </ALBanner>
  )
};
