import { html } from 'lit';
import { spread } from '../../directives/spread';
import './pagination';

export default {
  title: 'Components/Pagination',
  component: 'sl-pagination',
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['change']
    }
  },
  args: {
    totalRecords: '200',
    pageSize: '20'
  }
};

const Template = (args) => html`<sl-pagination ${spread(args)} data-testid="pagination"></sl-pagination>`;

export const Default = Template.bind({});
Default.args = {};

export const Small = Template.bind({});
Small.args = {
  variant: 'small'
};