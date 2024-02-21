import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../button/button';
import '../icon/icons/emoji';
import './badge';

export default {
  title: 'Atoms/Badge',
  component: 'al-badge',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered'
  },
  argTypes: {
    isDot: {
      control: 'boolean'
    },
    variant: {
      control: 'radio',
      options: ['default', 'success', 'warning', 'danger']
    },
    position: {
      control: 'radio',
      options: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
    }
  }
};

const Template = (args) => html`<al-badge ${spread(args)}>0</al-badge>`;

export const Default = Template.bind({});
Default.args = {};

export const DefaultSuccess = Template.bind({});
DefaultSuccess.args = {
  variant: 'success'
};

export const DefaultWarning = Template.bind({});
DefaultWarning.args = {
  variant: 'warning'
};

export const DefaultDanger = Template.bind({});
DefaultDanger.args = {
  variant: 'danger'
};

export const Dot = Template.bind({});
Dot.args = {
  isDot: true
};

export const DotSuccess = Template.bind({});
DotSuccess.args = {
  isDot: true,
  variant: 'success'
};

export const DotWarning = Template.bind({});
DotWarning.args = {
  isDot: true,
  variant: 'warning'
};

export const DotDanger = Template.bind({});
DotDanger.args = {
  isDot: true,
  variant: 'danger'
};

const TemplatePosition = (args) => html`
  <div>
    <al-badge ${spread(args)}>Notifications</al-badge>
    <al-button>Label</al-button>
  </div>
`;

export const PositionTopLeft = TemplatePosition.bind({});
PositionTopLeft.args = {
  isDot: true,
  variant: 'success',
  position: 'top-left'
};

export const PositionTopRight = TemplatePosition.bind({});
PositionTopRight.args = {
  isDot: true,
  variant: 'success',
  position: 'top-right'
};

export const PositionBottomLeft = TemplatePosition.bind({});
PositionBottomLeft.args = {
  isDot: true,
  variant: 'success',
  position: 'bottom-left'
};

export const PositionBottomRight = TemplatePosition.bind({});
PositionBottomRight.args = {
  isDot: true,
  variant: 'success',
  position: 'bottom-right'
};
