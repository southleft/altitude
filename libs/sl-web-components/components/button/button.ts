import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { FormController } from '../../controllers/form';
import { SLElement } from '../SLElement';
import styles from './button.scss';

/**
 * Component: sl-button
 * - Buttons serve as interactive elements that enable users to execute actions or transition to different sections.
 * @slot "before" - Content to display before the Button text, typically an Icon
 * @slot "after" - Content to display after the Button text, typically an Icon
 */
export class SLButton extends SLElement {
  static el = 'sl-button';

  static get styles() {
    console.log("STYLES: ", styles);
    return unsafeCSS(styles);
  }

  protected formController = new FormController(this);

  /**
   * Type of button
   */
  @property()
  accessor type: 'button' | 'submit' | 'reset';

  /**
   * Style variant
   * - **secondary** renders the button used for primary actions
   * - **danger** renders the button used for caution actions
   */
  @property()
  accessor variant: 'secondary' | 'tertiary' | 'danger';

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
   * Handle click events
   * 1. When we click on button which has type=submit trigger requestSubmit on closest form element in order to invoke submit event on form element
   */
  handleOnClick() {
    /* 1 */
    if (this.type === 'submit' || this.type === 'reset') {
      this.formController.submit(this.type);
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-button', {
      'sl-c-button--secondary': this.variant === 'secondary',
      'sl-c-button--tertiary': this.variant === 'tertiary',
      'sl-c-button--danger': this.variant === 'danger',
      'sl-c-button--full-width': this.fullWidth === true,
      'sl-c-button--icon-only': this.hideText === true,
      'sl-is-expanded': this.isExpanded === true
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
          ${this.slotNotEmpty('before') && html`<span class="sl-c-button__icon"><slot name="before"></slot></span>`}
          <span class="${this.hideText && 'sl-u-is-vishidden'} sl-c-button__text">
            <slot></slot>
          </span>
          ${this.slotNotEmpty('after') && html`<span class="sl-c-button__icon"><slot name="after"></slot></span>`}
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
          ?disabled=${this.isDisabled}
          aria-pressed=${ifDefined(this.isPressed)}
          aria-expanded=${ifDefined(this.isExpanded)}
          part="button"
        >
          ${this.slotNotEmpty('before') && html`<span class="sl-c-button__icon"><slot name="before"></slot></span>`}
          <span class="${this.hideText && 'sl-u-is-vishidden'} sl-c-button__text">
            <slot></slot>
          </span>

          ${this.slotNotEmpty('after') && html`<span class="sl-c-button__icon"><slot name="after"></slot></span>`}
        </button>
      `;
    }
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLButton.el) === undefined) {
  customElements.define(SLButton.el, SLButton);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-button': SLButton;
  }
}
