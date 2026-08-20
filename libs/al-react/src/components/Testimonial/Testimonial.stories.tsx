import type { StoryObj } from '@storybook/react-vite';
import { ALTestimonial, ALAvatar } from '../..';

export default {
  title: 'Organisms/Testimonial',
  component: ALTestimonial,
  parameters: {
    status: { type: 'beta' }
  },
  args: {
    attribution: 'Jane Doe',
    role: 'VP of Engineering',
    company: 'Acme Corp',
    children:
      'Altitude let us ship a fully re-branded marketing site in an afternoon — same components, completely different look.'
  }
};

export const Default: StoryObj<typeof ALTestimonial> = {};

export const WithAvatar: StoryObj<typeof ALTestimonial> = {
  render: (args) => (
    <ALTestimonial {...args}>
      {args.children}
      <ALAvatar slot="avatar">
        <img src="https://i.pravatar.cc/80" alt="Jane Doe" />
      </ALAvatar>
    </ALTestimonial>
  )
};
