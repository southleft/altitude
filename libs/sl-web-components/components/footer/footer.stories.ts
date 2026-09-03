import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import './footer';
import '../../../al-web-components/components/logo/logo';
import '../../../al-web-components/components/button/button';

const meta: Meta = {
  title: 'Organisms/Footer',
  component: 'al-footer',
  parameters: { status: { type: 'beta' }, layout: 'fullscreen' },
  tags: ['autodocs'],
  argTypes: {
    quote: { control: 'text' },
    cite: { control: 'text' },
    copyright: { control: 'text' }
  }
};

export default meta;
type Story = StoryObj;

const SITEMAP = ['AI + Design Systems', 'Services', 'Work', 'Insights', 'About', 'Speaking', 'Contact'];
const ELSEWHERE = ['LinkedIn', 'Substack', 'GitHub'];

/**
 * Story-only styling for the slotted fixtures — VALUE-FOR-VALUE the treatment
 * the site gives the same slots (`.sl-kicker` / `.sl-footer__*` in
 * apps/southleft/src/styles/layout.css and Footer.astro). The docs playground
 * executes this story as its preview, so the previous per-element inline
 * styles (literal font sizes, unstructured bare links) rendered as docs↔site
 * drift (spec 2026-08-28-southleft-docs-parity-with-example-site, R6).
 */
const fixtureStyles = html`
  <style>
    .sl-kicker {
      font-family: var(--sl-font-mono, 'IBM Plex Mono', monospace);
      font-size: 0.8125rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--al-theme-color-content-neutral-weak);
      margin: 0;
    }
    .footer-blurb {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.625;
      color: var(--al-theme-color-content-neutral-weak);
    }
    .footer-links {
      list-style: none;
      margin: 1rem 0 0;
      padding: 0;
      font-size: 0.875rem;
    }
    .footer-links li + li {
      margin-block-start: 0.5rem;
    }
    .footer-link {
      color: var(--al-theme-color-content-neutral-weak);
      text-decoration: none;
      transition: color var(--al-theme-animation-duration) var(--al-theme-animation-timing);
    }
    .footer-link:hover {
      color: var(--al-theme-color-content-neutral-default);
    }
    .footer-link:focus-visible {
      outline: 2px solid var(--al-theme-color-content-info-default);
      outline-offset: 2px;
    }
  </style>
`;

const linkList = (links: string[]) => html`
  <ul class="footer-links">
    ${links.map((l) => html`<li><a href="#" class="footer-link">${l}</a></li>`)}
  </ul>
`;

/**
 * The masthead as the site ships it: a wider brand column, then sitemap and
 * elsewhere. The 1.4fr/1fr/1fr track list rides al-layout's documented
 * `--al-layout-template` hook — an asymmetric masthead is never a reason to
 * hand-roll `display: grid`.
 */
export const Default: Story = {
  args: {
    quote: '“If I cannot do great things, I can do small things in a great way.”',
    cite: '— attributed to Dr. Martin Luther King Jr.',
    copyright: '© 2026 Southleft, LLC. All rights reserved.'
  },
  render: (args) => html`
    ${fixtureStyles}
    <al-footer quote=${args.quote} cite=${args.cite} copyright=${args.copyright}>
      <al-logo slot="brand" variant="southleft" href="#" aria-label="Southleft home"></al-logo>
      <p slot="brand" class="footer-blurb">
        Design systems consulting, engineering, and AI integration — from the team behind Figma Console MCP and Story
        UI. Founded in 2012 · rooted in New Orleans.
      </p>
      <al-button slot="brand" href="#">Book a call</al-button>

      <nav slot="columns" aria-label="Footer">
        <h2 class="sl-kicker">&lt;sitemap&gt;</h2>
        ${linkList(SITEMAP)}
      </nav>

      <div slot="columns">
        <h2 class="sl-kicker">&lt;elsewhere&gt;</h2>
        ${linkList(ELSEWHERE)}
      </div>

      <a slot="legal" href="#" class="footer-link">Privacy policy</a>
      <a slot="legal" href="#" class="footer-link">Cookie policy</a>
    </al-footer>
  `
};

/**
 * Every rendered region is optional. Without a quote the legal bar follows the
 * masthead directly — the shape a shorter site wants.
 */
export const NoQuote: Story = {
  args: { copyright: '© 2026 Southleft, LLC.' },
  render: (args) => html`
    ${fixtureStyles}
    <al-footer copyright=${args.copyright}>
      <al-logo slot="brand" variant="southleft" href="#" aria-label="Southleft home"></al-logo>
      <div slot="columns">
        <h2 class="sl-kicker">&lt;sitemap&gt;</h2>
        ${linkList(SITEMAP.slice(0, 4))}
      </div>
      <a slot="legal" href="#" class="footer-link">Privacy policy</a>
    </al-footer>
  `
};

/**
 * The track list is a custom property, so a two-column masthead needs no new
 * component — just a different `--al-footer-template`.
 */
export const TwoColumn: Story = {
  args: { copyright: '© 2026 Southleft, LLC.' },
  render: (args) => html`
    ${fixtureStyles}
    <al-footer style="--al-footer-template: 2fr 1fr;" copyright=${args.copyright}>
      <al-logo slot="brand" variant="southleft" href="#" aria-label="Southleft home"></al-logo>
      <div slot="columns">
        <h2 class="sl-kicker">&lt;elsewhere&gt;</h2>
        ${linkList(ELSEWHERE)}
      </div>
      <a slot="legal" href="#" class="footer-link">Privacy policy</a>
    </al-footer>
  `
};
