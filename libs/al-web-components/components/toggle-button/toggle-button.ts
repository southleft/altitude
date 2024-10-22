import { html, unsafeCSS } from 'lit';
import { property, query, queryAssignedElements } from 'lit/decorators.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALMenu } from '../menu/menu';
import { ALPopover } from '../popover/popover';
import styles from './toggle-button.scss';

/**
 * Component: al-toggle-button
 * - **slot**: The content to display in the toggle button
 */
export class ALToggleButton extends ALElement {
  static el = 'al-toggle-button';

  private elementMap = register({
    elements: [
      [ALPopover.el, ALPopover],
      [ALMenu.el, ALMenu]
    ],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Variant
   * - **default** renders the toggle button without background styles
   * - **background** renders the toggle button with background styles
   */
  @property()
  accessor variant: 'background';

  /**
   * Indicates the selected state of the toggle button.
   */
  @property({ type: Boolean })
  accessor isSelected: boolean = false;

  /**
   * If true, a fixed width will be set on the button.
   * - Dynamically set based on the slotted component
   */
  @property({ type: Boolean })
  accessor isSmall: boolean;

  /**
   * Has toggle?
   * - Is dynamically set if the first time slotted is a ALPopover or ALMenu
   * - **true** does not toggle the isSelected state
   * - **false** toggles the isSelected state
   */
  @property({ type: Boolean })
  accessor hasToggle: boolean;

  /**
   * Query the toggle button
   */
  @query('.al-c-toggle-button')
  accessor toggleButton: HTMLElement;

  /**
   * Query the toggle button content
   */
  @query('.al-c-toggle-button__content')
  accessor toggleButtonContent: HTMLElement;

  /**
   * Query the slotted elements
   */
  @queryAssignedElements()
  accessor slottedEls: Array<any>;

  /**
   * Check if toggle button has a popover and set property
   */
  get hasPopover(): boolean {
    if (this.slottedEls[0] && this.slottedEls[0].nodeName === this.elementMap.get(ALPopover.el).toUpperCase()) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Initialize functions
   */
  constructor() {
    super();
    this.handleOnClickOutside = this.handleOnClickOutside.bind(this);
    this.deselectToggleButton = this.deselectToggleButton.bind(this);
  }

  /**
   * Connected callback lifecycle
   * 1. Add mousedown event listener
   * 2. Add popoverCloseButton event listener
   */
  connectedCallback() {
    super.connectedCallback();
    globalThis.addEventListener('mousedown', this.handleOnClickOutside, false); /* 1 */
    this.addEventListener('onPopoverCloseButton', this.deselectToggleButton, false); /* 2 */
  }

  /**
   * Disconnected callback lifecycle
   * 1. Remove mousedown event listener
   * 2. Remove popoverCloseButton event listener
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    globalThis.removeEventListener('mousedown', this.handleOnClickOutside, false); /* 1 */
    this.removeEventListener('onPopoverCloseButton', this.deselectToggleButton, false); /* 2 */
  }

  /**
   * First updated lifecycle method
   * 1. The timeout allows for the slotted elements to load in the DOM
   * 2. Determine if the toggle button is small
   * 3. If there is a ALPopover or ALMenu slotted, then dynamically set hasToggle to true
   */
  firstUpdated() {
    /* 1 */
    setTimeout(() => {
      this.setIsSmall(); /* 2 */
    }, 1);

    /* 3 */
    if (
      this.slottedEls[0] &&
      (this.slottedEls[0].nodeName === this.elementMap.get(ALPopover.el).toUpperCase() ||
        this.slottedEls[0].nodeName === this.elementMap.get(ALMenu.el).toUpperCase())
    ) {
      this.hasToggle = true;
    }
  }

  /**
   * Set is small
   * 1. If the toggle button content width is less than 48, then set isSmall to true to remove the padding.
   */
  setIsSmall() {
    if (this.toggleButtonContent.clientWidth <= 48) {
      this.isSmall = true;
    }
  }

  /**
   * Toggle toggle button selected state
   * 1. Toggle the selected state between true and false
   * 2. Select/deselect the toggle button based on isSelected
   */
  toggleSelected() {
    if (this.hasToggle) {
      this.isSelected = !this.isSelected; /* 1 */
    } else {
      this.isSelected = true;
    }

    /* 2 */
    if (this.isSelected) {
      this.selectToggleButton();
    } else {
      this.deselectToggleButton();
    }
  }

  /**
   * Select the toggle button
   * 1. Set isSelected to true
   * 2. If has a slotted popover, set is active to true
   * 3. Dispatch the custom event
   */
  public selectToggleButton() {
    this.isSelected = true; /* 1 */
    /* 2 */
    if (this.hasPopover) {
      this.slottedEls[0].isActive = true;
    }
    /* 3 */
    this.dispatch({
      eventName: 'onToggleButtonSelect',
      detailObj: {
        item: this,
        selected: this.isSelected
      }
    });
  }

  /**
   * Deselect the toggle button
   * 1. Set isSelected to false
   * 2. Return focus to the toggle button
   * 3. If has a slotted popover, set is active to false
   * 4. Dispatch the custom event
   */
  public deselectToggleButton() {
    this.isSelected = false; /* 1 */
    /* 2 */
    if (this.toggleButton) {
      this.toggleButton.focus();
    }
    /* 3 */
    if (this.hasPopover) {
      this.slottedEls[0].isActive = false;
    }
    /* 4 */
    this.dispatch({
      eventName: 'onToggleButtonDeselect',
      detailObj: {
        item: this,
        selected: this.isSelected
      }
    });
  }

  /**
   * Handle on click
   * 1. If the toggle button is clicked, toggle the selected state
   */
  handleOnClick(e: MouseEvent) {
    if ((this.hasPopover && e.target === this.toggleButtonContent) || !this.hasPopover) {
      this.toggleSelected();
    }
  }

  /**
   * Handle on keydown
   * 1. If enter key is pressed, set selected state
   */
  handleOnKeydown(e: KeyboardEvent) {
    /* 1 */
    if (this.isSelected === false && e.code === 'Enter') {
      this.selectToggleButton();
    }

    /* 2 */
    if (this.isSelected === true && e.code === 'Escape') {
      this.deselectToggleButton();
    }
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
    if (this.isSelected) {
      const didClickInside = e.composedPath().includes(this.shadowRoot.host); /* 2 */
      /* 3 */
      if (!didClickInside) {
        /* 4 */
        this.deselectToggleButton();
      }
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-toggle-button', {
      'al-c-toggle-button--background': this.variant === 'background',
      'al-c-toggle-button--small': this.isSmall === true,
      'al-is-selected': this.isSelected === true,
      'al-has-popover': this.hasPopover === true
    });

    return html`
      <div class="${componentClassNames}" @click=${this.handleOnClick} @keydown=${this.handleOnKeydown} tabindex="0">
        <div class="al-c-toggle-button__content">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALToggleButton.el) === undefined) {
  customElements.define(ALToggleButton.el, ALToggleButton);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-toggle-button': ALToggleButton;
  }
}
