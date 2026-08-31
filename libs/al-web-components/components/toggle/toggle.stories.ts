import { html } from 'lit';
import { spread } from '../../directives/spread';
import './toggle';

export default {
  title: 'Atoms/Form/Toggle',
  component: 'al-toggle',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onToggleChange']
    }
  },
  argTypes: {
    label: {
      control: 'text'
    },
    name: {
      control: 'text'
    },
    isChecked: {
      control: 'boolean'
    },
    isDisabled: {
      control: 'boolean'
    },
    fieldId: {
      control: 'text'
    }
  },
  args: {
    label: 'Toggle label',
    name: 'Toggle name'
  },
};

const Template = (args) => html`<al-toggle data-testid="al-toggle" ${spread(args)}></al-toggle> `;

export const Default = Template.bind({});
Default.args = {};

export const Checked = Template.bind({});
Checked.args = {
  isChecked: true
};

export const Disabled = Template.bind({});
Disabled.args = {
  isDisabled: true
};

export const DisabledChecked = Template.bind({});
DisabledChecked.args = {
  isDisabled: true,
  isChecked: true
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/
