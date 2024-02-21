import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './skeleton.scss';

/**
 * Component: al-skeleton
 */
export class ALSkeleton extends ALElement {
  static el = 'al-skeleton';

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
      this.style.setProperty('--al-skeleton-width', this.width.toString() + 'px');
    }
    if (this.height) {
      this.style.setProperty('--al-skeleton-height', this.height.toString() + 'px');
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-skeleton', {
      'al-c-skeleton--circle': this.variant === 'circle',
      'al-c-skeleton--square': this.variant === 'square'
    });

    return html` <div class="${componentClassNames}"></div> `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALSkeleton.el) === undefined) {
  customElements.define(ALSkeleton.el, ALSkeleton);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-skeleton': ALSkeleton;
  }
}
