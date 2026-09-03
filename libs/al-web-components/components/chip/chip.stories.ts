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
      options: ['default', 'neutral', 'bare', 'primary', 'secondary', 'tertiary'],
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

export const Primary = Template.bind({});
Primary.args = {
  variant: 'primary',
  text: 'Research'
};

export const Tertiary = Template.bind({});
Tertiary.args = {
  variant: 'tertiary',
  text: 'Stable'
};

export const Neutral = Template.bind({});
Neutral.args = {
  variant: 'neutral'
};

export const Bare = Template.bind({});
Bare.args = {
  variant: 'bare'
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

