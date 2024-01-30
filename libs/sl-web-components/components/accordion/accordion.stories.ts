import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../accordion-panel/accordion-panel';
import './accordion';

export default {
  title: 'Molecules/Accordion',
  component: 'sl-accordion',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onAccordionPanelOpen', 'onAccordionPanelClose']
    },
  },
  decorators: [withActions],
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
