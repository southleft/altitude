import { html, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { ALElement } from '../ALElement';
import styles from './pagination-item.scss';

/**
 * Component: al-pagination-item
 * @slot - The pagination item's content
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
    const componentClassNames = this.componentClassNames('al-c-pagination-item', {
      'al-is-disabled': this.isDisabled === true,
      'al-is-selected': this.isSelected === true
    });

    return html`
      <li role=${this._listRole} class="${componentClassNames}">
        ${this.isExpandable ?
          html`<slot></slot>` :
          html`
            <a
              href="${ifDefined(this.href)}"
              class="al-c-pagination__link"
              role=${ifDefined(this.href ? undefined : 'button')}
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
