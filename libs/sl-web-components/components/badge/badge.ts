import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { SLElement } from '../SLElement';
import styles from './badge.scss';

/**
 * Component: sl-badge
 * - Badges are labels which hold small amounts of information. Badges can hold a number and can be paired with icons, text, or avatars.
 * @slot - The component content
 */
export class SLBadge extends SLElement {
  static el = 'sl-badge';

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
   * - **success** renders a badge with success state treatment
   * - **warning** renders a badge with warning state treatment
   * - **danger** renders a badge with danger state treatment
   */
  @property()
  accessor variant: 'success' | 'warning' | 'danger';

  /**
   * Positions the badge absolutely to the parent container.
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
    const componentClassNames = this.componentClassNames('sl-c-badge', {
      'sl-c-badge--success': this.variant === 'success',
      'sl-c-badge--warning': this.variant === 'warning',
      'sl-c-badge--danger': this.variant === 'danger',
      'sl-c-badge--top-left': this.position === 'top-left',
      'sl-c-badge--top-right': this.position === 'top-right',
      'sl-c-badge--bottom-left': this.position === 'bottom-left',
      'sl-c-badge--bottom-right': this.position === 'bottom-right',
      'sl-is-dot': this.isDot
    });

    return html`
      <div class="${componentClassNames}">
        <slot></slot>
      </div>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLBadge.el) === undefined) {
  customElements.define(SLBadge.el, SLBadge);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-badge': SLBadge;
  }
}
