import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { SLElement } from '../SLElement';
import styles from './card.scss';

/**
 * Component: sl-card
 *
 * Card displays content and actions on a single topic in a concise, scannable format.
 * - **slot**: The main content of the card that appers below the header
 * - **slot** "actions-start": The actions the appear to the top-left of the card
 * - **slot** "action-right": The actions the appear to the top-right of the card
 * - **slot** "image": The main image of the card that appears below the actions
 * - **slot** "header": The main title of the card that appears below the image
 */
export class SLCard extends SLElement {
  static el = 'sl-card';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Layout
   * - **default** Displays the slotted items stacked in a column
   * - **row** Displays the slotted items inline in a row
   */
  @property()
  accessor layout: 'inline'

  /**
   * Variant
   * - **default** Renders a card with a background color, box shadow, or border radius
   * - **bare** Renders a card without a background color, box shadow, or border radius
   */
  @property()
  accessor variant: 'bare'

  render() {
    const componentClassNames = this.componentClassNames('sl-c-card', {
      'sl-c-card--inline': this.layout === 'inline',
      'sl-c-card--bare': this.variant === 'bare'
    });

    return html`
      <div class="${componentClassNames}">
        ${this.slotNotEmpty('actions-start') || this.slotNotEmpty('actions-end') ? html`
          <div class="sl-c-card__actions">
            ${this.slotNotEmpty('actions-start') && html`
              <div class="sl-c-card__actions-start">
                <slot name="actions-start"></slot>
              </div>
            `}
            ${this.slotNotEmpty('actions-end') && html`
              <div class="sl-c-card__actions-end">
                <slot name="actions-end"></slot>
              </div>
            `}
          </div>
        `: html``}
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

if ((globalThis as any).slAutoRegistry === true && customElements.get(SLCard.el) === undefined) {
  customElements.define(SLCard.el, SLCard);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-card': SLCard;
  }
}
