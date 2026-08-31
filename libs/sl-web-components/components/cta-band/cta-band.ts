import { html, unsafeCSS, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../../../al-web-components/components/ALElement';
import '../../../al-web-components/components/layout/layout';
import '../../../al-web-components/components/heading/heading';
import styles from './cta-band.scss';

/**
 * Component: al-cta-band
 *
 * The closing call-to-action band that ends 16 of the site's 24 pages: a
 * full-bleed surface with the brand's grid texture behind it, a kicker, a
 * centred display heading and lead, and the page's actions below.
 *
 * What it owns is the band — the top hairline, the texture, the generous
 * responsive rhythm, and the centred measure the copy is capped to. The actions
 * come from the page through the default slot, because which CTAs close a page
 * is the page's decision, not the band's.
 *
 * ```html
 * <al-cta-band heading="Is your design system AI-ready?" dek="…">
 *   <al-layout direction="row" wrap gap="md" align="center" justify="center">
 *     <al-button href="/contact">Book a call</al-button>
 *     <al-button variant="tertiary" href="/services/workshops">Ask about a workshop</al-button>
 *   </al-layout>
 * </al-cta-band>
 * ```
 *
 * @slot - The band's actions. Wrap them in an `<al-layout>` to arrange them — a row that wraps to a stack is the usual choice.
 *
 * @csspart band - The full-bleed outer band. The top hairline lives here.
 * @csspart texture - The decorative grid layer. Hide it with `display: none` where a page wants a plain band.
 * @csspart inner - The centred, measure-capped content column.
 * @csspart kicker - The accent kicker.
 * @csspart heading - The `<al-heading>`.
 * @csspart dek - The lead paragraph.
 * @csspart actions - The wrapper around the slotted actions.
 *
 * @cssproperty --al-cta-band-padding-block - The band's vertical rhythm. Defaults to `6rem`, and `8rem` from the `48rem` breakpoint up.
 * @cssproperty --al-cta-band-max-width - Measure the content column is capped to. Defaults to `85rem`.
 * @cssproperty --al-cta-band-heading-max-width - Measure the heading is capped to. Defaults to `48rem`.
 * @cssproperty --al-cta-band-dek-max-width - Measure the lead is capped to. Defaults to `32rem`.
 */
export class SLCtaBand extends ALElement {
  static el = 'al-cta-band';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /** The band's heading. */
  @property()
  accessor heading: string;

  /** The lead paragraph under the heading. Omit for none. */
  @property()
  accessor dek: string;

  /** The accent kicker above the heading. Defaults to the brand's `<cta>` form. */
  @property()
  accessor kicker: string = '<cta>';

  /** The heading's semantic level — a document-outline concern, so not fixed. */
  @property({ attribute: 'heading-tag' })
  accessor headingTag: string = 'h2';

  render() {
    const componentClassNames = this.componentClassNames('sl-c-cta-band', {});

    return html`
      <div class="${componentClassNames}" part="band">
        <div class="sl-c-cta-band__texture" part="texture" aria-hidden="true"></div>
        <div class="sl-c-cta-band__inner" part="inner">
          ${this.kicker ? html`<p class="sl-c-cta-band__kicker" part="kicker">${this.kicker}</p>` : nothing}
          ${this.heading
            ? html`<al-heading
                class="sl-c-cta-band__heading"
                part="heading"
                tagName="${this.headingTag}"
                variant="display-md"
                isBold
              >
                ${this.heading}
              </al-heading>`
            : nothing}
          ${this.dek ? html`<p class="sl-c-cta-band__dek" part="dek">${this.dek}</p>` : nothing}
          <div class="sl-c-cta-band__actions" part="actions">
            <slot></slot>
          </div>
        </div>
      </div>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(SLCtaBand.el) === undefined) {
  customElements.define(SLCtaBand.el, SLCtaBand);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-cta-band': SLCtaBand;
  }
}
