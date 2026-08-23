import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import './cta-band';
import '../../../al-web-components/components/button/button';
import '../../../al-web-components/components/layout/layout';

const meta: Meta = {
  title: 'Organisms/CTA Band',
  component: 'sl-cta-band',
  parameters: { status: { type: 'beta' }, layout: 'fullscreen' },
  tags: ['autodocs'],
  argTypes: {
    heading: { control: 'text' },
    dek: { control: 'text' },
    kicker: { control: 'text' }
  }
};

export default meta;
type Story = StoryObj;

/**
 * The band that closes 16 of the site's 24 pages. It owns the top hairline, the
 * grid texture and the rhythm; the actions come from the page, because which
 * CTAs close a page is the page's call.
 */
export const Default: Story = {
  args: {
    heading: 'Is your design system AI-ready?',
    dek: 'A 30-minute discovery call is the fastest way to find out where your leverage is.',
    kicker: '<cta>'
  },
  render: (args) => html`
    <sl-cta-band heading=${args.heading} dek=${args.dek} kicker=${args.kicker}>
      <al-layout direction="row" wrap gap="md" align="center" justify="center">
        <al-button href="#">Book a call</al-button>
        <al-button variant="tertiary" href="#">Ask about a workshop</al-button>
      </al-layout>
    </sl-cta-band>
  `
};

/**
 * One action, and nothing says the actions must be buttons at all — the slot
 * takes whatever the page puts in it.
 */
export const SingleAction: Story = {
  args: { heading: 'Ready when you are.', kicker: '<start>' },
  render: (args) => html`
    <sl-cta-band heading=${args.heading} kicker=${args.kicker}>
      <al-button href="#">Get in touch</al-button>
    </sl-cta-band>
  `
};

/**
 * The texture is a `::part()`, so a page that wants a plain band hides it
 * without forking the component. This is the escape-hatch layer of the
 * three-layer model.
 */
export const NoTexture: Story = {
  args: {
    heading: 'A quieter close',
    dek: 'Same rhythm, no grid.',
    kicker: '<cta>'
  },
  render: (args) => html`
    <style>
      .sl-plain::part(texture) {
        display: none;
      }
    </style>
    <sl-cta-band class="sl-plain" heading=${args.heading} dek=${args.dek} kicker=${args.kicker}>
      <al-button href="#">Book a call</al-button>
    </sl-cta-band>
  `
};

/**
 * Every content prop is optional. Heading and one action is the minimum useful
 * band.
 */
export const Minimal: Story = {
  args: { heading: 'Let us talk.', kicker: '' },
  render: (args) => html`
    <sl-cta-band heading=${args.heading} kicker=${args.kicker}>
      <al-button href="#">Contact</al-button>
    </sl-cta-band>
  `
};
