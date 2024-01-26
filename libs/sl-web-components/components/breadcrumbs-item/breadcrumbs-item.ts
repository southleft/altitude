import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { SLElement } from '../SLElement';
import styles from './breadcrumbs-item.scss';

/**
 * Component: sl-breadcrumbs-item
 * - Breadcrumbs Item is a singular link used within the breadcrumbs component.
 * @slot - The breadcrumb item's content, typically text
 */
export class SLBreadcrumbsItem extends SLElement {
  static el = 'sl-breadcrumbs-item';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Link URL
   */
  @property()
  accessor href: string;

  /**
   * Target attribute for a link (i.e. set to _blank to open in new tab)
   */
  @property()
  accessor target: '_blank' | '_self' | '_parent' | '_top';

  /**
   * Indicates if this the is the currently active breadcrumb item
   * - **true** This is the current breadcrumb
   * - **false** This is not the current breadcrumb
   */
  @property({ type: Boolean })
  accessor isCurrent: boolean;

  /**
   * Truncated attribute
   * - Dynamically set by the SLBreadcrumbs
   * - **true** The slotted content does not display in an <a></a> or <button></button>
   * - **false** The slotted content does displays in an <a></a> or <button></button>
   */
  @property({ type: Boolean })
  accessor isTruncated: boolean;

  /**
   * Indicates whether or not to add a separator icon after the breadcrumb item
   */
  @property({ type: Boolean })
  accessor hasSeparator: boolean;

  render() {
    const componentClassNames = this.componentClassNames('sl-c-breadcrumbs-item', {
      'sl-is-current': this.isCurrent,
      'sl-is-truncated': this.isTruncated
    });

    return html`
      <li class="${componentClassNames}" role="listitem">
        ${this.isTruncated
          ? html` <slot></slot> `
          : html`
              ${this.href
                ? html`
                    <a
                      class="sl-c-breadcrumbs-item__label"
                      href=${ifDefined(this.href)}
                      target=${ifDefined(this.target)}
                      aria-current=${ifDefined(this.isCurrent ? 'page' : null)}
                      tabindex=${this.isCurrent ? -1 : 0}
                    >
                      <slot></slot>
                    </a>
                  `
                : html`
                    <button
                      class="sl-c-breadcrumbs-item__label"
                      aria-current=${ifDefined(this.isCurrent ? 'page' : null)}
                      tabindex=${this.isCurrent ? -1 : 0}
                    >
                      <slot></slot>
                    </button>
                  `}
            `}
        ${this.hasSeparator === true ? html` <div class="sl-c-breadcrumbs__separator" aria-hidden="true">${'/'}</div> ` : html``}
      </li>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLBreadcrumbsItem.el) === undefined) {
  customElements.define(SLBreadcrumbsItem.el, SLBreadcrumbsItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-breadcrumbs-item': SLBreadcrumbsItem;
  }
}
