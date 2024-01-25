import { html } from 'lit';
import { spread } from '../../directives/spread';
import './accordion-panel';

export default {
  title: 'Components/Accordion Panel',
  component: 'sl-accordion-panel',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['open', 'close']
    },
  },
};

const Template = (args) => html`
  <sl-accordion-panel ${spread(args)}>
    <div slot="header">Label</div>
    <f-po>Accordion Panel</f-po>
  </sl-accordion-panel>
`;

export const Default = Template.bind({});
Default.args = {}

export const Disabled = Template.bind({});
Disabled.args = {
  isDisabled: true,
}

export const Last = Template.bind({});
Last.args = {
  isLast: true,
}
