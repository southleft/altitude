import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { SLElement } from '../../SLElement';
import styles from '../icon.scss';
import AddSquare from '../svgs/add-square.svg';

/**
 * Icon: sl-icon-add-square
 */
export class SLIconAddSquare extends SLElement {
  static el = 'sl-icon-add-square';

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

  connectedCallback() {
    super.connectedCallback();
    this.classList.add('sl-c-icon');
  }

  render() {
    const componentClassName = this.componentClassNames('sl-c-icon-add-square', {
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
        ${AddSquare}
      </span>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLIconAddSquare.el) === undefined) {
  customElements.define(SLIconAddSquare.el, SLIconAddSquare);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-icon-add-square': SLIconAddSquare;
  }
}
