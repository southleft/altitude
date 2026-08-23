import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../../../al-web-components/components/ALElement';
import '../../../al-web-components/components/layout/layout';
import styles from './logo-wall.scss';

/**
 * Component: sl-logo-wall
 *
 * The client logo band — a wrapping row of monochrome marks that come up to
 * full strength on hover.
 *
 * ```html
 * <sl-logo-wall>
 *   <img src="/logos/ibm.webp" alt="IBM" />
 *   <img src="/logos/google.webp" alt="Google" />
 * </sl-logo-wall>
 * ```
 *
 * The marks are slotted, because which clients appear is the page's business.
 * What the component owns is the treatment: the uniform optical height, the
 * knock-back-and-reveal, and the asymmetric row/column rhythm the brand uses.
 *
 * @slot - The logo images. Sized and treated by the component; pass them at their natural dimensions.
 *
 * @csspart wall - The wrapping row.
 *
 * @cssproperty --sl-logo-wall-height - Optical height every mark is normalised to. Defaults to `1.75rem`, and `2rem` from the `48rem` breakpoint up.
 * @cssproperty --sl-logo-wall-opacity - Resting opacity. Defaults to `0.5`.
 * @cssproperty --sl-logo-wall-gap - Row and column gap, in that order. Defaults to `3rem 3.5rem`.
 */
export class SLLogoWall extends ALElement {
  static el = 'sl-logo-wall';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Render the marks at full strength instead of knocked back. For a page where
   * the logos are the subject rather than social proof in passing.
   */
  @property({ type: Boolean, reflect: true })
  accessor vivid: boolean;

  render() {
    const componentClassNames = this.componentClassNames('sl-c-logo-wall', {});

    return html`
      <div class="${componentClassNames}" part="wall">
        <al-layout direction="row" wrap align="center">
          <slot></slot>
        </al-layout>
      </div>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(SLLogoWall.el) === undefined) {
  customElements.define(SLLogoWall.el, SLLogoWall);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-logo-wall': SLLogoWall;
  }
}
