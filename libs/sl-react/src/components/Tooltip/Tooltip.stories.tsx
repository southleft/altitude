import type { StoryObj } from '@storybook/react-webpack5';
import { SLTooltip } from '../..';

export default {
  title: 'Components/Tooltip',
  component: SLTooltip,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onTooltipOpen', 'onTooltipClose']
    },
    controls: {
      exclude: ['ariaDescribedBy']
    },
  },
  argTypes: {
    hasArrow: {
      type: 'boolean'
    },
    position: {
      options: ['top', 'bottom', 'left', 'right'],
      control: { type: 'radio' }
    },
    isActive: {
      type: 'boolean'
    },
    isDynamic: {
      type: 'boolean'
    },
    isInteractive: {
      type: 'boolean'
    },
  },
  args: {
    heading: 'Tooltip heading',
    children: (
      <>
        <span slot="trigger">Hover me</span>
        <span slot="prefix">⌘ + C</span>
        Tooltip Text
      </>
    )
  },
};

export const Default: StoryObj<typeof SLTooltip> = { args: {} };

export const PositionBottom: StoryObj<typeof SLTooltip> = { args: {
  position: 'bottom',
} };

export const PositionLeft: StoryObj<typeof SLTooltip> = { args: {
  position: 'left',
} };

export const PositionRight: StoryObj<typeof SLTooltip> = { args: {
  position: 'right',
} };

export const PositionDynamic: StoryObj<typeof SLTooltip> = {
  args: {
    isDynamic: true,
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '1rem', height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {Story()}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {Story()}
          {Story()}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {Story()}
        </div>
      </div>
    )
  ],
  parameters: {
    layout: 'fullscreen'
  },
};

export const HideArrow: StoryObj<typeof SLTooltip> = { args: {
  hasArrow: false,
} };

export const VisibleOnClick: StoryObj<typeof SLTooltip> = { args: {
  isInteractive: true,
  children: (
    <>
      <span slot="trigger">Click me</span>
      <span slot="prefix">⌘ + C</span>
      Tooltip Text
    </>
  )
} };

export const WithLongText: StoryObj<typeof SLTooltip> = { args: {
  children: (
    <>
      <span slot="trigger">Hover me</span>
      <span slot="prefix">⌘ + C</span>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc nisi eros, maximus vel pellentesque non, iaculis ac urna.
    </>
  )
} };
