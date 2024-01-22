import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { SLElement } from '../SLElement';
import styles from './divider.scss';

/**
 * Component: sl-divider
 * - A divider is a thin line that groups content in lists and layouts.
 */
export class SLDivider extends SLElement {
  static el = 'sl-divider';

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
    const componentClassNames = this.componentClassNames('sl-c-divider', {
      'sl-c-divider--vertical': this.variant === 'vertical'
    });

    return html` <hr class="${componentClassNames}" /> `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLDivider.el) === undefined) {
  customElements.define(SLDivider.el, SLDivider);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-divider': SLDivider;
  }
}
