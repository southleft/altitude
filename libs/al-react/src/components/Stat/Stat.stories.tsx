import type { StoryObj } from '@storybook/react-vite';
import { ALStat } from '../..';

export default {
  title: 'Organisms/Stat',
  component: ALStat,
  parameters: {
    status: { type: 'beta' }
  },
  argTypes: {
    trend: {
      control: 'radio',
      options: ['none', 'up', 'down']
    }
  }
};

export const Default: StoryObj<typeof ALStat> = {
  args: {
    value: '1,234',
    label: 'Active users'
  }
};

export const TrendingUp: StoryObj<typeof ALStat> = {
  args: {
    value: '95,204',
    label: 'Monthly signups',
    trend: 'up',
    delta: '+12%'
  }
};

export const KPIBand: StoryObj<typeof ALStat> = {
  render: () => (
    <div className="al-u-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      <ALStat value="95,204" label="Monthly active users" trend="up" delta="+12%" />
      <ALStat value="99.9%" label="Uptime" trend="up" delta="+0.1%" />
      <ALStat value="2.4%" label="Churn rate" trend="down" delta="-0.8%" invertPolarity />
      <ALStat value="4.9/5" label="Customer satisfaction" trend="none" />
    </div>
  )
};
