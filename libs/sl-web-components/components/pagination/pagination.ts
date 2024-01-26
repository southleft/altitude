import { PropertyValueMap, TemplateResult, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLContextualMenu } from '../contextual-menu/contextual-menu';
import { SLDropdown } from '../dropdown/dropdown';
import { PartialDataSource } from '../dropdown/dropdown.model';
import { SLIconChevronLeft } from '../icon/icons/chevron-left';
import { SLIconChevronRight } from '../icon/icons/chevron-right';
import { SLIconDotsHorizontal } from '../icon/icons/dots-horizontal';
import { SLListItem } from '../list-item/list-item';
import { SLList } from '../list/list';
import { SLPaginationItem } from '../pagination-item/pagination-item';
import styles from './pagination.scss';

/**
 * For accessing the position of ellipsis
 * 1. dots with no prefix and suffix space
 * 2. dots with prefix space
 * 3. dots with suffix space
 */
const dot = '...'; /* 1 */
const initialDot = ' ...'; /* 2 */
const endDot = '... '; /* 3 */

/**
 * Component: sl-pagination
 * - Pagination allows a user to navigate to content that has been split up into pages.
 * @slot - The components content
 */
export class SLPagination extends SLElement {
  static el = 'sl-pagination';

  private elementMap = register({
    elements: [
      [SLDropdown.el, SLDropdown],
      [SLList.el, SLList],
      [SLListItem.el, SLListItem],
      [SLPaginationItem.el, SLPaginationItem],
      [SLIconChevronRight.el, SLIconChevronRight],
      [SLIconChevronLeft.el, SLIconChevronLeft],
      [SLIconDotsHorizontal.el, SLIconDotsHorizontal],
      [SLContextualMenu.el, SLContextualMenu]
    ],
    suffix: (globalThis as any).enAutoRegistry === true ? '' : PackageJson.version
  });

  private dropdownEl = unsafeStatic(this.elementMap.get(SLDropdown.el));
  private listEl = unsafeStatic(this.elementMap.get(SLList.el));
  private listItemEl = unsafeStatic(this.elementMap.get(SLListItem.el));
  private paginationItemEl = unsafeStatic(this.elementMap.get(SLPaginationItem.el));
  private iconChevronRightEl = unsafeStatic(this.elementMap.get(SLIconChevronRight.el));
  private iconChevronLeftEl = unsafeStatic(this.elementMap.get(SLIconChevronLeft.el));
  private iconDotsHorizontalEl = unsafeStatic(this.elementMap.get(SLIconDotsHorizontal.el));
  private contextualMenuEl = unsafeStatic(this.elementMap.get(SLContextualMenu.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Text displayed on the previous button
   */
  @property()
  accessor prevButtonText: string;

  /**
   * Text displayed on the next button
   */
  @property()
  accessor nextButtonText: string;

  /**
   * Aria label attribute for accessibility
   * Provides an accessible name for the navigation element
   */
  @property({ type: String })
  accessor ariaLabel: string;

  /**
   * Total number of records
   * Represents the total size of the data set
   */
  @property({ type: Number })
  accessor totalRecords: number;

  /**
   * Current page number being displayed
   */
  @property({ type: Number })
  accessor currentItem = 1;

  /**
   * Number of records to display per page
   */
  @property({ type: Number })
  accessor pageSize: number = 10;

  /**
   * Dropdown options for choosing the number of items displayed per page
   */
  @property()
  accessor pageSizeOptions: Array<number> = [20, 40, 60, 80, 100];

  /**
   * Variant of pagination (e.g., 'small' for a compact view)
   */
  @property()
  accessor variant: 'small';

  /**
   * Label text for the page size dropdown
   */
  @property()
  accessor pageSizeLabel: string = 'Show';

  /**
   * Array of page numbers displayed as pagination
   */
  @state()
  accessor pageItems: string[] = [];

  private recordsPerPageDropdownData: PartialDataSource[];

  /**
   * Array of page numbers based on total records
   */
  private pages: string[] = [];

  /**
   * Page numbers displayed under ellipsis (...)
   */
  @state()
  accessor pageItemsRange: string[] = [];

  /**
   * Query for all contextual menus within the pagination component
   */
  get contextualMenus(): Array<SLContextualMenu> {
    return [...this.querySelectorAll<SLContextualMenu>(this.elementMap.get(SLContextualMenu.el))];
  }

  /**
   * Text displaying the range of page numbers based on the current page
   */
  get label() {
    return `Viewing ${this.totalRecords != 0 ? this.currentItem * this.pageSize - this.pageSize + 1 : this.totalRecords} -
    ${this.currentItem * this.pageSize < this.totalRecords ? this.currentItem * this.pageSize : this.totalRecords} of ${this.totalRecords}`;
  }

  /**
   * First updated lifecycle method
   * - Initializes and sets default values:
   * 1. Sets the default page size if not already set
   * 2. Sets up the page numbers
   * 3. Creates the data for the records per page dropdown
   */
  firstUpdated() {
    this.pageSize = this.pageSize || this.pageSizeOptions[0]; /* 1 */
    this.setPageNumbers(); /* 2 */
    this.setRecordsPerPageDropdownData(); /* 3 */
  }

  /**
   * Updated lifecycle method
   * - Handles updates based on changed properties:
   * 1. Resets pagination items and properties if 'pageSize' or 'totalRecords' change
   * 2. Re-creates dropdown data if 'pageSizeOptions' change
   * 3. Updates page items when 'currentItem' changes
   */
  updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    /* 1 */
    if (changedProperties.has('pageSize') || changedProperties.has('totalRecords')) {
      this.pageItems = [];
      this.pages = [];
      this.setPageNumbers();
      this.setPageItems();
      this.currentItem = 1;
    }
    /* 2 */
    if (changedProperties.has('pageSizeOptions')) {
      this.setRecordsPerPageDropdownData();
    }
    /* 3 */
    if (changedProperties.has('currentItem')) {
      this.setPageItems();
    }
  }

  /**
   * Handles keyboard events (keydown)
   * 1. Closes all contextual menus if 'Escape' key is pressed
   * 2. Opens contextual menus based on the selected item (ellipses or dots)
   * 3. Handles page item click based on the selected item
   */
  handleOnKeydown(evt: KeyboardEvent, selectedItem: string): void {
    /* 1 */
    if (evt.code === 'Escape') {
      this.contextualMenus.forEach((menu) => menu.close());
    } else if (evt.code === 'Enter') {
      /* 2 */
      if (selectedItem == endDot) {
        this.contextualMenus[1].open();
      } else if (selectedItem == initialDot) {
        this.contextualMenus[0].open();
      } else if (selectedItem == dot) {
        this.contextualMenus.forEach((menu) => menu.open());
      }
      /* 3 */
      this.handleOnClickPageItem(selectedItem);
    }
  }

  /**
   * Handle on click of previous
   */
  handleOnClickPrev(pageNo: number, e: MouseEvent) {
    e.preventDefault();
    if (this.currentItem !== 1) {
      this.handleOnClickPageItem(pageNo - 1);
    }
  }

  /**
   * Handle on click of next
   */
  handleOnClickNext(pageNo: number, e: MouseEvent) {
    e.preventDefault();
    if (pageNo !== this.pages.length) {
      this.handleOnClickPageItem(pageNo + 1);
    }
  }

  /**
   * Handle on click of page item
   * 1. Checking whether the Item is ellipsis, if , flag is updated
   * 2. If the item is number, the currentItem is updated
   */
  handleOnClickPageItem = (selectedItem: string | number) => {
    /* 1 */
    if (isNaN(selectedItem as any)) {
      this.setPageItemRange(selectedItem as string);
    } else {
      this.currentItem = +selectedItem; /* 2 */
      this.setPageItems();
      this.eventDispatch();
    }
  };

  /**
   * Calculating the pageItemsRange for ellipsis
   * 1. Find if the currentItem is ellipsis
   * 2. Find the IndexOf the ellipsis
   * 3. pageItemsRange calculated by knowing the before and after element of ellipsis in Pages Array
   */
  setPageItemRange(selectedItem: string) {
    let dotIndex;
    if (selectedItem == dot) {
      /* 1 */
      dotIndex = this.pageItems.indexOf(dot); /* 2 */
      this.pageItemsRange = this.pages.slice(parseInt(this.pageItems[dotIndex - 1]), parseInt(this.pageItems[dotIndex + 1]) - 1); /* 3 */
    } else if (selectedItem == initialDot) {
      dotIndex = this.pageItems.indexOf(initialDot); /* 2 */
      this.pageItemsRange = this.pages.slice(parseInt(this.pageItems[dotIndex - 1]), parseInt(this.pageItems[dotIndex + 1]) - 1);
    } else if (selectedItem == endDot) {
      dotIndex = this.pageItems.indexOf(endDot); /* 2 */
      this.pageItemsRange = this.pages.slice(parseInt(this.pageItems[dotIndex - 1]), parseInt(this.pageItems[dotIndex + 1]) - 1);
    }
  }

  /**
   * Dropdown with pageSizeOptions values
   * 1. The selected item is updated as pageSize
   * 2. Prevent event while same as previous pageSize value
   */
  handleOnClickDropdownItem = (option: number) => {
    if (this.pageSize != option) {
      this.pageSize = option;
      this.currentItem = 1;
      this.eventDispatch();
    }
  };

  /**
   * Sets the array of page items to be displayed for pagination
   * 1. If the number of pages is less than or equal to 6, display all page numbers
   * 2. Otherwise, updates the array based on the currentItem for pagination display
   */
  setPageItems() {
    const len = this.pages.length;
    if (this.pages.length <= 6) {
      this.pageItems = this.pages; /* 1 */
    } else if (this.currentItem >= 1 && this.currentItem <= 3) {
      this.pageItems = ['1', '2', '3', '4', dot, len.toString()]; /* 2 */
    } else if (this.currentItem > 3 && this.currentItem < 5) {
      const sliced = this.pages.slice(0, 5);
      this.pageItems = [...sliced, dot, len.toString()]; /* 2 */
    } else if (this.currentItem > 4 && this.currentItem < this.pages.length - 2) {
      const sliced1 = this.pages.slice(this.currentItem - 2, this.currentItem);
      const sliced2 = this.pages.slice(this.currentItem, this.currentItem + 1);
      this.pageItems = ['1', initialDot, ...sliced1, ...sliced2, endDot, len.toString()]; /* 2 */
    } else if (this.currentItem > this.pages.length - 3) {
      const sliced = this.pages.slice(this.pages.length - 4);
      this.pageItems = ['1', dot, ...sliced]; /* 2 */
    }
  }

  /**
   * Generates an array of page numbers based on the total number of pages needed for pagination
   * 1. Calculates the total number of pages using the setPageLength method
   * 2. Populates the 'pages' array with strings representing each page number from 1 to pageLength
   */
  setPageNumbers() {
    /* 1 */
    const pageLength = this.setPageLength();
    for (let i = 1; i <= pageLength; i++) {
      this.pages.push(i.toString()); /* 2 */
    }
  }

  /**
   * Determines the total number of pages for pagination
   * 1. Initializes the quotient as the total number of records
   * 2. Checks if the total records are greater than 6, calculates the quotient based on page size and any remainder
   * 3. Sets the quotient as 1 if the total records are 6 or fewer
   * 4. Returns the calculated or default quotient as the total number of pages for pagination
   */
  setPageLength() {
    /* 1 */
    let quotient = this.totalRecords;
    if (this.totalRecords > 6) {
      let remainder = this.totalRecords % this.pageSize;
      quotient = this.totalRecords / this.pageSize;
      /* 2 */
      if (remainder !== 0) {
        quotient = Math.floor(quotient) + 1;
      }
    } else {
      quotient = 1; /* 3 */
    }
    return quotient; /* 4 */
  }

  /**
   * Generates partial data for the records per page dropdown
   * 1. Creates an array of objects containing label and value properties
   * 2. The 'label' property is converted to a string since the dropdown component's dataSource expects label as a string type
   */
  setRecordsPerPageDropdownData() {
    /* 1 */
    this.recordsPerPageDropdownData = this.pageSizeOptions.map((item) => {
      const obj = {
        label: item.toString() /* 2 */,
        value: item
      };
      return obj;
    });
  }

  /**
   * Dispatch custom event
   */
  eventDispatch() {
    this.dispatch({ eventName: 'change', detailObj: { pageNumber: this.currentItem, pageSize: this.pageSize, totalRecordSize: this.totalRecords } });
  }

  /**
   * Renders a compact pager view
   * - Generates HTML markup displaying pageItemsRange along with previous and next buttons
   * - Utilizes an ordered list (ol) for the pagination elements
   * - Includes slots for 'prev' and 'next' buttons with corresponding icons
   * - Displays a label for the current page range
   */
  renderSmallPager() {
    return html`
      <ol role="list" class="sl-c-pagination__list">
        <${this.paginationItemEl}
          @click=${(e: MouseEvent) => this.handleOnClickPrev(this.currentItem, e)}
          ariaLabel=${this.currentItem - 1}
          ?isDisabled=${this.currentItem == 1}
        >
          <slot name="prev" class="sl-c-pagination__arrow">
            <${this.iconChevronLeftEl}></${this.iconChevronLeftEl}>
          </slot>
        </${this.paginationItemEl}>
        <slot name="inpage-label">
          <label>${this.label}</label>
        </slot>
        <${this.paginationItemEl}
          @click=${(e: MouseEvent) => this.handleOnClickNext(this.currentItem, e)}
          ariaLabel=${this.currentItem + 1}
          ?isDisabled=${this.currentItem == this.pages.length}
        >
          <slot name="next" class="sl-c-pagination__arrow">
            <${this.iconChevronRightEl}></${this.iconChevronRightEl}>
          </slot>
        </${this.paginationItemEl}>
      </ol>
    `;
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-pagination', {
      'sl-c-pagination--has-before': this.slotNotEmpty('beforePagination'),
      'sl-c-pagination--has-after': this.slotNotEmpty('afterPagination'),
      'sl-c-pagination--inpage': this.variant == 'small'
    });

    return html`
      <nav role="navigation" class="${componentClassNames}" aria-label=${ifDefined(this.ariaLabel)}>
        ${this.variant === 'small'
          ? html` <div class="sl-pagination-inpage">${this.renderSmallPager()}</div> `
          : html`
          <div class="sl-pagination-footer-mobile">
            ${this.renderSmallPager()}
          </div>
          <div class="sl-pagination-footer">
            <div class="sl-c-pagination-label">
              <slot name="label"><label>${this.label}</label></slot>
            </div>
            <ol role="list" class="sl-c-pagination__list">
              <${this.paginationItemEl}
                @click=${(e: MouseEvent) => this.handleOnClickPrev(this.currentItem, e)}
                ariaLabel=${this.currentItem - 1}
                ?isDisabled=${this.currentItem == 1}
              >
                <span class="sl-u-is-vishidden"> ${this.prevButtonText ? this.prevButtonText : html` Previous `} </span>
                <slot name="prev" class="sl-c-pagination__arrow">
                  <${this.iconChevronLeftEl}></${this.iconChevronLeftEl}>
                </slot>
              </${this.paginationItemEl}>
              ${this.pageItems.map(
                (item: string) =>
                  html`
                    <${this.paginationItemEl}
                      ariaLabel=${item}
                      @click=${() => {
                        this.handleOnClickPageItem(item);
                      }}
                      ?isSelected=${this.currentItem.toString() === item}
                      @keydown=${(e: KeyboardEvent) => this.handleOnKeydown(e, item)}
                    >
                      ${
                        isNaN(item as any) //if item is in "..." pattern
                          ? html`
                            <${this.contextualMenuEl} isDynamic=${true} hasScroll=${this.pageItemsRange.length >= 4}>
                              <div role="button" aria-label="More items" slot="trigger">
                                <${this.iconDotsHorizontalEl} slot="after"></${this.iconDotsHorizontalEl}>
                              </div>
                              ${this.pageItemsRange.map((option, index) => {
                                return html`
                                  <${this.listItemEl}
                                    class="sl-c-contextual-pagination-list-item"
                                    value=${option}
                                    key=${index}
                                    @blur=${() => {
                                      if (index === this.pageItemsRange.length - 1) {
                                        this.contextualMenus.forEach((menu) => menu.close());
                                      }
                                    }}
                                    @click=${(e: MouseEvent) => {
                                      e.stopPropagation();
                                    }}
                                    @select=${() => {
                                      this.handleOnClickPageItem(option);
                                      this.contextualMenus.forEach((menu) => menu.close());
                                    }}
                                  >
                                    <span class="sl-c-contextual-pagination-item-text">${option}</span>
                                  </${this.listItemEl}>
                                `;
                              })}
                            </${this.contextualMenuEl}>
                          `
                          : item
                      }
                    </${this.paginationItemEl}>
                  `
              )}
              <${this.paginationItemEl}
                @click=${(e: MouseEvent) => this.handleOnClickNext(this.currentItem, e)}
                ariaLabel=${this.currentItem + 1}
                ?isDisabled=${this.currentItem == this.pages.length}
              >
                <span class="sl-u-is-vishidden"> ${this.nextButtonText ? this.nextButtonText : html` Next `} </span>
                <slot name="next" class="sl-c-pagination__arrow">
                  <${this.iconChevronRightEl}></${this.iconChevronRightEl}>
                </slot>
              </${this.paginationItemEl}>
            </ol>
            <div class="sl-c-pagination-dropdown">
              <${this.dropdownEl}
                .label=${this.pageSizeLabel}
                .dataSource=${this.recordsPerPageDropdownData}
                .value=${`${this.pageSize}`}
              >
                <${this.listEl}>
                  ${this.recordsPerPageDropdownData?.map(
                    (option, index) => html`
                    <${this.listItemEl}
                      value=${option.label}
                      key=${index}
                      @click=${() => {
                        this.handleOnClickDropdownItem(option.value);
                      }}
                    >
                      ${option.label}
                    </${this.listItemEl}>
                  `
                  )}
                </${this.listEl}>
              </${this.dropdownEl}>
            </div>
          </div>
        `}
      </nav>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLPagination.el) === undefined) {
  customElements.define(SLPagination.el, SLPagination);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-pagination': SLPagination;
  }
}
