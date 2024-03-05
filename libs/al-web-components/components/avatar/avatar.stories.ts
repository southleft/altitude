import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../icon/icons/user';
import './avatar';

export default {
  title: 'Atoms/Avatar',
  component: 'al-avatar',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered'
  },
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['default', 'sm']
    },
    hasBadge: {
      control: 'boolean',
    },
    badgeVariant: {
      control: 'radio',
      options: ['default', 'success', 'warning', 'danger'],
    },
  },
};

const Template = (args) => html`<al-avatar ${spread(args)} data-testid="avatar">WW</al-avatar>`;

const TemplateWithIcon = (args) => html`
  <al-avatar ${spread(args)}>
    <al-icon-user></al-icon-user>
  </al-avatar>
`;

const TemplateWithImage = (args) => html`
  <al-avatar ${spread(args)} data-testid="avatar-with-image">
    <img src="https://picsum.photos/80/80" alt="Alt text" />
  </al-avatar>
`;

export const Default = Template.bind({});
Default.args = {};

export const WithIcon = TemplateWithIcon.bind({});
WithIcon.args = {};

export const WithImage = TemplateWithImage.bind({});
WithImage.args = {};

export const Small = Template.bind({});
Small.args = {
  variant: 'sm',
};

export const SmallWithIcon = TemplateWithIcon.bind({});
SmallWithIcon.args = {
  ...Small.args,
};

export const SmallWithImage = TemplateWithImage.bind({});
SmallWithImage.args = {
  ...Small.args,
};

export const HasBadge = Template.bind({});
HasBadge.args = {
  hasBadge: true,
  badgeVariant: 'success'
};

export const HasBadgeWithIcon = TemplateWithIcon.bind({});
HasBadgeWithIcon.args = {
  ...HasBadge.args,
};

export const HasBadgeWithImage = TemplateWithImage.bind({});
HasBadgeWithImage.args = {
  ...HasBadge.args,
};

export const HasBadgeSmall = Template.bind({});
HasBadgeSmall.args = {
  ...HasBadge.args,
  ...Small.args,
};

export const HasBadgeSmallWithIcon = TemplateWithIcon.bind({});
HasBadgeSmallWithIcon.args = {
  ...HasBadge.args,
  ...Small.args,
};

export const HasBadgeSmallWithImage = TemplateWithImage.bind({});
HasBadgeSmallWithImage.args = {
  ...HasBadge.args,
  ...Small.args,
};