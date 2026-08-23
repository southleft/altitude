import { TemplateResult, unsafeCSS } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALButton } from '../button/button';
import { ALIconChevronDown } from '../icon/icons/chevron-down';
import { ALLink } from '../link/link';
import styles from './menu-item.scss';

/**
 * Component: al-menu-item
 * @slot - The content to display in the menu item
 * @slot before - Optional prefix content to display in the menu item
 *
 * @event onMenuItemSelect - Fired when the item is selected. Detail: `{ value, selected, item }` — the item's value, its new selected state, and the element itself.
 * @event onMenuItemExpand - Fired when an item with a submenu expands or collapses. Detail: `{ expanded, item }`.
 */
export class ALMenuItem extends ALElement {
  static el = 'al-menu-item';
  private elementMap = register({
    elements: [
      [ALLink.el, ALLink],
      [ALButton.el, ALButton],
      [ALIconChevronDown.el, ALIconChevronDown]
    ],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private linkEl = unsafeStatic(this.elementMap.get(ALLink.el));
  private buttonEl = unsafeStatic(this.elementMap.get(ALButton.el));
  private iconChevronDownEl = unsafeStatic(this.elementMap.get(ALIconChevronDown.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Selection value surfaced via `e.detail.value` on the bubbled
   * `onMenuItemSelect` event. Use this to give the consumer an opaque
   * identifier for the item (e.g. `value="edit"`) so they don't have to
   * pattern-match on label or DOM ref.
   *
   * Note on labeling: the **default slot supplies the visible AND
   * accessible name** for text items — `<al-menu-item value="edit">Edit profile</al-menu-item>`
   * is sufficient. The `label` attribute is only required for
   * icon-only menu items where there is no visible text. Setting both
   * `label="Edit"` and the slot to "Edit" produces a duplicate
   * accessible name.
   */
  @property()
  accessor value: string;

  /**
   * The optional menu link URL
   */
  @property()
  accessor href: string;

  /**
   * Target attribute for the menu link (i.e. set to _blank to open in new tab)
   */
  @property()
  accessor target: '_blank' | '_self' | '_parent' | '_top';

  /**
   * Title attribute
   * - Optional title for a11y
   * - If a link opens a new window or performs an action, use the title attribute to provide a tooltip with additional information.
   */
  @property()
  accessor linkTitle: string;

  /**
   * isHeader property
   * - **true** Applies the header treatment to the menu item
   */
  @property({ type: Boolean })
  accessor isHeader: boolean;

  /**
   * isExpandableHeader property
   * - **true** Applies expandable functionality to the menu item
   */
  @property({ type: Boolean })
  accessor isExpandableHeader: boolean;

  /**
   * isExpanded property
   * - **true** Applies the expanded treatment to a Header item
   * - **false** Applies the collapsed treatment to a Header item
   */
  @property({ type: Boolean })
  accessor isExpanded: boolean;

  /**
   * Selected attribute
   * - Changes the component's treatment to represent a selected state
   */
  @property({ type: Boolean })
  accessor isSelected: boolean;

  /**
   * Current attribute
   * - Changes the component's treatment to represent a focused state
   */
  @property({ type: Boolean })
  accessor isFocused: boolean;

  /**
   * Disabled attribute
   * - Changes the component's treatment to represent a disabled state
   */
  @property({ type: Boolean })
  accessor isDisabled: boolean;

  /**
   * Is hidden property
   * - Is set on child menu items based on their Header's expanded state
   * - **true** Hide the item
   * - **false** Show the item
   */
  @property( { type: Boolean })
  accessor isHidden: boolean = false;

  /**
   * Group id property
   * - Dynamically set by the Menu parent component
   * - Used to associate menu group headers and group items
   */
  @property()
  accessor groupId: string;

  /**
   * Index property
   * - Dynamically set by the Menu parent component
   * - Used to track and set focus with keyboard navigation
   */
  @property({ type: Number })
  accessor idx: number;

  /**
   * Indentation
   * - Dynamically set by the menu parent component
   * - Adds padding to a menu item to left-align its text with that of its Header
   */
  @property({ type: Number })
  accessor indentation: number = 0;

  /**
   * Label attribute
   * - Sets the ariaLabel for A11y
   */
  @property()
  accessor label: string;

  /**
   * Aria controls
   * - Associates an Expandable Header's control with the items in that group
   * - **Not rendered as an attribute.** The ids `<al-menu>` collects here belong
   *   to `<al-menu-item>` hosts in the *document*, while the expand control
   *   lives inside this component's shadow root, and an IDREF cannot cross a
   *   shadow boundary — every value was reported invalid
   *   (axe `aria-valid-attr-value`). The disclosure relationship is carried by
   *   `aria-expanded` on the control, which needs no IDREF. The property is
   *   kept because it is public API and records the grouping.
   * - Defaults to `''`: it used to be `undefined`, and `undefined += ' id'`
   *   produced the literal id list `"undefined group-x-item-1"`.
   */
  @property()
  accessor ariaControls: string = '';

  /**
   * A11y — the role rendered on the internal `<li>`.
   *
   * `<al-menu>` renders the owning `<ul>` in *its* shadow root, so the
   * list/listitem relationship only exists once this item is assigned to that
   * slot. A bare `<li>` outside a list is not semantic (axe `listitem`), and a
   * hardcoded `role="listitem"` on an orphan has no required parent
   * (`aria-required-parent`). `none` is the honest answer for a standalone item.
   */
  @state()
  accessor _listRole: 'listitem' | 'none' = 'none';

  /**
   * Query the al-LINK element inside the component
   */
  @query('.al-c-menu-item__link')
  accessor menuItemLink: ALLink;

  /**
   * Query the al-BUTTON element inside the component
   */
  @query('.al-c-menu-item__control')
  accessor menuItemControl: ALButton;

  /**
   * Query the link element inside the ALLink
   * - This will be either an `a` tag or `button`
   */
  get menuItemLinkEl(): HTMLAnchorElement | HTMLButtonElement {
    if (this.menuItemLink) {
      return this.menuItemLink.shadowRoot?.querySelector('.al-c-link');
    }
  }

  /**
   * The element inside this item that actually receives focus.
   *
   * `menuItemLinkEl` reaches into `<al-link>`'s shadow root, but a header with
   * no `href` renders a plain `<div class="al-c-menu-item__link">` with no
   * shadow root at all — so for those items it is `undefined` and `<al-menu>`'s
   * arrow-key navigation had nothing to focus. The div now carries
   * `tabindex="-1"` and this getter falls back to it, so Home/End/arrows can
   * land on a group header like every other item.
   */
  get menuItemFocusable(): HTMLElement | undefined {
    return (this.menuItemLinkEl as HTMLElement) ?? (this.menuItemLink as unknown as HTMLElement) ?? undefined;
  }

  /**
   * Query the button element inside the ALButton
   */
  get menuItemControlEl(): HTMLButtonElement {
    if (this.menuItemControl) {
      return this.menuItemControl.shadowRoot.querySelector('.al-c-button');
    }
  }

  /**
   * First updated lifecycle
   * 1. Wait for slotted elements to be loaded
   */
  async firstUpdated() {
    await this.updateComplete;
    this.setIndentation();
    this.setLinkClasses();
    this.setControlClasses();
    // The owning <al-menu> may not have rendered its <ul> yet.
    requestAnimationFrame(() => this.syncListRole());
  }

  /**
   * Updated lifecycle
   * 1. Wait for slotted elements to be loaded
   */
  updated() {
    this.setIndentation();
    this.setLinkClasses();
    this.setControlClasses();
    this.syncListRole();
  }

  /**
   * A11y — recompute the internal `<li>`'s role from the flattened tree, which
   * is the only path that crosses the slot/shadow hop to `<al-menu>`'s `<ul>`.
   */
  private syncListRole() {
    this._listRole = this.hasAncestorRole(['list', 'group'], ['ul', 'ol', 'menu']) ? 'listitem' : 'none';
  }

  /**
   * Set the appropriate classes for link
   * 1. Add classes once the element loads
   * 2. Add class if the menu item is a header
   * 3. Toggle selected class based on isSelected property
   */
  setLinkClasses() {
    if (this.menuItemLinkEl) {
      /* 1 */
      this.menuItemLinkEl.classList.add('al-c-menu-item-link');
      /* A11y: `aria-label` and `aria-current` belong on the focusable control
         that screen readers land on, not on the wrapping `<li>` — which is
         `role="none"` whenever the item is standalone, and `aria-label` is
         prohibited there (axe `aria-prohibited-attr`). */
      if (this.label) {
        this.menuItemLinkEl.setAttribute('aria-label', this.label);
      } else {
        this.menuItemLinkEl.removeAttribute('aria-label');
      }
      if (this.isSelected) {
        this.menuItemLinkEl.setAttribute('aria-current', 'true');
      } else {
        this.menuItemLinkEl.removeAttribute('aria-current');
      }
      /* 2 */
      if (this.isHeader) {
        this.menuItemLinkEl.classList.add('al-c-menu-item-header-link');
      }
      /* 3 */
      if (this.isSelected) {
        this.menuItemLinkEl.classList.add('al-is-selected');
      } else {
        this.menuItemLinkEl.classList.remove('al-is-selected');
      }
    }
  }

  /**
   * Set the appropriate classes for the control button
   * 1. Add classes once the element loads
   * 2. Toggle selected class based on isSelected property
   */
  setControlClasses() {
    if (this.menuItemControlEl) {
      /* 1 */
      this.menuItemControlEl.classList.add('al-c-menu-item-button');
      /* 2 */
      if (this.isSelected) {
        this.menuItemControlEl.classList.add('al-is-selected');
      } else {
        this.menuItemControlEl.classList.remove('al-is-selected');
      }
    }
  }

  /**
   * Set indentation
   * 1. Set the indentation on the menu item link to align with header items
   */
  setIndentation() {
    if (this.indentation) {
      this.style.setProperty('--al-link-padding-inline-start', this.indentation.toString() + 'px'); /* 1 */
    }
  }

  /**
   * Set selected item
   * 1. If the item is not disabled or already selected, set its selected state to true
   * 2. Dispatch the custom event
   */
  setSelected() {
    /* 1 */
    if (!this.isDisabled && !this.isSelected) {
      this.isSelected = true;
      /* 2 */
      this.dispatch({
        eventName: 'onMenuItemSelect',
        detailObj: {
          value: this.value,
          selected: this.isSelected,
          item: this
        }
      });
    }
  }

  /**
   * Toggle the item's expanded state
   * 1. If the item is a group header, toggle its expanded state
   * 2. Dispatch the custom event
   */
  toggleExpanded() {
    /* 1 */
    if (this.isHeader && this.groupId) {
      this.isExpanded = !this.isExpanded;

      /* 2 */
      this.dispatch({
        eventName: 'onMenuItemExpand',
        detailObj: {
          expanded: this.isExpanded,
          item: this
        }
      });
    }
  }

  /**
   * Handle on click of the menu item control button
   * - Expand the item
   */
  handleOnControlClick() {
    this.toggleExpanded();
  }

  /**
   * Handle on click of a menu item
   * - Select the item on click
   */
  handleOnLinkClick() {
    this.setSelected();
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-menu-item', {
      'al-c-menu-item--header': this.isHeader,
      'al-is-hidden': this.isHidden
    });

    return html`
      <li
        class="${componentClassNames}"
        role=${this._listRole}
      >
      ${this.isHeader && !this.href ?
        html`<div
          class="al-c-menu-item__link al-c-menu-item--no-href"
          tabindex="-1"
          @click=${this.handleOnLinkClick}>
            ${
              this.slotNotEmpty('before') &&
              html`
                <div class="al-c-menu-item__prefix">
                  <slot name="before"></slot>
                </div>
              `
            }
            <slot></slot>
        </div>` :
        html`<${this.linkEl}
          class="al-c-menu-item__link"
          @click=${this.handleOnLinkClick}
          href=${ifDefined(this.href)}
          target=${ifDefined(this.target)}
          linkTitle=${ifDefined(this.linkTitle)}
          ?isDisabled=${this.isDisabled}
        >
          ${
            this.slotNotEmpty('before') &&
            html`
              <div class="al-c-menu-item__prefix">
                <slot name="before"></slot>
              </div>
            `
          }
          <slot></slot>
        </${this.linkEl}>`}
        ${
          this.isHeader && this.groupId
            ? html`
          <${this.buttonEl}
            class="al-c-menu-item__control"
            styleModifier="al-c-menu-item-button"
            @click=${this.handleOnControlClick}
            ?isExpanded=${this.isExpanded}
            ?hideText=${true}
            ?isDisabled=${this.isDisabled}
          >
            <${this.iconChevronDownEl} size="lg" slot="before"></${this.iconChevronDownEl}>
            ${this.isExpanded ? 'Collapse' : 'Expand'}
          </${this.buttonEl}>
        `
            : html``
        }
      </li>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALMenuItem.el) === undefined) {
  customElements.define(ALMenuItem.el, ALMenuItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-menu-item': ALMenuItem;
  }
}
