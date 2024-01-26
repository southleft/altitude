import { TemplateResult, unsafeCSS } from 'lit';
import { property, query, queryAssignedElements, state } from 'lit/decorators.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLButton } from '../button/button';
import { SLIconChevronLeft } from '../icon/icons/chevron-left';
import { SLIconChevronRight } from '../icon/icons/chevron-right';
import { SLToast } from '../toast/toast';
import styles from './toast-group.scss';

/**
 * Component: sl-toast-group
 * - Toast Group contains one or multiple toasts, and provides positioning and group interactivity.
 * @slot - Individual Toast components
 */
export class SLToastGroup extends SLElement {
  static el = 'sl-toast-group';

  private elementMap = register({
    elements: [
      [SLButton.el, SLButton],
      [SLIconChevronLeft.el, SLIconChevronLeft],
      [SLIconChevronRight.el, SLIconChevronRight]
    ],
    suffix: (globalThis as any).enAutoRegistry === true ? '' : PackageJson.version
  });

  private buttonEl = unsafeStatic(this.elementMap.get(SLButton.el));
  private iconChevronLeftEl = unsafeStatic(this.elementMap.get(SLIconChevronLeft.el));
  private iconChevronRightEl = unsafeStatic(this.elementMap.get(SLIconChevronRight.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Position property
   * - **default** Displays the toast group where ever it's placed on the page
   * - **top** Displays the toast group absolutely at the top center of the screen
   * - **bottom** Displays the toast group absolutely at the top center of the screen
   */
  @property()
  accessor position: 'top' | 'bottom';

  /**
   * Is active?
   * - **true** Displays the toast group on the screen
   * - **false** Hides the toast group on the screen
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   * Is a group?
   * - **true** Displays the toasts stacked on top of one another
   * - **false** Displays the toasts stacked vertically
   */
  @property({ type: Boolean })
  accessor isGroup: boolean;

  /**
   * Has controls?
   * - **true** Shows controls to scroll through the active toasts
   * - **false** Hides controls to scroll through the active toasts
   */
  @property({ type: Boolean })
  accessor hasControls: boolean;

  /**
   * Auto close?
   * - Set whether you want the toast group to auto close. Adjust the autoCloseDelay if you want longer than 3 seconds
   */
  @property({ type: Boolean })
  accessor autoClose: boolean;

  /**
   * Delay property
   * 1. Number of seconds to close the toast group when autoClose is enabled
   * 2. Default amount is 3
   */
  @property({ type: Number })
  accessor autoCloseDelay: number = 3; /* 2 */

  /**
   * activeToastIdx state
   * - The index of the toast that is currently active in the toast group
   */
  @state()
  accessor activeToastIdx: number = 0;

  /**
   * prevActiveIdx state
   * - Tracks the previously active toast to update the group when controls are used
   */
  @state()
  accessor prevActiveIdx: number = 0;

  /**
   * Visible toasts
   * - Tracks the number of toasts visible
   */
  @state()
  accessor toastsVisible: number = 0;

  /**
   * Active toasts
   * - Tracks the number of toasts active
   */
  @state()
  accessor toastsActive: number = 0;

  /**
   * Query the control prev button
   */
  @query('.sl-c-toast-group__control--prev')
  accessor controlPrev: SLButton;

  /**
   * Query the control next button
   */
  @query('.sl-c-toast-group__control--next')
  accessor controlNext: SLButton;

  /**
   * Use queryAssignedElements to populate the toastList
   */
  @queryAssignedElements({ flatten: true })
  accessor toastList: Array<SLToast>;

  /**
   * Create an array to store the list of toasts
   */
  private toasts: Array<SLToast> = [];

  /**
   * Internal property store setTimeout() method so that we can clear timer later
   */
  private _timer: ReturnType<typeof setTimeout>;

  /**
   * First updated lifecycle
   * 1. Use timeout to allow for slotted items to load in the DOM
   * 2. Set the active toasts based on their conditions
   * 3. Set the open toast to the number of slotted toasts
   * 4. Watch for the custom event when a toast is dismissed
   * 5. Initializes auto close if there is no panel
   */
  firstUpdated() {
    /* 1 */
    setTimeout(() => {
      this.toasts = this.toastList;
      /* 2 */
      this.setActiveToasts();
      /* 3 */
      this.toastsVisible = this.toasts.length;
      /* 4 */
      this.addEventListener('closeToast', (e: CustomEvent) => {
        this.handleToastClosed(e);
      });
    }, 1);

    /* 5 */
    this.handleAutoClose();
  }

  /**
   * Set the active toasts
   * 1. Set the idx on each of the toasts
   * 2. If is active, but not a group, make all the toasts active by default
   * 3. If is a group and does not have controls, then make all the toasts dismissible
   * 4. If if a group and has controls, set hasControls on all the toasts to true
   * 5. If is a group, then only set the first item to active
   * 6. Check if any toast has isDismissible as true
   * 7. If any toast has isDismissible as true, set it to true for all toasts
   */
  setActiveToasts() {
    this.toasts.forEach((toast, index) => {
      /* 1 */
      toast.idx = index;
      /* 2 */
      if (this.isActive && !this.isGroup) {
        toast.isActive = true;
      }
      /* 3 */
      if (this.isGroup && !this.hasControls) {
        toast.isDismissible = true;
      }
      /* 4 */
      if (this.isGroup && this.hasControls) {
        toast.hasControls = true;
      }
      /* 5 */
      if (this.isGroup && index === this.activeToastIdx) {
        toast.isActive = true;
      }
    });
    if (this.isGroup) {
      /* 6 */
      const hasIsDismissible = this.toasts.some((toast) => toast.isDismissible);
      /* 7 */
      if (hasIsDismissible) {
        this.toasts.forEach((toast) => {
          toast.isDismissible = true;
        });
      }
    }
  }

  /**
   * Handle a toast closed event
   * 1. Create a new array without the dismissed toast
   * 2. Update the active toast index if it was the last toast that was closed
   * 3. Update the visible and active toast counts
   * 4. Run setActiveToasts to update the props
   * 5. If there is only one toast left, then disabled the controls
   * 6. If there are no open toasts, then hide the toast group
   */
  handleToastClosed(e: CustomEvent) {
    const closedToastIdx = e.detail.toastIdx;
    /* 1 */
    const updatedToasts = this.toasts.filter((_, index) => index !== closedToastIdx);
    this.toasts = updatedToasts;
    /* 2 */
    if (closedToastIdx === this.activeToastIdx) {
      this.activeToastIdx = Math.max(0, this.activeToastIdx - 1);
    }
    /* 3 */
    this.toastsVisible = this.toasts.length;
    this.toastsActive = this.activeToastIdx;
    /* 4 */
    this.setActiveToasts();
    /* 5 */
    if (this.hasControls && this.toasts.length === 1) {
      this.hasControls = false;
      this.toasts[this.activeToastIdx].hasControls = false;
    }
    /* 6 */
    if (this.toasts.length === 0) {
      this.isActive = false;
    }
  }

  /**
   * Open toast group
   * 1. Set active to true to show the toasts
   * 2. Dispatch a custom event on open of the toast group
   */
  public open() {
    /* 1 */
    this.isActive = true;

    /* 2 */
    this.dispatch({
      eventName: 'open',
      detailObj: {
        active: this.isActive
      }
    });
  }

  /**
   * Close toast group
   * 1. Set active to true to show the toasts
   * 2. Dispatch a custom event on close of the toast group
   */
  public close() {
    /*  */
    this.isActive = false;

    /* 2 */
    this.dispatch({
      eventName: 'close',
      detailObj: {
        active: this.isActive
      }
    });
  }

  /**
   * Update Active Toast
   * 1. Set the previously active toast's isActive property to false
   * 2. Set the next active toasts's isActive property to true
   */
  updateActiveToast() {
    this.toasts[this.prevActiveIdx].isActive = false; /* 1 */
    this.toasts[this.activeToastIdx].isActive = true; /* 2 */
  }

  /**
   * Handle on click of the previous control
   * 1. If the active toast is not the first in the group...
   * 2. Set the previous toast in the group to active
   * 3. Set active controls
   */
  handlePrev() {
    /* 1 */
    if (this.activeToastIdx > 0) {
      /* 2 */
      this.prevActiveIdx = this.activeToastIdx;
      this.activeToastIdx = this.activeToastIdx - 1;
      this.toastsActive = this.prevActiveIdx - 1;
      this.updateActiveToast();
      this.controlNext.isDisabled = false;
    }
    /* 3 */
    if (this.activeToastIdx === 0) {
      this.controlPrev.isDisabled = true;
    }
    /* 4 */
    this.dispatch({
      eventName: 'prev',
      detailObj: {
        activeToastIdx: this.activeToastIdx
      }
    });
  }

  /**
   * Handle on click of the next control
   * 1. If the active toast is not the last in the group...
   * 2. Set the next toast in the group to active
   * 3. Set active controls
   */
  handleNext() {
    /* 1 */
    if (this.activeToastIdx <= this.toasts.length - 2) {
      /* 2 */
      this.prevActiveIdx = this.activeToastIdx;
      this.activeToastIdx = this.prevActiveIdx + 1;
      this.toastsActive = this.prevActiveIdx + 1;
      this.updateActiveToast();
      this.controlPrev.isDisabled = false;
    }
    /* 3 */
    if (this.activeToastIdx === this.toasts.length - 1) {
      this.controlNext.isDisabled = true;
    }
    /* 4 */
    this.dispatch({
      eventName: 'next',
      detailObj: {
        activeToastIdx: this.activeToastIdx
      }
    });
  }

  /**
   * Mouseover event
   * 1. On mouseover of the toast group, clear the timer to pause auto close
   */
  handleMouseOver() {
    if (this.autoClose) {
      clearTimeout(this._timer); /* 1 */
    }
  }

  /**
   * Mouseleave event
   * 1. Resume auto close with a new timeout
   */
  handleMouseLeave() {
    this.handleAutoClose(); /* 1 */
  }

  /**
   * Auto close
   * 1. Automatically close the toast group after delay time
   */
  handleAutoClose() {
    if (this.autoClose) {
      this._timer = setTimeout(() => {
        this.close();
        clearTimeout(this._timer);
      }, this.autoCloseDelay * 1000);
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-toast-group', {
      'sl-c-toast-group--position-top': this.position === 'top',
      'sl-c-toast-group--position-bottom': this.position === 'bottom',
      'sl-is-active': this.isActive,
      'sl-is-group': this.isGroup,
      'sl-has-controls': this.hasControls
    });

    return html`
      <div class=${componentClassNames} aria-relevant="additions" role="log" @mouseover=${this.handleMouseOver} @mouseleave=${this.handleMouseLeave}>
        ${this.isGroup && this.hasControls
          ? html`
              <div class="sl-c-toast-group__controls">
                <${this.buttonEl}
                  @click=${this.handlePrev}
                  class="sl-c-toast-group__control sl-c-toast-group__control--prev"
                  ?isDisabled=${true}
                  ?hideText=${true}
                  variant="tertiary"
                >
                  Previous
                  <${this.iconChevronLeftEl} slot="before"></${this.iconChevronLeftEl}>
                </${this.buttonEl}>
                ${this.toastsActive + 1}<span class="sl-c-toast-group__controls-divider">/</span>${this.toasts.length}
                <${this.buttonEl}
                  @click=${this.handleNext}
                  class="sl-c-toast-group__control sl-c-toast-group__control--next"
                  ?hideText=${true}
                  variant="tertiary"
                >
                  Next
                  <${this.iconChevronRightEl} slot="before"></${this.iconChevronRightEl}>
                </${this.buttonEl}>
              </div>
            `
          : html``}
        <slot></slot>
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLToastGroup.el) === undefined) {
  customElements.define(SLToastGroup.el, SLToastGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-toast-group': SLToastGroup;
  }
}
