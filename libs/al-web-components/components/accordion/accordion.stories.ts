import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import './accordion';
import '../accordion-panel/accordion-panel';
import '../../.storybook/components/f-po/f-po';

export default {
  title: 'Molecules/Accordion',
  component: 'al-accordion',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onAccordionPanelOpen', 'onAccordionPanelClose']
    },
  },
  decorators: [ withActions ],
};

const Template = (args) => html`
  <al-accordion ${spread(args)}>
    <al-accordion-panel>
      <div slot="header">Label</div>
      <f-po>Accordion Panel</f-po>
    </al-accordion-panel>
    <al-accordion-panel>
      <div slot="header">Label</div>
      <f-po>Accordion Panel</f-po>
    </al-accordion-panel>
    <al-accordion-panel>
      <div slot="header">Label</div>
      <f-po>Accordion Panel</f-po>
    </al-accordion-panel>
    <al-accordion-panel ?isDisabled=${true}>
      <div slot="header">Label</div>
      <f-po>Accordion Panel</f-po>
    </al-accordion-panel>
  </al-accordion>
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
