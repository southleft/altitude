import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { SLElement } from '../SLElement';
import styles from './pagination-item.scss';

/**
 * Component: sl-pagination-item
 *
 * Pagination Item is a singular link used within the pagination component.
 * - **slot**: The pagination item's content
 */
export class SLPaginationItem extends SLElement {
  static el = 'sl-pagination-item';

  static get styles() {
    return unsafeCSS(styles.toString());
  }
  /**
   * Href for link
   */
  @property()
  accessor href: string;

  /**
   * Disabled state
   */
  @property({ type: Boolean })
  accessor isDisabled: boolean;

  /**
   * Selected state
   */
  @property({ type: Boolean })
  accessor isSelected: boolean;

  /**
   * Aria label for the link for accessibility
   */
  @property({ type: String })
  accessor ariaLabel: string;

  render() {
    const componentClassNames = this.componentClassNames('sl-c-pagination-item', {
      'sl-is-disabled': this.isDisabled === true,
      'sl-is-selected': this.isSelected === true
    });

    return html`
      <li role="listitem" class="${componentClassNames}">
        <a
          href="${ifDefined(this.href)}"
          class="sl-c-pagination__link"
          aria-label=${ifDefined(this.ariaLabel)}
          aria-disabled=${this.isDisabled === true ? 'true' : 'false'}
          tabindex=${this.isDisabled === true ? '-1' : '0'}
        >
          <slot></slot>
        </a>
      </li>
    `;
  }
}

if ((globalThis as any).slAutoRegistry === true && customElements.get(SLPaginationItem.el) === undefined) {
  customElements.define(SLPaginationItem.el, SLPaginationItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-pagination-item': SLPaginationItem;
  }
}
