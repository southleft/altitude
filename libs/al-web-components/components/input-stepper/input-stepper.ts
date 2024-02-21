import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALButton } from '../button/button';
import { ALFieldNote } from '../field-note/field-note';
import { ALIconAdd } from '../icon/icons/add';
import { ALIconMinus } from '../icon/icons/minus';
import styles from './input-stepper.scss';

/**
 * Component: al-input-stepper
 * - **slot** "field-note": If content is slotted, it will display in place of the fieldNote property
 * - **slot** "error": If content is slotted, it will display in place of the errorNote property
 */
export class ALInputStepper extends ALElement {
  static el = 'al-input-stepper';

  private elementMap = register({
    elements: [
      [ALFieldNote.el, ALFieldNote],
      [ALButton.el, ALButton],
      [ALIconAdd.el, ALIconAdd],
      [ALIconMinus.el, ALIconMinus]
    ],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private fieldNoteEl = unsafeStatic(this.elementMap.get(ALFieldNote.el));
  private buttonEl = unsafeStatic(this.elementMap.get(ALButton.el));
  private iconAddEl = unsafeStatic(this.elementMap.get(ALIconAdd.el));
  private iconMinusEl = unsafeStatic(this.elementMap.get(ALIconMinus.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * The unique id of the field
   */
  @property()
  accessor fieldId: string;

  /**
   * The form field's label
   */
  @property()
  accessor label = 'Label';

  /**
   * Hide label?
   */
  @property({ type: Boolean })
  accessor hideLabel: boolean;

  /**
   * Checkbox name attribute property
   */
  @property()
  accessor name: string;

  /**
   * Value
   */
  @property({ type: Number })
  accessor value: number;

  /**
   * Fieldnote text
   */
  @property()
  accessor fieldNote: string;

  /**
   * Errornote text
   */
  @property()
  accessor errorNote: string;

  /**
   * Add button icon name
   */
  @property({ type: Number })
  accessor min: number;

  /**
   * Add button icon name
   */
  @property({ type: Number })
  accessor max: number;

  /**
   * Aria describedby
   * 1) Used to connect the field note in select to the select menu for accessibility
   */
  @property()
  accessor ariaDescribedBy: string;

  /**
   * Required attribute
   */
  @property({ type: Boolean })
  accessor isRequired = false;

  /**
   * Disabled attribute
   */
  @property({ type: Boolean })
  accessor isDisabled: boolean;

  /**
   * Readonly attribute
   */
  @property({ type: Boolean })
  accessor isReadonly: boolean;

  /**
   * Placeholder text
   */
  @property()
  accessor placeholder: string;

  /**
   * Error state
   */
  @property({ type: Boolean })
  accessor isError: boolean;

  /**
   * Count state
   */
  @property({ type: Number })
  accessor count: number = 0;

  /**
   * Inremental/Decremental range
   */
  @property({ type: Number })
  accessor step: number = 1;

  /**
   * Increase
   * 1) Increase the value by 1 if below max count
   * 2) Add disabled state to custom element and inner button element
   */
  private onIncrease(e: MouseEvent) {
    e.preventDefault();
    const leftButton = this.shadowRoot.querySelector('.al-c-input-stepper__button--left') as ALButton;
    const rightButton = this.shadowRoot.querySelector('.al-c-input-stepper__button--right') as ALButton;
    rightButton.isDisabled = false;
    const _incrementCount = this.count + this.step;
    /* 2 */
    if (_incrementCount > this.max) {
      rightButton.isDisabled = true;
    } else if (this.isDisabled) {
      return false;
    } else {
      this.count = _incrementCount;
    }
    const _decrementCount = this.count - this.step;
    if (_decrementCount >= this.min) {
      leftButton.isDisabled = false;
    }
    this.emitEvent();
  }

  /**
   * Decrease
   * 1) Decrease the value by 1 if above min count
   * 2) Add disabled state to custom element and inner button element
   */
  private onDecrease(e: MouseEvent) {
    e.preventDefault();
    const leftButton = this.shadowRoot.querySelector('.al-c-input-stepper__button--left') as ALButton;
    const rightButton = this.shadowRoot.querySelector('.al-c-input-stepper__button--right') as ALButton;
    leftButton.isDisabled = false;
    const _decrementCount = this.count - this.step;
    /* 2 */
    if (_decrementCount < this.min) {
      leftButton.isDisabled = true;
    } else if (this.isDisabled) {
      return false;
    } else {
      this.count = _decrementCount;
    }
    const _incrementCount = this.count + this.step;
    if (_incrementCount <= this.max) {
      rightButton.isDisabled = false;
    }
    this.emitEvent();
  }

  /**
   * On change
   * 1) Make the count the value within the input
   */
  private handleOnChange(e: Event) {
    this.count = Number((<HTMLInputElement>e.target).value.replace(/e/g, ''));
    this.emitEvent();
  }

  private emitEvent(): void {
    this.dispatch({ eventName: 'onInputStepperChange', detailObj: { value: this.count } });
  }

  /**
   * On mount/update
   * 1) Autogenerate ids, for attribute, and aria-describedby ids to make this
   * accessible if these properties aren't provided
   */
  connectedCallback() {
    super.connectedCallback();
    this.fieldId = this.fieldId || nanoid(); /* 1 */
    if (this.fieldNote) {
      this.ariaDescribedBy = this.ariaDescribedBy || nanoid(); /* 1 */
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-input-stepper', {
      'al-has-hidden-label': this.hideLabel,
      'al-is-disabled': this.isDisabled,
      'al-is-error': this.isError
    });

    return html`
      <div class="${componentClassNames}">
        <label class="al-c-input-stepper__label" for="${this.fieldId}">${this.label}</label>
        <div class="al-c-input-stepper__body">
          <${this.buttonEl}
            class="al-c-input-stepper__button al-c-input-stepper__button--left"
            variant="tertiary"
            ?hideText=${true}
            @click=${(e: MouseEvent) => this.onDecrease(e)}
            role="spinbutton"
            ?isDisabled=${this.isDisabled}
          >
            Decrease
            <${this.iconMinusEl} class="al-c-input-stepper__icon-minus" slot="after"></${this.iconMinusEl}>
          </${this.buttonEl}>
          <input
            class="al-c-input-stepper__input"
            type="number"
            size="1"
            min=${ifDefined(this.min)}
            max=${ifDefined(this.max)}
            id="${this.fieldId}"
            pattern="[0-9]*"
            name=${ifDefined(this.name)}
            .value="${this.count.toString()}"
            @change=${(e: Event) => this.handleOnChange(e)}
            ?required=${this.isRequired}
            ?readonly=${this.isReadonly || this.isDisabled}
            ?disabled=${this.isDisabled}
            aria-describedby="${ifDefined(this.ariaDescribedBy)}"
            placeholder="${ifDefined(this.placeholder)}"
          />
          <${this.buttonEl}
            class="al-c-input-stepper__button al-c-input-stepper__button--right"
            variant="tertiary"
            ?hideText=${true}
            @click=${(e: MouseEvent) => this.onIncrease(e)}
            role="spinbutton"
            ?isDisabled=${this.isDisabled}
          >
            Increase
            <${this.iconAddEl} class="al-c-input-stepper__icon-add" slot="after"></${this.iconAddEl}>
          </${this.buttonEl}>
        </div>
        ${
          this.fieldNote || this.slotNotEmpty('field-note')
            ? html`
          <slot name="field-note">
            <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} id=${ifDefined(this.ariaDescribedBy)}>
              ${this.fieldNote}
            </${this.fieldNoteEl}>
          </slot>
        `
            : html``
        }
        ${
          (this.errorNote || this.slotNotEmpty('error')) && this.isError
            ? html`
          <slot name="error">
            <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} ?isError=${true}>
              ${this.errorNote}
            </${this.fieldNoteEl}>
          </slot>
        `
            : html``
        }
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALInputStepper.el) === undefined) {
  customElements.define(ALInputStepper.el, ALInputStepper);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-input-stepper': ALInputStepper;
  }
}
