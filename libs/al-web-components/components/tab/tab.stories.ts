import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../icon/icons/success';
import './tab';

export default {
  title: 'Atoms/Navigation/Tab',
  component: 'al-tab',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onTabSelect']
    },
    controls: {
      exclude: ['ariaId', 'ariaControls', 'idx', 'tabEl']
    },
  },
  argTypes: {
    isActive: {
      control: 'boolean',
    },
    isDisabled: {
      control: 'boolean',
    },
  },
};

const Template = (args) => html`<al-tab ${spread(args)} data-testid="tab"><al-icon-success></al-icon-success>Label<al-badge variant="danger">2</al-badge></al-tab>`;

export const Default = Template.bind({});
Default.args = {};

export const Selected = Template.bind({});
Selected.args = {
  isActive: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  isDisabled: true,
};

export const DisabledSelected = Template.bind({});
DisabledSelected.args = {
  isActive: true,
  isDisabled: true,
};

const TemplateWithIconOnly = (args) => html`<al-tab ${spread(args)} data-testid="tab"><al-icon-success></al-icon-success><span class="al-u-is-vishidden">Label</span></al-tab>`;

export const WithIconOnly = TemplateWithIconOnly.bind({});
WithIconOnly.args = {
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/
