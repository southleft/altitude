import { TemplateResult, unsafeCSS } from 'lit';
import { property, query } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLDropdownPanel } from '../dropdown-panel/dropdown-panel';
import { SLIconChevronDown } from '../icon/icons/chevron-down';
import { SLIconChevronRight } from '../icon/icons/chevron-right';
import styles from './list-item.scss';

/**
 * Component: sl-list-item
 *
 * List Item is a single item in a list.
 * - **slot**: The content of the list item
 */
export class SLListItem extends SLElement {
  static el = 'sl-list-item';

  private elementMap = register({
    elements: [
      [SLDropdownPanel.el, SLDropdownPanel],
      [SLIconChevronDown.el, SLIconChevronDown],
      [SLIconChevronRight.el, SLIconChevronRight],
      [SLListItem.el, SLListItem]
    ],
    suffix: (globalThis as any).enAutoRegistry === true ? '' : PackageJson.version
  });

  private dropdownPanelEl = unsafeStatic(this.elementMap.get(SLDropdownPanel.el));
  private iconChevronDownEl = unsafeStatic(this.elementMap.get(SLIconChevronDown.el));
  private iconChevronRightEl = unsafeStatic(this.elementMap.get(SLIconChevronRight.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Variants
   * - **static** renders a list item that isn't interactive. Use for typeahead dropdowns
   */
  @property()
  accessor variant: 'static';

  /**
   * Error state
   * 1. Changes the component's treatment to represent an error
   */
  @property({ type: Boolean })
  accessor isError: boolean;

  /**
   * Disabled attribute
   */
  @property({ type: Boolean })
  accessor isDisabled: boolean;

  /**
   * Target attribute for a link (i.e. set to _blank to open in new tab)
   * - **flyout** changes the nested items into flyout menus
   */
  @property()
  accessor behavior: 'flyout';

  /**
   * Flyout position (only use with flyout behavior)
   * - **left** positions the flyout menu to the left of the item trigger
   * - **bottom** positions the flyout menu below the item trigger
   */
  @property()
  accessor flyoutPosition: 'left' | 'bottom' | 'top';

  /**
   * URL if this is an <a> element - this swaps <button> for <a>
   */
  @property()
  accessor href: string;

  /**
   * Value for a list item that needs to return a value to an input in a dropdown. This is required for search-form/drop-down.
   * Value can be a string or object ({lable, value} pair)
   */
  @property()
  accessor value: string | { label: string; value: any; [key: string]: unknown };

  /**
   * Active state
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   * Current state
   */
  @property({ type: Boolean })
  accessor isCurrent: boolean;

  /**
   * Disabled attribute
   */
  @property()
  accessor onClick: () => void;

  /**
   * Target attribute for a link (i.e. set to _blank to open in new tab)
   * - **_blank** yields a link that opens in a new tab
   * - **_self** yields a link that loads the URL into the same browsing context as the current one. This is the default behavior
   * - **_parent** yields a link that loads the URL into the parent browsing context of the current one.
   *   If there is no parent, this behaves the same way as _self
   * - **_top** yields a link that loads the URL into the top-level browsing context. If there is no parent, this behaves the same way as _self.
   */
  @property()
  accessor target: '_blank' | '_self' | '_parent' | '_top';

  /**
   * Query the .sl-c-tooltip
   */
  @query('.sl-c-list-item')
  accessor _enListItem: HTMLElement;

  /**
   * Query the .sl-c-tooltip
   */
  @query('.sl-c-list-item__dropdown-panel')
  accessor _enListItemDropdown: HTMLElement;

  /**
   * Focus on first list item
   * 1. Used for keyboard functionality within the list
   */
  focusOnFirstItem(e: Event) {
    const listItems = this.parentNode.querySelectorAll(this.elementMap.get(SLListItem.el));
    for (let i = 0; i < listItems.length; i++) {
      if (!listItems[i].shadowRoot.querySelector('.sl-c-list-item.sl-is-disabled')) {
        listItems[i].shadowRoot.querySelector<HTMLButtonElement | HTMLAnchorElement>('.sl-c-list-item__link').focus();
        e.preventDefault();
        break;
      }
    }
  }

  /**
   * Focus on last list item
   * 1. Used for keyboard functionality within the list
   */
  focusOnLastItem(e: Event) {
    const listItems = this.parentNode.querySelectorAll(this.elementMap.get(SLListItem.el));
    for (let i = listItems.length - 1; i >= 0; i--) {
      if (!listItems[i].shadowRoot.querySelector('.sl-c-list-item.sl-is-disabled')) {
        listItems[i].shadowRoot.querySelector<HTMLButtonElement | HTMLAnchorElement>('.sl-c-list-item__link').focus();
        e.preventDefault();
        break;
      }
    }
  }

  /**
   * Initialize functions
   */
  constructor() {
    super();
    this.handleOnMouseOver = this.handleOnMouseOver.bind(this);
  }

  /**
   * Connected callback lifecycle
   * 1. Add event listeners
   */
  connectedCallback() {
    super.connectedCallback();
    if (this.behavior === 'flyout') {
      document.addEventListener('mouseover', this.handleOnMouseOver);
    }
  }

  /**
   * Disconnected callback lifecycle
   * 1. Remove window resize event listener
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.behavior === 'flyout') {
      document.removeEventListener('mouseover', this.handleOnMouseOver);
    }
  }

  /**
   * Handle click outside the component
   * 1. Close the show hide panel on click outside
   * 2. If the nav is already closed then we don't care about outside clicks and we
   * can bail early
   * 3. By the time a user clicks on the page the shadowRoot will almost certainly be
   * defined, but TypeScript isn't that trusting and sees this.shadowRoot as possibly
   * undefined. To work around that we'll check that we have a shadowRoot (and a
   * rendered .host) element here to appease the TypeScript compiler. This should never
   * actually be shown or run for a human end user.
   * 4. Check to see if we clicked inside the active navigation item
   * 5. If the navigation is active and we've clicked outside of the nav then it should
   * be closed.
   */
  handleOnMouseOver(event: MouseEvent) {
    if (this.behavior === 'flyout') {
      /* 2 */
      if (!this.isActive) {
        return;
      }

      /* 3 */
      if (!this.shadowRoot?.host) {
        throw Error('Could not determine navigation context during click handler');
      }

      /* 4 */
      const didClickInside = event.composedPath().includes(this.shadowRoot.host);

      if (this.isActive && !didClickInside) {
        this.handleMouseLeave();
      }
    }
  }

  /**
   * Handle keydown
   * 1. If left or up arrow key is struck and radio field item exists before current item, remove checked from all items and
   * add it to the next item
   * 2. If right or down arrow key is struck and radio field item exists after current item, remove checked from all items and
   * add checked to the next item. Focus on this item and set tabindex for when focusing out of radio field and back onto checked item.
   */
  handleKeyDown(e: KeyboardEvent) {
    if (this.previousElementSibling && (e.code === 'ArrowLeft' || e.code === 'ArrowUp')) {
      /* 1 */
      let previous = this.previousElementSibling;

      const previousElement = previous.shadowRoot?.querySelector<HTMLInputElement>('.sl-c-list-item__link');
      if (previousElement) {
        previousElement.focus();
        e.preventDefault();
        while (previous) {
          const previousListItem = previous.shadowRoot.querySelector<HTMLLIElement>('.sl-c-list-item');
          if (!previousListItem.classList.contains('sl-is-disabled')) {
            const newPreviousElement = previous.shadowRoot?.querySelector<HTMLInputElement>('.sl-c-list-item__link');
            newPreviousElement.focus();
            e.preventDefault();
            break;
          } else {
            this.focusOnLastItem(e);
          }

          // Get the previous sibling
          previous = previous.previousElementSibling;
        }
      }
    } else if (this.nextElementSibling && (e.code === 'ArrowRight' || e.code === 'ArrowDown')) {
      /* 2 */
      let next = this.nextElementSibling;
      const nextElement = next.shadowRoot?.querySelector<HTMLInputElement>('.sl-c-list-item__link');
      if (nextElement) {
        while (next) {
          const nextListItem = next.shadowRoot.querySelector<HTMLLIElement>('.sl-c-list-item');
          if (!nextListItem.classList.contains('sl-is-disabled')) {
            const newNextElement = next.shadowRoot?.querySelector<HTMLInputElement>('.sl-c-list-item__link');
            newNextElement.focus();
            e.preventDefault();
            break;
          } else {
            this.focusOnFirstItem(e);
          }

          // Get next sibling
          next = next.nextElementSibling;
        }
      }
    } else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
      this.focusOnLastItem(e);
    } else if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
      this.focusOnFirstItem(e);
    }
  }

  handleClose(e: KeyboardEvent) {
    if (e.code === 'Escape') {
      this.isActive = false;
    }
  }

  /**
   * Handle mouse enter
   * 1. If parent is contextual menu and the item doesn't have subitems, close the contextual menu
   * 2. If the parent is a search form, close the dropdown if item is selected
   */
  handleMouseEnter() {
    if (this.behavior === 'flyout') {
      this.isActive = true;
    }
    setTimeout(() => {
      this.dynamicActive();
    }, 1);
  }

  /**
   * Handle mouse leave
   */
  handleMouseLeave() {
    if (this.behavior === 'flyout' && this.isActive) {
      setTimeout(() => {
        this.isActive = false;
      }, 300);
    }
  }

  /**
   * Handle click
   * 1. If parent is contextual menu and the item doesn't have subitems, close the contextual menu
   * 2. If the parent is a search form, close the dropdown if item is selected
   * @fires select - Fires when the list item  is clicked
   */
  handleClick() {
    if (this.slotNotEmpty('items')) {
      this.isActive = !this.isActive;
    }

    if (this.onClick) {
      this.onClick();
    }
    this.onItemClick();
  }

  onItemClick() {
    const eventValue = new CustomEvent('select', {
      detail: this.value,
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(eventValue);
  }

  /**
   * Handle all mouseout events
   */
  dynamicInactive() {
    if (this.behavior === 'flyout') {
      if (this._enListItem && this._enListItemDropdown) {
        this.isActive = false;
      }
    }
  }

  /**
   * Handle all dynamic placement on mouseover
   */
  dynamicActive() {
    if (this.behavior === 'flyout') {
      if (this._enListItem && this._enListItemDropdown) {
        const body = document.querySelector('body');
        const bodyPosition = body.getBoundingClientRect();
        const listItemDropdown = this._enListItemDropdown;

        this.isActive = true;

        /**
         * Set dynamic positioning
         * 1. If the width of the dropdown is less than the body position minus the trigger list item's right position,
         * set default state of flyout menu (undefined positions it right)
         * 2. Otherwise, if the dropdown width is greater than or equal to the the body position minus the trigger list item's right position
         * and the dropdown width is less than the trigger list item's left position, position the menu to the right of the item
         * 3. Otherwise, if the  position the dropdown below the item
         */
        if (listItemDropdown.clientWidth < bodyPosition.right - this._enListItem.getBoundingClientRect().right) {
          this.flyoutPosition = undefined; /* 1 */
        } else if (
          listItemDropdown.clientWidth >= bodyPosition.right - this._enListItem.getBoundingClientRect().right &&
          listItemDropdown.clientWidth < this._enListItem.getBoundingClientRect().left
        ) {
          this.flyoutPosition = 'left'; /* 2 */
        } else if (listItemDropdown.clientWidth >= bodyPosition.right - this._enListItem.getBoundingClientRect().right) {
          this.flyoutPosition = 'bottom'; /* 3 */
        }
      }
    }
  }

  render() {
    const componentClassName = this.componentClassNames('sl-c-list-item', {
      'sl-c-list-item--flyout': this.behavior === 'flyout',
      'sl-c-list-item--flyout-position-left': this.flyoutPosition === 'left',
      'sl-c-list-item--flyout-position-bottom': this.flyoutPosition === 'bottom',
      'sl-c-list-item--flyout-position-top': this.flyoutPosition === 'top',
      'sl-is-current': this.isCurrent,
      'sl-is-active': this.isActive,
      'sl-is-error': this.isError,
      'sl-is-disabled': this.isDisabled
    });

    if (this.href) {
      return html`
        <li role="listitem" class="${componentClassName}" @keydown=${this.handleKeyDown}>
          <a class="sl-c-list-item__link sl-c-list-item-href__link" href=${this.href} target=${this.target} tabindex=${this.isDisabled && '-1'}>
            <span class="sl-c-list-item__body">
              ${this.slotNotEmpty('before') && html` <div class="sl-c-list-item__icon"><slot name="before"></slot></div> `}
              <div class="sl-c-list-item__text">
                <slot></slot>
              </div>
            </span>
            ${this.slotNotEmpty('after') && html` <div class="sl-c-list-item__after"><slot name="after"></slot></div> `}
          </a>
        </li>
      ` as TemplateResult<1>;
    } else if (this.variant === 'static') {
      return html`
        <li role="listitem" class="${componentClassName}" @keydown=${this.handleKeyDown}>
          <div class="sl-c-list-item__link" @click=${this.handleClick} tabindex=${this.isDisabled && '-1'}>
            <span class="sl-c-list-item__body">
              ${this.slotNotEmpty('before') && html` <div class="sl-c-list-item__icon"><slot name="before"></slot></div> `}
              <div class="sl-c-list-item__text">
                <slot></slot>
              </div>
            </span>
            ${this.slotNotEmpty('after') && html` <div class="sl-c-list-item__after"><slot name="after"></slot></div> `}
          </div>
        </li>
      ` as TemplateResult<1>;
    } else {
      return html`
        <li
          role="listitem"
          class="${componentClassName}"
          @keydown=${this.handleKeyDown}
          @mouseenter=${this.handleMouseEnter}
          @mouseleave=${this.handleMouseLeave}
        >
          <button class="sl-c-list-item__link" @click=${this.handleClick} ?disabled=${this.isDisabled} aria-expanded=${ifDefined(this.isActive)}>
            <span class="sl-c-list-item__body">
              ${this.slotNotEmpty('before') && html` <div class="sl-c-list-item__icon"><slot name="before"></slot></div> `}
              <div class="sl-c-list-item__text">
                <slot></slot>
              </div>
              ${this.slotNotEmpty('items') &&
              (this.behavior === 'flyout'
                ? html` <${this.iconChevronRightEl} class="sl-c-list-item__items-icon" size="xl"></${this.iconChevronRightEl}> `
                : html` <${this.iconChevronDownEl} class="sl-c-list-item__items-icon" size="xl"></${this.iconChevronDownEl}> `)}
            </span>
            ${this.slotNotEmpty('after') && html` <div class="sl-c-list-item__after"><slot name="after"></slot></div> `}
          </button>
          ${this.slotNotEmpty('items') &&
          (this.behavior === 'flyout'
            ? html`
                <div class="sl-c-list-item__items" @mouseenter=${this.handleMouseEnter} aria-hidden=${ifDefined(!this.isActive)}>
                  <${this.dropdownPanelEl} class="sl-c-list-item__dropdown-panel" @keydown=${this.handleClose}>
                    <slot name="items" aria-hidden=${ifDefined(this.isActive)}></slot>
                  </${this.dropdownPanelEl}>
                </div>
              `
            : html`
                <div class="sl-c-list-item__items" aria-hidden=${ifDefined(!this.isActive)}>
                  <slot name="items" aria-hidden=${ifDefined(this.isActive)}></slot>
                </div>
              `)}
        </li>
      ` as TemplateResult<1>;
    }
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLListItem.el) === undefined) {
  customElements.define(SLListItem.el, SLListItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-list-item': SLListItem;
  }
}
