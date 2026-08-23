import { html } from 'lit';
import { spread } from '../../directives/spread';
import './testimonial';
import '../avatar/avatar';
import { placeholderImages } from '../../.storybook/fixtures';

export default {
  title: 'Molecules/Testimonial',
  component: 'al-testimonial',
  tags: ['autodocs'],
  parameters: {
    status: { type: 'beta' }
  }
};

const Template = (args) => html`
  <al-testimonial ${spread(args)}>Altitude let us ship a fully re-branded marketing site in an afternoon — same components, completely different look.</al-testimonial>
`;

export const Default = Template.bind({});
Default.args = {
  attribution: 'Jane Doe',
  role: 'VP of Engineering',
  company: 'Acme Corp'
};

export const WithAvatar = (args) => html`
  <al-testimonial ${spread(args)}>
    Altitude let us ship a fully re-branded marketing site in an afternoon — same components, completely different look.
    <al-avatar slot="avatar"><img src=${placeholderImages.avatar} alt="Jane Doe" /></al-avatar>
  </al-testimonial>
`;
WithAvatar.args = {
  attribution: 'Jane Doe',
  role: 'VP of Engineering',
  company: 'Acme Corp'
};

export const RoleOnly = Template.bind({});
RoleOnly.args = {
  attribution: 'Jane Doe',
  role: 'VP of Engineering'
};
