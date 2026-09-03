import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import './hero';
import '../../../al-web-components/components/button/button';
import '../../../al-web-components/components/chip/chip';
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

/**
 * The "loose tokens" annotation strip the site runs under the actions.
 * `<al-chip>` with the site's `.sl-token-chip` custom-property hooks — the
 * site renders these as chips (apps/southleft/src/pages/index.astro), so a
 * `<span class="chip">` here was a wrong-component drift the docs playground
 * inherited (spec 2026-08-28-southleft-docs-parity-with-example-site, R6).
 */
const chips = html`
  <al-layout gap="sm" aria-hidden="true">
    <al-layout direction="row" wrap gap="sm" align="center">
      <al-chip class="sl-token-chip"><span class="sl-token-chip__dot"></span>--sl-color-red-500: #f05735</al-chip>
      <al-chip class="sl-token-chip">--sl-font-display: Agrandir</al-chip>
      <al-chip class="sl-token-chip">--sl-ease-out: cubic-bezier(.22,1,.36,1)</al-chip>
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
      <span class="term__dot term__dot--1"></span><span class="term__dot term__dot--2"></span><span
        class="term__dot term__dot--3"
      ></span>
      <span class="term__title">southleft — mcp</span>
    </div>
    <pre class="term__body">
<span class="term__prompt">$</span> <span class="term__cmd">npx story-ui init</span>
<span class="term__ok">✓</span> <span class="term__out">design system detected</span>
<span class="term__ok">✓</span> <span class="term__out">tokens parsed · 214 components indexed</span>
<span class="term__ok">✓</span> <span class="term__out">MCP server connected</span>
<span class="term__prompt">›</span> <span class="term__cmd">"build a pricing page from our system"</span>
<span class="term__key">agent</span> <span class="term__out">composing layout… <span class="term__ok">done in 9s</span></span>
<span class="term__out">— every component from your library. zero rogue divs.</span></pre>
  </div>
`;

/**
 * Story-only styling for the two slotted fixtures above. Not part of the
 * component — but VALUE-FOR-VALUE the same treatment the site gives the same
 * fixtures (`.sl-token-chip` / `.sl-terminal` in
 * apps/southleft/src/styles/layout.css), because the docs playground executes
 * this story as its preview: any drift here renders as docs↔site drift. The
 * terminal deliberately uses the brand PRIMITIVES (`--al-color-southleft-*`) —
 * the site's terminal is always an ink panel regardless of mode, by design.
 */
const fixtureStyles = html`
  <style>
    .sl-token-chip {
      --al-chip-font-family: var(--sl-font-mono, 'IBM Plex Mono', monospace);
      --al-chip-color: var(--al-theme-color-content-neutral-weak);
      --al-chip-border: var(--al-theme-border-width) solid
        color-mix(in srgb, var(--al-theme-color-border-neutral-weak) 55%, transparent);
      --al-chip-border-radius: var(--al-theme-border-radius-xs);
      --al-chip-padding: var(--al-theme-space-xxs) var(--al-theme-space-xs);
      --al-chip-gap: 0.5em;
      --al-chip-background: color-mix(in srgb, var(--al-theme-color-background-neutral-default) 65%, transparent);
      --al-chip-cursor: default;
    }
    .sl-token-chip__dot {
      display: inline-block;
      inline-size: 0.5rem;
      block-size: 0.5rem;
      border-radius: var(--al-theme-border-radius-role-action);
      background: var(--al-theme-color-content-primary-default);
    }
    .chip-note {
      margin: 0;
      font-family: var(--sl-font-mono, 'IBM Plex Mono', monospace);
      font-size: 0.75rem;
      color: var(--al-theme-color-content-neutral-weak);
    }
    .term {
      background: var(--al-color-southleft-neutral-dark-950);
      color: var(--al-color-southleft-neutral-light-100);
      border: var(--al-theme-border-width) solid var(--al-color-southleft-neutral-dark-600);
      border-radius: var(--al-theme-border-radius-md);
      font-family: var(--sl-font-mono, 'IBM Plex Mono', monospace);
      line-height: 1.7;
      overflow: hidden;
    }
    .term__bar {
      display: flex;
      align-items: center;
      gap: var(--al-theme-space-xs);
      padding: var(--al-theme-space-sm) var(--al-theme-space);
      border-block-end: var(--al-theme-border-width) solid var(--al-color-southleft-neutral-dark-700);
      background: var(--al-color-southleft-neutral-dark-900);
    }
    .term__dot {
      inline-size: 0.625rem;
      block-size: 0.625rem;
      border-radius: var(--al-theme-border-radius-role-action);
    }
    .term__dot--1 {
      background: var(--al-color-danger-500);
    }
    .term__dot--2 {
      background: var(--al-color-southleft-neutral-light-400);
    }
    .term__dot--3 {
      background: var(--al-color-primary-400);
    }
    .term__title {
      margin-inline-start: auto;
      font-size: 0.6875rem;
      color: var(--al-color-southleft-neutral-light-500);
    }
    .term__body {
      margin: 0;
      padding: var(--al-theme-space-md) var(--al-theme-space-lg);
      font-size: 0.8125rem;
      overflow-x: auto;
      white-space: pre-wrap;
    }
    .term__prompt {
      color: var(--al-color-danger-500);
    }
    .term__cmd {
      color: var(--al-color-southleft-neutral-light-50);
    }
    .term__out {
      color: var(--al-color-southleft-neutral-light-400);
    }
    .term__ok {
      color: var(--al-color-success-500);
    }
    .term__key {
      color: var(--al-color-primary-400);
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
