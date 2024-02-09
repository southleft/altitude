import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLIconCheck } from '../icon/icons/check';
import { SLIconInfo } from '../icon/icons/info';
import { SLIconWarningCircle } from '../icon/icons/warning-circle';
import { SLIconWarningTriangle } from '../icon/icons/warning-triangle';
import { SLIconClose } from '../icon/icons/close';
import { SLButton } from '../button/button';
import styles from './alert.scss';

/**
 * Component: sl-alert
 *
 * Alert displays a short important message that will attract a user's attention without interrupting the user's task.
 * - **slot**: The alert's main content or title
 * - **slot** "icon": Slot in an icon to override the default one
 * */
export class SLAlert extends SLElement {
  static el = 'sl-alert';

  private elementMap = register({
    elements: [
      [SLIconCheck.el, SLIconCheck],
      [SLIconInfo.el, SLIconInfo],
      [SLIconWarningCircle.el, SLIconWarningCircle],
      [SLIconWarningTriangle.el, SLIconWarningTriangle],
      [SLIconClose.el, SLIconClose],
      [SLButton.el, SLButton]
    ],
    suffix: (globalThis as any).enAutoRegistry === true ? '' : PackageJson.version
  });

  private iconDoneEl = unsafeStatic(this.elementMap.get(SLIconCheck.el));
  private iconInfoEl = unsafeStatic(this.elementMap.get(SLIconInfo.el));
  private iconWarningEl = unsafeStatic(this.elementMap.get(SLIconWarningCircle.el));
  private iconWarningTriangleEl = unsafeStatic(this.elementMap.get(SLIconWarningTriangle.el));
  private iconCloseEl = unsafeStatic(this.elementMap.get(SLIconClose.el));
  private buttonEl = unsafeStatic(this.elementMap.get(SLButton.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Variants
   * - **default** renders a alert that represents an informative state
   * - **success** renders a alert that represents a success state
   * - **warning** renders a alert that represents a warning state
   * - **danger** renders a alert that represents an danger state
   */
  @property()
  accessor variant: 'success' | 'warning' | 'danger';

  /**
   * Optional title of the alert
   */
  @property()
  accessor title: string;

  /**
   * isActive boolean
   * - If true, the alert displays on the page
   * - If false, the alert is hidden from the page
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   * Auto close?
   * - Set whether you want the alert to auto close. Adjust the autoCloseDelay if you want longer than 3 seconds
   */
  @property({ type: Boolean })
  accessor autoClose: boolean = false;

  /**
   * Auto close delay
   * 1. Number of seconds to close the alert when autoClose is enabled
   * 2. Default amount is 3
   */
  @property({ type: Number })
  accessor autoCloseDelay: number = 3; /* 2 */

  /**
   * Dismissible?
   * - If true, displays a close button with close functionality on the alert
   */
  @property({ type: Boolean })
  accessor isDismissible: boolean;

  /**
   * Internal property store setTimeout() method so that we can clear timer later
   */
  private _timer: ReturnType<typeof setTimeout>;

  /**
   * When the component is first updated
   * 1. Initializes auto close if there is no panel
   */
  firstUpdated() {
    this.handleAutoClose(); /* 1 */
  }

  /**
   * Mouseover event
   * 1. On mouseover of the alert, clear the timer to pause auto close
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
   * 1. Automatically close the alert after delay time
   */
  handleAutoClose() {
    if (this.autoClose) {
      this._timer = setTimeout(() => {
        this.close();
        clearTimeout(this._timer);
      }, this.autoCloseDelay * 1000);
    }
  }

  /**
   * Close alert
   * 1. Set isActive to false to hide the alert
   * 2. Dispatch a custom event on close
   */
  public close() {
    /* 1 */
    this.isActive = false;
    console.log("active? ", this.isActive)

    /* 2 */
    this.dispatch({
      eventName: 'close',
      detailObj: {
        active: this.isActive
      }
    });
  }

  /**
   * Open alert
   * 1. Set isActive to true to show the alert
   * 2. Dispatch a custom event on open
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

  render() {
    const componentClassNames = this.componentClassNames('sl-c-alert', {
      'sl-c-alert--success': this.variant === 'success',
      'sl-c-alert--warning': this.variant === 'warning',
      'sl-c-alert--danger': this.variant === 'danger',
      'sl-is-active': this.isActive,
      'sl-has-title': !!this.title
    });

    let alertIcon = html`<${this.iconInfoEl}></${this.iconInfoEl}>`;

    if (this.variant === 'success') {
      alertIcon = html`<${this.iconDoneEl}></${this.iconDoneEl}>`;
    } else if (this.variant === 'warning') {
      alertIcon = html`<${this.iconWarningTriangleEl}></${this.iconWarningTriangleEl}>`;
    } else if (this.variant === 'danger') {
      alertIcon = html`<${this.iconWarningEl}></${this.iconWarningEl}>`;
    }

    return html`
      <div
        role="alert"
        class=${componentClassNames}
      >
        <div class="sl-c-alert__icon">${this.slotNotEmpty('icon') ?
          html` <slot name="icon"></slot> ` : html` ${alertIcon} `}
        </div>
        <div class="sl-c-alert__body">
          <div class="sl-c-alert__content">
            ${this.title ?
              html`<div class="sl-c-alert__title">${this.title}</div>` : ''}
            <slot></slot>
          </div>
          <div class="sl-c-alert__actions">
            ${this.slotNotEmpty('action') ?
              html`<div class="sl-c-alert__action">
                <slot name="action"></slot>
              </div>` : ''}
            ${this.isDismissible ?
              html`<${this.buttonEl} class="sl-c-alert__close" variant="tertiary" hideText="true" label="Close" @click=${this.close}><${this.iconCloseEl} slot="before"></${this.iconCloseEl}></${this.buttonEl}>` : ''}
            </div>
        </div>
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLAlert.el) === undefined) {
  customElements.define(SLAlert.el, SLAlert);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-alert': SLAlert;
  }
}
