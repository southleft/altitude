import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLFieldNote } from '../field-note/field-note';
import { SLRadio } from '../radio/radio';
import styles from './radio-item.scss';

/**
 * Component: sl-radio-item
 * - A radio item is a singular radio that is meant to be used within the SLRadio
 * @slot - The component content that appears next to the radio
 * @slot "field-note" - If content is slotted, it will display in place of the fieldNote property
 * @slot "error" - If content is slotted, it will display in place of the errorNote property
 */
export class SLRadioItem extends SLElement {
  static el = 'sl-radio-item';

  private elementMap = register({
    elements: [
      [SLRadioItem.el, SLRadioItem],
      [SLFieldNote.el, SLFieldNote],
      [SLRadio.el, SLRadio]
    ],
    suffix: (globalThis as any).enAutoRegistry === true ? '' : PackageJson.version
  });

  private fieldNoteEl = unsafeStatic(this.elementMap.get(SLFieldNote.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Checked attribute
   */
  @property({ type: Boolean })
  accessor isChecked: boolean;

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
   * - Sets the radio to be required for validation
   */
  @property({ type: Boolean })
  accessor isRequired: boolean;

  /**
   * Name attribute
   */
  @property()
  accessor name: string;

  /**
   * Value attribute
   */
  @property()
  accessor value: string;

  /**
   * Hide label?
   * - If true, hides the label from displaying
   */
  @property({ type: Boolean })
  accessor hideLabel: boolean;

  /**
   *  Error message
   * - An error field note that displays below the radio input
   */
  @property()
  accessor errorNote: string;

  /**
   * Field note
   * - The helper text that displays below the radio input
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
   * Remove checked
   * 1. Remove checked property from all radio items
   */
  removeChecked() {
    if (this.parentNode.nodeName === this.elementMap.get(SLRadio.el).toUpperCase()) {
      const radioItems = this.parentNode.querySelectorAll(this.elementMap.get(SLRadioItem.el));
      if (radioItems) {
        radioItems.forEach((el: SLRadioItem) => {
          el.isChecked = false;
        });
      }
    }
  }

  /**
   * Handle on change events
   * 1. Remove any checked items
   * 2. Toggle the checked state
   * 3. Dispatch the custom event
   */
  handleOnChange() {
    this.removeChecked(); /* 1 */
    this.isChecked = !this.isChecked; /* 2 */
    /* 3 */
    this.dispatch({
      eventName: 'change',
      detailObj: {
        checked: this.isChecked,
        name: this.name,
        value: this.value
      }
    });
  }

  /**
   * Set the next or previous sibling as checked based on the arrow key pressed
   * @param {string} direction - 'previousElementSibling' or 'nextElementSibling'
   * 1. Skip over disabled siblings
   * 2. Remove checked from all items
   * 3. Set the sibling as checked
   * 4. Focus on the selected sibling's radio input
   * 5. Dispatch the custom event
   */
  setSiblingChecked(direction: 'previousElementSibling' | 'nextElementSibling') {
    let sibling = this[direction] as SLRadioItem | null;

    /* 1 */
    while (sibling && sibling.isDisabled) {
      sibling = sibling[direction] as SLRadioItem | null;
    }

    if (sibling.nodeName === this.elementMap.get(SLRadioItem.el).toUpperCase()) {
      this.removeChecked(); /* 2 */
      sibling.isChecked = true; /* 3 */

      /* 4 */
      const siblingRadioInput = sibling.shadowRoot?.querySelector<HTMLInputElement>('.sl-c-radio-item__input:not(:disabled)');
      if (siblingRadioInput) {
        siblingRadioInput.focus();
      }

      /* 3 */
      this.dispatch({
        eventName: 'change',
        detailObj: {
          checked: sibling.isChecked,
          name: sibling.name,
          value: sibling.value
        }
      });
    }
  }

  /**
   * Handle on keydown events
   * 1. If the enter key is pressed, then check the checkbox and dispatch the custom event
   * 2. If arrow left or arrow up is pressed, set previous sibling as checked
   * 3. If arrow right or arrow down is pressed, set next sibling as checked
   */
  handleOnKeydown(e: KeyboardEvent) {
    if (e.code === 'Enter') {
      this.handleOnChange(); /* 1 */
    } else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
      this.setSiblingChecked('previousElementSibling'); /* 2 */
    } else if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
      this.setSiblingChecked('nextElementSibling'); /* 3 */
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-radio-item', {
      'sl-is-error': this.isError === true,
      'sl-is-disabled': this.isDisabled === true,
      'sl-has-hidden-label': this.hideLabel
    });

    return html`
      <div class="${componentClassNames}">
        <div class="sl-c-radio-item__container">
          <div class="sl-c-radio-item__radio">
            <input
              class="sl-c-radio-item__input"
              type="radio"
              id="${this.fieldId}"
              name="${this.name}"
              .value="${this.value}"
              .checked="${this.isChecked}"
              ?disabled="${this.isDisabled}"
              ?required=${this.isRequired}
              @change=${this.handleOnChange}
              @keydown=${this.handleOnKeydown}
              aria-describedby="${ifDefined(this.ariaDescribedBy)}"
              tabindex="0"
            />
            <span class="sl-c-radio-item__custom-radio"></span>
            <span class="sl-c-radio-item__ripple"></span>
          </div>
          <label class="sl-c-radio-item__label" for="${this.fieldId}">
            <slot></slot>
          </label>
        </div>
        ${(this.fieldNote || this.slotNotEmpty('field-note')) &&
        html`
          <slot name="field-note">
            <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} id=${ifDefined(this.ariaDescribedBy)}> ${this.fieldNote} </${this.fieldNoteEl}>
          </slot>
        `}
        ${(this.errorNote || this.slotNotEmpty('error')) &&
        html`
          <slot name="error">
            <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} ?isError=${true}> ${this.errorNote} </${this.fieldNoteEl}>
          </slot>
        `}
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLRadioItem.el) === undefined) {
  customElements.define(SLRadioItem.el, SLRadioItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-radio-item': SLRadioItem;
  }
}
