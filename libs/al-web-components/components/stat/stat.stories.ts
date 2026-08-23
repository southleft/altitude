import { html } from 'lit';
import { spread } from '../../directives/spread';
import './stat';

export default {
  title: 'Molecules/Stat',
  component: 'al-stat',
  tags: ['autodocs'],
  parameters: {
    status: { type: 'beta' }
  },
  argTypes: {
    trend: {
      control: 'radio',
      options: ['none', 'up', 'down']
    },
    invertPolarity: {
      control: 'boolean'
    }
  }
};

const Template = (args) => html`<al-stat ${spread(args)}></al-stat>`;

export const Default = Template.bind({});
Default.args = {
  value: '1,234',
  label: 'Active users'
};

export const TrendingUp = Template.bind({});
TrendingUp.args = {
  value: '95,204',
  label: 'Monthly signups',
  trend: 'up',
  delta: '+12%'
};

export const TrendingDown = Template.bind({});
TrendingDown.args = {
  value: '2.4%',
  label: 'Churn rate',
  trend: 'down',
  delta: '-0.8%',
  invertPolarity: true
};

export const WithDescription = Template.bind({});
WithDescription.args = {
  value: '99.9%',
  label: 'Uptime',
  trend: 'up',
  delta: '+0.1%',
  description: 'Trailing 90-day average across all regions.'
};

export const KPIBand = () => html`
  <div class="al-u-grid" style="--al-grid-cols: 4; grid-template-columns: repeat(4, 1fr);">
    <al-stat value="95,204" label="Monthly active users" trend="up" delta="+12%"></al-stat>
    <al-stat value="99.9%" label="Uptime" trend="up" delta="+0.1%"></al-stat>
    <al-stat value="2.4%" label="Churn rate" trend="down" delta="-0.8%" ?invertPolarity=${true}></al-stat>
    <al-stat value="4.9/5" label="Customer satisfaction" trend="none"></al-stat>
  </div>
`;
