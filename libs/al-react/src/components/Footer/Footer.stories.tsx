import type { StoryObj } from '@storybook/react-vite';
import { ALFooter, ALHeading, ALLink, ALList, ALListItem } from '../..';

export default {
  title: 'Organisms/Footer',
  component: ALFooter,
  parameters: {
    status: { type: 'beta' },
    layout: 'fullscreen'
  }
};

export const Default: StoryObj<typeof ALFooter> = {
  render: (args) => (
    <ALFooter {...args}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--al-theme-space-sm)' }}>
        <ALHeading tagName="h3" variant="sm" isBold>
          Product
        </ALHeading>
        <ALList>
          <ALListItem>
            <ALLink href="#">Features</ALLink>
          </ALListItem>
          <ALListItem>
            <ALLink href="#">Pricing</ALLink>
          </ALListItem>
        </ALList>
      </div>
      <div slot="legal">
        <span>&copy; 2026 Altitude. All rights reserved.</span>
      </div>
    </ALFooter>
  )
};
