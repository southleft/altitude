import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './badge.scss';

/**
 * Component: al-badge
 * - **slot**: The badge content
 */
export class ALBadge extends ALElement {
  static el = 'al-badge';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * isDot boolean
   * - Makes the badge a small dot only
   */
  @property({ type: Boolean })
  accessor isDot: boolean;

  /**
   * State variant
   * - **default** Displays a badge with the default state
   * - **info** renders a badge with info state treatment
   * - **success** renders a badge with success state treatment
   * - **warning** renders a badge with warning state treatment
   * - **danger** renders a badge with danger state treatment
   */
  @property()
  accessor variant: 'info' | 'success' | 'warning' | 'danger';

  /**
   * Positions the badge absolutely to its parent container.
   * - **top-left** places the badge to the top left
   * - **top-right** places the badge to the top right
   * - **bottom-left** places the badge to the bottom left
   * - **bottom-right** places the badge to the bottom right
   */
  @property()
  accessor position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

  /**
   * First updated lifecycle hook
   * 1. Handle the position of the parent element
   */
  firstUpdated() {
    this.handlePosition();
  }

  /**
   * Handle position
   * 1. If a position is defined, then apply position: relative to the direct parent element
   */
  handlePosition() {
    if (this.position) {
      this.parentElement.style.position = 'relative';
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-badge', {
      'al-c-badge--info': this.variant === 'info',
      'al-c-badge--success': this.variant === 'success',
      'al-c-badge--warning': this.variant === 'warning',
      'al-c-badge--danger': this.variant === 'danger',
      'al-c-badge--top-left': this.position === 'top-left',
      'al-c-badge--top-right': this.position === 'top-right',
      'al-c-badge--bottom-left': this.position === 'bottom-left',
      'al-c-badge--bottom-right': this.position === 'bottom-right',
      'al-is-dot': this.isDot
    });

    return html`
      <div class="${componentClassNames}">
        <slot></slot>
      </div>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALBadge.el) === undefined) {
  customElements.define(ALBadge.el, ALBadge);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-badge': ALBadge;
  }
}
