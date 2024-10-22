import { html, unsafeCSS } from 'lit';
import { property, queryAssignedNodes } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { FormController } from '../../controllers/form';
import { ALElement } from '../ALElement';
import styles from './button.scss';

/**
 * Component: al-button
 * - **slot**: The button text content
 * - **slot** "before": Content to display before the button text, typically an icon
 * - **slot** "after": Content to display after the button text, typically an icon
 */
export class ALButton extends ALElement {
  static el = 'al-button';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  protected formController = new FormController(this);

  /**
   * Type of button
   */
  @property()
  accessor type: 'button' | 'submit' | 'reset';

  /**
   * Style variant
   * - **default** renders the button used for primary actions
   * - **secondary** renders the button used for secondary actions
   * - **tertiary** renders the button with an outlined style
   * - **bare** renders the button with a bare style
   * - **danger** renders the button used for caution actions
   */
  @property()
  accessor variant: 'secondary' | 'tertiary' | 'bare' | 'danger';

  /**
   * Target attribute for a link (i.e. set to _blank to open in new tab)
   * - **_blank** yields a link that opens in a new tab
   * - **_self** yields a link that loads the URL into the same browsing context as the current one. This is the default behavior
   * - **_parent** yields a link that loads the URL into the parent browsing context of the current one. If there is no parent, this behaves the same way as _self
   * - **_top** yields a link that loads the URL into the top-level browsing context. If there is no parent, this behaves the same way as _self.
   */
  @property()
  accessor target: '_blank' | '_self' | '_parent' | '_top';

  /**
   * URL if this is an <a> element - this swaps <button> for <a>
   */
  @property()
  accessor href: string;

  /**
   * Indicates the name when submitted with form data.
   */
  @property()
  accessor name: string;

  /**
   * Indicates the aria label to apply to the button.
   */
  @property()
  accessor label: string;

  /**
   * Indicates the value associated with the name when submitted with form data.
   */
  @property()
  accessor value: string;

  /**
   * Indicates this button is a toggle button and whether it is pressed or not.
   */
  @property()
  accessor isPressed: boolean | 'mixed';

  /**
   * Disabled attribute
   */
  @property({ type: Boolean })
  accessor isDisabled: boolean;

  @property({ type: Boolean })
  accessor isAriaDisabled: boolean;

  /**
   * Indicates this button is a toggle button and whether it is pressed or not.
   */
  @property({ type: Boolean })
  accessor isExpanded: boolean;

  /**
   * Visually hide button text (but text is still accessible to assistive technology)
   * 1. Use this for icon-only buttons for accessibility
   */
  @property({ type: Boolean })
  accessor hideText: boolean;

  /**
   * Full width button
   */
  @property({ type: Boolean })
  accessor fullWidth: boolean;

  /**
   * aria-controls attribute on the button
   * 1. Used for items like the buttons attached drawers
   */
  @property()
  accessor ariaControls: string;

  /**
   * Queries nodes in the default slot
   * 1. Used to dynamically set the aria-label attribute if a label is not provided
   */
  @queryAssignedNodes()
  accessor slotNodes: Array<Node>;

  /**
   * Handle click events
   * 1. When we click on button which has type=submit trigger requestSubmit on closest form element in order to invoke submit event on form element
   */
  handleOnClick() {
    /* 1 */
    if (this.type === 'submit' || this.type === 'reset') {
      this.formController.submit(this.type);
    }
  }

  /**
   * Lifecycle connected callback
   * 1. If a label is not provided for aria, dynamically set the label from button's slotted text content
   */
  connectedCallback() {
    super.connectedCallback();

    /* 1 */
    if (!this.label) {
      setTimeout(() => {
        const textNode = [...this.slotNodes].find((node) => node.nodeType === 3);
        if (textNode) {
          this.label = textNode.textContent.trim();
        }
      }, 10);
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-button', {
      'al-c-button--secondary': this.variant === 'secondary',
      'al-c-button--tertiary': this.variant === 'tertiary',
      'al-c-button--bare': this.variant === 'bare',
      'al-c-button--danger': this.variant === 'danger',
      'al-c-button--full-width': this.fullWidth === true,
      'al-c-button--icon-only': this.hideText === true,
      'al-is-expanded': this.isExpanded === true,
    });

    if (this.href) {
      return html`
        <a
          href="${ifDefined(this.href)}"
          role="button"
          class="${componentClassNames}"
          aria-label=${ifDefined(this.label)}
          aria-pressed=${ifDefined(this.isPressed)}
          aria-expanded=${ifDefined(this.isExpanded)}
          aria-controls=${ifDefined(this.ariaControls)}
          target=${ifDefined(this.target)}
        >
          ${this.slotNotEmpty('before') && html`<span class="al-c-button__icon"><slot name="before"></slot></span>`}
          <span class="${this.hideText && 'al-u-is-vishidden'} al-c-button__text">
            <slot></slot>
          </span>
          ${this.slotNotEmpty('after') && html`<span class="al-c-button__icon"><slot name="after"></slot></span>`}
        </a>
      `;
    } else {
      return html`
        <button
          @click=${this.handleOnClick}
          class="${componentClassNames}"
          type=${ifDefined(this.type)}
          value=${ifDefined(this.value)}
          name=${ifDefined(this.name)}
          aria-label=${ifDefined(this.label)}
          aria-disabled=${ifDefined(this.isDisabled)}
          aria-pressed=${ifDefined(this.isPressed)}
          aria-expanded=${ifDefined(this.isExpanded)}
          part="button"
        >
          ${this.slotNotEmpty('before') && html`<span class="al-c-button__icon"><slot name="before"></slot></span>`}
          <span class="${this.hideText && 'al-u-is-vishidden'} al-c-button__text">
            <slot></slot>
          </span>

          ${this.slotNotEmpty('after') && html`<span class="al-c-button__icon"><slot name="after"></slot></span>`}
        </button>
      `;
    }
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALButton.el) === undefined) {
  customElements.define(ALButton.el, ALButton);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-button': ALButton;
  }
}
