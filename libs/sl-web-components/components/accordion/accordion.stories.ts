import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../accordion-panel/accordion-panel';
import './accordion';

export default {
  title: 'Components/Accordion',
  component: 'sl-accordion',
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['open', 'close']
    },
  },
};

const Template = (args) => html`
  <sl-accordion ${spread(args)}>
    <sl-accordion-panel>
      <div slot="header">Label</div>
      <f-po>Accordion Panel</f-po>
    </sl-accordion-panel>
    <sl-accordion-panel>
      <div slot="header">Label</div>
      <f-po>Accordion Panel</f-po>
    </sl-accordion-panel>
    <sl-accordion-panel>
      <div slot="header">Label</div>
      <f-po>Accordion Panel</f-po>
    </sl-accordion-panel>
    <sl-accordion-panel ?isDisabled=${true}>
      <div slot="header">Label</div>
      <f-po>Accordion Panel</f-po>
    </sl-accordion-panel>
  </sl-accordion>
`;

export const Default = Template.bind({});
Default.args = {}

export const ExpandOneOnly = Template.bind({});
ExpandOneOnly.args = {
  expandOneOnly: true,
}

export const ExpandAll = Template.bind({});
ExpandAll.args = {
  expandAll: true,
}
