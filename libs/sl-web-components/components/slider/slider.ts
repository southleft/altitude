import { TemplateResult, unsafeCSS } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLFieldNote } from '../field-note/field-note';
import styles from './slider.scss';
const LOWER_SLIDER = 'LOWERSLIDER';
const UPPER_SLIDER = 'UPPERSLIDER';

/**
 * Component: sl-slider
 *
 * Slider provides a visual indication of adjustable content, where the user can increment or decrement the value by moving the handle along a track, or via text input.
 * - **slot** "label": If content is slotted, it will override the default slider label
 * - **slot** "before": If content is slotted, it will override the default slider "min" label text
 * - **slot** "after": If content is slotted, it will override the default slider "max" label text
 */
export class SLSlider extends SLElement {
  static el = 'sl-slider';

  private elementMap = register({
    elements: [[SLFieldNote.el, SLFieldNote]],
    suffix: (globalThis as any).enAutoRegistry === true ? '' : PackageJson.version
  });

  private fieldNoteEl = unsafeStatic(this.elementMap.get(SLFieldNote.el));

  // Holds the reference for clearing the timeout
  private clearSetTimeout: ReturnType<typeof setTimeout>;
  private canAllowDispatch = false;

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Hide label?
   * - If true, hides the label from displaying
   */
  @property({ type: Boolean })
  accessor hideLabel: boolean;

  /**
   * Error state
   */
  @property({ type: Boolean })
  accessor isError: boolean;

  /**
   * Disabled attribute
   */
  @property({ type: Boolean })
  accessor isDisabled: boolean;

  /**
   * Handle label unit attribute
   */
  @property({ type: String })
  accessor handleLabelUnit: string;

  /**
   * Min property for slider
   */
  @property({ type: Number })
  accessor min = 0;

  /**
   * Minselected property for range slider
   */
  @property({ type: Number })
  accessor minSelected: number;

  /**
   * Max property for slider
   */
  @property({ type: Number })
  accessor max = 100;

  /**
   * Maxselected property for range slider
   */
  @property({ type: Number })
  accessor maxSelected: number;

  /**
   * Step for slider
   */
  @property({ type: Number })
  accessor step = 1;

  /**
   * Shows input value
   */
  @property({ type: Boolean })
  accessor hasOutput: boolean;

  /**
   * Input value
   */
  @property({ type: Number })
  accessor value: number;

  /**
   * Input value for lower slider of range slider
   */
  @property({ type: Number })
  accessor lowerSliderValue: number;

  /**
   * Input value for upper slider of range slider
   */
  @property({ type: Number })
  accessor upperSliderValue: number;

  /**
   * Slide Label
   */
  @property()
  accessor label: string;

  /**
   * Field note text
   */
  @property()
  accessor fieldNote: string;

  /**
   * Error note text
   */
  @property()
  accessor errorNote: string;

  /**
   * Aria described by
   * - Used to connect the field note in select field to the select menu for accessibility
   */
  @property()
  accessor ariaDescribedBy: string;

  /**
   * The unique id of the field
   */
  @property()
  accessor fieldId: string;

  /**
   * Displays value label above slider
   */
  @property({ type: Boolean })
  accessor hasTooltip: boolean;

  /**
   * Behavior property for slide
   */
  @property()
  accessor behavior: 'range';

  /**
   * Queries the default slider
   */
  @query('.sl-c-slider__input')
  accessor defaultSlider: HTMLInputElement;

  /**
   * Queries the lower slider/lower input of range slider
   */
  @query('.sl-c-slider__range-one')
  accessor lowerSlider: HTMLInputElement;

  /**
   * Queries the upper slider/upper input of range slider
   */
  @query('.sl-c-slider__range-two')
  accessor upperSlider: HTMLInputElement;

  /**
   * Queries the container for the label of the lower slider in the range slider
   */
  @query('.sl-c-slider__range-one-label-container')
  accessor lowerSliderLabelContainer: HTMLElement;

  /**
   * Queries the container for the label of the upper slider in the range slider
   */
  @query('.sl-c-slider__range-two-label-container')
  accessor upperSliderLabelContainer: HTMLElement;

  /**
   * Queries the element for the range color in the slider
   */
  @query('.sl-c-slider__range-color')
  accessor rangeColor: HTMLElement;

  /**
   * Queries the wrapper for the tooltip associated with the slider
   */
  @query('.sl-c-slider__tooltip-wrapper')
  accessor defaultLabelWrapper: HTMLElement;

  /**
   * Represents the result as a string
   */
  @state()
  accessor result: string;

  /**
   * Represents the output value as a number
   */
  @state()
  accessor outputValue: number;

  /**
   * Represents the output value of the lower slider as a number for a range slider
   */
  @state()
  accessor outputValueLowerSlider: number;

  /**
   * Represents the output value of the upper slider as a number for a range slider
   */
  @state()
  accessor outputValueUpperSlider: number;

  constructor() {
    super();
    this.updateValue = this.updateValue.bind(this);
    this.syncOutFieldToSliderField = this.syncOutFieldToSliderField.bind(this);
    this.syncOutFieldToLowerRange = this.syncOutFieldToLowerRange.bind(this);
    this.syncOutFieldToUpperRange = this.syncOutFieldToUpperRange.bind(this);
    this.upperSliderOnInput = this.upperSliderOnInput.bind(this);
    this.lowerSliderOnInput = this.lowerSliderOnInput.bind(this);
    this.toggleZIndexonLowerSlider = this.toggleZIndexonLowerSlider.bind(this);
    this.toggleZIndexonLowerSlider = this.toggleZIndexonUppserSlider.bind(this);
  }

  firstUpdated() {
    if (this.behavior !== 'range') {
      if (this.value === undefined) {
        this.value = this.min;
      }
      this.outputValue = this.value;
      this.setPercentageLabel(); /* 1 */
    } else {
      this.outputValueLowerSlider = this.minSelected ? this.minSelected : this.min;
      this.outputValueUpperSlider = this.maxSelected ? this.maxSelected : this.max;
      this.lowerSliderValue = this.minSelected ? this.minSelected : this.min;
      this.upperSliderValue = this.maxSelected ? this.maxSelected : this.max;
      this.handleRangeSlider(this.lowerSliderValue, this.minSelected, LOWER_SLIDER);
      this.handleRangeSlider(this.upperSliderValue, this.maxSelected, UPPER_SLIDER);
      this.doubleRange();
    }
  }

  /**
   * function to sets the background style of default sliders when it is dragged
   */
  generateLinearGradient(value1: number, value2: number) {
    return `linear-gradient(var(--rtlGradientToRight, to right), var(--sl-theme-color-background-accent-default) 0%, var(--sl-theme-color-background-accent-default)
    ${value1}%, var(--sl-theme-color-background-default-weak)
    ${value2}%, var(--sl-theme-color-background-default-weak) 100%)`;
  }

  /**
   *
   * called when range-slider is used. This function sets the position of  min and maxselected and
     handles styling for labels.
   */
  handleRangeSlider(value: number, min_max_selected: number, sliderType: string) {
    let val = value; /* 2 */
    /**
   *
   * if minselected and maxselected values lies within the range of slider, then assign the corresponding
    values to the values of range-slider.
    If it does not lie within the range, then leave the slider values to the min and max values itself.
   */
    if (min_max_selected && min_max_selected >= this.min && min_max_selected <= this.max) {
      if (sliderType === LOWER_SLIDER) {
        this.lowerSliderValue = min_max_selected;
      } else {
        this.upperSliderValue = min_max_selected;
      }
      val = min_max_selected;
    } else {
      if (sliderType === LOWER_SLIDER) {
        this.lowerSliderValue = this.min;
      } else {
        this.upperSliderValue = this.max;
      }
    }
    const percentage = this.calculatePercentage(val);

    if (sliderType === LOWER_SLIDER) {
      // @ts-ignore
      this.lowerSliderLabelContainer.style.insetInlineStart = `calc(${percentage + 0.3}% + (${10 - percentage * 0.2}px))`; /* 6 */
    } else {
      // @ts-ignore
      this.upperSliderLabelContainer.style.insetInlineStart = `calc(${percentage - 0.3}% + (${10 - percentage * 0.2}px))`; /* 6 */
    }
  }

  /**
   * function to set the position of labels when they become equal and handle z-index when they become equal.
   */
  checkEquality(sliderType: string) {
    const lowerVal = this.lowerSliderValue;
    const upperVal: number = this.upperSliderValue;

    if (lowerVal === upperVal) {
      if (sliderType === UPPER_SLIDER && !this.upperSlider.classList.contains('sl-c-slider__range-upper-active-thumb')) {
        const percentage = this.calculatePercentage(this.upperSliderValue);
        this.upperSlider.classList.add('sl-c-slider__range-upper-active-thumb');
        // @ts-ignore
        this.upperSliderLabelContainer.style.insetInlineStart = `calc(${percentage + 0.3}% + (${10 - percentage * 0.2}px))`;
      } else if (sliderType === LOWER_SLIDER && !this.lowerSlider.classList.contains('sl-c-slider__range-lower-active-thumb')) {
        const percentage = this.calculatePercentage(this.lowerSliderValue);
        this.lowerSlider.classList.add('sl-c-slider__range-lower-active-thumb');
        // @ts-ignore
        this.lowerSliderLabelContainer.style.insetInlineStart = `calc(${percentage - 0.3}% + (${10 - percentage * 0.2}px))`; /* 6 */
      }
    } else if (lowerVal !== upperVal) {
      if (sliderType === UPPER_SLIDER && this.upperSlider.classList.contains('sl-c-slider__range-upper-active-thumb')) {
        this.upperSlider.classList.remove('sl-c-slider__range-upper-active-thumb');
      } else if (sliderType === LOWER_SLIDER && this.lowerSlider.classList.contains('sl-c-slider__range-lower-active-thumb')) {
        this.lowerSlider.classList.remove('sl-c-slider__range-lower-active-thumb');
      }
    }
  }

  /**
   * called when upper range  oninput event occurs
   * i.e when the element gets user input
   */
  upperSliderOnInput(e: Event) {
    this.upperSliderLabelContainer.style.zIndex = '100000';
    this.upperSliderValue = Number((e.target as HTMLInputElement).value !== '' ? (e.target as HTMLInputElement).value : '0');
    const percentage = this.calculatePercentage(+this.upperSliderValue);
    this.setUpperPercentageRangeLabel(percentage);
    this.checkEquality(UPPER_SLIDER);

    this.outputValueUpperSlider = this.upperSliderValue;

    if (this.canAllowDispatch) {
      this.emitSlideEvent({
        minValue: this.lowerSliderValue,
        maxValue: this.upperSliderValue,
        minSelected: this.minSelected,
        maxSelected: this.maxSelected
      });
    }
  }

  /**
   * sets the position of upper slider label corresponding to value and add style to sliders correspondingly.
   */
  setUpperPercentageRangeLabel(newVal: number) {
    const upperVal = this.upperSliderValue;
    const lowerVal = this.lowerSliderValue;

    if (upperVal < lowerVal) {
      this.upperSliderValue = lowerVal; //Here we are resetting upper slider to minimum/equal value
      this.canAllowDispatch = false;

      // TODO: explore fix for larger than 3 digits
    } else if (lowerVal !== upperVal) {
      // @ts-ignore
      this.upperSliderLabelContainer.style.insetInlineStart = `calc(${newVal - 0.3}% + (${10 - newVal * 0.2}px))`; /* 6 */
      this.canAllowDispatch = true;
    }
    if (this.rangeColor) {
      // @ts-ignore
      const upperInitialValue = this.upperSlider.max;

      this.rangeColor.style.marginInlineEnd =
        ((+upperInitialValue - this.upperSliderValue) / (+this.upperSlider.max - +this.lowerSlider.min)) * 100 + '%'; /* 5 */
      this.rangeColor.style.width =
        ((this.upperSliderValue - this.lowerSliderValue) / (+this.upperSlider.max - +this.lowerSlider.min)) * 100 + '%'; /* 5 */
    }
  }

  /**
   * sets the position of lower slider label corresponding to value and add style to sliders correspondingly.
   */
  setLowerPercentageRangeLabel(newVal: number) {
    const upperVal = this.upperSliderValue;
    const lowerVal = this.lowerSliderValue;
    if (lowerVal > upperVal) {
      this.lowerSliderValue = upperVal; //Here we are resetting lower slider to maximum/equal value
      this.canAllowDispatch = false;
    } else if (lowerVal !== upperVal) {
      // @ts-ignore
      this.lowerSliderLabelContainer.style.insetInlineStart = `calc(${newVal + 0.3}% + (${10 - newVal * 0.2}px))`; /* 6 */
      this.canAllowDispatch = true;
    }
    if (this.rangeColor) {
      // @ts-ignore
      const lowerInitialValue = this.lowerSlider.min;

      this.rangeColor.style.marginInlineStart =
        ((this.lowerSliderValue - +lowerInitialValue) / (+this.upperSlider.max - +this.lowerSlider.min)) * 100 + '%'; /* 5 */
      this.rangeColor.style.width =
        ((this.upperSliderValue - this.lowerSliderValue) / (+this.upperSlider.max - +this.lowerSlider.min)) * 100 + '%'; /* 5 */
    }
  }

  /**
   * called when user drags the lower slider of range (the left-side slider)
   */
  lowerSliderOnInput(evt: Event) {
    this.lowerSliderLabelContainer.style.zIndex = '100000';
    this.lowerSliderValue = Number((evt.target as HTMLInputElement).value !== '' ? (evt.target as HTMLInputElement).value : '0');

    const lowerVal = this.lowerSliderValue;

    const percentage = this.calculatePercentage(lowerVal);
    this.setLowerPercentageRangeLabel(percentage);
    this.checkEquality(LOWER_SLIDER);
    this.outputValueLowerSlider = this.lowerSliderValue;
    if (this.canAllowDispatch) {
      this.emitSlideEvent({
        minValue: this.lowerSliderValue,
        maxValue: this.upperSliderValue,
        minSelected: this.minSelected,
        maxSelected: this.maxSelected
      });
    }
  }

  /**
   * function that dispatch event for range sliders
   */
  emitSlideEvent(detailObj: { minValue?: number; maxValue?: number; minSelected?: number; maxSelected?: number; value?: number }) {
    if (this.clearSetTimeout) {
      clearTimeout(this.clearSetTimeout);
    }
    this.clearSetTimeout = setTimeout(() => {
      clearTimeout(this.clearSetTimeout);
      this.dispatch({
        eventName: 'slide',
        detailObj
      });
    }, 300);
  }

  /**
   * Set the default / on load configuration for range-sliders
   */

  emitOutputFieldEvent(value: number) {
    this.dispatch({ eventName: 'outputValueChange', detailObj: { value } });
  }

  async doubleRange() {
    const lowerSlider: HTMLInputElement = this.lowerSlider; /* 1 */
    const upperSlider: HTMLInputElement = this.upperSlider; /* 1 */
    if (this.minSelected && this.maxSelected) {
      const upperInitialValue = upperSlider.max;
      const lowerInitialValue = lowerSlider.min;
      this.rangeColor.style.marginInlineEnd =
        ((+upperInitialValue - this.upperSliderValue) / (+upperSlider.max - +lowerSlider.min)) * 100 + '%'; /* 5 */
      this.rangeColor.style.width = ((this.upperSliderValue - this.lowerSliderValue) / (+upperSlider.max - +lowerSlider.min)) * 100 + '%'; /* 5 */
      this.rangeColor.style.marginInlineStart =
        ((this.lowerSliderValue - +lowerInitialValue) / (+upperSlider.max - +lowerSlider.min)) * 100 + '%'; /* 5 */
    }
  }

  /**
   * called when mouseup event happens for lower slider.
   * set the lower slider label back to its original z-index and removes the z-index of lower-slider
   */
  toggleZIndexonLowerSlider() {
    if (!(this.upperSliderValue - this.lowerSliderValue <= 3)) {
      this.lowerSliderLabelContainer.style.zIndex = `var(--sl-z-index-top)`;
    }
    if (this.upperSliderValue !== this.lowerSliderValue) {
      if (this.lowerSlider.classList.contains('sl-c-slider__range-lower-active-thumb')) {
        this.lowerSlider.classList.remove('sl-c-slider__range-lower-active-thumb');
      }
    }
  }

  /**
   * called when mouseup event happens for upper slider.
   * set the upper slider label back to its original z-index and removes the z-index of upper-slider
   */
  toggleZIndexonUppserSlider() {
    if (!(this.upperSliderValue - this.lowerSliderValue <= 2)) {
      this.upperSliderLabelContainer.style.zIndex = `var(--sl-z-index-top)`;
    }
    if (this.upperSliderValue !== this.lowerSliderValue) {
      if (this.upperSlider.classList.contains('sl-c-slider__range-upper-active-thumb')) {
        this.upperSlider.classList.remove('sl-c-slider__range-upper-active-thumb');
      }
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.fieldId = this.fieldId || nanoid();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  /**
   * Set the value
   */
  set Value(value: number) {
    const oldValue = this.value;

    this.value = value;
    this.requestUpdate('value', oldValue);
  }

  /**
   * Get the value
   */
  get Value() {
    return this.value;
  }

  /**
   * called when default slider becomed active i.e when user drags the slider.
   */
  handleDefaulSliderChange(e: Event) {
    this.value = Number((e.target as HTMLInputElement).value !== '' ? (e.target as HTMLInputElement).value : '0');
    this.outputValue = this.value;
    this.updateValue();
  }

  /**
   * calculates percentage and update the value of slider label ,sets its position and dispatch the value
   */
  updateValue() {
    const percentage = this.calculatePercentage(this.value);
    this.setPercentageLabel();
    this.defaultSlider.style.background = this.generateLinearGradient(percentage, percentage);
    this.emitSlideEvent({ value: this.value });
  }

  /**
   * called when user sets the position of slider using input-field. when the value is lesser than min , rest the value to min..and when it is greater than max, reset it to max
   */
  checkValue() {
    if (this.outputValue < this.min) {
      this.value = this.min;
    } else if (this.outputValue > this.max) {
      this.value = this.max;
    } else {
      if (this.step > 1) {
        this.calculateValueOnStep();
      } else {
        this.value = this.outputValue;
      }
    }
  }

  /**
   * function to update the slider value when step value greater than one is given
   */
  calculateValueOnStep() {
    let currValue = this.min + this.step;
    let prevValue = this.min;
    while (this.outputValue > currValue) {
      prevValue = currValue;
      currValue = prevValue + this.step;
    }

    if (this.outputValue - prevValue < currValue - this.outputValue || this.outputValue - prevValue === currValue - this.outputValue) {
      this.value = prevValue;
    } else if (this.outputValue === 0) {
      this.value = this.min;
    } else {
      this.value = currValue;
    }
  }

  /**
   * update default slider based on user-input from its corresponding input-field
   */
  syncOutFieldToSliderField(e: Event) {
    this.outputValue = +((e.target as HTMLInputElement).value !== '' ? (e.target as HTMLInputElement).value : '0');
    this.emitOutputFieldEvent(this.outputValue);
    this.checkValue();
    this.updateValue();
  }

  /**
   * update lower slider (left-side-slider) based on user-input from its corresponding input-field
   */
  syncOutFieldToLowerRange(e: Event) {
    if ((e.target as HTMLInputElement).value === '' || +(e.target as HTMLInputElement).value < this.min) {
      this.lowerSliderValue = this.min;
    } else if (+(e.target as HTMLInputElement).value > this.upperSliderValue || +(e.target as HTMLInputElement).value > this.max) {
      this.outputValueLowerSlider = this.upperSliderValue;
      this.lowerSliderValue = this.upperSliderValue;
    } else {
      this.lowerSliderValue = +(e.target as HTMLInputElement).value;
    }
    const percentage = this.calculatePercentage(this.lowerSliderValue);
    this.setLowerPercentageRangeLabel(percentage);
    this.checkEquality(LOWER_SLIDER);
    if (this.canAllowDispatch) {
      this.emitSlideEvent({
        minValue: this.lowerSliderValue,
        maxValue: this.upperSliderValue,
        minSelected: this.minSelected,
        maxSelected: this.maxSelected
      });
    }
    this.emitOutputFieldEvent(+(e.target as HTMLInputElement).value);
  }

  /**
   * update upper slider (right-side-slider) based on user-input from its corresponding input-field
   */
  syncOutFieldToUpperRange(e: Event) {
    if ((e.target as HTMLInputElement).value === '' || +(e.target as HTMLInputElement).value > this.max) {
      this.upperSliderValue = this.max;
    } else if (+(e.target as HTMLInputElement).value < this.lowerSliderValue || +(e.target as HTMLInputElement).value < this.min) {
      this.outputValueUpperSlider = this.lowerSliderValue;
      this.upperSliderValue = this.lowerSliderValue;
    } else {
      this.upperSliderValue = +(e.target as HTMLInputElement).value;
    }
    const percentage = this.calculatePercentage(this.upperSliderValue);
    this.setUpperPercentageRangeLabel(percentage);
    this.checkEquality(UPPER_SLIDER);
    if (this.canAllowDispatch) {
      this.emitSlideEvent({
        minValue: this.lowerSliderValue,
        maxValue: this.upperSliderValue,
        minSelected: this.minSelected,
        maxSelected: this.maxSelected
      });
    }
    this.emitOutputFieldEvent(+(e.target as HTMLInputElement).value);
  }

  /**
   * Dynamic styling on slider as a percentage. sets the label value and sets the position of label
   */
  setPercentageLabel() {
    const percentage = this.calculatePercentage(this.value);
    if (this.defaultSlider) this.defaultSlider.style.background = this.generateLinearGradient(percentage, percentage);
    if (this.handleLabelUnit !== undefined) {
      this.result = this.value + this.handleLabelUnit;
    } else {
      this.result = `${this.value}`;
    }
    if (this.defaultLabelWrapper) {
      // @ts-ignore
      this.defaultLabelWrapper.style.insetInlineStart = `calc(${percentage + 0.3}% + (${10 - percentage * 0.2}px))`;
    }
  }

  /**
   * returns the percentage value.
   */
  calculatePercentage(value: number) {
    return ((value - this.min) * 100) / (this.max - this.min);
  }

  /**
   * returns the code of range slider
   */
  renderRangeSlider() {
    return html`
      ${this.label || this.slotNotEmpty('label') ? html`<slot name="label"><label class="sl-c-slider__label">${this.label}</label></slot>` : html``}
      <div class="sl-c-slider__range-container">
        <slot name="before"> <span class="sl-c-slider-prefix-text">${this.min}</span></slot>
        <div class="sl-c-slider__range">
          <input
            class="sl-c-slider__range-one sl-c-slider__range-input"
            type="range"
            min=${ifDefined(this.min)}
            max=${ifDefined(this.max)}
            @input=${this.lowerSliderOnInput}
            .value=${live(`${this.lowerSliderValue}`)}
            step=${ifDefined(this.step)}
            aria-label="lowerRange"
            ?disabled="${this.isDisabled}"
            @mouseup=${this.toggleZIndexonLowerSlider}
          />
          <span class="sl-c-slider__range-color"></span>
          <input
            class="sl-c-slider__range-two sl-c-slider__range-input"
            type="range"
            min=${ifDefined(this.min)}
            max=${ifDefined(this.max)}
            @input=${(e: Event) => this.upperSliderOnInput(e)}
            .value=${live(`${this.upperSliderValue}`)}
            step=${ifDefined(this.step)}
            ?disabled="${this.isDisabled}"
            aria-label="upperRange"
            @mouseup=${this.toggleZIndexonUppserSlider}
          />
          <div>
            <span class="sl-c-slider__range-one-label-container"><span class="sl-c-slider__range-one-label"> ${this.lowerSliderValue} </span></span>
            <span class="sl-c-slider__range-two-label-container"><span class="sl-c-slider__range-two-label"> ${this.upperSliderValue}</span></span>
          </div>
        </div>
        <slot name="after"> <span class="sl-c-slider-suffix-text">${this.max}</span></slot>
        ${this.hasOutput
          ? html`
              <div>
                <input
                  type="number"
                  min=${ifDefined(this.min)}
                  max=${ifDefined(this.max)}
                  step=${ifDefined(this.step)}
                  .value=${this.outputValueLowerSlider}
                  class="sl-c-slider__output-range-one"
                  @input=${this.syncOutFieldToLowerRange}
                  ?disabled="${this.isDisabled}"
                />
                <div class="sl-c-slider__output-range-one-text">Min</div>
              </div>
            `
          : ''}
        ${this.hasOutput
          ? html`
              <div>
                <input
                  type="number"
                  min=${ifDefined(this.min)}
                  max=${ifDefined(this.max)}
                  step=${ifDefined(this.step)}
                  .value=${this.outputValueUpperSlider}
                  class="sl-c-slider__output-range-two"
                  @input=${this.syncOutFieldToUpperRange}
                  ?disabled="${this.isDisabled}"
                />
                <div class="sl-c-slider__output-range-two-text">Max</div>
              </div>
            `
          : ''}
      </div>
      ${this.fieldNote || this.slotNotEmpty('field-note')
        ? html`
            <slot name="field-note">
              <${this.fieldNoteEl} id=${ifDefined(this.ariaDescribedBy)}> ${this.fieldNote} </${this.fieldNoteEl}>
            </slot>
          `
        : html``}
      ${this.errorNote || this.slotNotEmpty('error')
        ? html`
            <slot name="error">
              <${this.fieldNoteEl} id=${ifDefined(this.ariaDescribedBy)} ?isError=${true}> ${this.errorNote} </${this.fieldNoteEl}>
            </slot>
          `
        : html``}
    `;
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-slider', {
      'sl-c-slider--range': this.behavior === 'range',
      'sl-has-output': this.hasOutput,
      'sl-is-disabled': this.isDisabled,
      'sl-is-error': this.isError,
      'sl-has-hidden-label': this.hideLabel,
      'sl-has-tooltip': this.hasTooltip
    });

    return html`
      <div class="${componentClassNames}">
        ${this.behavior === 'range'
          ? this.renderRangeSlider()
          : html`
              ${this.label || this.slotNotEmpty('label')
                ? html`<slot name="label"><label class="sl-c-slider__label">${this.label}</label></slot>`
                : html``}
              <div class="sl-c-slider__output-container">
                <slot name="before"><span class="sl-c-slider-prefix-text">${this.min}</span></slot>
                <div class="sl-c-slider__tooltip-container">
                  ${this.hasTooltip
                    ? html` <span class="sl-c-slider__tooltip-wrapper"><output class="sl-c-slider__tooltip"> ${this.result} </output></span> `
                    : ''}
                  <input
                    ?disabled="${this.isDisabled}"
                    class="sl-c-slider__input"
                    type="range"
                    min=${ifDefined(this.min)}
                    max=${ifDefined(this.max)}
                    step=${ifDefined(this.step)}
                    .value=${live(`${this.value}`)}
                    @input=${(e: Event) => this.handleDefaulSliderChange(e)}
                    @change=${(e: Event) => this.handleDefaulSliderChange(e)}
                    id="${this.fieldId}"
                    role="slider"
                    aria-label="range"
                    name="range"
                  />
                </div>
                <slot name="after"><span class="sl-c-slider-suffix-text">${this.max}</span></slot>
                ${this.hasOutput
                  ? html`
                      <input
                        min=${ifDefined(this.min)}
                        max=${ifDefined(this.max)}
                        type="number"
                        @input=${this.syncOutFieldToSliderField}
                        step=${ifDefined(this.step)}
                        .value=${this.outputValue}
                        class="sl-c-slider__output"
                        ?disabled="${this.isDisabled}"
                      />
                    `
                  : ''}
              </div>
              ${this.fieldNote || this.slotNotEmpty('field-note')
                ? html`
                    <slot name="field-note">
                      <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} id=${ifDefined(this.ariaDescribedBy)}> ${this.fieldNote} </${this.fieldNoteEl}>
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
            `}
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLSlider.el) === undefined) {
  customElements.define(SLSlider.el, SLSlider);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-slider': SLSlider;
  }
}
