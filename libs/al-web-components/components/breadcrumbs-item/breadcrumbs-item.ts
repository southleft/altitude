import { html, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { ALElement } from '../ALElement';
import styles from './breadcrumbs-item.scss';

/**
 * Component: al-breadcrumbs-item
 * @slot - The breadcrumb item's content, typically text
 */
export class ALBreadcrumbsItem extends ALElement {
  static el = 'al-breadcrumbs-item';

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
   * - Dynamically set by the ALBreadcrumbs
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

  /**
   * A11y — the role rendered on the internal `<li>`.
   *
   * `listitem` is only legal inside a `list`, and the owning `<ul role="list">`
   * lives in the *parent* component's shadow root. Rendered standalone the
   * hardcoded role has no required parent (axe `aria-required-parent`), while
   * dropping the role leaves a bare `<li>` outside a list (axe `listitem`).
   * `none` is the honest answer for an orphan; `hasAncestorRole` walks the
   * flattened tree, so the slot/shadow hop to the real `<ul>` is followed.
   */
  @state()
  accessor _listRole: 'listitem' | 'none' = 'none';

  /**
   * A11y — recompute the internal `<li>`'s role from the flattened tree.
   * Also runs once on the next frame, because the owning list component may
   * not have rendered its `<ul>` yet when this item first updates.
   */
  private syncListRole() {
    this._listRole = this.hasAncestorRole(['list', 'group'], ['ul', 'ol', 'menu']) ? 'listitem' : 'none';
  }

  async firstUpdated() {
    await this.updateComplete;
    requestAnimationFrame(() => this.syncListRole());
  }

  updated() {
    this.syncListRole();
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-breadcrumbs-item', {
      'al-is-current': this.isCurrent,
      'al-is-truncated': this.isTruncated
    });

    return html`
      <li class="${componentClassNames}" role=${this._listRole}>
        ${this.isTruncated
          ? html` <slot></slot> `
          : html`
              ${this.href
                ? html`
                    <a
                      class="al-c-breadcrumbs-item__label"
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
                      class="al-c-breadcrumbs-item__label"
                      aria-current=${ifDefined(this.isCurrent ? 'page' : null)}
                      tabindex=${this.isCurrent ? -1 : 0}
                    >
                      <slot></slot>
                    </button>
                  `}
            `}
        ${this.hasSeparator === true ? html` <div class="al-c-breadcrumbs__separator" aria-hidden="true">${'/'}</div> ` : html``}
      </li>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALBreadcrumbsItem.el) === undefined) {
  customElements.define(ALBreadcrumbsItem.el, ALBreadcrumbsItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-breadcrumbs-item': ALBreadcrumbsItem;
  }
}
