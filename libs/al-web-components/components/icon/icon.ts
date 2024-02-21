import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './icon.scss';

/**
 * Component: al-icon-[ICON_NAME]
 *
 * Icons are symbols that provide meaning. Icon component is used to display any icon from the Altitude icon library.
 */
export class ALIcon extends ALElement {
  static el = 'al-icon';

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
   * - **xs** renders a smaller size than default (8px)
   * - **sm** renders a smaller size than default (12px)
   * - **md** renders a larger size than default (20px)
   * - **lg** renders a larger size than the md variant (24px)
   * - **xl** renders a larger size than the lg variant (32px)
   * - **xxl** renders a larger size than the lg variant (36px)
   * - **xxxl** renders a larger size than the lg variant (40px)
   */
  @property()
  accessor size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl';

  render() {
    const componentClassName = this.componentClassNames('al-c-icon', {
      'al-c-icon--xs': this.size === 'xs',
      'al-c-icon--sm': this.size === 'sm',
      'al-c-icon--md': this.size === 'md',
      'al-c-icon--lg': this.size === 'lg',
      'al-c-icon--xl': this.size === 'xl',
      'al-c-icon--xxl': this.size === 'xxl',
      'al-c-icon--xxxl': this.size === 'xxxl'
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

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALIcon.el) === undefined) {
  customElements.define(ALIcon.el, ALIcon);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-icon': ALIcon;
  }
}
