import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import './pagination';

export default {
  title: 'Molecules/Pagination',
  component: 'al-pagination',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onPaginationChange']
    },
    layout: 'centered'
  },
  decorators: [ withActions ],
  args: {
    totalRecords: '200',
    pageSize: '20'
  }
};

const Template = (args) => html`<al-pagination ${spread(args)} data-testid="pagination"></al-pagination>`;

export const Default = Template.bind({});
Default.args = {};

export const Small = Template.bind({});
Small.args = {
  variant: 'small'
};