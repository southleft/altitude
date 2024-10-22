import { html, unsafeCSS } from 'lit';
import { property, query, queryAssignedElements, state } from 'lit/decorators.js';
import { nanoid } from 'nanoid';
import { ALElement } from '../ALElement';
import { ALMenuItem } from '../menu-item/menu-item';
import styles from './menu.scss';

/**
 * Component: al-menu
 * - **slot**: The menu items in the menu
 */
export class ALMenu extends ALElement {
  static el = 'al-menu';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Variant
   * - **default** Display the menu items with a background and padding
   * - **simple** Display the menu items without a background and padding
   */
  @property()
  accessor variant: 'simple';

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
  accessor id: string;

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
  accessor focusedItem: ALMenuItem;

  /**
   * The currently selected item in the menu list
   */
  @state()
  accessor selectedItem: ALMenuItem;

  /**
   * Keeps track of the number of valid (expanded/visible, not disabled) items in the list
   * - Used to control keyboard focus
   */
  @state()
  accessor validItemCount: number = 0;

  /**
   * Query the menu item components within the menu
   */
  @queryAssignedElements({ flatten: true })
  accessor menuItems: Array<ALMenuItem>;

  /**
   * Query the UL element within the menu
   */
  @query('.al-c-menu__list')
  accessor menuList: HTMLElement;

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

    /**
     * Observe changes to the expanded state of menu items and update the menu
     */
    this.addEventListener('onMenuItemExpand', () => {
      this.handleOnMenuItemExpand();
    });
    /**
     * Observe changes to the selected state of menu items and update the menu
     */
    this.addEventListener('onMenuItemSelect', (e: CustomEvent) => this.handleOnMenuItemSelect(e.target as ALMenuItem));
  }

  /**
   * Connected callback lifecycle
   * 1. Dynamically set the id for A11y. This id should be set as the 'ariaControls' attribute on the trigger button
   */
  connectedCallback() {
    super.connectedCallback();

    this.id = this.id || nanoid(); /* 1 */
  }

  /**
   * First updated lifecycle
   * 1. Dynamically set the menu's width, height, and scroll behavior
   * 2. Synchronize items with their Group Headers and apply indexes for keyboard navigation
   */
  firstUpdated() {
    this.setWidthHeight(); /* 1 */
    this.syncHeadersWithItems(); /* 2 */
  }

  /**
   * Dynamically associate Group Menu items with their Headers, and set indexes on items for keyboard navigation
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
    let groupHeader: ALMenuItem;
    let groupId: string;
    this.validItemCount = 0; /* 1 */

    /* 2 */
    this.menuItems.forEach((item: ALMenuItem, i: number) => {
      item.idx = null; /* 3 */
      const nextItem = this.menuItems[i + 1];
      /* 4 */
      if (item.isHeader) {
        /* 5 */
        if (i > 0) {
          item.style.setProperty('--al-menu-item-header-margin-block-start', '12px');
        }
        item.idx = this.validItemCount;
        this.validItemCount++;
        /* 6 */
        if (item.isExpandableHeader && nextItem && !nextItem.isHeader) {
          groupHeader = item as ALMenuItem;
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
   * 2. If the Group Header has prefix content, add padding to account for prefix content width
   * 3. If there is no prefix content, set the padding to the default width
   */
   async setIndentation(currentHeader: ALMenuItem, item: ALMenuItem) {
    item.indentation = 0; /* 1 */
    if (currentHeader.slotNotEmpty('before')) { 
      item.indentation = 48; /* 2 */
    } else {
      item.indentation = 24; /* 3 */
    }
  }

  /**
   * Set the width and height
   * 1. Add a custom property to adjust the width of the menu list
   * 2. Add a custom property to adjust the height of the menu list and enable scroll
   */
  setWidthHeight() {
    if (this.width) {
      this.style.setProperty('--al-menu-width', this.width.toString() + 'px');
    }
    if (this.height) {
      this.style.setProperty('--al-menu-height', this.height.toString() + 'px');
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
   * 4. Return the new item
   */
  getNewValidItem(currentIndex: number, isPrevious: boolean): ALMenuItem {
    /* 1 */
    let newIndex = isPrevious ? currentIndex - 1 : currentIndex + 1;
    /* 2 */
    if (newIndex < 0) {
      newIndex = this._maxIndex;
    } else if (newIndex > this._maxIndex) {
      newIndex = 0;
    }
    /* 3 */
    const newItem = this.menuItems.find((item) => item.idx === newIndex);
    return newItem; /* 4 */
  }

  /**
   * When a new item is focused:
   * 1. Set the previously selected item's isFocused state to false
   * 2. Store the newly focused item on the menu's state
   * 3. Apply focus to the new item
   */
  setFocusedItem(item: ALMenuItem) {
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
   */
  setFocusAdjacentItem(currentItem: ALMenuItem, isPrevious: boolean) {
    const newFocusItem = this.getNewValidItem(currentItem.idx, isPrevious); /* 1 */
    if (newFocusItem) {
      this.setFocusedItem(newFocusItem); /* 2 */
    }
  }

  /**
   * Handle keydown event
   * 1. On Down Arrow or Right Arrow key, move focus to the next item. Or, if focus is on the last valid item, move focus to the first valid item in the list.
   * 2. On Up Arrow or Left Arrow key, move focus to the previous item. Or, if focus is on the first valid item, move focus to the last valid item in the list.
   * 3. On Home key, move focus to the first valid item in the list.
   * 4. On End key, move focus to the last valid item in the list.
   */
  handleOnKeydown(e: KeyboardEvent) {
    const { target } = e as any;

    if (target instanceof ALMenuItem || target.tagName.match("al-MENU-ITEM")) {
      switch (e.key) {
        case 'ArrowDown' /* 1 */:
        case 'ArrowRight':
          this.setFocusAdjacentItem(target as ALMenuItem, false);
          break;
        case 'ArrowUp' /* 2 */:
        case 'ArrowLeft':
          this.setFocusAdjacentItem(target as ALMenuItem, true);
          break;
        case 'Home' /* 3 */:
          this.setFocusAdjacentItem(
            this.menuItems.find((item) => item.idx === this._maxIndex),
            false
          );
          break;
        case 'End' /* 4 */:
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
  handleOnMenuItemSelect(item: ALMenuItem) {
    if (this.selectedItem) {
      this.selectedItem.isSelected = false; /* 1 */
    }
    this.selectedItem = item; /* 2 */
  }

  /**
   * When a menu Group Header is Expanded:
   * 1. Show/hide items that belong to the given Group Header, and reassign valid indexes for keyboard navigation
   */
  handleOnMenuItemExpand(): void {
    this.syncHeadersWithItems();
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-menu', {
      'al-c-menu--simple': this.variant === 'simple',
      'al-has-overflow': this.hasOverflow
    });

    return html`
      <div class="${componentClassNames}">
        <ul
          class="al-c-menu__list"
          role="menu"
          aria-label=${this.label}
          @keydown=${this.handleOnKeydown}
        >
          <slot></slot>
        </ul>
      </div>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALMenu.el) === undefined) {
  customElements.define(ALMenu.el, ALMenu);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-menu': ALMenu;
  }
}
