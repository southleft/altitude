import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ALElement } from '../ALElement';
import styles from './card.scss';

/**
 * Component: al-card
 *
 * @slot - The main content of the card (renders below the header).
 * @slot actions-start - Trailing-action row, leading edge (bottom-left). Use for a "View" / "Open" primary action.
 * @slot actions-end - Trailing-action row, trailing edge (bottom-right). Use for the canonical bottom-right primary action.
 * @slot action-right - Top-right single control (kebab / overflow menu).
 * @slot image - Media rendered above the header, INSIDE the card's padding. Takes the full content width; an `<al-avatar>` sits here too, which is the common case across the example apps.
 *
 *   NOT flush to the card edge — this line previously claimed it was, and it never has been: `.al-c-card` carries a single outer `padding` and `.al-c-card__image` neither resets nor negates it (card.scss). The claim was wrong rather than the code: the slot is used for avatars in `apps/angular`, `apps/astro` and `apps/svelte`, and bleeding it to the edge would wreck all of them. A card that needs edge-to-edge media wants a card that owns its own padding, not a flag here — see the `article` / `work` variants on Southleft's `al-card` in `libs/sl-web-components`, which move the padding onto the content column.
 * @slot header - Card heading row. Rendered above a hairline rule. Compose the row itself with `<al-layout>` when it carries a title and a control.
 * @slot footer - Card footer row, below a hairline rule and on a tinted ground. Compose it with `<al-layout>` rather than relying on slot order.
 */
export class ALCard extends ALElement {
  static el = 'al-card';

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

  /**
   * Fill the available block size instead of hugging the content.
   *
   * For a card in a grid or a stretched flex row, where a row of cards should
   * share one height and their footers should line up. Reflected, so a page can
   * also select `al-card[fill]`.
   *
   * It has to be a property rather than something the page sets from outside:
   * `:host` is `display: contents`, so `<al-card>` generates no box and a
   * `height: 100%` written on the element is dropped entirely. `apps/southleft`
   * hit exactly this and worked around it with
   * `style="height:100%; box-sizing:border-box"` at 25 call sites across 13
   * files — that inline style is what this replaces.
   */
  @property({ type: Boolean, reflect: true })
  accessor fill: boolean;

  render() {
    const componentClassNames = this.componentClassNames('al-c-card', {
      'al-c-card--inline': this.layout === 'inline',
      'al-c-card--bare': this.variant === 'bare'
    });

    return html`
      <div class="${componentClassNames}">
        ${this.slotNotEmpty('actions-start') || this.slotNotEmpty('actions-end') ? html`
          <div class="al-c-card__actions">
            ${this.slotNotEmpty('actions-start') && html`
              <div class="al-c-card__actions-start">
                <slot name="actions-start"></slot>
              </div>
            `}
            ${this.slotNotEmpty('actions-end') && html`
              <div class="al-c-card__actions-end">
                <slot name="actions-end"></slot>
              </div>
            `}
          </div>
        `: html``}
        ${this.slotNotEmpty('image') &&
        html`
          <div class="al-c-card__image">
            <slot name="image"></slot>
          </div>
        `}
        ${this.slotNotEmpty('header') &&
        html`
          <div class="al-c-card__header">
            <slot name="header"></slot>
          </div>
        `}
        <div class="al-c-card__body">
          <slot></slot>
        </div>
        ${this.slotNotEmpty('footer') &&
        html`
          <div class="al-c-card__footer">
            <slot name="footer"></slot>
          </div>
        `}
      </div>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALCard.el) === undefined) {
  customElements.define(ALCard.el, ALCard);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-card': ALCard;
  }
}
