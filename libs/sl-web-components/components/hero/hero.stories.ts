import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import './hero';
import '../../../al-web-components/components/button/button';
import '../../../al-web-components/components/layout/layout';

const meta: Meta = {
  title: 'Organisms/Hero',
  component: 'al-hero',
  parameters: { status: { type: 'beta' }, layout: 'fullscreen' },
  tags: ['autodocs'],
  argTypes: {
    kicker: { control: 'text' },
    heading: { control: 'text' },
    lead: { control: 'text' }
  }
};

export default meta;
type Story = StoryObj;

const HEADING = 'AI-powered design systems. Built by the people building the tools.';
const LEAD =
  'We audit, build, and evolve design systems for teams at Caterpillar, Novartis, UPS, and NASDAQ — and we build the open-source AI tooling the design systems community actually uses. We don’t just talk about this stuff. We build it.';

/** The "loose tokens" annotation strip the site runs under the actions. */
const chips = html`
  <al-layout gap="sm" aria-hidden="true">
    <al-layout direction="row" wrap gap="sm" align="center">
      <span class="chip">--sl-color-red-500: #f05735</span>
      <span class="chip">--sl-font-display: Agrandir</span>
      <span class="chip">--sl-ease-out: cubic-bezier(.22,1,.36,1)</span>
    </al-layout>
    <p class="chip-note">// loose tokens — drag them around</p>
  </al-layout>
`;

/**
 * The terminal panel is ONE-OFF BRAND ART — it appears on a single page, so by
 * the reuse test it belongs to `apps/southleft`, not to the design system. It
 * is reproduced here only so the story shows the hero's real two-column
 * balance; the component's contract is the `aside` slot, not this markup.
 */
const terminal = html`
  <div class="term">
    <div class="term__bar" aria-hidden="true">
      <span class="term__dot"></span><span class="term__dot"></span><span class="term__dot"></span>
      <span class="term__title">southleft — mcp</span>
    </div>
    <pre class="term__body">
<span class="term__prompt">$</span> <span class="term__cmd">npx story-ui init</span>
<span class="term__ok">✓</span> design system detected
<span class="term__ok">✓</span> tokens parsed · 214 components indexed
<span class="term__ok">✓</span> MCP server connected
<span class="term__prompt">›</span> <span class="term__cmd">"build a pricing page from our system"</span>
<span class="term__key">agent</span> composing layout… <span class="term__ok">done in 9s</span>
— every component from your library. zero rogue divs.</pre>
  </div>
`;

/** Story-only styling for the two slotted fixtures above. Not part of the component. */
const fixtureStyles = html`
  <style>
    .chip,
    .chip-note {
      font-family: var(--sl-font-mono, 'IBM Plex Mono', monospace);
      font-size: 0.75rem;
      color: var(--al-theme-color-content-default-weak);
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.625rem;
      border: 1px solid color-mix(in srgb, var(--al-theme-color-border-default-weak) 55%, transparent);
      border-radius: var(--al-theme-border-radius-xs);
    }
    .chip-note {
      margin: 0;
    }
    .term {
      border: 1px solid color-mix(in srgb, var(--al-theme-color-border-default-weak) 55%, transparent);
      border-radius: var(--al-theme-border-radius);
      background: var(--al-theme-color-background-default-strong);
      overflow: hidden;
    }
    .term__bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.875rem;
      border-block-end: 1px solid color-mix(in srgb, var(--al-theme-color-border-default-weak) 55%, transparent);
    }
    .term__dot {
      inline-size: 0.5rem;
      block-size: 0.5rem;
      border-radius: 50%;
      background: color-mix(in srgb, var(--al-theme-color-border-default-weak) 80%, transparent);
    }
    .term__title {
      margin-inline-start: auto;
      font-family: var(--sl-font-mono, monospace);
      font-size: 0.6875rem;
      color: var(--al-theme-color-content-default-weak);
    }
    .term__body {
      margin: 0;
      padding: 1rem;
      font-family: var(--sl-font-mono, monospace);
      font-size: 0.8125rem;
      line-height: 1.7;
      color: var(--al-theme-color-content-default-weak);
      white-space: pre-wrap;
    }
    .term__prompt,
    .term__key {
      color: var(--al-theme-color-content-primary-default);
    }
    .term__cmd {
      color: var(--al-theme-color-content-default);
    }
    .term__ok {
      color: var(--al-theme-color-content-success-default, #7bbf7b);
    }
  </style>
`;

/**
 * The homepage hero as southleft.com ships it: grid texture, kicker, an 18ch
 * display headline, then the lead column beside a supporting panel.
 */
export const Default: Story = {
  args: { kicker: '<southleft>', heading: HEADING, lead: LEAD },
  render: (args) => html`
    ${fixtureStyles}
    <al-hero kicker=${args.kicker} heading=${args.heading} lead=${args.lead}>
      <al-button slot="actions" href="#">Book a call</al-button>
      <al-button slot="actions" variant="tertiary" href="#">See how we work</al-button>
      <div slot="chips">${chips}</div>
      <div slot="aside">${terminal}</div>
    </al-hero>
  `
};

/**
 * Without an `aside` the lead column runs the full measure — the shape a
 * landing page with no supporting panel wants. Nothing about the component
 * changes; the slot is simply empty.
 */
export const NoAside: Story = {
  args: { kicker: '<southleft>', heading: HEADING, lead: LEAD },
  render: (args) => html`
    ${fixtureStyles}
    <al-hero kicker=${args.kicker} heading=${args.heading} lead=${args.lead}>
      <al-button slot="actions" href="#">Book a call</al-button>
      <al-button slot="actions" variant="tertiary" href="#">See how we work</al-button>
    </al-hero>
  `
};

/**
 * The texture is a `::part()`, so a page can drop it without forking the
 * component — the escape-hatch layer of the three-layer model (reflected
 * attribute → custom property → part).
 */
export const NoTexture: Story = {
  args: { kicker: '<southleft>', heading: 'A quieter opening.', lead: LEAD },
  render: (args) => html`
    ${fixtureStyles}
    <style>
      .plain::part(texture) {
        display: none;
      }
    </style>
    <al-hero class="plain" kicker=${args.kicker} heading=${args.heading} lead=${args.lead}>
      <al-button slot="actions" href="#">Book a call</al-button>
    </al-hero>
  `
};
