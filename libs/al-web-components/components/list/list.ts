import { html, unsafeCSS } from 'lit';
import { property, queryAssignedElements, state } from 'lit/decorators.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALListItem } from '../list-item/list-item';
import styles from './list.scss';

/**
 * Component: al-list
 *
 * List is a vertical or horizontal grouping of related content or links.
 * - **slot**: The list items
 */
export class ALList extends ALElement {
  static el = 'al-list';

  private elementMap = register({
    elements: [[ALListItem.el, ALListItem]],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
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
   * Query all the ALListItems's
   */
  @queryAssignedElements({ flatten: true, slot: '' })
  accessor listItems: Array<ALListItem>;

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
    const overflowList = this.shadowRoot?.querySelector('.al-c-list-overflow-wrapper'); /* 1 */
    const overflowListInner = this.shadowRoot?.querySelector('.al-c-list--overflow');
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
        // Calculate the depth of the list item relative to ALList
        while (this !== parent && parent) {
          if (parent.tagName === this.elementMap.get(ALListItem.el).toUpperCase()) {
            depth++;
          }
          parent = parent.parentElement;
        }
        // Apply indentation based on depth
        if (depth === 0) {
          listItem.style.setProperty('--al-list-item-link-padding-inline-start', `${8}px`);
        } else {
          listItem.style.setProperty('--al-list-item-link-padding-inline-start', `${depth * 16}px`);
        }
      });
    }
  }

  render() {
    const wrapperClassNames = this.componentClassNames('al-c-list-overflow-wrapper', {
      'al-is-overflow-left': this.isStart === true,
      'al-is-overflow-right': this.isEnd === true
    });

    const componentClassName = this.componentClassNames('al-c-list', {
      'al-c-list--horizontal': this.orientation === 'horizontal',
      'al-c-list--overflow': this.behavior === 'overflow'
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
        <ul 
          class="${componentClassName}" 
          role="list" 
        >
          <slot></slot>
        </ul>
      `;
    }
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALList.el) === undefined) {
  customElements.define(ALList.el, ALList);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-list': ALList;
  }
}
