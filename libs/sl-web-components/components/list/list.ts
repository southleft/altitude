import { html, unsafeCSS } from 'lit';
import { property, queryAssignedElements, state } from 'lit/decorators.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLListItem } from '../list-item/list-item';
import styles from './list.scss';

/**
 * Component: sl-list
 *
 * List is a vertical or horizontal grouping of related content or links.
 * - **slot**: The list items
 */
export class SLList extends SLElement {
  static el = 'sl-list';

  private elementMap = register({
    elements: [[SLListItem.el, SLListItem]],
    suffix: (globalThis as any).enAutoRegistry === true ? '' : PackageJson.version
  });

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Behavior
   * - **overflow** turns the list into an overflow list
   */
  @property()
  accessor behavior: 'overflow';

  /**
   * Orientation
   * - default renders a stacked list
   * - **horizontal** renders the list side-by-side and wraps unless overflow is turned on
   */
  @property()
  accessor orientation: 'horizontal';

  /**
   * isStart state
   * 1) Controls the beginning gradient on the overflow list
   */
  @state()
  accessor isStart: boolean;

  /**
   * isEnd state
   * 1) Controls the ending gradient on the overflow list
   */
  @state()
  accessor isEnd: boolean;

  /**
   * Query all the SLListItems's
   */
  @queryAssignedElements({ flatten: true, slot: '' })
  accessor listItems: Array<SLListItem>;

  /**
   * Initialize functions
   */
  constructor() {
    super();
    this.setShadows = this.setShadows.bind(this);
  }

  async updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    this.setIndentation(); // Call the method to set indentation on updates
  }

  /**
   * Connected callback lifecycle
   * 1) Add event listeners
   */
  connectedCallback() {
    super.connectedCallback();
    if (this.behavior === 'overflow') {
      setTimeout(() => {
        this.setShadows(); /* 1 */
      }, 1);
      window.addEventListener('resize', this.setShadows);
    }
  }

  /**
   * Disconnected callback lifecycle
   * 1) Remove window resize event listener
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.behavior === 'overflow') {
      window.removeEventListener('resize', this.setShadows);
    }
  }

  /**
   * On overflow list inner scroll
   * 1) On scroll, if position from left is greater than 0, set isStart to false. Otherwise set isStart to true.
   * 2) On scroll, If last child is fully in the viewport, set isEnd to true. Otherwise, set isEnd to false.
   */
  onScroll() {
    this.setShadows();
  }

  /**
   * Set right and left gradients on overflow list
   * 1) Target the overflow list items and calculate the width of the children + margin
   * 2) Get the total width of the children offscreen when items overflow
   * 3) If table width is less than or equal to overflow list width, remove all shadows
   * 4) If overflow list  inner scroll isn't all the way to the left or to the right, turn all shadows on
   * 5) If overflow list inner scroll left 2px is >= to width of table offscreen, turn off right shadow and turn left shadow on
   * 6) Else, set the right shadow to true and the left shadow to false
   * 7) Overflow list inner scrollLeft is off by 2px and needs that additional 2 pixels to remove the end shadow
   * once scrolled all the way to the right.
   */
  setShadows() {
    const overflowList = this.shadowRoot?.querySelector('.sl-c-list-overflow-wrapper'); /* 1 */
    const overflowListInner = this.shadowRoot?.querySelector('.sl-c-list--overflow');
    if (overflowList && overflowListInner) {
      const overflowListWidth = overflowList.clientWidth; /* 2 */
      const overflowListInnerEndShadowScrollWidth = overflowListInner.scrollWidth; /* 7 */
      const overflowListOffScreen = overflowListInnerEndShadowScrollWidth - overflowList.clientWidth; /* 2 */

      if (overflowListInnerEndShadowScrollWidth <= overflowListWidth) {
        /* 3 */
        this.isEnd = false;
        this.isStart = false;
      } else if (overflowListInner.scrollLeft > 0 && overflowListInner.scrollLeft + 2 < overflowListOffScreen) {
        /* 4 */
        this.isEnd = true;
        this.isStart = true;
      } else if (overflowListInner.scrollLeft + 2 >= overflowListOffScreen) {
        /* 5 */
        this.isEnd = false;
        this.isStart = true;
      } else {
        /* 6 */
        this.isEnd = true;
        this.isStart = false;
      }
    }
  }

  setIndentation() {
    const flyout = this.listItems.find((item) => item.behavior === 'flyout');
    if (this.listItems && !flyout) {
      this.listItems.forEach((listItem) => {
        let depth = 0;
        let parent = listItem.parentElement.parentElement;
        // Calculate the depth of the list item relative to SLList
        while (this !== parent && parent) {
          if (parent.tagName === this.elementMap.get(SLListItem.el).toUpperCase()) {
            depth++;
          }
          parent = parent.parentElement;
        }
        // Apply indentation based on depth
        if (depth === 0) {
          listItem.style.setProperty('--sl-list-item-link-padding-inline-start', `${8}px`);
        } else {
          listItem.style.setProperty('--sl-list-item-link-padding-inline-start', `${depth * 16}px`);
        }
      });
    }
  }

  render() {
    const wrapperClassNames = this.componentClassNames('sl-c-list-overflow-wrapper', {
      'sl-is-overflow-left': this.isStart === true,
      'sl-is-overflow-right': this.isEnd === true
    });

    const componentClassName = this.componentClassNames('sl-c-list', {
      'sl-c-list--horizontal': this.orientation === 'horizontal',
      'sl-c-list--overflow': this.behavior === 'overflow'
    });

    if (this.behavior === 'overflow') {
      return html`
        <div class=${wrapperClassNames}>
          <ul role="list" class="${componentClassName}" @scroll=${this.onScroll}>
            <slot></slot>
          </ul>
        </div>
      `;
    } else {
      return html`
        <ul role="list" class="${componentClassName}">
          <slot></slot>
        </ul>
      `;
    }
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLList.el) === undefined) {
  customElements.define(SLList.el, SLList);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-list': SLList;
  }
}
