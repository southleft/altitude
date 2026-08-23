import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import './footer';
import '../../../al-web-components/components/logo/logo';
import '../../../al-web-components/components/button/button';

const meta: Meta = {
  title: 'Organisms/Footer',
  component: 'sl-footer',
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
    <sl-footer quote=${args.quote} cite=${args.cite} copyright=${args.copyright}>
      <al-logo slot="brand" variant="southleft" href="#" aria-label="Southleft home"></al-logo>
      <p slot="brand" style="margin: 0; color: var(--al-theme-color-content-default-weak); font-size: 0.875rem;">
        Design systems consulting, engineering, and AI integration — from the team behind Figma Console MCP and Story
        UI. Founded in 2012 · rooted in New Orleans.
      </p>
      <al-button slot="brand" href="#">Book a call</al-button>

      <nav slot="columns" aria-label="Footer">
        <h2 style="margin:0; font-family: var(--sl-font-mono); font-size: 0.8125rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--al-theme-color-content-default-weak);">&lt;sitemap&gt;</h2>
        ${SITEMAP.map((l) => html`<a href="#" style="color: var(--al-theme-color-content-default-weak); text-decoration: none; font-size: 0.875rem;">${l}</a>`)}
      </nav>

      <div slot="columns">
        <h2 style="margin:0; font-family: var(--sl-font-mono); font-size: 0.8125rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--al-theme-color-content-default-weak);">&lt;elsewhere&gt;</h2>
        ${ELSEWHERE.map((l) => html`<a href="#" style="color: var(--al-theme-color-content-default-weak); text-decoration: none; font-size: 0.875rem;">${l}</a>`)}
      </div>

      <a slot="legal" href="#">Privacy policy</a>
      <a slot="legal" href="#">Cookie policy</a>
    </sl-footer>
  `
};

/**
 * Every rendered region is optional. Without a quote the legal bar follows the
 * masthead directly — the shape a shorter site wants.
 */
export const NoQuote: Story = {
  args: { copyright: '© 2026 Southleft, LLC.' },
  render: (args) => html`
    <sl-footer copyright=${args.copyright}>
      <al-logo slot="brand" variant="southleft" href="#" aria-label="Southleft home"></al-logo>
      <div slot="columns">
        <h2 style="margin:0; font-family: var(--sl-font-mono); font-size: 0.8125rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--al-theme-color-content-default-weak);">&lt;sitemap&gt;</h2>
        ${SITEMAP.slice(0, 4).map((l) => html`<a href="#" style="color: var(--al-theme-color-content-default-weak); text-decoration: none; font-size: 0.875rem;">${l}</a>`)}
      </div>
      <a slot="legal" href="#">Privacy policy</a>
    </sl-footer>
  `
};

/**
 * The track list is a custom property, so a two-column masthead needs no new
 * component — just a different `--sl-footer-template`.
 */
export const TwoColumn: Story = {
  args: { copyright: '© 2026 Southleft, LLC.' },
  render: (args) => html`
    <sl-footer style="--sl-footer-template: 2fr 1fr;" copyright=${args.copyright}>
      <al-logo slot="brand" variant="southleft" href="#" aria-label="Southleft home"></al-logo>
      <div slot="columns">
        <h2 style="margin:0; font-family: var(--sl-font-mono); font-size: 0.8125rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--al-theme-color-content-default-weak);">&lt;elsewhere&gt;</h2>
        ${ELSEWHERE.map((l) => html`<a href="#" style="color: var(--al-theme-color-content-default-weak); text-decoration: none; font-size: 0.875rem;">${l}</a>`)}
      </div>
      <a slot="legal" href="#">Privacy policy</a>
    </sl-footer>
  `
};
