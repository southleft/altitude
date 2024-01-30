import { html, unsafeCSS } from 'lit';
import { property, query } from 'lit/decorators.js';
import { nanoid } from 'nanoid';
import { SLElement } from '../SLElement';
import styles from './tooltip.scss';

/**
 * Component: sl-tooltip
 *
 * Tooltips display informative text when users hover over, focus on, or tap an element.
 * - **slot**: The content that appears inside the tooltip
 * - **slot** "prefix": The content that appears before the main content
 * - **slot** "trigger": The trigger that opens the tooltip
 */
export class SLTooltip extends SLElement {
  static el = 'sl-tooltip';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Displays the arrow on the tooltip container
   */
  @property({ type: Boolean })
  accessor hasArrow: boolean = true;

  /**
   * Positions the dropdown tooltip absolutely to the trigger.
   * - **default** places the tooltip to the top
   * - **top** places the tooltip to the top
   * - **bottom** places the tooltip to the bottom
   * - **left** places the tooltip to the left
   * - **right** places the tooltip to the right
   */
  @property()
  accessor position: 'top' | 'bottom' | 'left' | 'right' = 'top';

  /**
   * Is active?
   * - **true** Shows the tooltip container
   * - **false** Hides the tooltip container
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   * Is dynamic?
   * - **true** Dynamically position the tooltip container based on it's position in the viewport
   * - **false** Positions the tooltip container based on the position property
   */
  @property({ type: Boolean })
  accessor isDynamic: boolean;

  /**
   * Is interactive?
   * - **true** Tooltip container is visible on click and not hover/focus
   * - **false** Tooltip container is visible on hover/focus
   */
  @property({ type: Boolean })
  accessor isInteractive: boolean;

  /**
   * Aria Described By attribute
   * - Dynamically set for A11y
   */
  @property()
  accessor ariaDescribedBy: string;

  /**
   * Query the tooltip container
   */
  @query('.sl-c-tooltip__container')
  accessor tooltipContainer: HTMLElement;

  /**
   * Query the tooltip trigger
   */
  @query('.sl-c-tooltip__trigger')
  accessor tooltipTrigger: HTMLElement;

  /**
   * Get the document dir
   */
  get isRTL() {
    return document.dir === 'rtl';
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
   * 2. Add mouseover event listener
   * 3. Add mouseout event listener
   */
  connectedCallback() {
    super.connectedCallback();
    globalThis.addEventListener('mousedown', this.handleOnClickOutside, false); /* 2 */
    this.addEventListener('mouseover', this.handleOnMouseOver);
    this.addEventListener('mouseout', this.handleOnMouseOut);
  }

  /**
   * Disconnected callback lifecycle
   * 1. Remove mousedown event listener
   * 2. Remove mouseover event listener
   * 3. Remove mouseout event listener
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    globalThis.removeEventListener('mousedown', this.handleOnClickOutside, false); /* 2 */
    this.removeEventListener('mouseover', this.handleOnMouseOver);
    this.removeEventListener('mouseout', this.handleOnMouseOut);
  }

  /**
   * First updated lifecycle
   * 1. Wait for slotted components to be loaded
   * 2. Dynamically sets the aria-describedby for A11y
   * 3. Do not display the tooltip container if the height is less than 16px, which means it's empty
   */
  async firstUpdated() {
    await this.updateComplete; /* 1 */
    this.ariaDescribedBy = this.ariaDescribedBy || nanoid(); /* 2 */
    /* 3 */
    if (this.tooltipContainer.clientHeight < 16) {
      this.tooltipContainer.style.display = 'none';
    }
  }

  /**
   * Handle all dynamic placement
   */
  async setDynamicPosition() {
    await this.updateComplete;
    if (this.isDynamic) {
      const body = document.querySelector('body').getBoundingClientRect();
      const tooltipContainter = this.tooltipContainer.getBoundingClientRect();

      /**
       * If tooltip container breaks out the left side of the window, position it to the right
       */
      if (tooltipContainter.left < 0) {
        this.position = this.isRTL ? 'left' : 'right';
      }

      /**
       * If tooltip container breaks out the right side of the window, position it to the left
       */
      if (tooltipContainter.right >= body.width) {
        this.position = this.isRTL ? 'right' : 'left';
      }

      /**
       * If tooltip container breaks out the top side of the window, position it to the bottom
       */
      if (tooltipContainter.top < 0) {
        this.position = 'bottom';
      }

      /**
       * If tooltip container breaks out the bottom side of the window, position it to the top
       */
      if (tooltipContainter.bottom >= window.innerHeight) {
        this.position = 'top';
      }
    }
  }

  /**
   * Handles the click event outside the component:
   * 1. Check if the tooltip is active
   * 2. Determine if the click occurred inside the active tooltip
   * 3. Check if the click occurred outside the active tooltip
   * 4. Close the tooltip if the click occurred outside it
   */
  handleOnClickOutside(event: MouseEvent) {
    /* 1 */
    if (this.isActive) {
      const didClickInside = event.composedPath().includes(this.shadowRoot.host); /* 2 */
      /* 3 */
      if (event.target !== document.querySelector('html') && !didClickInside) {
        /* 4 */
        this.close();
      }
    }
  }

  /**
   * Handle on keydown events
   * 1. If the tooltip is open and escape or tab is keyed, close the tooltip and return focus to the trigger
   * 2. If the enter or spacebar is keyed, toggle the tooltip open or close
   */
  handleOnKeydown(e: KeyboardEvent) {
    if (this.isActive) {
      if (e.code === 'Escape' || e.code === 'Tab') {
        this.close(); /* 1 */
      }
    }
    if (e.code === 'Enter' || e.code === 'Space') {
      this.toggleActive(); /* 2 */
    }
  }

  /**
   * Handle on mouse over events
   * 1. If the toolip is interactive, ignore the mouse handler active state
   */
  handleOnMouseOver() {
    if (!this.isInteractive) {
      this.open();
    }
  }

  /**
   * Handle on mouse out events
   * 1. If the toolip is interactive, ignore the mouse handler active state
   */
  handleOnMouseOut() {
    if (!this.isInteractive) {
      this.close();
    }
  }

  /**
   * Handle on focus events
   * 1. If the toolip is interactive, ignore the focus handler active state
   */
  handleOnFocus() {
    if (!this.isInteractive) {
      this.open();
    }
  }

  /**
   * Set tooltip active state
   * 1. Toggle the active state between true and false
   * 2. Open/close the tooltip container based on isActive
   */
  toggleActive() {
    this.isActive = !this.isActive; /* 1 */

    /* 2 */
    if (this.isActive) {
      this.open();
    } else {
      this.close();
    }
  }

  /**
   * Open tooltip
   * 1. Set isActive to true to show the tooltip
   * 2. Set the dynamic positioning
   * 3. Dispatch a custom event on open
   */
  open() {
    this.isActive = true; /* 1 */
    this.setDynamicPosition(); /* 2 */
    /* 3 */
    this.dispatch({
      eventName: 'onTooltipOpen',
      detailObj: {
        active: this.isActive
      }
    });
  }

  /**
   * Close tooltip
   * 1. Set isActive to false to hide the tooltip
   * 2. Dispatch a custom event on close
   */
  close() {
    this.isActive = false; /* 1 */
    /* 2 */
    this.dispatch({
      eventName: 'onTooltipClose',
      detailObj: {
        active: this.isActive
      }
    });
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-tooltip', {
      'sl-c-tooltip--top': this.position === 'top',
      'sl-c-tooltip--bottom': this.position === 'bottom',
      'sl-c-tooltip--left': this.position === 'left',
      'sl-c-tooltip--right': this.position === 'right',
      'sl-is-dynamic': this.isDynamic === true,
      'sl-is-active': this.isActive === true,
      'sl-is-interactive': this.isInteractive === true,
      'sl-has-prefix': this.slotNotEmpty('prefix'),
      'sl-has-arrow': this.hasArrow
    });

    return html`
      <div class="${componentClassNames}" @keydown=${this.handleOnKeydown}>
        ${this.slotNotEmpty('trigger') &&
        html`
          <div class="sl-c-tooltip__trigger" tabindex="0" @click=${this.toggleActive} @focus=${this.handleOnFocus}>
            <slot name="trigger"></slot>
          </div>
        `}
        <div class="sl-c-tooltip__container" tabindex="-1" role="tooltip" id=${this.ariaDescribedBy} aria-hidden=${this.isActive ? false : true} style=${this.isActive ? "" : "display: none"}>
          ${this.slotNotEmpty('prefix') &&
          html`
            <div class="sl-c-tooltip__prefix">
              <slot name="prefix"></slot>
            </div>
          `}
          <slot></slot>
        </div>
      </div>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLTooltip.el) === undefined) {
  customElements.define(SLTooltip.el, SLTooltip);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-tooltip': SLTooltip;
  }
}
