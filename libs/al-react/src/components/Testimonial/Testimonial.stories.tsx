import type { StoryObj } from '@storybook/react-vite';
import { ALTestimonial, ALAvatar } from '../..';
import { placeholderImages } from '../../../../al-web-components/fixtures';

export default {
  title: 'Molecules/Testimonial',
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
        <img src={placeholderImages.avatar} alt="Jane Doe" />
      </ALAvatar>
    </ALTestimonial>
  )
};
