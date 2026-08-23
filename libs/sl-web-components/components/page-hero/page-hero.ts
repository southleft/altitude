import { html, unsafeCSS, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../../../al-web-components/components/ALElement';
import '../../../al-web-components/components/layout/layout';
import '../../../al-web-components/components/chip/chip';
import '../../../al-web-components/components/heading/heading';
import '../../../al-web-components/components/text-block/text-block';
import styles from './page-hero.scss';

/**
 * Component: al-page-hero
 *
 * Southleft's INTERIOR-page hero band — an eyebrow, a display heading, a lead
 * paragraph, and whatever the page adds below. Appears on 19 of the site's 24
 * pages.
 *
 * Not to be confused with `al-hero`, the HOMEPAGE hero: that one is a
 * two-column landing composition with the grid texture behind it. They are
 * genuinely different shapes, and the site's own class names (`.al-page-hero`
 * vs `.al-hero`) already tell them apart — this keeps that distinction rather
 * than overloading one name with two jobs.
 *
 * What it owns is the BAND: the vertical rhythm, and the eyebrow hugging its
 * content instead of stretching. Arrangement is `<al-layout>`'s job, and the
 * stack below is exactly that — nested in the shadow root so the page does not
 * have to restate it, not replaced by a grid of this component's own.
 *
 * ```html
 * <al-page-hero label="Services" heading="Design systems that hold" dek="…">
 *   <al-layout direction="row" gap="md">
 *     <al-button>Book a call</al-button>
 *   </al-layout>
 * </al-page-hero>
 * ```
 *
 * The three content props are CONTENT, not layout — they say what the band
 * says, never where anything sits. A fundamentally different hero shape is a
 * different component, not another prop on this one. That distinction is the
 * whole reason `al-hero` was removed from Altitude: six fixed named slots plus
 * five layout props, abandoned mid-build by its first real consumer.
 *
 * @slot - Anything below the lead paragraph — CTAs, a token strip, a form. Laid out as further children of the stack.
 *
 * @csspart band - The outer band. Retune the vertical rhythm and the measure here.
 * @csspart eyebrow - The `<al-chip>` eyebrow.
 * @csspart heading - The `<al-heading>`.
 * @csspart dek - The lead paragraph.
 *
 * @cssproperty --al-page-hero-padding-block - The band's vertical rhythm. Defaults to `clamp(3rem, 6vw, 5rem)`.
 * @cssproperty --al-page-hero-max-width - The measure the band is capped to. Defaults to `85rem`, the site's own container width.
 * @cssproperty --al-page-hero-padding-inline - The side gutters. Defaults to `clamp(1.25rem, 4vw, 3rem)`.
 * @cssproperty --al-page-hero-gap - Gap between the stacked items. Defaults to `--al-theme-space-md`.
 */
export class SLPageHero extends ALElement {
  static el = 'al-page-hero';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /** The eyebrow chip above the heading. Omit for no eyebrow. */
  @property()
  accessor label: string;

  /** The band's heading. */
  @property()
  accessor heading: string;

  /** The lead paragraph under the heading. Omit for none. */
  @property()
  accessor dek: string;

  /**
   * The heading's semantic level. `h1` on a page's primary hero, `h2` where the
   * band is a section rather than the page title — a document-outline concern,
   * which is why it is not fixed.
   */
  @property({ attribute: 'heading-tag' })
  accessor headingTag: string = 'h1';

  render() {
    const componentClassNames = this.componentClassNames('sl-c-page-hero', {});

    return html`
      <div class="${componentClassNames}" part="band">
        <al-layout gap="md">
          ${this.label
            ? html`<div class="sl-c-page-hero__eyebrow" part="eyebrow">
                <al-chip variant="secondary">${this.label}</al-chip>
              </div>`
            : nothing}
          ${this.heading
            ? html`<al-heading part="heading" tagName="${this.headingTag}" variant="display-md" isBold>
                ${this.heading}
              </al-heading>`
            : nothing}
          ${this.dek ? html`<al-text-block part="dek" class="sl-c-page-hero__dek">${this.dek}</al-text-block>` : nothing}
          <slot></slot>
        </al-layout>
      </div>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(SLPageHero.el) === undefined) {
  customElements.define(SLPageHero.el, SLPageHero);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-page-hero': SLPageHero;
  }
}
