import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { SLElement } from '../../SLElement';
import styles from '../icon.scss';
import WarningCircle from '../svgs/warning-circle.svg';

/**
 * Icon: sl-icon-warning-circle
 */
export class SLIconWarningCircle extends SLElement {
  static el = 'sl-icon-warning-circle';

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
    const componentClassName = this.componentClassNames('sl-c-icon-warning-circle', {
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
        ${WarningCircle}
      </span>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLIconWarningCircle.el) === undefined) {
  customElements.define(SLIconWarningCircle.el, SLIconWarningCircle);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-icon-warning-circle': SLIconWarningCircle;
  }
}
