import { html } from 'lit';
import { spread } from '../../directives/spread';
import './pagination-item';

export default {
  title: 'Components/Pagination Item',
  component: 'sl-pagination-item',
  tags: [ 'autodocs' ],
  parameters: { status: { type: 'beta' } },
};

const Template = (args) => html`<sl-pagination-item ${spread(args)} data-testid="pagination-item">1</sl-pagination-item>`;

export const Default = Template.bind({});
Default.args = {};

export const Disabled = Template.bind({});
Disabled.args = {
  isDisabled: true
};

export const Selected = Template.bind({});
Selected.args = {
  isSelected: true
};