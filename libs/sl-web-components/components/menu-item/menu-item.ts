import { TemplateResult, unsafeCSS } from 'lit';
import { property, query } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLButton } from '../button/button';
import { SLIconChevronDown } from '../icon/icons/chevron-down';
import { SLLink } from '../link/link';
import styles from './menu-item.scss';

/**
 * Component: sl-menu-item
 * - A menu item is a singular item that is meant to be used within the SLMenu
 * @slot - The content to display in the menu item
 * @slot "before" - Optional prefix content to display in the menu item
 */
export class SLMenuItem extends SLElement {
  static el = 'sl-menu-item';
  private elementMap = register({
    elements: [
      [SLLink.el, SLLink],
      [SLButton.el, SLButton],
      [SLIconChevronDown.el, SLIconChevronDown]
    ],
    suffix: (globalThis as any).enAutoRegistry === true ? '' : PackageJson.version
  });

  private linkEl = unsafeStatic(this.elementMap.get(SLLink.el));
  private buttonEl = unsafeStatic(this.elementMap.get(SLButton.el));
  private iconChevronDownEl = unsafeStatic(this.elementMap.get(SLIconChevronDown.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

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
  @property()
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
  accessor indentation: number;

  /**
   * Label attribute
   * - Sets the ariaLabel for A11y
   */
  @property()
  accessor label: string;

  /**
   * Aria controls
   * - Associates a Expandable Header's control with the items in that group
   */
  @property()
  accessor ariaControls: string;

  /**
   * Query the SL-LINK element inside the component
   */
  @query('.sl-c-menu-item__link')
  accessor menuItemLink: SLLink;

  /**
   * Query the SL-BUTTON element inside the component
   */
  @query('.sl-c-menu-item__control')
  accessor menuItemControl: SLButton;

  /**
   * Query the link element inside the SLLink
   * - This will be either an `a` tag or `button`
   */
  get menuItemLinkEl(): HTMLAnchorElement | HTMLButtonElement {
    if (this.menuItemLink) {
      return this.menuItemLink.shadowRoot.querySelector('.sl-c-link');
    }
  }

  /**
   * Query the button element inside the SLButton
   */
  get menuItemControlEl(): HTMLButtonElement {
    if (this.menuItemControl) {
      return this.menuItemControl.shadowRoot.querySelector('.sl-c-button');
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
  }

  /**
   * Updated lifecycle
   * 1. Wait for slotted elements to be loaded
   */
  updated() {
    this.setIndentation();
    this.setLinkClasses();
    this.setControlClasses();
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
      this.menuItemLinkEl.classList.add('sl-c-menu-item-link');
      /* 2 */
      if (this.isHeader) {
        this.menuItemLinkEl.classList.add('sl-c-menu-item-header-link');
      }
      /* 3 */
      if (this.isSelected) {
        this.menuItemLinkEl.classList.add('sl-is-selected');
      } else {
        this.menuItemLinkEl.classList.remove('sl-is-selected');
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
      this.menuItemControlEl.classList.add('sl-c-menu-item-button');
      /* 2 */
      if (this.isSelected) {
        this.menuItemControlEl.classList.add('sl-is-selected');
      } else {
        this.menuItemControlEl.classList.remove('sl-is-selected');
      }
    }
  }

  /**
   * Set indentation
   * 1. Set the indentation on the menu item link to align with header items
   */
  setIndentation() {
    if (this.indentation) {
      this.style.setProperty('--sl-link-padding-inline-start', this.indentation.toString() + 'px'); /* 1 */
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
        eventName: 'menuItemSelected',
        detailObj: {
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
        eventName: 'menuItemExpanded',
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
    const componentClassNames = this.componentClassNames('sl-c-menu-item', {
      'sl-c-menu-item--header': this.isHeader,
      'sl-is-hidden': this.isHidden
    });

    return html`
      <li
        class="${componentClassNames}"
        aria-label=${ifDefined(this.label)}
        aria-current=${ifDefined(this.isSelected)}
      >
        <${this.linkEl}
          class="sl-c-menu-item__link"
          @click=${this.handleOnLinkClick}
          href=${ifDefined(this.href)}
          target=${ifDefined(this.target)}
          linkTitle=${ifDefined(this.linkTitle)}
          ?isDisabled=${this.isDisabled}
        >
          ${
            this.slotNotEmpty('before') &&
            html`
              <div class="sl-c-menu-item__prefix">
                <slot name="before"></slot>
              </div>
            `
          }
          <slot></slot>
        </${this.linkEl}>
        ${
          this.isHeader && this.groupId
            ? html`
          <${this.buttonEl}
            class="sl-c-menu-item__control"
            styleModifier="sl-c-menu-item-button"
            @click=${this.handleOnControlClick}
            ?isExpanded=${this.isExpanded}
            aria-controls=${this.ariaControls}
            ?hideText=${true}
            ?isDisabled=${this.isDisabled}
          >
            <${this.iconChevronDownEl} slot="before"></${this.iconChevronDownEl}>
            ${this.isExpanded ? 'Collapse' : 'Expand'}
          </${this.buttonEl}>
        `
            : html``
        }
      </li>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLMenuItem.el) === undefined) {
  customElements.define(SLMenuItem.el, SLMenuItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-menu-item': SLMenuItem;
  }
}
