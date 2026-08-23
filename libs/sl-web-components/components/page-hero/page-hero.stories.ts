import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import './page-hero';
import '../../../al-web-components/components/button/button';
import '../../../al-web-components/components/layout/layout';

const meta: Meta = {
  title: 'Organisms/Page Hero',
  component: 'sl-page-hero',
  parameters: { status: { type: 'beta' }, layout: 'fullscreen' },
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    heading: { control: 'text' },
    dek: { control: 'text' },
    headingTag: { control: 'select', options: ['h1', 'h2', 'h3'] }
  }
};

export default meta;
type Story = StoryObj;

/**
 * The interior-page hero as 19 of the site's 24 pages use it: eyebrow, display
 * heading, lead. The band owns its vertical rhythm and nothing else — the stack
 * inside is an `<al-layout>`.
 */
export const Default: Story = {
  args: {
    label: 'Services',
    heading: 'Design systems that hold up',
    dek: 'We build the system, the governance around it, and the muscle to keep it alive after we leave.'
  },
  render: (args) => html`
    <sl-page-hero label=${args.label} heading=${args.heading} dek=${args.dek}></sl-page-hero>
  `
};

/**
 * The default slot takes whatever the page adds below the lead. Here, two CTAs
 * in an `<al-layout>` row — the hero takes no position on how they sit, which
 * is exactly the escape `al-hero` never offered.
 */
export const WithActions: Story = {
  args: {
    label: 'Contact',
    heading: 'Start with a conversation',
    dek: 'A 30-minute call is the fastest way to find out where your leverage is.'
  },
  render: (args) => html`
    <sl-page-hero label=${args.label} heading=${args.heading} dek=${args.dek}>
      <al-layout direction="row" wrap gap="md">
        <al-button href="#">Book a call</al-button>
        <al-button variant="tertiary" href="#">See our work</al-button>
      </al-layout>
    </sl-page-hero>
  `
};

/**
 * Every content prop is optional. Heading only is a valid, quieter band — used
 * where the page title carries no framing copy.
 */
export const HeadingOnly: Story = {
  args: { heading: 'Insights' },
  render: (args) => html`<sl-page-hero heading=${args.heading}></sl-page-hero>`
};

/**
 * `heading-tag` is a document-outline control, not a size control. A hero used
 * as a section rather than the page title should not claim the page's `h1`.
 */
export const AsSection: Story = {
  args: {
    label: 'Capabilities',
    heading: 'What we do',
    dek: 'Four practices, one system.',
    headingTag: 'h2'
  },
  render: (args) => html`
    <sl-page-hero label=${args.label} heading=${args.heading} dek=${args.dek} heading-tag=${args.headingTag}></sl-page-hero>
  `
};

/**
 * The band's rhythm is a custom property, so a page can tighten it without
 * forking the component — the tuning layer of the three-layer model
 * (attribute → custom property → `::part()`).
 */
export const TightRhythm: Story = {
  args: { label: 'Legal', heading: 'Privacy policy' },
  render: (args) => html`
    <sl-page-hero style="--sl-page-hero-padding-block: 2rem;" label=${args.label} heading=${args.heading}></sl-page-hero>
  `
};
