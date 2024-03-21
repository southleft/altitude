import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../../ALElement';
import styles from '../icon.scss';
import Bookmark from '../svgs/bookmark.svg';

/**
 * Icon: al-icon-bookmark
 */
export class ALIconBookmark extends ALElement {
  static el = 'al-icon-bookmark';

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
   * - **xs** renders a 8px icon
   * - **sm** renders a 12px icon
   * - **md** renders a 20px icon
   * - **lg** renders a 24px icon
   * - **xl** renders a 32px icon
   * - **xxl** renders a 36px icon
   * - **xxxl** renders a 40px icon
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
        ${Bookmark}
      </span>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALIconBookmark.el) === undefined) {
  customElements.define(ALIconBookmark.el, ALIconBookmark);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-icon-bookmark': ALIconBookmark;
  }
}
