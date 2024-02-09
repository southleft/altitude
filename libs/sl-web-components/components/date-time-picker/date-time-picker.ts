import { format } from 'date-fns';
import { TemplateResult, unsafeCSS } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLButtonGroup } from '../button-group/button-group';
import { SLButton } from '../button/button';
import { SLCalendar } from '../calendar/calendar';
import { SLFieldNote } from '../field-note/field-note';
import { SLIconCalendar } from '../icon/icons/calendar';
import { SLIconChevronDown } from '../icon/icons/chevron-down';
import { SLInput } from '../input/input';
import { SLTimeSelectorList } from '../time-selector-list/time-selector-list';
import styles from './date-time-picker.scss';

/**
 * Component: sl-date-time-picker
 *
 * Date Time Picker allows the user to select a date and time.
 * - **slot** "field-note": If content is slotted, it will display in place of the fieldNote property
 * - **slot** "error": If content is slotted, it will display in place of the errorNote property
 */
export class SLDateTimePicker extends SLElement {
  static el = 'sl-date-time-picker';

  private elementMap = register({
    elements: [
      [SLInput.el, SLInput],
      [SLFieldNote.el, SLFieldNote],
      [SLCalendar.el, SLCalendar],
      [SLIconCalendar.el, SLIconCalendar],
      [SLIconChevronDown.el, SLIconChevronDown],
      [SLTimeSelectorList.el, SLTimeSelectorList],
      [SLButtonGroup.el, SLButtonGroup],
      [SLButton.el, SLButton]
    ],
    suffix: (globalThis as any).enAutoRegistry === true ? '' : PackageJson.version
  });

  private inputEl = unsafeStatic(this.elementMap.get(SLInput.el));
  private fieldNoteEl = unsafeStatic(this.elementMap.get(SLFieldNote.el));
  private calendarEl = unsafeStatic(this.elementMap.get(SLCalendar.el));
  private iconCalendarEl = unsafeStatic(this.elementMap.get(SLIconCalendar.el));
  private iconChevronDownEl = unsafeStatic(this.elementMap.get(SLIconChevronDown.el));
  private timeSelectorListEl = unsafeStatic(this.elementMap.get(SLTimeSelectorList.el));
  private buttonGroupEl = unsafeStatic(this.elementMap.get(SLButtonGroup.el));
  private buttonEl = unsafeStatic(this.elementMap.get(SLButton.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * The unique id of the field
   */
  @property()
  accessor fieldId: string;

  /**
   * The field's label
   */
  @property()
  accessor label: string = 'Date and Time';

  /**
   * Hide label?
   */
  @property({ type: Boolean })
  accessor hideLabel: boolean;

  /**
   * The field's name attribute
   */
  @property()
  accessor name: string;

  /**
   * The field's value attribute
   */
  @property()
  accessor value: string;

  /**
   * Placeholder attribute
   * - Specifies a short hint that describes the expected value of an <input> element
   */
  @property()
  accessor placeholder: string;

  /**
   * The field note displayed beneath the field
   */
  @property()
  accessor fieldNote: string;

  /**
   * Error note displayed beneath the field when in an error state
   */
  @property()
  accessor errorNote: string;

  /**
   * Aria describedby
   * - Used to connect the field note in the field to the input for accessibility
   */
  @property()
  accessor ariaDescribedBy: string;

  /**
   * The field's required attribute
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
   * The field's disabled attribute
   */
  @property({ type: Boolean })
  accessor isDisabled: boolean;

  /**
   * Error state indicating an issue with the field
   */
  @property({ type: Boolean })
  accessor isError: boolean;

  /**
   * Indicates whether a date has been selected
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   * Tracks the display state of the date time picker
   */
  @state()
  accessor isActiveCalendar: boolean;

  /**
   * Holds the selected date value
   */
  @property()
  accessor selectedDate: any;

  /**
   * Selected time
   */
  @state()
  accessor selectedTime: any;

  /**
   * Set a specific date to be active
   */
  @property()
  accessor setActiveDate: any;

  /**
   * Set a specific time to be active (24 hour format, e.g., setActiveTime="16:00" for 4PM)
   */
  @property()
  accessor setActiveTime: any;

  /**
   * The field's raw date value
   */
  @state()
  accessor rawDateValue: any;

  /**
   * Saved input date value in date format
   */
  @state()
  accessor originalRawValue: any;

  /**
   * Saved input datetime value
   */
  @state()
  accessor originalValue: any;

  /**
   * Saved time selection
   */
  @state()
  accessor originalTime: any;

  /**
   * ISO Format for date
   */
  @property()
  accessor isoFormat: string = 'yyyy-MM-dd';

  /**
   * Specify date format for UI display
   */
  @property()
  accessor dateFormat: 'MMM dd, yyyy' | 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'yyyy/MM/dd' | 'MMM dd yyyy' | 'dd MMM yyyy' = 'MMM dd, yyyy';

  /**
   * Minimum date for disabled dates (format: yyyy/mm/dd)
   */
  @property()
  accessor disabledMinDate: any;

  /**
   * Maximum date for disabled dates (format: yyyy/mm/dd)
   */
  @property()
  accessor disabledMaxDate: any;

  /**
   * Amount of years to go before and after the current date
   */
  @property({ type: Number })
  accessor multiYear: number = 3;

  /**
   * Previous month button text
   */
  @property()
  accessor previousButtonText: string = 'Previous Month';

  /**
   * Next month button text
   */
  @property()
  accessor nextButtonText: string = 'Next Month';

  /**
   * Show the day of the week as a short hand, e.g. "M" for Monday
   */
  @property({ type: Boolean })
  accessor isDayShortHand: boolean;

  /**
   * Start the day of the week on Monday
   */
  @property({ type: Boolean })
  accessor startOnMonday: boolean;

  /**
   * If the window is a small screen
   */
  @state()
  accessor isSmallScreen: boolean;

  /**
   * Check to see if the date selections have been cancelled
   */
  @state()
  accessor isCancelled: boolean;

  /**
   * Use 24 hour time format
   */
  @property({ type: Boolean })
  accessor is24HourFormat: boolean;

  /**
   * Increments of time
   */
  @property({ type: Number })
  accessor timeIncrements: number = 30;

  /**
   * Minimum time for between times display (24 hour format, e.g., timeStart=${16} for 4PM)
   */
  @property({ type: Number })
  accessor timeStart: number;

  /**
   * Maximum time for between times display (24 hour format, e.g., timeEnd=${16} for 4PM)
   */
  @property({ type: Number })
  accessor timeEnd: number;

  /**
   * Time selector heading label
   */
  @property()
  accessor timeSelectorLabel: string = 'Time';

  /**
   * Cancel button label
   */
  @property()
  accessor cancelLabel: string = 'Cancel';

  /**
   * Submit button label
   */
  @property()
  accessor submitLabel: string = 'Apply';

  /**
   * The submit button's attribute
   */
  @state()
  accessor disabledSubmit: boolean = true;

  /**
   * Query the popup
   */
  @query('.sl-c-date-time-picker__popup')
  accessor popup: HTMLElement;

  /**
   * Query the time selector
   */
  @query('.sl-c-date-time-picker__time-selector-list')
  accessor timeSelectorList: SLTimeSelectorList;

  /**
   * Query the input
   */
  @query('.sl-c-date-time-picker__input')
  accessor input: SLInput;

  /**
   * Initializations
   * 1. Binds the 'handleOnClickOutside' method to the component instance
   */
  constructor() {
    super();
    this.handleOnClickOutside = this.handleOnClickOutside.bind(this); /* 1 */
  }

  /**
   * Connected callback
   * 1. Attaches a mousedown event listener for handling clicks outside the component
   * 2. Attaches a window resize event listener
   * 3. Dynamically sets 'fieldId' and 'ariaDescribedBy' attributes for Accessibility
   */
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('mousedown', this.handleOnClickOutside, false); /* 1 */
    window.addEventListener('resize', this.handleOnResize); /* 2 */
    /* 3 */
    this.fieldId = this.fieldId || nanoid();
    if (this.fieldNote) {
      this.ariaDescribedBy = this.ariaDescribedBy || nanoid();
    }
  }

  /**
   * Disconnected callback
   * 1. Removes event listeners for handling clicks outside and window resize
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    /* 1 */
    document.removeEventListener('mousedown', this.handleOnClickOutside, false);
    window.removeEventListener('resize', this.handleOnResize);
  }

  /**
   * Disconnected callback
   * 1. Removes event listeners for handling clicks outside and window resize
   */
  firstUpdated() {
    this.handleOnResize();
  }

  /**
   * Toggle active calendar
   * 1. Checks if the component is disabled; if not, toggles the calendar's display
   * 2. Toggles the calendar display
   * 3. Sets dynamic position for the calendar
   * 4. Clears the cancelled state
   * 5. Dispatches custom events 'open' or 'close' based on the calendar state
   */
  toggleActiveCalendar() {
    /* 1 */
    if (!this.isDisabled) {
      this.isActiveCalendar = !this.isActiveCalendar; /* 2 */
      this.setDynamicPosition(); /* 3 */
      this.isCancelled = false; /* 4 */
    }

    /* 5 */
    if (this.isActiveCalendar) {
      this.dispatch({
        eventName: 'onDateTimePickerOpen',
        detailObj: {
          activeCalendar: this.isActiveCalendar
        }
      });
    } else {
      this.dispatch({
        eventName: 'onDateTimePickerClose',
        detailObj: {
          activeCalendar: this.isActiveCalendar
        }
      });
    }
  }

  /**
   * Handle on input keydown
   * 1. Toggles the calendar open/close if 'Enter' or 'Spacebar' is pressed
   */
  handleOnKeydown(e: KeyboardEvent) {
    /* 1 */
    if (e.code === 'Enter' || e.code === 'Space') {
      this.toggleActiveCalendar();
    }
  }

  /**
   * Handles the click event outside the component:
   * 1. Check if the calendar is active
   * 2. Determine if the click occurred inside the active field
   * 3. Check if the click occurred outside the active field
   * 4. Close the calendar if the click occurred outside it
   */
  handleOnClickOutside(e: MouseEvent) {
    /* 1 */
    if (this.isActiveCalendar) {
      const didClickInside = e.composedPath().includes(this.shadowRoot.host); /* 2 */
      /* 3 */
      if (!didClickInside) {
        /* 4 */
        this.toggleActiveCalendar();
      }
    }
  }

  /**
   * Handle dynamic placement for calendar popup
   * 1. Sets timeout for dynamic positioning of the calendar
   * 2. Adjusts the calendar position based on window and body dimensions
   * 3. Opens the calendar at the top if it's too close to the bottom
   */
  setDynamicPosition() {
    /* 1 */
    setTimeout(() => {
      if (this.popup) {
        /* 2 */
        this.popup.classList.remove('sl-c-date-time-picker__popup--top');
        const body = this.closest('#root-inner') || document.querySelector('body');
        const bodyRect = body.getBoundingClientRect();
        const calendarPopup = this.popup.getBoundingClientRect();

        /* 3 */
        if (bodyRect.height > calendarPopup.height && calendarPopup.bottom > bodyRect.height) {
          this.popup.classList.add('sl-c-date-time-picker__popup--top');
        }
      }
    }, 1);
  }

  /**
   * Handle on change of the date
   * 1. Updates 'selectedDate' and 'rawDateValue' based on the event detail
   * 2. Updates 'value' based on the selected date and time (if available)
   * 3. Sets 'disabledSubmit' to false if a time is selected
   * 4. Sets 'value' to the selected date if no time is selected
   * 5. Sets 'isActive' to true
   * 6. Focuses on the first time selector button
   * 7. Dispatches a 'dateChanged' event with the updated value
   */
  handleOnChangeDate(e: CustomEvent) {
    this.selectedDate = e.detail.value; /* 1 */
    this.rawDateValue = e.detail.rawDate; /* 2 */
    /* 3 */
    if (this.selectedTime) {
      this.value = this.selectedDate + ' ' + this.selectedTime;
      this.disabledSubmit = false;
    } else {
      this.value = this.selectedDate; /* 4 */
    }
    this.isActive = true; /* 5 */
    this.timeSelectorList.shadowRoot.querySelector<HTMLButtonElement>('.sl-c-time-selector-list__item:first-child button').focus(); /* 6 */
    /* 7 */
    this.dispatch({
      eventName: 'onDateTimePickerDateChange',
      detailObj: {
        value: this.value
      }
    });
  }

  /**
   * Handle on change of the time
   * 1. Updates 'selectedTime' based on the event detail
   * 2. Updates 'value' based on the selected date and time (if available)
   * 3. Focuses on the submit button after a slight delay
   * 4. Sets 'value' to the selected time if no date is selected
   * 5. Sets 'isActive' to true
   * 6. Dispatches a 'timeChanged' event with the updated value
   */
  handleOnChangeTime(e: CustomEvent) {
    this.selectedTime = e.detail.value; /* 1 */
    /* 2 */
    if (this.selectedDate) {
      this.value = this.selectedDate + ' ' + this.selectedTime;
      this.disabledSubmit = false;
      /* 3 */
      setTimeout(() => {
        this.shadowRoot.querySelector('.sl-c-date-time-picker__footer-submit').shadowRoot.querySelector<HTMLButtonElement>('button').focus();
      }, 1);
    } else {
      this.value = this.selectedTime; /* 4 */
    }
    this.isActive = true; /* 5 */
    /* 6 */
    this.dispatch({
      eventName: 'onDateTimePickerTimeChange',
      detailObj: {
        value: this.value
      }
    });
  }

  /**
   * Close date time picker when cancel button is clicked
   * 1. Toggles the active calendar state
   * 2. Focuses back on the input field
   * 3. Resets values if original values exist
   * 4. Converts a 12-hour time string to a 24-hour format
   * 5. Clears the cancelled state
   */
  handleOnClickCancel() {
    this.toggleActiveCalendar(); /* 1 */
    /* 2 */
    const inputField = this.input?.shadowRoot?.querySelector('input');
    if (inputField) {
      inputField.focus();
    }
    /* 3 */
    if (this.originalValue && this.originalTime) {
      this.value = this.originalValue;
      this.rawDateValue = this.originalRawValue;
      this.setActiveDate = format(this.rawDateValue, this.isoFormat);
      /* 4 */
      const convertTime = (timeStr: any) => {
        const [time, modifier] = timeStr.split(' ');
        // eslint-disable-next-line prefer-const
        let [hours, minutes] = time.split(':');
        if (hours === '12' && modifier === 'AM') {
          hours = '00';
        }
        if (modifier === 'PM') {
          hours = parseInt(hours, 10) + 12;
        }
        return `${hours}:${minutes}`;
      };
      /* 5 */
      this.setActiveTime = convertTime(this.originalTime);
    } else {
      this.value = this.value; /* 6 */
    }
    /* 7 */
    this.isCancelled = true;
  }

  /**
   * Apply the values and close date time picker
   * 1. If not disabled, toggles the active calendar state
   * 2. Focuses back on the input field
   * 3. Clears the cancelled state
   * 4. Saves the current values as original if a value exists and the picker wasn't cancelled
   * 5. If the picker is cancelled and a value is present, reverts to the original value
   */
  handleOnClickSubmit() {
    /* 1 */
    if (!this.disabledSubmit) {
      this.toggleActiveCalendar(); /* 2 */
      /* 3 */
      const inputField = this.input?.shadowRoot?.querySelector('input');
      if (inputField) {
        inputField.focus();
      }
      /* 4 */
      this.isCancelled = false;
      /* 5 */
      if (this.value) {
        this.originalValue = this.value;
        this.originalRawValue = this.rawDateValue;
        this.originalTime = this.selectedTime;
      }
    }
  }

  /**
   * Handle on resize of the screen
   * 1. Sets 'isSmallScreen' based on window width (< 480)
   * 2. If the window width is not small (greater than or equal to 480 pixels), reset 'isSmallScreen' to false.
   */
  handleOnResize() {
    /* 1 */
    if (window.innerWidth < 480) {
      this.isSmallScreen = true;
    } else {
      this.isSmallScreen = false; /* 2 */
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-date-time-picker', {
      'sl-has-hidden-label': this.hideLabel,
      'sl-is-disabled': this.isDisabled,
      'sl-is-required': this.isRequired,
      'sl-is-error': this.isError,
      'sl-is-active-calendar': this.isActiveCalendar,
      'sl-is-active': this.isActive,
      'sl-c-date-time-picker--small-screen': this.isSmallScreen
    });

    return html`
      <div class="${componentClassNames}">
        <div class="sl-c-date-time-picker__body">
          <${this.inputEl}
            class="sl-c-date-time-picker__input"
            label="${this.label}"
            id="${this.fieldId}"
            name="${ifDefined(this.name)}"
            value="${ifDefined(this.value)}"
            ?hideLabel="${this.hideLabel}"
            ?isReadonly=${true}
            ?isRequired="${this.isRequired}"
            ?isOptional="${this.isOptional}"
            ?isDisabled="${this.isDisabled}"
            ?isError="${this.isError}"
            aria-describedby="${ifDefined(this.ariaDescribedBy)}"
            placeholder="${ifDefined(this.placeholder)}"
            @click=${this.toggleActiveCalendar}
            @keydown=${this.handleOnKeydown}
            ref="inputField"
            ?isActive="${this.isActive}"
          >
            <${this.iconCalendarEl} slot="before"></${this.iconCalendarEl}>
            <${this.iconChevronDownEl} size="lg" slot="after" class="sl-c-date-time-picker__icon-arrow"></${this.iconChevronDownEl}>
          </${this.inputEl}>
          <div class="sl-c-date-time-picker__popup" ?hidden="${!this.isActiveCalendar}" role="dialog">
            <div class="sl-c-date-time-picker__popup-body">
              <div class="sl-c-date-time-picker__calendar-container">
                <${this.calendarEl}
                  class="sl-c-date-time-picker__calendar"
                  @onCalendarChange=${this.handleOnChangeDate}
                  resetDates="${this.isCancelled}"
                  .setActiveDate=${this.setActiveDate}
                  .disabledMinDate=${this.disabledMinDate}
                  .disabledMaxDate=${this.disabledMaxDate}
                  .multiYear=${this.multiYear}
                  .previousButtonText=${this.previousButtonText}
                  .nextButtonText=${this.nextButtonText}
                  .dateFormat=${this.dateFormat}
                  ?isDayShortHand=${this.isDayShortHand}
                  ?startOnMonday=${this.startOnMonday}
                ></${this.calendarEl}>
                <${this.timeSelectorListEl}
                  class="sl-c-date-time-picker__time-selector-list"
                  @onTimeSelectorListChange=${this.handleOnChangeTime}
                  orientation=${this.isSmallScreen ? 'horizontal' : false}
                  resetTime="${this.isCancelled}"
                  .setActiveTime=${this.setActiveTime}
                  .is24HourFormat=${this.is24HourFormat}
                  .timeIncrements=${this.timeIncrements}
                  .timeStart=${this.timeStart}
                  .timeEnd=${this.timeEnd}
                  .timeSelectorLabel=${this.timeSelectorLabel}
                ></${this.timeSelectorListEl}>
              </div>
              <div class="sl-c-date-time-picker__footer">
                <${this.buttonGroupEl} alignment="right">
                  <${this.buttonEl}
                    class="sl-c-date-time-picker__footer-cancel"
                    variant="secondary"
                    @click=${this.handleOnClickCancel}
                    >${this.cancelLabel}</${this.buttonEl}>
                  <${this.buttonEl}
                    class="sl-c-date-time-picker__footer-submit"
                    @click=${this.handleOnClickSubmit}
                    ?isDisabled="${this.disabledSubmit}"
                    >${this.submitLabel}</${this.buttonEl}>
                </${this.buttonGroupEl}>
              </div>
            </div>
          </div>
        </div>
        ${
          this.fieldNote || this.slotNotEmpty('field-note')
            ? html`
          <slot name="field-note">
            <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} id=${ifDefined(this.ariaDescribedBy)}>${this.fieldNote}</${this.fieldNoteEl}>
          </slot>
        `
            : html``
        }
        ${
          (this.errorNote || this.slotNotEmpty('error')) && this.isError
            ? html`
          <slot name="error">
            <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} ?isError=${true}>${this.errorNote}</${this.fieldNoteEl}>
          </slot>
        `
            : html``
        }
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLDateTimePicker.el) === undefined) {
  customElements.define(SLDateTimePicker.el, SLDateTimePicker);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-date-time-picker': SLDateTimePicker;
  }
}
