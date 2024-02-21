import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { ALElement } from '../ALElement';
import styles from './pagination-item.scss';

/**
 * Component: al-pagination-item
 *
 * Pagination Item is a singular link used within the pagination component.
 * - **slot**: The pagination item's content
 */
export class ALPaginationItem extends ALElement {
  static el = 'al-pagination-item';

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
   * Expandable
   * - **true** the item contains a popover with a list of page links
   * - **false** the item contains a single page link
   */
  @property({ type: Boolean })
  accessor isExpandable: boolean;

  /**
   * Aria label for the link for accessibility
   */
  @property({ type: String })
  accessor ariaLabel: string;

  render() {
    const componentClassNames = this.componentClassNames('al-c-pagination-item', {
      'al-is-disabled': this.isDisabled === true,
      'al-is-selected': this.isSelected === true
    });

    return html`
      <li role="listitem" class="${componentClassNames}">
        ${this.isExpandable ? 
          html`<slot></slot>` :
          html`
            <a
              href="${ifDefined(this.href)}"
              class="al-c-pagination__link"
              aria-label=${ifDefined(this.ariaLabel)}
              aria-disabled=${this.isDisabled === true ? 'true' : 'false'}
              tabindex=${this.isDisabled === true ? '-1' : '0'}
            >
              <slot></slot>
            </a>
          `
        }
      </li>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALPaginationItem.el) === undefined) {
  customElements.define(ALPaginationItem.el, ALPaginationItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-pagination-item': ALPaginationItem;
  }
}
