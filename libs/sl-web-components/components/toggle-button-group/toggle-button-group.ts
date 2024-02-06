import { html, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { SLElement } from '../SLElement';
import { SLToggleButton } from '../toggle-button/toggle-button';
import styles from './toggle-button-group.scss';

/**
 * Component: sl-toggle-button-group
 *
 * Toggle Button Group is a grouping of related toggle buttons.
 * - **slot**: A set of toggle buttons
 */
export class SLToggleButtonGroup extends SLElement {
  static el = 'sl-toggle-button-group';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Variant
   * - **default** renders the toggle button group without background styles
   * - **background** renders the toggle button group with background styles
   */
  @property()
  accessor variant: 'background';

  /**
   * Orientation
   * - **default** renders the toggle button's in a horizontal row
   * - **vertical** renders the toggle button's in a vertical row
   */
  @property()
  accessor orientation: 'vertical';

  /**
   * Gap
   * - **default** adds no gap between the toggle buttons
   * - **sm** adds a 16px gap between the toggle buttons
   */
  @property()
  accessor gap: 'sm';

  /**
   * Selected item
   * - The currently selected Toggle Button in the group
   */
  @state()
  accessor selectedItem: SLToggleButton;

  /**
   * Initialize functions
   */
  constructor() {
    super();
    /**
     * Observe changes to the selected state of toggle buttons
     */
    this.addEventListener('onToggleButtonSelect', (e: CustomEvent) => this.handleOnToggleButtonSelect(e.target as SLToggleButton));
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
   * Handle when a Toggle Button in the group is selected
   * 1. Set the previously selected item's isSelected state to false
   * 2. Store the newly selected item on the toggle button's state
   */
  handleOnToggleButtonSelect(item: SLToggleButton) {
    if (this.selectedItem && this.selectedItem !== item) {
      this.selectedItem.isSelected = false; /* 1 */
    }
    this.selectedItem = item; /* 2 */
  }

  /**
   * Handles the click event outside the component:
   * 1. Check if the toggle button is selected
   * 2. Determine if the click occurred inside the selected toggle button
   * 3. Check if the click occurred outside the selected toggle button
   * 4. Close the toggle button if the click occurred outside it
   */
  handleOnClickOutside(e: MouseEvent) {
    /* 1 */
    if (this.selectedItem) {
      const didClickInside = e.composedPath().includes(this.shadowRoot.host); /* 2 */
      /* 3 */
      if (e.target !== document.querySelector('html') && !didClickInside) {
        /* 4 */
        this.selectedItem.isSelected = false;
      }
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-toggle-button-group', {
      'sl-c-toggle-button-group--background': this.variant === 'background',
      'sl-c-toggle-button-group--vertical': this.orientation === 'vertical',
      'sl-c-toggle-button-group--gap-sm': this.gap === 'sm'
    });

    return html`
      <div class="${componentClassNames}">
        <slot></slot>
      </div>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLToggleButtonGroup.el) === undefined) {
  customElements.define(SLToggleButtonGroup.el, SLToggleButtonGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-toggle-button-group': SLToggleButtonGroup;
  }
}
