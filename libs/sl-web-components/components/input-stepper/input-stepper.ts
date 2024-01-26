import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLButton } from '../button/button';
import { SLFieldNote } from '../field-note/field-note';
import { SLIconAdd } from '../icon/icons/add';
import { SLIconMinus } from '../icon/icons/minus';
import styles from './input-stepper.scss';

/**
 * Component: sl-input-stepper
 * - Input Stepper lets users enter a numeric value and incrementally increase or decrease the value with a two-segment control.
 * @slot - The component content
 */
export class SLInputStepper extends SLElement {
  static el = 'sl-input-stepper';

  private elementMap = register({
    elements: [
      [SLFieldNote.el, SLFieldNote],
      [SLButton.el, SLButton],
      [SLIconAdd.el, SLIconAdd],
      [SLIconMinus.el, SLIconMinus]
    ],
    suffix: (globalThis as any).enAutoRegistry === true ? '' : PackageJson.version
  });

  private fieldNoteEl = unsafeStatic(this.elementMap.get(SLFieldNote.el));
  private buttonEl = unsafeStatic(this.elementMap.get(SLButton.el));
  private iconAddEl = unsafeStatic(this.elementMap.get(SLIconAdd.el));
  private iconMinusEl = unsafeStatic(this.elementMap.get(SLIconMinus.el));

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
   * 1) Used to connect the field note in select field to the select menu for accessibility
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
    const leftButton = this.shadowRoot.querySelector('.sl-c-input-stepper__button--left') as SLButton;
    const rightButton = this.shadowRoot.querySelector('.sl-c-input-stepper__button--right') as SLButton;
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
    const leftButton = this.shadowRoot.querySelector('.sl-c-input-stepper__button--left') as SLButton;
    const rightButton = this.shadowRoot.querySelector('.sl-c-input-stepper__button--right') as SLButton;
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
    this.dispatch({ eventName: 'change', detailObj: { value: this.count } });
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
    const componentClassNames = this.componentClassNames('sl-c-input-stepper', {
      'sl-has-hidden-label': this.hideLabel,
      'sl-is-disabled': this.isDisabled,
      'sl-is-error': this.isError
    });

    return html`
      <div class="${componentClassNames}">
        <label class="sl-c-input-stepper__label" for="${this.fieldId}">${this.label}</label>
        <div class="sl-c-input-stepper__body">
          <${this.buttonEl}
            class="sl-c-input-stepper__button sl-c-input-stepper__button--left"
            variant="tertiary"
            ?hideText=${true}
            @click=${(e: MouseEvent) => this.onDecrease(e)}
            role="spinbutton"
            ?isDisabled=${this.isDisabled}
          >
            Decrease
            <${this.iconMinusEl} class="sl-c-input-stepper__icon-minus" slot="after"></${this.iconMinusEl}>
          </${this.buttonEl}>
          <input
            class="sl-c-input-stepper__input"
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
            class="sl-c-input-stepper__button sl-c-input-stepper__button--right"
            variant="tertiary"
            ?hideText=${true}
            @click=${(e: MouseEvent) => this.onIncrease(e)}
            role="spinbutton"
            ?isDisabled=${this.isDisabled}
          >
            Increase
            <${this.iconAddEl} class="sl-c-input-stepper__icon-add" slot="after"></${this.iconAddEl}>
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

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLInputStepper.el) === undefined) {
  customElements.define(SLInputStepper.el, SLInputStepper);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-input-stepper': SLInputStepper;
  }
}
