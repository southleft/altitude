import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './hero.scss';

/**
 * Component: al-hero
 *
 * A page-level hero band. Purely compositional: every visual decision
 * (type scale, radius, spacing, color) comes from the active theme's
 * tokens, so the same hero re-skins per brand. The `layout` prop is the
 * structural lever pages flip per theme so a brand change reads as a
 * different site, not a recolor.
 *
 * @slot - The main body copy of the hero (renders below the heading).
 * @slot eyebrow - Small intro line above the heading (chip, badge, or text).
 * @slot heading - The hero heading (typically an al-heading with a display variant).
 * @slot actions - Call-to-action row (buttons/links).
 * @slot media - Visual area (image, illustration, or composed cards).
 * @slot meta - Bottom strip (stats, logo row, scroll hint). Renders full-width under the main area.
 * @cssproperty --al-hero-max-width - Max width of the contained content. Default 75rem.
 * @cssproperty --al-hero-min-height - Minimum block size of the main area. Default none.
 * @cssproperty --al-hero-gap - Gap between content and media. Defaults to the theme space ramp.
 * @cssproperty --al-hero-padding-block - Vertical padding of the band. Defaults to the theme space ramp.
 *
 * Marketing-organism additions (additive, zero visual change when unset):
 * `contentAlignment` gives the content column an explicit cross-axis
 * alignment instead of the implicit centered default, and `overlay` adds a
 * scrim behind poster media so text stays legible over busy imagery.
 */
export class ALHero extends ALElement {
  static el = 'al-hero';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Layout
   * - **split** (default) Content on one side, media on the other
   * - **centered** Content centered, media below
   * - **stacked** Left-aligned content, full-width media below
   * - **poster** Media as full-bleed backdrop, oversized content on top
   */
  @property()
  accessor layout: 'centered' | 'stacked' | 'poster';

  /**
   * Media position (split layout only)
   * - **default** Media renders after the content (end)
   * - **start** Media renders before the content
   */
  @property()
  accessor mediaPosition: 'start';

  /**
   * When true, constrains content to `--al-hero-max-width` and centers it.
   */
  @property({ type: Boolean })
  accessor contained: boolean;

  /**
   * Content alignment (split/centered/stacked layouts). Unset preserves the
   * existing centered-by-default behavior — set this only to opt into an
   * explicit start/end alignment.
   * - **start** Aligns the content column to the block-start edge
   * - **end** Aligns the content column to the block-end edge
   */
  @property()
  accessor contentAlignment: 'start' | 'end';

  /**
   * When true (poster layout only), renders a gradient scrim behind the
   * background media so overlaid text stays legible. No-op on other layouts.
   * Defaults to false — no visual change unless explicitly opted in.
   */
  @property({ type: Boolean })
  accessor overlay: boolean;

  render() {
    const componentClassNames = this.componentClassNames('al-c-hero', {
      'al-c-hero--centered': this.layout === 'centered',
      'al-c-hero--stacked': this.layout === 'stacked',
      'al-c-hero--poster': this.layout === 'poster',
      'al-c-hero--media-start': this.mediaPosition === 'start',
      'al-c-hero--contained': this.contained === true,
      'al-c-hero--align-start': this.contentAlignment === 'start',
      'al-c-hero--align-end': this.contentAlignment === 'end',
      'al-c-hero--overlay': this.overlay === true
    });

    return html`
      <section class="${componentClassNames}">
        <div class="al-c-hero__inner">
          ${this.slotNotEmpty('media') &&
          html`
            <div class="al-c-hero__media">
              <slot name="media"></slot>
            </div>
          `}
          <div class="al-c-hero__content">
            ${this.slotNotEmpty('eyebrow') &&
            html`
              <div class="al-c-hero__eyebrow">
                <slot name="eyebrow"></slot>
              </div>
            `}
            ${this.slotNotEmpty('heading') &&
            html`
              <div class="al-c-hero__heading">
                <slot name="heading"></slot>
              </div>
            `}
            <div class="al-c-hero__body">
              <slot></slot>
            </div>
            ${this.slotNotEmpty('actions') &&
            html`
              <div class="al-c-hero__actions">
                <slot name="actions"></slot>
              </div>
            `}
          </div>
        </div>
        ${this.slotNotEmpty('meta') &&
        html`
          <div class="al-c-hero__meta">
            <slot name="meta"></slot>
          </div>
        `}
      </section>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALHero.el) === undefined) {
  customElements.define(ALHero.el, ALHero);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-hero': ALHero;
  }
}
