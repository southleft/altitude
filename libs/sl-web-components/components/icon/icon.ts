import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { SLElement } from '../SLElement';
import styles from './icon.scss';

/**
 * Component: sl-icon-[ICON_NAME]
 * - Icons are symbols that provide meaning. Icon component is used to display any icon from the Altitude icon library. 
 */
export class SLIcon extends SLElement {
  static el = 'sl-icon';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Icon title
   */
  @property()
  accessor iconTitle: string;

  /**
   * Icon size
   * - Default size is 16px
   * - **md** renders a larger size than default (20px)
   * - **lg** renders a larger size than the md variant (24px)
   * - **xl** renders a larger size than the lg variant (32px)
   */
  @property()
  accessor size: 'md' | 'lg' | 'xl';

  render() {
    const componentClassName = this.componentClassNames('sl-c-icon', {
      'sl-c-icon--md': this.size === 'md',
      'sl-c-icon--lg': this.size === 'lg',
      'sl-c-icon--xl': this.size === 'xl'
    });

    return html`
      <span
        aria-hidden="${!this.iconTitle}"
        aria-labelledby="${this.iconTitle}"
        class="${componentClassName}"
        role="${this.iconTitle ? 'img' : 'presentation'}"
      >
        <slot></slot>
      </span>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLIcon.el) === undefined) {
  customElements.define(SLIcon.el, SLIcon);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-icon': SLIcon;
  }
}
