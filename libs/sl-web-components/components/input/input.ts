import { TemplateResult, unsafeCSS } from 'lit';
import { property, queryAsync } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLFieldNote } from '../field-note/field-note';
import styles from './input.scss';

/**
 * Component: sl-input
 *
 * Input allows users to input alphanumeric data when the expected input is short.
 * - **slot** "before": The content that appears before the text in the input
 * - **slot** "after": The content that appears after the text in the input
 * - **slot** "field-note": If content is slotted, it will display in place of the fieldNote property
 * - **slot** "error": If content is slotted, it will display in place of the errorNote property
 */
export class SLInput extends SLElement {
  static el = 'sl-input';

  private elementMap = register({
    elements: [[SLFieldNote.el, SLFieldNote]],
    suffix: (globalThis as any).slAutoRegistry === true ? '' : PackageJson.version
  });

  private fieldNoteEl = unsafeStatic(this.elementMap.get(SLFieldNote.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Type variants
   * - Specifies the type <input> element to display
   * - **text** renders a standar text input
   * - **email** renders a text input specifically for an email format
   * - **number** renders an input for number values only
   * - **password** renders an input for a password input format
   * - **url** renders an input for urls only
   * - **tel** renders an input for telephone number values only
   */
  @property()
  accessor type: 'text' | 'email' | 'number' | 'password' | 'url' | 'hidden' | 'tel' = 'text';

  /**
   * isActive
   * - Dynamically sets to true if the input has a value
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   * Readonly attribute
   * - Specifies that an input field is read-only
   */
  @property({ type: Boolean })
  accessor isReadonly: boolean;

  /**
   * Error state
   * - Changes the component's treatment to represent an error state
   */
  @property({ type: Boolean })
  accessor isError: boolean;

  /**
   * Disabled attribute
   * - Changes the component's treatment to represent a disabled state
   */
  @property({ type: Boolean })
  accessor isDisabled: boolean;

  /**
   * Required attribute
   * - Specifies that an input field must be filled out before submitting the form
   */
  @property({ type: Boolean })
  accessor isRequired: boolean;

  /**
   * Optional state
   * - Specifies that a field is optional and adds the text 'optional' to the label
   */
  @property({ type: Boolean })
  accessor isOptional: boolean;

  /**
   * Autofocus attribute
   * - When present, it specifies that the text area should automatically get focus when the page loads
   */
  @property({ type: Boolean })
  accessor isFocused: boolean;

  /**
   * Hide label?
   * - If true, hides the label from displaying
   */
  @property({ type: Boolean })
  accessor hideLabel: boolean;

  /**
   * Label attribute
   * - Specifies what content to enter within the <input> element
   */
  @property()
  accessor label: string = 'Label';

  /**
   * Placeholder attribute
   * - Specifies a short hint that describes the expected value of an <input> element
   */
  @property()
  accessor placeholder: string;

  /**
   * Name attribute
   * - Specifies the name of an <input> element
   */
  @property()
  accessor name: string;

  /**
   * Value attribute
   * - Specifies the value of an <input> element
   */
  @property()
  accessor value: string;

  /**
   *  Error message
   * - An error field note that displays below the input
   */
  @property()
  accessor errorNote: string;

  /**
   * Field note
   * - The helper text that displays below the input
   */
  @property()
  accessor fieldNote: string;

  /**
   * Id attribute
   * - The ID used for A11y and to associate the label with the input
   */
  @property()
  accessor fieldId: string;

  /**
   * aria-describedby attribute
   * - Applied to the field note or error note for A11y
   */
  @property()
  accessor ariaDescribedBy: string;

  /**
   * Min length
   * - Specifies the minimum number of characters required in an <input> element
   */
  @property({ type: Number })
  accessor minLength: number;

  /**
   * Max length
   * - Specifies the maximum number of characters required in an <input> element
   */
  @property({ type: Number })
  accessor maxLength: number;

  /**
   * Maxlength value
   * - Dynamically outputs the number of characters inside the input field
   */
  @property({ type: Number })
  accessor maxLengthValue: number;

  /**
   * Minimum value
   * - Specifies a minimum value for an <input> element
   */
  @property({ type: Number })
  accessor min: number;

  /**
   * Maximum value
   * - Specifies a maximum value for an <input> element
   */
  @property({ type: Number })
  accessor max: number;

  /**
   * Autocomplete property
   * - Specifies whether an <input> element should have autocomplete enabled
   */
  @property()
  accessor autoComplete: 'on' | 'off';

  /**
   * Queries content before the input label
   */
  @queryAsync('.sl-c-input__before')
  accessor beforeEl: any;

  /**
   * Connected callback
   * 1. Dynamically sets the fieldId and ariaDescribedBy for A11y
   */
  connectedCallback() {
    super.connectedCallback();
    /* 1 */
    this.fieldId = this.fieldId || nanoid();
    if (this.fieldNote) {
      this.ariaDescribedBy = this.ariaDescribedBy || nanoid();
    }
  }

  /**
   * First updated lifecycle
   * 1. Set the padding for the input, accounting for content before the label
   * 2. If there is a value, set isActive to true to move the label and get the length and set it to the maxlengthValue
   * 3. If isFocused is true, then autofocus the field on page load
   */
  firstUpdated() {
    /* 1 */
    this.setInputPadding();
    /* 2 */
    if (this.value && this.value.length > 0) {
      this.isActive = true;
      this.maxLengthValue = this.value.length;
    }
    /* 3 */
    if (this.isFocused) {
      this.shadowRoot.querySelector<HTMLTextAreaElement>('.sl-c-input__input').focus();
    }
  }

  /**
   * Handle on change events
   * 1. Update the maxlengthValue as text is being inputted in the field
   * 2. If the value is greater than zero, then set active to true to move the label above the input
   * 3. If the value is less than zero, then set active to false and move the label back to its original position
   * 4. Dispatch the custom event
   */
  handleOnChange(e: Event) {
    /* 1 */
    const value = (e.target as HTMLInputElement).value;
    this.value = value;
    this.maxLengthValue = value.length;

    if (value.length > 0) {
      this.isActive = true; /* 2 */
    } else {
      this.isActive = false; /* 3 */
    }

    /* 4 */
    this.dispatch({
      eventName: 'onInputChange',
      detailObj: {
        value: this.value
      }
    });
  }

  /**
   * Set the padding-left for the input field based on the before content width
   */
  setBeforePadding(beforeEl: HTMLElement) {
    let beforeWidth;
    if (this.isRequired && this.hideLabel) {
      beforeWidth = beforeEl.clientWidth + 16;
    } else {
      beforeWidth = beforeEl.clientWidth + 24;
    }
    this.style.setProperty('--sl-input-padding-start', beforeWidth + 'px');
  }

  /**
   * Set input padding
   * 1. Set the padding-left for the input field based on the before slotted content
   * 2. If the before slotted content has not loaded, wait 100ms and try again
   * 3. Set the padding-right for the input field based on the after slotted content
   */
  async setInputPadding() {
    /* 1 */
    const beforeEl = await this.beforeEl;
    if (beforeEl) {
      /* 2 */
      if (!beforeEl.clientWidth)  {
        setTimeout(() => {
          this.setBeforePadding(beforeEl);
        }, 100)
      } else {
        this.setBeforePadding(beforeEl);
      }
    }
    /* 2 */
    const afterEl = this.shadowRoot.querySelector<HTMLElement>('.sl-c-input__after');
    if (afterEl) {
      const afterWidth = afterEl.clientWidth + 24;
      this.style.setProperty('--sl-input-padding-end', afterWidth + 'px');
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-input', {
      'sl-has-hidden-label': this.hideLabel,
      'sl-is-disabled': this.isDisabled,
      'sl-is-required': this.isRequired,
      'sl-is-error': this.isError,
      'sl-is-active': this.isActive
    });

    return html`
      <div class="${componentClassNames}">
        <div class="sl-c-input__container">
          <input
            class="sl-c-input__input"
            type="${this.type}"
            id="${this.fieldId}"
            name="${ifDefined(this.name)}"
            .value="${ifDefined(this.value)}"
            ?readonly="${this.isReadonly}"
            ?required="${this.isRequired}"
            ?disabled="${this.isDisabled}"
            autocomplete="${this.type === 'password' ? 'off' : this.autoComplete}"
            aria-describedby="${ifDefined(this.ariaDescribedBy)}"
            placeholder="${ifDefined(this.placeholder)}"
            maxlength="${ifDefined(this.maxLength)}"
            minlength=${ifDefined(this.minLength)}
            min=${ifDefined(this.min)}
            max=${ifDefined(this.max)}
            @input=${(e: Event) => this.handleOnChange(e)}
            .autofocus=${this.isFocused}
          />
          <label ?hidden="${this.type === 'hidden'}" class="sl-c-input__label" for="${this.fieldId}">
            ${this.isRequired ? html`<span class="sl-c-input__asterisk">*</span>` : html``}
            <span>${this.label}</span>
            ${this.isOptional ? html`<em class="sl-c-input__optional">(Optional)</em>` : html``}
          </label>
          ${this.slotNotEmpty('before') || (this.isRequired && this.hideLabel)
            ? html`
                <div class="sl-c-input__before">
                  ${this.slotNotEmpty('before') ? html` <slot name="before"></slot> ` : html``}
                  ${this.isRequired && this.hideLabel
                    ? html` <span class="sl-c-input__asterisk sl-c-input__asterisk--hidden-label">*</span> `
                    : html``}
                </div>
              `
            : html``}
          ${this.slotNotEmpty('after')
            ? html`
                <div class="sl-c-input__after">
                  <slot name="after"></slot>
                </div>
              `
            : html``}
        </div>
        ${this.maxLength || this.fieldNote || this.errorNote || this.slotNotEmpty('field-note') || this.slotNotEmpty('error')
          ? html`
              <div class="sl-c-input__footer">
                <div class="sl-c-input__field-notes">
                  ${this.fieldNote || this.slotNotEmpty('field-note')
                    ? html`
                        <slot name="field-note">
                          <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} id=${ifDefined(this.ariaDescribedBy)}>
                            ${this.fieldNote}
                          </${this.fieldNoteEl}>
                        </slot>
                      `
                    : html``}
                  ${(this.errorNote || this.slotNotEmpty('error')) && this.isError
                    ? html`
                        <slot name="error">
                          <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} ?isError=${true}> ${this.errorNote} </${this.fieldNoteEl}>
                        </slot>
                      `
                    : html``}
                </div>
                ${this.maxLength
                  ? html`
                      <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} ?isError=${this.isError}>
                        ${this.maxLengthValue > 0 ? this.maxLengthValue : 0}/${this.maxLength}
                      </${this.fieldNoteEl}>
                    `
                  : html``}
              </div>
            `
          : html``}
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).slAutoRegistry === true && customElements.get(SLInput.el) === undefined) {
  customElements.define(SLInput.el, SLInput);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-input': SLInput;
  }
}
