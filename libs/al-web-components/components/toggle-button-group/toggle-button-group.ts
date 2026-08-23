import { TemplateResult, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALLayout } from '../layout/layout';
import { ALToggleButton } from '../toggle-button/toggle-button';
import styles from './toggle-button-group.scss';

/**
 * Component: al-toggle-button-group
 * @slot - A set of toggle buttons. Arranged in a row by default; for a column
 *         or a gap, nest them in `<al-layout>` with the props you need.
 */
export class ALToggleButtonGroup extends ALElement {
  static el = 'al-toggle-button-group';

  private elementMap = register({
    elements: [[ALLayout.el, ALLayout]],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private layoutEl = unsafeStatic(this.elementMap.get(ALLayout.el));

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
   * Selected item
   * - The currently selected Toggle Button in the group
   */
  @state()
  accessor selectedItem: ALToggleButton;

  /**
   * Initialize functions
   */
  constructor() {
    super();
    /**
     * Observe changes to the selected state of toggle buttons
     */
    this.addEventListener('onToggleButtonSelect', (e: CustomEvent) => this.handleOnToggleButtonSelect(e.target as ALToggleButton));
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
  handleOnToggleButtonSelect(item: ALToggleButton) {
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
    const componentClassNames = this.componentClassNames('al-c-toggle-button-group', {
      'al-c-toggle-button-group--background': this.variant === 'background'
    });

    return html`
      <div class="${componentClassNames}">
        <${this.layoutEl} direction="row" gap="none">
          <slot></slot>
        </${this.layoutEl}>
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALToggleButtonGroup.el) === undefined) {
  customElements.define(ALToggleButtonGroup.el, ALToggleButtonGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-toggle-button-group': ALToggleButtonGroup;
  }
}
