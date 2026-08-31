import { html } from 'lit';
import { spread } from '../../directives/spread';
import './chip';
import '../icon/icons/warning-triangle';

export default {
  title: 'Atoms/Chip',
  component: 'al-chip',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['click', 'onChipClose']
    }
  },
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['default', 'secondary', 'info', 'success', 'warning', 'danger'],
    },
    type: {
      control: { type: 'radio' },
      options: ['default', 'squared'],
    },
    isDismissible: {
      control: 'boolean',
    },
  },
};

const Template = ({ text, ...args }) => html`<al-chip ${spread(args)}>${text ?? 'Design'}</al-chip>`;

export const Default = Template.bind({});
Default.args = {};

export const Secondary = Template.bind({});
Secondary.args = {
  variant: 'secondary',
  text: 'Engineering'
};

export const Info = Template.bind({});
Info.args = {
  variant: 'info',
  text: 'Research'
};

export const Success = Template.bind({});
Success.args = {
  variant: 'success',
  text: 'Stable'
};

export const Warning = Template.bind({});
Warning.args = {
  variant: 'warning'
};

export const Danger = Template.bind({});
Danger.args = {
  variant: 'danger'
};

const TemplateIcon = (args) => html`<al-chip ${spread(args)} data-testid="chip"><al-icon-warning-triangle></al-icon-warning-triangle>Label</al-chip>`;

export const WithIcon = TemplateIcon.bind({});
WithIcon.args = {};

export const WithIconDismissible = TemplateIcon.bind({});
WithIconDismissible.args = {
  isDismissible: true
};

export const WithDismissible = Template.bind({});
WithDismissible.args = {
  isDismissible: true
};

export const Squared = Template.bind({});
Squared.args = {
  type: 'squared'
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

