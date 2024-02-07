import { html, unsafeCSS } from 'lit';
import { SLElement } from '../SLElement';
import styles from './card.scss';

/**
 * Component: sl-card
 *
 * Card displays content and actions on a single topic in a concise, scannable format.
 * - **slot**: The main content of the card that appers below the header
 * - **slot** "actions-left": The actions the appear to the top-left of the card
 * - **slot** "action-right": The actions the appear to the top-right of the card
 * - **slot** "image": The main image of the card that appears below the actions
 * - **slot** "header": The main title of the card that appears below the image
 */
export class SLCard extends SLElement {
  static el = 'sl-card';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-card', {});

    return html`
      <div class="${componentClassNames}">
        ${(this.slotNotEmpty('actions-left') || this.slotNotEmpty('actions-right')) &&
        html`
          <div class="sl-c-card__actions">
            ${this.slotNotEmpty('actions-left') &&
            html`
              <div class="sl-c-card__actions-left">
                <slot name="actions-left"></slot>
              </div>
            `}
            ${this.slotNotEmpty('actions-right') &&
            html`
              <div class="sl-c-card__actions-right">
                <slot name="actions-right"></slot>
              </div>
            `}
          </div>
        `}
        ${this.slotNotEmpty('image') &&
        html`
          <div class="sl-c-card__image">
            <slot name="image"></slot>
          </div>
        `}
        ${this.slotNotEmpty('header') &&
        html`
          <div class="sl-c-card__header">
            <slot name="header"></slot>
          </div>
        `}
        <div class="sl-c-card__body">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLCard.el) === undefined) {
  customElements.define(SLCard.el, SLCard);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-card': SLCard;
  }
}
