import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import './media-card';
import '../../../al-web-components/components/layout/layout';

const meta: Meta = {
  title: 'Molecules/Media Card',
  component: 'sl-media-card',
  parameters: { status: { type: 'beta' } },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['article', 'work'] },
    featured: { control: 'boolean' },
    href: { control: 'text' },
    image: { control: 'text' },
    heading: { control: 'text' },
    excerpt: { control: 'text' },
    footerLabel: { control: 'text' }
  }
};

export default meta;
type Story = StoryObj;

/** A neutral 16:9 stand-in, inline so these stories need no static asset. */
const placeholder =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#2a2a2a"/><text x="50%" y="50%" fill="#666" font-family="monospace" font-size="20" text-anchor="middle" dominant-baseline="middle">640 &#215; 360</text></svg>`
  );

/**
 * The insights anatomy: flush image, mono meta row, title, three-line excerpt,
 * mono footer cue. The meta row is a slot, so the page decides what it says.
 */
export const Article: Story = {
  args: {
    variant: 'article',
    href: '#',
    image: placeholder,
    heading: 'Code to design is not the point — system parity is',
    excerpt:
      'Round-tripping a button between Figma and code is a party trick. The thing worth building is a system where both sides answer the same question the same way, every time.',
    footerLabel: 'read →'
  },
  render: (args) => html`
    <div style="max-width: 24rem;">
      <sl-media-card
        variant=${args.variant}
        href=${args.href}
        image=${args.image}
        heading=${args.heading}
        excerpt=${args.excerpt}
        footer-label=${args.footerLabel}
      >
        <span slot="meta" style="color: var(--al-theme-color-content-primary-default);">Design systems</span>
        <span slot="meta" aria-hidden="true">·</span>
        <time slot="meta" datetime="2026-08-12">Aug 12, 2026</time>
      </sl-media-card>
    </div>
  `
};

/**
 * The work anatomy: a taller 16:10 well, a two-line clamp, and a tag row. Each
 * slotted tag gets the brand's chip treatment through `::slotted()`, so the
 * page passes plain `<span>`s.
 */
export const Work: Story = {
  args: {
    variant: 'work',
    href: '#',
    image: placeholder,
    heading: 'PetSmart',
    excerpt: 'A design system for 1,600 stores and the teams that ship to them.',
    footerLabel: 'case study →'
  },
  render: (args) => html`
    <div style="max-width: 24rem;">
      <sl-media-card
        variant=${args.variant}
        href=${args.href}
        image=${args.image}
        heading=${args.heading}
        excerpt=${args.excerpt}
        footer-label=${args.footerLabel}
      >
        <span slot="tags">Design systems</span>
        <span slot="tags">Accessibility</span>
        <span slot="tags">Governance</span>
      </sl-media-card>
    </div>
  `
};

/**
 * With no `image`, the `fallback` glyph fills the well — the brand's bracketed
 * client initial.
 */
export const NoImage: Story = {
  args: {
    variant: 'work',
    href: '#',
    fallback: '<P>',
    heading: 'PetSmart',
    excerpt: 'A design system for 1,600 stores.',
    footerLabel: 'case study →'
  },
  render: (args) => html`
    <div style="max-width: 24rem;">
      <sl-media-card
        variant=${args.variant}
        href=${args.href}
        fallback=${args.fallback}
        heading=${args.heading}
        excerpt=${args.excerpt}
        footer-label=${args.footerLabel}
      ></sl-media-card>
    </div>
  `
};

/**
 * `featured` is the lead treatment for a card spanning two grid columns —
 * roomier padding and the larger heading step.
 */
export const Featured: Story = {
  args: {
    variant: 'article',
    featured: true,
    href: '#',
    image: placeholder,
    heading: 'Building multi-brand design systems',
    excerpt: 'One component library, several brands, and the decisions that keep them from forking.',
    footerLabel: 'read →'
  },
  render: (args) => html`
    <div style="max-width: 40rem;">
      <sl-media-card
        variant=${args.variant}
        ?featured=${args.featured}
        href=${args.href}
        image=${args.image}
        heading=${args.heading}
        excerpt=${args.excerpt}
        footer-label=${args.footerLabel}
      >
        <span slot="meta" style="color: var(--al-theme-color-content-primary-default);">Design systems</span>
        <span slot="meta" aria-hidden="true">·</span>
        <time slot="meta" datetime="2026-07-30">Jul 30, 2026</time>
      </sl-media-card>
    </div>
  `
};

/**
 * Three cards in an `<al-layout variant="grid">`. Every card fills its cell to
 * the same height and the footers line up — the card owns `block-size: 100%`
 * itself, which is what removes the `style="height:100%"` the site currently
 * repeats at 25 call sites.
 */
export const InAGrid: Story = {
  render: () => html`
    <al-layout variant="grid" columns="3" gap="lg">
      ${[
        { h: 'Short title', e: 'One line.' },
        {
          h: 'A considerably longer card title that wraps onto three lines in this column',
          e: 'And a longer excerpt to go with it, which the clamp will cut at three lines so the cards stay level.'
        },
        { h: 'Middling title here', e: 'Two lines of summary copy, roughly speaking.' }
      ].map(
        (c) => html`
          <sl-media-card href="#" image=${placeholder} heading=${c.h} excerpt=${c.e} footer-label="read →">
            <span slot="meta" style="color: var(--al-theme-color-content-primary-default);">Insights</span>
            <span slot="meta" aria-hidden="true">·</span>
            <time slot="meta" datetime="2026-08-01">Aug 1, 2026</time>
          </sl-media-card>
        `
      )}
    </al-layout>
  `
};
