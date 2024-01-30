import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import './pagination';

export default {
  title: 'Molecules/Pagination',
  component: 'sl-pagination',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onPaginationChange']
    }
  },
  decorators: [withActions],
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