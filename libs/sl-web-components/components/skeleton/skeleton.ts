import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { SLElement } from '../SLElement';
import styles from './skeleton.scss';

/**
 * Component: sl-skeleton
 * - Skeleton provides a low fidelity representation of content before it appears in a view. This improves the perceived loading time for users.
 * @slot - The components content
 */
export class SLSkeleton extends SLElement {
  static el = 'sl-skeleton';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Variant
   * - **default** renders a rectangular skeleton
   * - **circle** renders a round skeleton
   * - **square** renders a sqaure skeleton
   */
  @property()
  accessor variant: 'circle' | 'square';

  /**
   * The width of the skeleton
   * - If no value is entered, it defaults to 100%
   */
  @property({ type: Number })
  accessor width: number;

  /**
   * The height of the skeleton
   * - If no value is entered, it defaults to auto
   */
  @property({ type: Number })
  accessor height: number;

  /**
   * First updated lifecycle
   * 1. Adjust the height and width of the skeleton element
   */
  firstUpdated() {
    this.setWidthHeight(); /* 1 */
  }

  /**
   * Set the width and height
   * 1. Add a custom property to adjust the width of the skeleton
   * 2. Add a custom property to adjust the height of the skeleton
   */
  setWidthHeight() {
    if (this.width) {
      this.style.setProperty('--sl-skeleton-width', this.width.toString() + 'px');
    }
    if (this.height) {
      this.style.setProperty('--sl-skeleton-height', this.height.toString() + 'px');
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-skeleton', {
      'sl-c-skeleton--circle': this.variant === 'circle',
      'sl-c-skeleton--square': this.variant === 'square'
    });

    return html` <div class="${componentClassNames}"></div> `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLSkeleton.el) === undefined) {
  customElements.define(SLSkeleton.el, SLSkeleton);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-skeleton': SLSkeleton;
  }
}
