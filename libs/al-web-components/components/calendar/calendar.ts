/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  addDays,
  addMonths,
  addYears,
  eachMonthOfInterval,
  endOfMonth,
  endOfYear,
  format,
  getDay,
  getMonth,
  getYear,
  isAfter,
  isBefore,
  isEqual,
  isSameDay,
  isSameMonth,
  setDay,
  setYear,
  startOfDay,
  startOfMonth,
  startOfYear,
  subMonths,
  subYears,
  toDate
} from 'date-fns';
import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { query } from 'lit/decorators/query.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALButton } from '../button/button';
import { ALIconChevronDown } from '../icon/icons/chevron-down';
import { ALIconChevronLeft } from '../icon/icons/chevron-left';
import { ALIconChevronRight } from '../icon/icons/chevron-right';
import styles from './calendar.scss';

/**
 * Component: al-calendar
 * - **slot** "before": If content is slotted, it will override the default "previous button" icon
 * - **slot** "after": If content is slotted, it will override the default "next button" icon
 */
export class ALCalendar extends ALElement {
  static el = 'al-calendar';

  private elementMap = register({
    elements: [
      [ALButton.el, ALButton],
      [ALIconChevronLeft.el, ALIconChevronLeft],
      [ALIconChevronRight.el, ALIconChevronRight],
      [ALIconChevronDown.el, ALIconChevronDown]
    ],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private buttonEl = unsafeStatic(this.elementMap.get(ALButton.el));
  private iconChevronLeftEl = unsafeStatic(this.elementMap.get(ALIconChevronLeft.el));
  private iconChevronRightEl = unsafeStatic(this.elementMap.get(ALIconChevronRight.el));
  private iconChevronDownEl = unsafeStatic(this.elementMap.get(ALIconChevronDown.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Current Month/Year
   */
  @property({ attribute: false })
  accessor currentDate: Date = new Date();

  /**
   * Current Month/Year display in header
   */
  @property({ attribute: false })
  accessor navDate: Date;

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
  accessor multiYear = 3;

  @property()
  accessor previousButtonText: string = 'Previous Month';

  @property()
  accessor nextButtonText: string = 'Next Month';

  /**
   * Container for current days in month
   */
  @property({ type: Array })
  accessor days: Array<any> = [];

  /**
   * Container for years toggle
   */
  @property({ type: Array })
  accessor years: Array<any> = [];

  /**
   * Value to track month picker display
   */
  @property({ type: Boolean })
  accessor showMonthPopup: boolean;

  /**
   * Make active calendar date inactive
   */
  @property({ type: Boolean })
  accessor resetDates: boolean = false;

  /**
   * Selected date
   */
  @property()
  accessor selectedDate: any;

  /**
   * Set a specific date to be active
   */
  @property()
  accessor setActiveDate: any;

  /**
   * Internal ID only for labeling date picker popup
   */
  @property()
  accessor datePickerId: any;

  /**
   * Specify date format for UI display
   */
  @property()
  accessor dateFormat: 'MMM dd, yyyy' | 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'yyyy/MM/dd' | 'MMM dd yyyy' | 'dd MMM yyyy' = 'MMM dd, yyyy';

  /**
   * Specify "full" date format for aria role
   */
  @property()
  accessor fullDateFormat = 'd, EEEE MMMM yyyy';

  /**
   * Disabled attribute
   */
  @property({ type: Boolean })
  accessor disabled: boolean;

  /**
   * Field note icon name
   */
  @property()
  accessor iconName: string;

  /**
   * Show the day of the week as a short hand, e.g. "M" for Monday
   */
  @property({ type: Boolean })
  accessor isDayShortHand: boolean = false;

  /**
   * Start the day of the week on Monday
   */
  @property({ type: Boolean })
  accessor startOnMonday: boolean = false;

  /**
   * Query the calendar month popup
   */
  @query('.al-c-calendar__month-selector-popup')
  accessor calendarMonthPopup: HTMLElement;

  /**
   * Query the month selector button
   */
  @query('.al-c-calendar__month-selector-button')
  accessor calendarMonthButton: HTMLElement;

  /**
   * Initializations
   */
  constructor() {
    super();
    this.updateGrid = this.updateGrid.bind(this);
    this.setGrid = this.setGrid.bind(this);
    this.setNextMonth = this.setNextMonth.bind(this);
    this.setPrevMonth = this.setPrevMonth.bind(this);
    this.toggleMonthPopup = this.toggleMonthPopup.bind(this);
  }

  /**
   * Connected callback lifecycle
   * 1. Use the start of the month for the month navigation
   * 2. If an active date is set, move to that month and day on the calendar
   */
  connectedCallback() {
    super.connectedCallback();
    /* 1 */
    this.navDate = startOfMonth(this.currentDate);
    /* 2 */
    if (this.setActiveDate) {
      const activeDate = new Date(this.setActiveDate);
      this.updateGrid(activeDate);
    }
    this.setGrid();
  }

  /**
   * Set tabindex and focus state on month popup current month
   * 1. If an active month has been selected, put the focus there
   * 2. If no active month has been selected, put the focus on the current month
   */
  updated() {
    setTimeout(() => {
      const currentMonth: HTMLElement = this.calendarMonthPopup.querySelector('.al-is-current');
      const activeMonth: HTMLElement = this.calendarMonthPopup.querySelector('.al-is-active');
      if (activeMonth) {
        /* 1 */
        activeMonth.tabIndex = -1;
        if (this.showMonthPopup === true) {
          activeMonth.tabIndex = 0;
          activeMonth.focus();
        }
      } else if (currentMonth) {
        /* 2 */
        currentMonth.tabIndex = -1;
        if (this.showMonthPopup === true) {
          currentMonth.tabIndex = 0;
          currentMonth.focus();
        }
      }
    }, 1);
  }

  /**
   * Update the calendar grid to the month and year selected
   * 1. Focus back on the month header button after month grid has been updated
   * @param date date timestamp
   */
  updateGrid(date: Date) {
    if (date !== undefined) {
      const yearNumber = getYear(date);
      this.navDate = setYear(date, yearNumber);

      if (this.showMonthPopup === true) {
        this.toggleMonthPopup();
      }
      this.setGrid();

      /* 1 */
      const monthButton = this.shadowRoot.querySelector<HTMLButtonElement>('.al-c-calendar__month-selector-button');
      if (monthButton) {
        monthButton.focus();
      }
    }
  }

  /**
   * Make the calendar days header
   * 1. Set the start of the week
   * 2. Set the pattern for the day of the week
   * 3. Add the day to the array
   * 4. Return the array
   */
  setWeekdaysHeader() {
    const weekdays = [];
    const start = this.startOnMonday ? 1 : 0; /* 1 */
    const pattern = this.isDayShortHand ? 'eeeee' : 'eee'; /* 2 */
    for (let i = 0; i < 7; i++) {
      weekdays.push(format(setDay(new Date(), start + i), pattern)); /* 3 */
    }
    return weekdays; /* 4 */
  }

  /**
   * Navigate previous in sequential month order
   * 1. Go back a month if able to
   * 2. Reset the calendar grid
   */
  setPrevMonth() {
    if (this.canChangeSubNavMonth()) {
      this.navDate = subMonths(this.navDate, 1); /* 1 */
      this.setGrid(); /* 2 */
      return true;
    }
  }

  /**
   * Navigate next in sequential month order
   * 1. Go forward a month if able to
   * 2. Reset the calendar grid
   */
  setNextMonth() {
    if (this.canChangeAddNavMonth()) {
      this.navDate = addMonths(this.navDate, 1); /* 1 */
      this.setGrid(); /* 2 */
      return true;
    }
  }

  /**
   * Validate if month can proceed previous.
   * 1. If the current end of the month date is before the minimum date, return false
   */
  canChangeSubNavMonth() {
    let disabledMinDate = startOfYear(subYears(this.currentDate, this.multiYear));
    if (this.disabledMinDate) {
      disabledMinDate = toDate(new Date(this.disabledMinDate));
    }
    /* 1 */
    if (isBefore(subMonths(endOfMonth(this.navDate), 1), disabledMinDate)) {
      return false;
    }
    return true;
  }

  /**
   * Validate if month can proceed next.
   * 1. If the day is after the maximum date, return false
   */
  canChangeAddNavMonth() {
    let disabledMaxDate = endOfYear(addYears(this.currentDate, this.multiYear));
    if (this.disabledMaxDate) {
      disabledMaxDate = toDate(new Date(this.disabledMaxDate));
    }
    /* 1 */
    if (isAfter(addMonths(this.navDate, 1), disabledMaxDate)) {
      return false;
    }
    return true;
  }

  /**
   * Toggle the month popup overlay
   * 1. Starting Year: Get the current year - this.multiYear years (defaults to 3)
   * 2. Ending Year: Get the current year + this.multiYear years (defaults to 3)
   * 3. Get the years in between
   * 4. Get the months in each year
   * 5. Increment the year
   * 6. Position scroll on year of clicked month
   */
  toggleMonthPopup() {
    this.showMonthPopup = !this.showMonthPopup;
    /* 1 */
    let startYear = subYears(this.currentDate, this.multiYear);
    /* 2 */
    const endYear = addYears(this.currentDate, this.multiYear);
    /* 3 */
    this.years = [];
    while (startYear <= endYear) {
      const year: any = {};
      year.value = startYear;
      this.years.push(year);
      /* 4 */
      year.month = eachMonthOfInterval({
        start: startOfYear(startYear),
        end: endOfYear(startYear)
      });
      /* 5 */
      startYear = addYears(startYear, 1);
    }

    setTimeout(() => {
      /* 6 */
      const monthToggleYear = this.calendarMonthButton.dataset.year;
      this.shadowRoot.querySelector('#al-year-' + monthToggleYear).scrollIntoView({ block: 'nearest' });
    }, 1);
  }

  /**
   * Create days of month grid
   * 1. Add empty days to align the first day of the month with the correct day of the week
   * 2. Add the days of the selected month
   * 3. Add empty days to align the end of the month with the end of the week
   */
  setGrid() {
    setTimeout(() => {
      this.days = [];
      const weekStart = this.startOnMonday ? 1 : 0;
      const selectedMonth = getMonth(this.navDate);
      let currentDate = startOfMonth(this.navDate);
      let firstDayOfMonth = (getDay(currentDate) + 7 - weekStart) % 7;
      let weekDays = [];
      /* 1 */
      while (firstDayOfMonth > 0) {
        weekDays.push({ value: null, available: false });
        firstDayOfMonth--;
      }
      /* 2 */
      while (getMonth(currentDate) === selectedMonth) {
        const day = { value: currentDate, available: true };
        weekDays.push(day);
        currentDate = addDays(currentDate, 1);
      }
      /* 3 */
      while (weekDays.length % 7 !== 0) {
        weekDays.push({ value: null, available: false });
      }
      let counter = 0;
      let i = 0;
      let week = [];
      do {
        week.push(weekDays[i]);
        i++;
        counter++;
        if (counter === 7 || i === weekDays.length) {
          this.days.push(week);
          week = [];
          counter = 0;
        }
      } while (i < weekDays.length);
    }, 1);
  }

  /**
   * Apply active state if day has been selected
   * 1. I'm adding a day because of some date fns bug that sets the date from string a day back
   * 2. If a specific date is set, highlight it
   * @param day selected day
   */
  setActive(day: any) {
    const activeDateString = new Date(this.setActiveDate);
    const activeDate = startOfDay(addDays(toDate(activeDateString), 1)); /* 1 */
    const currentDateInLoop = startOfDay(day.value);
    /* 2 */
    if (day.available && this.selectedDate && this.resetDates === false) {
      return day.value === this.selectedDate;
    } else if (activeDate && isEqual(currentDateInLoop, activeDate)) {
      return true;
    }
  }

  /**
   * Check if day can be selected
   * @param day selected day
   */
  setAvailableDay(day: any): boolean {
    let disabledMinDate = startOfYear(subYears(this.currentDate, this.multiYear));
    if (this.disabledMinDate) {
      disabledMinDate = toDate(new Date(this.disabledMinDate));
      disabledMinDate.setUTCHours(0, 0, 0, 0);
    }
    let disabledMaxDate = endOfYear(addYears(this.currentDate, this.multiYear));
    if (this.disabledMaxDate) {
      disabledMaxDate = toDate(
        Date.UTC(new Date(this.disabledMaxDate).getFullYear(), new Date(this.disabledMaxDate).getMonth(), new Date(this.disabledMaxDate).getDate())
      );
      disabledMaxDate.setUTCHours(0, 0, 0, 0);
    }
    day = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()));
    if (isAfter(disabledMinDate, day) || isBefore(disabledMaxDate, day)) {
      return false;
    }
    return true;
  }

  /**
   * Check if month can be selected
   * @param month selected month
   */
  setAvailableMonth(month: any): boolean {
    let disabledMinDate = startOfYear(subYears(this.currentDate, this.multiYear));
    if (this.disabledMinDate) {
      disabledMinDate = toDate(subMonths(new Date(this.disabledMinDate), 1));
    }
    let disabledMaxDate = endOfYear(addYears(this.currentDate, this.multiYear));
    if (this.disabledMaxDate) {
      disabledMaxDate = toDate(new Date(this.disabledMaxDate));
    }
    if (isAfter(disabledMinDate, month) || isBefore(disabledMaxDate, month)) {
      return false;
    }
    return true;
  }

  /**
   * Check if day in calendar is today and highlight it
   * @param day
   */
  setToday(day: any): boolean {
    if (isSameDay(this.currentDate, day.value)) {
      return true;
    }
    return false;
  }

  /**
   * Select the day and emit
   * 1. Clear date reset
   * 2. Bind to form control
   * @param day selected day
   */
  handleOnClickDay(day: any) {
    /* 1 */
    this.resetDates = false;
    /* 2 */
    if (day.available) {
      this.selectedDate = day.value;
      this.handleOnChange();
    }
  }

  /**
   * Change output binding
   */
  handleOnChange() {
    this.dispatch({
      eventName: 'onCalendarChange',
      detailObj: {
        value: format(this.selectedDate, this.dateFormat),
        rawDate: this.selectedDate
      }
    });

    return format(this.selectedDate, this.dateFormat);
  }

  /**
   * Handle keydown
   * 1. Close the month calendar popup when escape is hit when the user is focused within the popup
   * 2. Return focus back to the month selector button
   */
  handleOnKeydown(e: KeyboardEvent) {
    if (e.code === 'Escape') {
      this.showMonthPopup = false; /* 1 */
      this.calendarMonthButton.tabIndex = 0; /* 2 */
      this.calendarMonthButton.focus();
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-calendar', {});

    return html`
      <div class="${componentClassNames}">
        <nav class="al-c-calendar__header">
          <${this.buttonEl}
            type="button"
            variant="tertiary"
            class="al-c-calendar__nav-btn"
            @click=${() => this.setPrevMonth()}
            ?hideText=${true}
            ?isDisabled="${!this.canChangeSubNavMonth()}"
          >
          ${this.previousButtonText}
          <slot slot="before">
            <${this.iconChevronLeftEl}></${this.iconChevronLeftEl}>
          </slot>
          </${this.buttonEl}>
          <button class="al-c-calendar__month-selector-button" data-year="${format(this.navDate, 'y')}" id="${this.datePickerId}"
          aria-live="polite" @click=${() => this.toggleMonthPopup()}>
            ${format(this.navDate, 'MMMM yyyy')}
            <${this.iconChevronDownEl} class="al-c-calendar__month-selector-button-icon"></${this.iconChevronDownEl}>
          </button>
          <${this.buttonEl}
            type="button"
            variant="tertiary"
            class="al-c-calendar__nav-btn"
            @click=${() => this.setNextMonth()}
            ?hideText=${true}
            ?isDisabled="${!this.canChangeAddNavMonth()}"
          >
            ${this.nextButtonText}
            <slot slot="after">
              <${this.iconChevronRightEl}></${this.iconChevronRightEl}>
            </slot>
          </${this.buttonEl}>
        </nav>

        <div class="al-c-calendar__table-container">
          <table role="presentation" class="al-c-calendar__table">
            <thead class="al-c-calendar__table-header">
              <tr class="al-c-calendar__table-row">
                ${this.setWeekdaysHeader().map((day: any) => {
                  return html` <th abbr="${day}" class="al-c-calendar__header-cell">${day}</th> `;
                })}
              </tr>
            </thead>
            <tbody class="al-c-calendar__table-body">
              ${this.days.map((week: any) => {
                return html`
                  <tr class="al-c-calendar__table-row">
                    ${week.map((day: any) => {
                      return html`
                        <td class="al-c-calendar__table-cell">
                          ${day.value !== null
                            ? html`
                                <button
                                  type="button"
                                  class="al-c-calendar__item
                                  ${this.setActive(day) ? 'al-is-active' : ''}
                                  ${this.setAvailableDay(day.value) ? 'al-is-available' : ''}
                                  ${this.setToday(day) ? 'al-is-today' : ''}"
                                  aria-pressed=${ifDefined(this.setActive(day) ? true : undefined)}
                                  @click=${() => this.handleOnClickDay(day)}
                                  ?disabled=${!this.setAvailableDay(day.value)}
                                  aria-label="${format(day.value, this.fullDateFormat)}"
                                >
                                  ${format(day.value, 'd')}
                                </button>
                              `
                            : ''}
                        </td>
                      `;
                    })}
                  </tr>
                `;
              })}
            </tbody>
          </table>
        </div>

        <div class="al-c-calendar__month-selector-popup" role="dialog" ?hidden="${!this.showMonthPopup}" @keydown=${this.handleOnKeydown}>
          <div class="al-c-month-selector">
            <ul class="al-c-month-selector__list">
              ${this.years.map((year: any) => {
                return html`
                  <li class="al-c-month-selector__item" id="al-year-${format(year.value, 'y')}">
                    <h4 class="al-c-month-selector__year-heading">${format(year.value, 'y')}</h4>
                    <ul class="al-c-month-selector__sub-list">
                      ${year.month.map((month: any) => {
                        return html`
                          <li class="al-c-month-selector__sub-item">
                            <button
                              class="al-c-month-selector__button
                              ${isSameMonth(month, this.currentDate) ? 'al-is-current' : ''}
                              ${isEqual(startOfMonth(startOfDay(this.navDate)), startOfMonth(startOfDay(month))) ? 'al-is-active' : ''}"
                              ?disabled=${!this.setAvailableMonth(month)}
                              @click=${() => this.updateGrid(month)}
                              aria-label="${format(month, 'MMMM, y')}"
                            >
                              <abbr title="${format(month, 'MMMM')}">${format(month, 'MMM')}</abbr>
                            </button>
                          </li>
                        `;
                      })}
                    </ul>
                  </li>
                `;
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALCalendar.el) === undefined) {
  customElements.define(ALCalendar.el, ALCalendar);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-calendar': ALCalendar;
  }
}
