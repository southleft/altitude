import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { SLElement } from '../../SLElement';
import styles from '../icon.scss';
import Calendar from '../svgs/calendar.svg';

/**
 * Icon: sl-icon-calendar
 */
export class SLIconCalendar extends SLElement {
  static el = 'sl-icon-calendar';

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
        ${Calendar}
      </span>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLIconCalendar.el) === undefined) {
  customElements.define(SLIconCalendar.el, SLIconCalendar);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-icon-calendar': SLIconCalendar;
  }
}
