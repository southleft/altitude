import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { SLElement } from '../../SLElement';
import styles from '../icon.scss';
import Home from '../svgs/home.svg';

/**
 * Icon: sl-icon-home
 */
export class SLIconHome extends SLElement {
  static el = 'sl-icon-home';

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
    const componentClassName = this.componentClassNames('sl-c-icon', {
      'sl-c-icon--xs': this.size === 'xs',
      'sl-c-icon--sm': this.size === 'sm',
      'sl-c-icon--md': this.size === 'md',
      'sl-c-icon--lg': this.size === 'lg',
      'sl-c-icon--xl': this.size === 'xl',
      'sl-c-icon--xxl': this.size === 'xxl',
      'sl-c-icon--xxxl': this.size === 'xxxl'
    });

    return html`
      <span
        aria-hidden="${!this.iconTitle}"
        aria-labelledby="${this.iconTitle}"
        class="${componentClassName}"
        role="${this.iconTitle ? 'img' : 'presentation'}"
      >
        ${Home}
      </span>
    `;
  }
}

if ((globalThis as any).slAutoRegistry === true && customElements.get(SLIconHome.el) === undefined) {
  customElements.define(SLIconHome.el, SLIconHome);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-icon-home': SLIconHome;
  }
}
