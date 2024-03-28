import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALIconSuccess } from '../icon/icons/success';
import { ALIconInfo } from '../icon/icons/info';
import { ALIconWarningCircle } from '../icon/icons/warning-circle';
import { ALIconWarningTriangle } from '../icon/icons/warning-triangle';
import { ALIconClose } from '../icon/icons/close';
import { ALButton } from '../button/button';
import styles from './alert.scss';

/**
 * Component: al-alert
 * - **slot**: The alert's main content or title
 * - **slot** "icon": Slot in an icon to override the default one
 * */
export class ALAlert extends ALElement {
  static el = 'al-alert';

  private elementMap = register({
    elements: [
      [ALIconSuccess.el, ALIconSuccess],
      [ALIconInfo.el, ALIconInfo],
      [ALIconWarningCircle.el, ALIconWarningCircle],
      [ALIconWarningTriangle.el, ALIconWarningTriangle],
      [ALIconClose.el, ALIconClose],
      [ALButton.el, ALButton]
    ],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private iconDoneEl = unsafeStatic(this.elementMap.get(ALIconSuccess.el));
  private iconInfoEl = unsafeStatic(this.elementMap.get(ALIconInfo.el));
  private iconWarningEl = unsafeStatic(this.elementMap.get(ALIconWarningCircle.el));
  private iconWarningTriangleEl = unsafeStatic(this.elementMap.get(ALIconWarningTriangle.el));
  private iconCloseEl = unsafeStatic(this.elementMap.get(ALIconClose.el));
  private buttonEl = unsafeStatic(this.elementMap.get(ALButton.el));

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
    const componentClassNames = this.componentClassNames('al-c-alert', {
      'al-c-alert--success': this.variant === 'success',
      'al-c-alert--warning': this.variant === 'warning',
      'al-c-alert--danger': this.variant === 'danger',
      'al-is-active': this.isActive,
      'al-has-title': !!this.title
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
        <div class="al-c-alert__icon">${this.slotNotEmpty('icon') ?
          html` <slot name="icon"></slot> ` : html` ${alertIcon} `}
        </div>
        <div class="al-c-alert__body">
          <div class="al-c-alert__content">
            ${this.title ?
              html`<div class="al-c-alert__title">${this.title}</div>` : ''}
            <slot></slot>
          </div>
          <div class="al-c-alert__actions">
            ${this.slotNotEmpty('action') ?
              html`<div class="al-c-alert__action">
                <slot name="action"></slot>
              </div>` : ''}
            ${this.isDismissible ?
              html`<${this.buttonEl} class="al-c-alert__close" variant="bare" hideText="true" label="Close" @click=${this.close}><${this.iconCloseEl} class="al-c-alert__icon-close" slot="before"></${this.iconCloseEl}></${this.buttonEl}>` : ''}
            </div>
        </div>
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALAlert.el) === undefined) {
  customElements.define(ALAlert.el, ALAlert);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-alert': ALAlert;
  }
}
