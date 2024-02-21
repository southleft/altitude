import { TemplateResult, unsafeCSS } from 'lit';
import { property, query, queryAssignedElements, state } from 'lit/decorators.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALButton } from '../button/button';
import { ALIconChevronLeft } from '../icon/icons/chevron-left';
import { ALIconChevronRight } from '../icon/icons/chevron-right';
import { ALTabPanel } from '../tab-panel/tab-panel';
import { ALTab } from '../tab/tab';
import styles from './tabs.scss';

/**
 * Component: al-tabs
 *
 * Tabs organize related content at the same level of hierarchy, and allow navigation between distinct groups of content.
 * - **slot**: The tab items for the tabs
 * - **slot** "panel": The tab panels that correspond to the slotted tab items
 */
export class ALTabs extends ALElement {
  static el = 'al-tabs';

  private elementMap = register({
    elements: [
      [ALButton.el, ALButton],
      [ALIconChevronLeft.el, ALIconChevronLeft],
      [ALIconChevronRight.el, ALIconChevronRight]
    ],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private buttonEl = unsafeStatic(this.elementMap.get(ALButton.el));
  private iconChevronLeftEl = unsafeStatic(this.elementMap.get(ALIconChevronLeft.el));
  private iconChevronRightEl = unsafeStatic(this.elementMap.get(ALIconChevronRight.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Tabs variant
   * - **default** Tabs are left-aligned, and the width of each tab is defined by the length of its content
   * - **stretch** Tabs stretch horizontally to have equal widths, which is calculated by the width of the screen divided by the number of tabs
   */
  @property()
  accessor variant: 'stretch';

  /**
   * Active tab state
   * - Sets the initial active tab (e.g. 0 sets the first tab, 1 sets the second tab, etc.)
   */
  @property({ type: Number })
  accessor activeIndex: number;

  /**
   * Active tab state
   */
  @state()
  accessor activeTab: ALTab;

  /**
   * If the tabs lists is overflowing, sets to true
   */
  @state()
  accessor isScrollable: boolean = false;

  /**
   * Query the tabs list container
   */
  @query('.al-c-tabs__list')
  accessor tabsList: HTMLElement;

  /**
   * Query all the ALTab's
   */
  @queryAssignedElements({ flatten: true, slot: '' })
  accessor tabItems: Array<ALTab>;

  /**
   * Query all the ALTabPanel's
   */
  @queryAssignedElements({ flatten: true, slot: 'panel' })
  accessor tabPanels: Array<ALTabPanel>;

  constructor() {
    super();
    this.handleOnScroll = this.handleOnScroll.bind(this);
    this.handleOnResize = this.handleOnResize.bind(this);
  }

  /**
   * Connected callback lifecycle
   * 1. Add window resize event listener
   */
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('resize', this.handleOnResize);
  }

  /**
   * Disconnected callback lifecycle
   * 1. Remove window resize event listener
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.handleOnResize);
  }

  /**
   * Synchronize tabs with tab panels
   * 1. Iterate through each tab item
   * 2. Generate a unique ID for the tab item
   * 3. Set the index and ariaId on the tab item
   * 4. Generate a unique aria-controls value for the tab item
   * 5. Set the index, ariaLabelledBy, and ariaId on the corresponding tab panel
   */
  syncTabWithPanel() {
    /* 1 */
    this.tabItems.forEach((tab, index) => {
      /* 2 */
      const tabAriaId = 'al-c-tab__' + nanoid();
      /* 3 */
      tab.idx = index;
      tab.ariaId = tabAriaId;
      /* 4 */
      const tabPanelAriaId = `al-c-tab-panel__` + nanoid();
      tab.ariaControls = tabPanelAriaId;
      /* 5 */
      const tabPanel = this.tabPanels[index];
      if (tabPanel) {
        tabPanel.idx = index;
        tabPanel.ariaLabelledBy = tabAriaId;
        tabPanel.ariaId = tabPanelAriaId;
      }
    });
  }

  /**
   * First updated lifecycle
   * 1. Synchronize tab elements with their corresponding panels to ensure accessibility
   * 2. Wait for the update to complete before proceeding to the next steps
   * 3. Set the active tab based on the user-defined 'activeIndex' or default to the first tab
   * 4. Determine is the tabs have scrolling
   */
  async firstUpdated() {
    this.syncTabWithPanel(); /* 1 */
    await this.updateComplete; /* 2 */
    this.activeIndex = this.activeIndex ? this.activeIndex : 0;
    this.activeTab = this.tabItems[this.activeIndex] || this.tabItems[0]; /* 3 */
    this.setIsScrollable(); /* 4 */
  }

  /**
   * Updated lifecycle hook
   * 1. Iterate through changed component properties and their old values
   * 2. Check if 'activeIndex' has changed
   * 3. Wait for the component update to complete before continuing
   * 4. Deactivate the previously active tab and set the new active tab
   */
  async updated(changedProperties: Map<string, unknown>) {
    /* 1 */
    for (const [propName, oldValue] of changedProperties) {
      if (propName === 'activeIndex' && this.activeIndex !== oldValue) {
        /* 2 */
        await this.updateComplete; /* 3 */
        if (this.activeTab) {
          this.setInactiveTab(); /* 4 */
        }
        this.activeTab = this.tabItems[this.activeIndex];
      }
    }
    if (this.activeTab) {
      this.setActiveTab();
    }
  }

  /**
   * Set active tab
   * 1. Mark the active tab as visually active
   * 2. Find and mark the active tab panel as active based on the tab's index
   */
  setActiveTab() {
    if (this.activeTab) {
      this.activeTab.isActive = true;
    }
    const activePanel = this.tabPanels.find((tabPanel) => tabPanel.idx === this.activeIndex);
    if (activePanel) {
      activePanel.isActive = true;
    }
  }

  /**
   * Set inactive tab
   * 1. Visually disable the currently active tab
   * 2. Disable the currently active tab panel based on the active tab's index
   */
  setInactiveTab() {
    this.activeTab.isActive = false;
    const activePanel = this.tabPanels.find((tabPanel) => tabPanel.idx === this.activeIndex);
    if (activePanel) {
      activePanel.isActive = false;
    }
  }

  /**
   * Handle the scrolling behavior of the tab list
   * 1. Check if the tab list is overflowing
   */
  handleOnScroll() {
    this.setIsScrollable(); /* 1 */
  }

  /**
   * Handle the resize behavior of the window
   * 1. Check if the tab list is overflowing
   */
  handleOnResize() {
    this.setIsScrollable(); /* 1 */
  }

  /**
   * Set the 'isScrollable' state based on whether the .al-c-tabs__list element is overflowing.
   * 1. Check if the scroll width of the tab list is greater than its client width
   * 2. If it's overflowing, set 'isScrollable' to true
   * 3. If it's not overflowing, set 'isScrollable' to false
   */
  setIsScrollable() {
    /* 1 */
    if (this.tabsList.scrollWidth > this.tabsList.clientWidth) {
      this.isScrollable = true; /* 2 */
    } else {
      this.isScrollable = false; /* 3 */
    }
  }

  /**
   * Handle on select of a tab
   * 1. Remove preivously selected tab selected state
   * 2. Make the selected tab active
   * 3. Dispatch a custom event
   */
  handleOnTabSelect(e: CustomEvent<{ target: Event }>) {
    if (this.activeTab) {
      this.setInactiveTab(); /* 1 */
    }
    /* 2 */
    this.activeTab = e.target as ALTab;
    const activeIndex = this.tabItems.findIndex((tab) => tab === this.activeTab);
    this.activeIndex = activeIndex;
    this.setActiveTab();
    /* 3 */
    this.dispatch({
      eventName: 'onTabsChange',
      detailObj: {
        value: this.activeTab,
        activeTabIdx: this.activeIndex
      }
    });
  }

  /**
   * Handle on keydown
   * 1. If arrowRight key is pressed, set the next tab to active
   * 2. If arrowLeft key is pressed, set the previous tab to active
   * 3. If home key is pressed, set the first tab to active
   * 4. If end key is pressed, set the last tab to active
   * @fires tabChange
   */
  handleOnTabKeydown(e: KeyboardEvent) {
    const { target } = e as any;
    const focused = document.activeElement as ALTab;
    if (focused && focused instanceof ALTab || focused.tagName.match('al-TAB')) {
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          this.setActiveAdjacentTab(target as ALTab, false, true, null);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.setActiveAdjacentTab(target as ALTab, true, true, null);
          break;
        case 'Home':
          e.preventDefault();
          this.setActiveAdjacentTab(this.tabItems[this.tabItems.length - 1], false, true, null);
          break;
        case 'End':
          e.preventDefault();
          this.setActiveAdjacentTab(this.tabItems[0], true, true, null);
          break;
      }
    }
  }

  /**
   * Focus the button element inside the active tab
   * 1. Query the shadow DOM of the active tab for the button element with the class 'al-c-tab'
   * 2. Set the focus on the found button element, making it the active element
   */
  setTabFocus() {
    const buttonElement = this.activeTab.shadowRoot.querySelector<HTMLButtonElement>('.al-c-tab'); /* 1 */
    buttonElement.focus(); /* 2 */
  }

  /**
   * Set the selected tab to the previous or next tab based on the 'isPrevious' flag
   * @param currentTab - The currently active tab
   * @param isPrevious - A flag indicating whether to select the previous tab (true) or the next tab (false)
   * @fires tabChange - Emits a 'tabChange' event with information about the newly selected tab
   * 1. Get the index of the currently active tab
   * 2. Calculate the total number of tabs in the list
   * 3. Deactivate the currently active tab
   * 4. Calculate the index of the new tab based on the 'isPrevious' flag
   * 5. Handle boundary conditions by looping to the other end if necessary
   * 6. Find the next valid tab that is not disabled
   * 7. Handle boundary conditions again if necessary
   * 8. Set the newly selected tab as the active one
   * 9. Ensure the newly selected tab has completed its updates
   * 10. Set focus to the newly selected tab, else only set focus on tab and back to the button
   * 11. Emit a 'tabChange' event to indicate the change in the selected tab
   */
  async setActiveAdjacentTab(currentTab: ALTab, isPrevious: boolean, tabFocusOnly: boolean, e: Event) {
    const activeIndex = currentTab.idx; /* 1 */
    const tabListLength = this.tabItems.length - 1; /* 2 */
    this.setInactiveTab(); /* 3 */
    let newIndex = isPrevious ? activeIndex - 1 : activeIndex + 1; /* 4 */
    /* 5 */
    if (newIndex < 0) {
      newIndex = tabListLength;
    } else if (newIndex > tabListLength) {
      newIndex = 0;
    }
    /* 6 */
    while (this.tabItems[newIndex].isDisabled) {
      newIndex = isPrevious ? newIndex - 1 : newIndex + 1;
      /* 7 */
      if (newIndex < 0) {
        newIndex = tabListLength;
      } else if (newIndex > tabListLength) {
        newIndex = 0;
      }
    }
    /* 8 */
    this.activeIndex = newIndex;
    this.activeTab = this.tabItems[newIndex];
    this.setActiveTab();
    await this.activeTab.updateComplete; /* 9 */
    /* 10 */
    if (tabFocusOnly) {
      this.setTabFocus();
    } else {
      this.setTabFocus();
      const target = e.target as ALButton;
      if (target && target instanceof ALButton || target.tagName.match('al-BUTTON')) {
        target.shadowRoot.querySelector<HTMLButtonElement>('.al-c-button').focus();
      }
    }
    /* 11 */
    this.dispatch({
      eventName: 'onTabsChange',
      detailObj: {
        value: this.activeTab,
        activeTabIdx: this.activeIndex
      }
    });
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-tabs', {
      'al-is-scrollable': this.isScrollable,
      'al-c-tabs--stretch': this.variant === 'stretch'
    });

    return html`
      <div class="${componentClassNames}">
        <header class="al-c-tabs__header">
          ${this.isScrollable
            ? html`
                <${this.buttonEl}
                  class="al-c-tabs__arrow al-c-tabs__arrow--prev"
                  variant="tertiary"
                  ?hideText=${true}
                  @click=${(e: Event) => this.setActiveAdjacentTab(this.activeTab, true, false, e)}
                >
                  <${this.iconChevronLeftEl} slot="before"></${this.iconChevronLeftEl}>
                  Next
                </${this.buttonEl}>
              `
            : null}
          <div
            class="al-c-tabs__list"
            role="tablist"
            @scroll=${this.handleOnScroll}
            @keydown=${this.handleOnTabKeydown}
            @onTabSelect=${this.handleOnTabSelect}
          >
            <slot></slot>
          </div>
          ${this.isScrollable
            ? html`
                <${this.buttonEl}
                  class="al-c-tabs__arrow al-c-tabs__arrow--next"
                  variant="tertiary"
                  ?hideText=${true}
                  @click=${(e: Event) => this.setActiveAdjacentTab(this.activeTab, false, false, e)}
                >
                  <${this.iconChevronRightEl} slot="before"></${this.iconChevronRightEl}>
                  Previous
                </${this.buttonEl}>
              `
            : null}
        </header>
        <div class="al-c-tabs__body">
          <slot name="panel"></slot>
        </div>
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALTabs.el) === undefined) {
  customElements.define(ALTabs.el, ALTabs);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-tabs': ALTabs;
  }
}
