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
 *
 * Toast Group contains one or multiple toasts, and provides positioning and group interactivity.
 * - **slot**: One or more individual toast components
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
   * 3. Watch for the custom event when a toast is dismissed
   * 4. Initializes auto close if there is no panel
   */
  firstUpdated() {
    /* 1 */
    setTimeout(() => {
      this.toasts = this.toastList;
      /* 2 */
      this.setActiveToasts();
      /* 3 */
      this.addEventListener('onToastClose', (e: CustomEvent) => {
        this.handleOnToastClose(e);
      });
    }, 1);

    /* 4 */
    this.handleAutoClose();
  }

  /**
   * Set the active toasts
   * 1. Set the idx on each of the toasts
   * 2. If is active, make all the toasts active by default
   */
  setActiveToasts() {
    this.toasts.forEach((toast, index) => {
      /* 1 */
      toast.idx = index;
      /* 2 */
      if (this.isActive) {
        toast.isActive = true;
      }
    });
  }

  /**
   * Handle a toast closed event
   * 1. Create a new array without the dismissed toast
   * 2. Run setActiveToasts to update the props
   * 3. If there are no open toasts, then hide the toast group
   */
  handleOnToastClose(e: CustomEvent) {
    const closedToastIdx = e.detail.toastIdx;
    /* 1 */
    const updatedToasts = this.toasts.filter((_, index) => index !== closedToastIdx);
    this.toasts = updatedToasts;
    /* 2 */
    this.setActiveToasts();
    /* 3 */
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
      eventName: 'onToastGroupOpen',
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
      eventName: 'onToastGroupClose',
      detailObj: {
        active: this.isActive
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
      'sl-is-active': this.isActive
    });

    return html`
      <div class=${componentClassNames} aria-relevant="additions" role="log" @mouseover=${this.handleMouseOver} @mouseleave=${this.handleMouseLeave}>
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
