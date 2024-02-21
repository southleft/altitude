import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './divider.scss';

/**
 * Component: al-divider
 */
export class ALDivider extends ALElement {
  static el = 'al-divider';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Variant
   * - **default** A divider the displays horizontally
   * - **vertical** A divider the displays vertically
   */
  @property()
  accessor variant: 'vertical';

  render() {
    const componentClassNames = this.componentClassNames('al-c-divider', {
      'al-c-divider--vertical': this.variant === 'vertical'
    });

    return html` <hr class="${componentClassNames}" /> `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALDivider.el) === undefined) {
  customElements.define(ALDivider.el, ALDivider);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-divider': ALDivider;
  }
}
