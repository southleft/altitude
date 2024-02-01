import { html, unsafeCSS } from 'lit';
import { property, queryAssignedElements } from 'lit/decorators.js';
import { nanoid } from 'nanoid';
import { SLElement } from '../SLElement';
import styles from './contextual-menu.scss';

/**
 * Component: sl-contextual-menu
 *
 * Contextual Menu is a list of options that is opened/closed by a trigger and positioned around the trigger.
 * - **slot**: The main body of the contextual menu
 * - **slot** "trigger": The trigger that opens/closes the contextual menu
 */
export class SLContextualMenu extends SLElement {
  static el = 'sl-contextual-menu';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Heading text that appears in the header region
   */
  @property()
  accessor heading: string;

  /**
   * Positions the dropdown contextual menu absolutely to the trigger.
   * - **default** places the contextual menuto the bottom left
   * - **bottom-center** places the contextual menuto the bottom center
   * - **bottom-right** places the contextual menuto the bottom right
   * - **bottom-left** places the contextual menuto the bottom left
   * - **top-center** places the contextual menuto the top center
   * - **top-right** places the contextual menuto the top right
   * - **top-left** places the contextual menuto the top left
   * - **left** places the contextual menuto the left
   * - **right** places the contextual menuto the right
   */
  @property()
  accessor position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left' | 'left' | 'right' = 'bottom-left';

  /**
   * Is active?
   * - **true** Shows the contextual menucontainer
   * - **false** Hides the contextual menucontainer
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   * Is dismissible?
   * - **true** Shows the contextual menuclose button
   * - **false** Hides the contextual menuclose button
   */
  @property({ type: Boolean })
  accessor isDismissible: boolean;

  /**
   * Aria Labelled By attribute
   * - Dynamically set for A11y
   */
  @property()
  accessor ariaLabelledBy: string;

  /**
   * Query the contextual menutrigger
   */
  @queryAssignedElements({ slot: 'trigger' })
  accessor contextualMenuTrigger: any[];

  /**
   * Query the list component in the menu's default slot
   */
  @queryAssignedElements()
  accessor menuList: any[];

  /**
   * Query the contextual menutrigger inner element
   */
  get contextualMenuTriggerButton(): any {
    if (this.contextualMenuTrigger[0]) {
      if (this.contextualMenuTrigger[0].shadowRoot) {
        return this.contextualMenuTrigger[0].shadowRoot.querySelector('*');
      } else {
        return this.contextualMenuTrigger[0].querySelector('*');
      }
    }
  }

  /**
   * Initialize functions
   */
  constructor() {
    super();
    this.handleOnClickOutside = this.handleOnClickOutside.bind(this);
  }

  /**
   * Connected callback lifecycle
   * 1. Add mousedown event listener
   */
  connectedCallback() {
    super.connectedCallback();
    globalThis.addEventListener('mousedown', this.handleOnClickOutside, false); /* 1 */
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
   * 1. Wait for slotted components to be loaded
   * 2. Set aria-expanded on the trigger for A11y
   */
  async firstUpdated() {
    await this.updateComplete; /* 1 */
    this.setAria(); /* 2 */
  }

  /**
   * Updated lifecycle
   * 1. Update aria-expanded on the trigger based on if isActive
   */
  updated() {
    this.setAria();
  }

  /**
   * Set aria-expanded to the trigger button
   * 1. Dynamically sets the aria-labelledby for A11y
   * 2. Set isExpanded to this.isActive if it's truthy, otherwise, set it to false
   */
  setAria() {
    /* 1 */
    this.ariaLabelledBy = this.ariaLabelledBy || nanoid();
    /* 2 */
    if (this.contextualMenuTriggerButton) {
      this.contextualMenuTriggerButton.isExpanded = this.isActive || false;
    }
  }

  /**
   * Handles the click event outside the component:
   * 1. Check if the contextual menu is active
   * 2. Determine if the click occurred inside the active contextual menu
   * 3. Check if the click occurred outside the active contextual menu
   * 4. Close the contextual menu if the click occurred outside it
   */
  handleOnClickOutside(event: MouseEvent) {
    /* 1 */
    if (this.isActive) {
      const didClickInside = event.composedPath().includes(this.shadowRoot.host); /* 2 */
      /* 3 */
      if (!didClickInside) {
        /* 4 */
        this.close();
      }
    }
  }

  /**
   * Handle on keydown events
   * 1. When the Enter key is pressed on the trigger, open the contextual menu and prevent default button click
   * 2. If the contextual menu is open and escape is keyed, close the contextual menu and return focus to the trigger button
   */
  handleOnKeydown(e: KeyboardEvent) {
    const { target } = e as any;
    /* 1 */
    if (this.slotNotEmpty('trigger') && target.matches('[slot="trigger"]') && e.key === 'Enter') {
      e.preventDefault();
      this.open();
    }
    /* 2 */
    if (this.isActive === true && e.code === 'Escape') {
      this.close();
    }
  }

  /**
   * Set contextual menu active state
   * 1. Toggle the active state between true and false
   * 2. Open/close the contextual menu container based on isActive
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
   * Open contextual menu
   * 1. Set isActive to true to show the contextual menu
   * 2. Focus on the contextual menu container once opened. Timeout is equal to the css transition timing
   * 3. Dispatch a custom event on open
   */
  public open() {
    this.isActive = true; /* 1 */
    setTimeout(() => {
      const menuListItems = this.menuList && this.menuList[0] && this.menuList[0].listItems;
      const firstValidListItem = menuListItems.find((item: any) => !item.isDisabled && !item.isError);
      const firstFocusableEl = firstValidListItem && firstValidListItem.shadowRoot.querySelector('button, a');

      if (firstFocusableEl) {
        firstFocusableEl.focus();
      }
    }, 400);
    /* 3 */
    this.dispatch({
      eventName: 'onContextualMenuOpen',
      detailObj: {
        active: this.isActive
      }
    });
  }

  /**
   * Close contextual menu
   * 1. Set isActive to false to hide the contextual menu
   * 2. Set the focus on trigger button element when the contextual menu is closed
   * 3. Dispatch a custom event on close
   */
  public close() {
    this.isActive = false; /* 1 */
    setTimeout(() => {
      if (this.contextualMenuTriggerButton) {
        this.contextualMenuTriggerButton.focus(); /* 2 */
      }
    }, 1);
    /* 3 */
    this.dispatch({
      eventName: 'onContextualMenuClose',
      detailObj: {
        active: this.isActive
      }
    });
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-contextual-menu', {
      'sl-c-contextual-menu--bottom-center': this.position === 'bottom-center',
      'sl-c-contextual-menu--bottom-right': this.position === 'bottom-right',
      'sl-c-contextual-menu--bottom-left': this.position === 'bottom-left',
      'sl-c-contextual-menu--top-center': this.position === 'top-center',
      'sl-c-contextual-menu--top-right': this.position === 'top-right',
      'sl-c-contextual-menu--top-left': this.position === 'top-left',
      'sl-c-contextual-menu--left': this.position === 'left',
      'sl-c-contextual-menu--right': this.position === 'right',
      'sl-is-active': this.isActive === true
    });

    return html`
      <div class="${componentClassNames}">
        ${this.slotNotEmpty('trigger') &&
        html`
          <div class="sl-c-contextual-menu__trigger" @click=${this.toggleActive} @keydown=${this.handleOnKeydown}>
            <slot name="trigger"></slot>
          </div>
        `}
          <div
            class="sl-c-contextual-menu__container"
            role="region"
            aria-labelledby=${this.ariaLabelledBy}
            aria-hidden=${this.isActive ? false : true}
            @keydown=${this.handleOnKeydown}
          >
            <div class="sl-c-contextual-menu__body">
              <slot></slot>
            </div>
          </div>
      </div>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLContextualMenu.el) === undefined) {
  customElements.define(SLContextualMenu.el, SLContextualMenu);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-contextual-menu': SLContextualMenu;
  }
}
