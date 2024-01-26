import { html, unsafeCSS } from 'lit';
import { property, query, queryAssignedElements, state } from 'lit/decorators.js';
import { nanoid } from 'nanoid';
import { SLElement } from '../SLElement';
import { SLMenuItem } from '../menu-item/menu-item';
import styles from './menu.scss';

/**
 * Component: sl-menu
 * - Menu displays a list of interactive options on a temporary surface.
 * @slot - The Menu Items in the menu
 * @slot "trigger" - A button to trigger the active state of the menu
 */
export class SLMenu extends SLElement {
  static el = 'sl-menu';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Variant
   * - **default** Displays the menu items in a panel
   * - **cascading** Display the menu items without a panel
   */
  @property()
  accessor variant: 'cascading';

  /**
   * Positions the menu panel absolutely to the trigger.
   * - **default** places the menu panel to the bottom right of the trigger
   * - **bottom-right** places the menu panel to the bottom right of the trigger
   * - **bottom-left** places the menu panel to the bottom left of the trigger
   * - **top-right** places the menu panel to the top right of the trigger
   * - **top-left** places the menu panel to the top left of the trigger
   * - **left** places the menu panel to the left of the trigger
   * - **right** places the menu panel to the right of the trigger
   */
  @property()
  accessor position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'left' | 'right' = 'bottom-right';

  /**
   * Active property
   * - **true** Displays the menu on the page
   * - **false** Hides the menu on the page
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   * Width property
   * - If set, the menu will be constrained to this width in px
   */
  @property({ type: Number })
  accessor width: number;

  /**
   * Height property
   * - If set, the menu will be constrained to this height in px and enable vertical scrolling
   */
  @property({ type: Number })
  accessor height: number;

  /**
   * Id attribute
   * - Unique id used for A11y
   * - Associate the menu with the trigger that controls its open/close state
   */
  @property()
  accessor menuId: string;

  /**
   * Label attribute
   * - Sets ariaLabel for A11y
   */
  @property()
  accessor label: string = 'Menu';

  /**
   * Indent group items attribute
   * **true** - Applies padding to left align the text on group Menu Items with the text of the group Header
   * **false** - Does not apply extra padding
   */
  @property({ type: Boolean })
  accessor indentGroupItems: boolean;

  /* Tab index attribute
   * - Dynamically sets the menu's tab index for keyboard navigation
   */
  @state()
  accessor tabIndex: number = 0;

  /**
   * Is set to true when the total height of items in the menu is greater than the menu's height attribute
   * - **true** Displays a scrollbar to handle vertical overflow
   */
  @state()
  accessor hasOverflow: boolean = false;

  /**
   * The currently focused item in the menu list
   */
  @state()
  accessor focusedItem: SLMenuItem;

  /**
   * The currently selected item in the menu list
   */
  @state()
  accessor selectedItem: SLMenuItem;

  /**
   * Keeps track of the number of valid (expanded/visible, not disabled) items in the list
   * - Used to control keyboard focus
   */
  @state()
  accessor validItemCount: number = 0;

  /**
   * The first valid item in the menu list, used to control keyboard focus
   */
  @state()
  accessor firstValidItem: SLMenuItem;

  /**
   * Flag that limits method calls to run only once when the menu is first active
   * - Is set to false after the methods run once
   */
  @state()
  accessor handleActiveMenu: boolean = true;

  /**
   * Query the menu item components within the menu
   */
  @queryAssignedElements({ flatten: true })
  accessor menuItems: Array<SLMenuItem>;

  /**
   * Query the UL element within the menu
   */
  @query('.sl-c-menu__list')
  accessor menuList: HTMLElement;

  /**
   * Query the button that triggers the opening of the menu
   */
  @queryAssignedElements({ slot: 'trigger' })
  accessor menuTrigger: any[];

  /**
   * Query the trigger inner elements
   */
  get menuTriggerButton(): any {
    if (this.menuTrigger[0].shadowRoot) {
      return this.menuTrigger[0].shadowRoot.querySelector('*');
    } else {
      return this.menuTrigger[0].querySelector('*');
    }
  }

  /**
   * The last index of menu items, used to control keyboard focus
   */
  get _maxIndex(): number {
    return this.validItemCount ? this.validItemCount - 1 : this.menuItems.length - 1;
  }

  /**
   * Initialize functions
   */
  constructor() {
    super();
    this.handleOnClickOutside = this.handleOnClickOutside.bind(this);
    /**
     * Observe changes to the expanded state of menu items and update the menu
     */
    this.addEventListener('menuItemExpanded', () => {
      this.handleOnMenuItemExpanded();
    });
    /**
     * Observe changes to the selected state of menu items and update the menu
     */
    this.addEventListener('menuItemSelected', (e: CustomEvent) => this.handleOnMenuItemSelected(e.target as SLMenuItem));
  }

  /**
   * Connected callback lifecycle
   * 1. Add mousedown event listener
   * 2. Dynamically set the id for A11y. This id should be set as the 'ariaControls' attribute on the trigger button
   */
  connectedCallback() {
    super.connectedCallback();
    globalThis.addEventListener('mousedown', this.handleOnClickOutside, false); /* 1 */
    this.menuId = this.menuId || nanoid(); /* 2 */
  }

  /**
   * Disconnected callback lifecycle
   * 1. Remove mousedown event listener
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    globalThis.removeEventListener('mousedown', this.handleOnClickOutside, false); /* 1 */
  }

  /**
   * First updated lifecycle
   * If the Menu is Active
   * 1. Dynamically set the menu panel's width and height and scroll behavior
   * 2. Synchronize items with their Group Headers and apply indexes for keyboard
   * 3. Set the handleActiveMenu flag to false to prevent running duplicate logic
   */
  firstUpdated() {
    if (this.isActive) {
      this.setWidthHeight(); /* 1 */
      this.syncHeadersWithItems(); /* 2 */
      this.handleActiveMenu = false; /* 3 */
    }
  }

  /**
   * Dynamically associates Group Menu items with their Headers, and sets indexes on items for keyboard navigation
   * 1. Initalize the valid item count at 0
   * 2. Iterate over all menu items
   * 3. Initialize the items index to null
   * 4. If the item is a Header: set its index, and increment the valid item count
   * 5. If the item has an index greater than 0, set the margin block start to 12px
   * 6. If the item is an Expandable Group Header:
   * - Store it as the Group Header in the loop
   * - Assign it a group id, if not previously set
   * - Assign it a unique id, if not previously set
   * 7. If the item is not a Header, a Group Header **has** been stored, and the item has does not already have a group id:
   * - Assign the item the current group id
   * - Apply the item a unique id
   * - Add this unique id to the aria-controls attribute for the group's expand control
   * 8. If required, apply padding to align the items's text with its Header
   * 9. If the item's Group Header is expanded: assign its index and increment the valid item count
   * 10. When the next item is not a header, remove the stored Group Header
   * 11. If the item is not a Header or part of a group, assign its index and increment the valid item count
   */
  syncHeadersWithItems() {
    let groupHeader: SLMenuItem;
    let groupId: string;
    this.validItemCount = 0; /* 1 */
    /* 2 */
    this.menuItems.forEach((item: SLMenuItem, i: number) => {
      item.idx = null; /* 3 */
      const nextItem = this.menuItems[i + 1];
      /* 4 */
      if (item.isHeader) {
        /* 5 */
        if (i > 0) {
          item.style.setProperty('--sl-menu-item-header-margin-block-start', '12px');
        }
        item.idx = this.validItemCount;
        this.validItemCount++;
        /* 6 */
        if (item.isExpandableHeader && nextItem && !nextItem.isHeader) {
          groupHeader = item as SLMenuItem;
          if (!item.groupId) {
            groupId = nanoid();
            item.groupId = groupId as string;
            item.id = `group-${groupId}-header`;
          }
        }
      } else if (groupHeader) {
        /* 7 */
        if (!item.groupId) {
          item.groupId = groupId;
          item.id = `group-${groupId}-item-${i}`;
          groupHeader.ariaControls += ` ${item.id}`;
          /* 8 */
          if (this.indentGroupItems) {
            this.setIndentation(groupHeader, item);
          }
        }
        /* 9 */
        if (groupHeader.isExpanded) {
          item.idx = this.validItemCount;
          this.validItemCount++;
          item.isHidden = false;
        } else {
          item.isHidden = true;
        }
        /* 10 */
        if (nextItem?.isHeader) {
          groupHeader = null;
        }
      } else {
        /* 11 */
        item.idx = this.validItemCount;
        this.validItemCount++;
      }
    });
  }

  /**
   * Dynamically set inline start padding on child menu items
   * 1. Reset the padding to 0
   * 2. If the Group Header has prefix content, Get the width of this content
   * 3. Add padding to the item to account for prefix content width, plus existing padding and gap widths
   */
  async setIndentation(currentHeader: SLMenuItem, item: SLMenuItem) {
    item.indentation = 0; /* 1 */
    await this.updateComplete;
    /* 2 */
    if (currentHeader.slotNotEmpty('before')) {
      const prefixContent = currentHeader.shadowRoot.querySelector<HTMLElement>('.sl-c-menu-item__prefix');
      /* 3 */
      item.indentation = prefixContent.clientWidth + item.indentation + 24;
    }
  }

  /**
   * Set the width and height
   * 1. Add a custom property to adjust the width of the menu panel
   * 2. Add a custom property to adjust the height of the menu panel and enable scroll
   */
  setWidthHeight() {
    if (this.width) {
      this.style.setProperty('--sl-menu-panel-width', this.width.toString() + 'px');
    }
    if (this.height) {
      this.style.setProperty('--sl-menu-panel-height', this.height.toString() + 'px');
      this.hasOverflow = true;
    }
  }

  /**
   * Find the previous or next valid item in the menu list that can receive focus
   * @param currentIndex - The index of the item that currently has focus
   * @param isPrevious - A flag indicating whether to look for the previous item (true) or the next item (false)
   * 1. Calculate the index of the new menu item based on the 'isPrevious' flag
   * 2. Handle boundary conditions by looping to the other end if necessary
   * 3. Find the new item to focus based on the new index
   * 4. If the new item is valid (not disabled), return it
   * 5. If the new item not valid, repeat recursively until a valid item is found
   */
  getNewValidItem(currentIndex: number, isPrevious: boolean): SLMenuItem {
    /* 1 */
    let newIndex = isPrevious ? currentIndex - 1 : currentIndex + 1;
    /* 2 */
    if (newIndex < 0) {
      newIndex = this._maxIndex;
    } else if (newIndex >= this._maxIndex) {
      newIndex = 0;
    }
    /* 3 */
    const newItem = this.menuItems.find((item) => item.idx === newIndex);
    if (!newItem.isDisabled) {
      return newItem; /* 4 */
    } else {
      return this.getNewValidItem(newItem.idx, isPrevious); /* 5 */
    }
  }

  /**
   * When a new item is focused:
   * 1. Set the previously selected item's isFocused state to false
   * 2. Store the newly focused item on the menu's state
   * 3. Apply focus to the new item
   */
  setFocusedItem(item: SLMenuItem) {
    if (this.focusedItem) {
      this.focusedItem.isFocused = false; /* 1 */
    }
    this.focusedItem = item; /* 2 */
    this.focusedItem.menuItemLinkEl.focus(); /* 3 */
  }

  /**
   * Set the focused item to the previous or next menu item based on the 'isPrevious' flag
   * @param currentItem - The currently focused menu item
   * @param isPrevious - A flag indicating whether to focus the previous item (true) or the next item (false)
   * 1. Get the next or previous valid item that will receive focus
   * 2. Set focus to the new item's inner element
   * 3. Set the new item as the currently focused item in the menu
   */
  setFocusAdjacentItem(currentItem: SLMenuItem, isPrevious: boolean) {
    const newFocusItem = this.getNewValidItem(currentItem.idx, isPrevious); /* 1 */
    this.setFocusedItem(newFocusItem);
  }

  /**
   * Handle focus event
   * 1. Remove the menu from tab order so that "Shift + Tab" will send focus back to the trigger button
   * 2. If there is a selected menu item, send focus to that item
   * 3. If there is not a selected menu item, send focus to the first valid item in the menu
   */
  handleOnFocus() {
    this.tabIndex = -1; /* 1 */
    /* 2 */
    if (this.selectedItem) {
      this.setFocusedItem(this.selectedItem);
    } else {
      /* 3 */
      this.firstValidItem = this.getNewValidItem(-1, false);
      this.setFocusedItem(this.firstValidItem);
    }
  }

  /**
   * Handle keydown event
   * 1. When the Enter key is pressed on the trigger, open the menu and prevent default button click
   * 2. When the Escape key is pressed, close the menu
   * 3. On Down Arrow key, move focus to the next item. Or, if focus is on the last valid item, move focus to the first valid item in the list.
   * 4. On Up Arrow key, move focus to the previous item. Or, if focus is on the first valid item, move focus to the last valid item in the list.
   * 5. On Home key, move focus to the first valid item in the list.
   * 6. On End key, move focus to the last valid item in the list.
   */
  handleOnKeydown(e: KeyboardEvent) {
    const { target } = e as any;
    /* 1 */
    if (this.slotNotEmpty('trigger') && target.matches('[slot="trigger"]') && e.key === 'Enter') {
      e.preventDefault();
      this.open();
    }
    /* 2 */
    if (this.slotNotEmpty('trigger') && e.key === 'Escape') {
      this.close();
    }
    if (target.matches('sl-menu-item')) {
      switch (e.key) {
        case 'ArrowDown' /* 3 */:
          this.setFocusAdjacentItem(target as SLMenuItem, false);
          break;
        case 'ArrowUp' /* 4 */:
          this.setFocusAdjacentItem(target as SLMenuItem, true);
          break;
        case 'Home' /* 5 */:
          this.setFocusAdjacentItem(
            this.menuItems.find((item) => item.idx === this._maxIndex - 1),
            false
          );
          break;
        case 'End' /* 6 */:
          this.setFocusAdjacentItem(
            this.menuItems.find((item) => item.idx === 0),
            true
          );
          break;
      }
    }
  }

  /**
   * When a new item is selected:
   * 1. Set the previously selected item's isSelected state to false
   * 2. Store the newly selected item on the menu's state
   */
  handleOnMenuItemSelected(item: SLMenuItem) {
    if (this.selectedItem) {
      this.selectedItem.isSelected = false; /* 1 */
    }
    this.selectedItem = item; /* 2 */
  }

  /**
   * When a menu Group Header is Expanded:
   * 1. Show/hide items that belong to the given Group Header, and reassign valid indexes for keyboard navigation
   */
  handleOnMenuItemExpanded(): void {
    this.syncHeadersWithItems();
  }

  /**
   * Handles the click event outside the component:
   * 1. Check if the menu is active
   * 2. Determine if the click occurred inside the active menu
   * 3. Check if the click occurred outside the active menu
   * 4. Close the menu if the click occurred outside it
   */
  handleOnClickOutside(event: MouseEvent) {
    /* 1 */
    if (this.slotNotEmpty('trigger') && this.isActive) {
      const didClickInside = event.composedPath().includes(this.shadowRoot.host); /* 2 */
      /* 3 */
      if (!didClickInside) {
        /* 4 */
        this.close();
      }
    }
  }

  /**
   * Set menu active state
   * 1. Toggle the active state between true and false
   * 2. Open/close the panel container based on isActive
   */
  public toggleActive() {
    this.isActive = !this.isActive; /* 1 */
    /* 2 */
    if (this.isActive) {
      this.open();
    } else {
      this.close();
    }
  }

  /**
   * Open menu
   * - When the menu is opened:
   * 1. Set the isActive property to true to display the menu
   * 2. Focus the menu list element
   * 3. Dispatch the custom event
   * 4. If the active menu methods have not run, execute them and set the flag to false
   */
  public open() {
    this.isActive = true; /* 1 */
    setTimeout(() => {
      this.menuList.focus(); /* 2 */
    }, 1);
    /* 3 */
    this.dispatch({
      eventName: 'open',
      detailObj: {
        active: this.isActive
      }
    });
    /* 4 */
    if (this.handleActiveMenu) {
      this.setWidthHeight();
      this.syncHeadersWithItems();
      this.handleActiveMenu = false;
    }
  }

  /**
   * Close menu
   * - When the menu is closed:
   * 1. Set the isActive property to false to hide the menu
   * 2. If there is no selected item, reset the menu's tab index so it is focusable
   * 3. Set focus to the trigger button element
   * 4. Dispatch the custom event
   */
  public close() {
    this.isActive = false; /* 1 */
    if (!this.selectedItem) {
      this.tabIndex = 0; /* 2 */
    }
    /* 3 */
    setTimeout(() => {
      if (this.menuTriggerButton) {
        this.menuTriggerButton.focus();
      }
    }, 1);
    /* 4 */
    this.dispatch({
      eventName: 'close',
      detailObj: {
        active: this.isActive
      }
    });
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-menu', {
      'sl-c-menu--cascading': this.variant === 'cascading',
      'sl-c-menu--top-left': this.position === 'top-left',
      'sl-c-menu--top-right': this.position === 'top-right',
      'sl-c-menu--bottom-left': this.position === 'bottom-left',
      'sl-c-menu--bottom-right': this.position === 'bottom-right',
      'sl-c-menu--left': this.position === 'left',
      'sl-c-menu--right': this.position === 'right',
      'sl-is-active': this.isActive,
      'sl-has-overflow': this.hasOverflow,
      'sl-has-trigger': this.slotNotEmpty('trigger')
    });

    return html`
      <div class="${componentClassNames}">
        ${this.slotNotEmpty('trigger') &&
        html`
          <div class="sl-c-menu__trigger" @click=${this.toggleActive} @keydown=${this.handleOnKeydown} aria-controls=${this.menuId}>
            <slot name="trigger"></slot>
          </div>
        `}
        <nav class="sl-c-menu__panel" id=${this.menuId}>
          <ul
            class="sl-c-menu__list"
            aria-label=${this.label}
            tabindex=${this.tabIndex}
            @focus=${this.handleOnFocus}
            @keydown=${this.handleOnKeydown}
          >
            <slot></slot>
          </ul>
        </nav>
      </div>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLMenu.el) === undefined) {
  customElements.define(SLMenu.el, SLMenu);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-menu': SLMenu;
  }
}
