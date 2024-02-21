import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALButton } from '../button/button';
import { ALIconClose } from '../icon/icons/close';
import { ALIconCheck } from '../icon/icons/check';
import { ALIconInfo } from '../icon/icons/info';
import { ALIconWarningCircle } from '../icon/icons/warning-circle';
import { ALIconWarningTriangle } from '../icon/icons/warning-triangle';
import { ALProgress } from '../progress/progress';
import styles from './toast.scss';

/**
 * Component: al-toast
 * - **slot**: The toast title or primary text
 * - **slot** "actions": Actions to optionally display in the toast
 * - **slot** "icon": Slot in an icon to override the default one
 */
export class ALToast extends ALElement {
  static el = 'al-toast';

  private elementMap = register({
    elements: [
      [ALButton.el, ALButton],
      [ALIconClose.el, ALIconClose],
      [ALIconCheck.el, ALIconCheck],
      [ALIconInfo.el, ALIconInfo],
      [ALIconWarningCircle.el, ALIconWarningCircle],
      [ALIconWarningTriangle.el, ALIconWarningTriangle],
      [ALProgress.el, ALProgress]
    ],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private buttonEl = unsafeStatic(this.elementMap.get(ALButton.el));
  private iconCloseEl = unsafeStatic(this.elementMap.get(ALIconClose.el));
  private iconDoneEl = unsafeStatic(this.elementMap.get(ALIconCheck.el));
  private iconInfoEl = unsafeStatic(this.elementMap.get(ALIconInfo.el));
  private iconWarningEl = unsafeStatic(this.elementMap.get(ALIconWarningCircle.el));
  private iconWarningTriangleEl = unsafeStatic(this.elementMap.get(ALIconWarningTriangle.el));
  private progressEl = unsafeStatic(this.elementMap.get(ALProgress.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Variants
   * - **default** renders a toast that represents an informative state
   * - **success** renders a toast that represents a success state
   * - **warning** renders a toast that represents a warning state
   * - **danger** renders a toast that represents an danger state
   */
  @property()
  accessor variant: 'info' | 'success' | 'warning' | 'danger';

  /**
   * The toast description text
   */
  @property()
  accessor description: string = '';

  /**
   * Is active?
   * - **true** Displays the toast on the screen
   * - **false** Hides the toast on the screen
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   * Is dismissible?
   * - **false** If false, the toast will auto close after a delay
   * - **true**  If true, this disables auto close and adds the ability for the user close the toast
   */
  @property({ type: Boolean })
  accessor isDismissible: boolean;

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

  @property({ type: Boolean })
  accessor showProgress: boolean;

  /**
   * Internal property store setTimeout() method so that we can clear timer later
   */
  private _timer: ReturnType<typeof setTimeout>;

  /**
   * First updated lifecycle
   * - Initializes auto close
   */
  firstUpdated() {
    this.handleAutoClose();
  }

  /**
   * Auto close handler
   * 1. Automatically close the toast after delay time
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
   * Open toast
   * 1. Set active to true to show the toast
   * 2. Dispatch a custom event
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
   * Close toast
   * 1. Set active to false to hide the toast
   * 2. Dispatch a custom event
   */
  public close() {
    this.isActive = false; /* 1 */

    /* 2 */
    this.dispatch({
      eventName: 'onToastClose',
      detailObj: {
        active: this.isActive
      }
    });
  }

  /**
   * Keydown event
   * 1. If escape key is struck when the toast is active, dismiss it
   */
  handleKeyDown(e: KeyboardEvent) {
    if (this.isDismissible && e.code === 'Escape') {
      this.close(); /* 1 */
    }
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

  render() {
    const componentClassNames = this.componentClassNames('al-c-toast', {
      'al-c-toast--success': this.variant === 'success',
      'al-c-toast--warning': this.variant === 'warning',
      'al-c-toast--danger': this.variant === 'danger',
      'al-is-active': this.isActive,
      'al-is-dismissible': this.isDismissible,
      'al-has-description': this.description?.length > 0
    });

    console.log("SHOW?", this.showProgress)

    let toastIcon;
    if (this.variant === 'info') {
      toastIcon = html`<${this.iconInfoEl}></${this.iconInfoEl}>`;
    } if (this.variant === 'success') {
      toastIcon = html`<${this.iconDoneEl}></${this.iconDoneEl}>`;
    } else if (this.variant === 'warning') {
      toastIcon = html`<${this.iconWarningTriangleEl}></${this.iconWarningTriangleEl}>`;
    } else if (this.variant === 'danger') {
      toastIcon = html`<${this.iconWarningEl}></${this.iconWarningEl}>`;
    }

    return html`
      <div role="alert"
        class=${componentClassNames}
        @keydown=${this.handleKeyDown}
        @mouseover=${this.handleMouseOver}
        @mouseleave=${this.handleMouseLeave}
      >
        <div class="al-c-toast__wrapper">
          ${this.variant || this.slotNotEmpty('icon') ? html`<div class="al-c-toast__icon">${this.slotNotEmpty('icon') ? html` <slot name="icon"></slot> ` : html` ${toastIcon} `}</div>` : html``}
          <div class="al-c-toast__body">
            <slot></slot>
            ${this.description ? html` <div class="al-c-toast__description">${this.description}</div> ` : html``}
          </div>
          ${this.slotNotEmpty('actions')
            ? html`
                <div class="al-c-toast__actions">
                  <slot name="actions"></slot>
                </div>
              `
            : html``}
          ${this.isDismissible
            ? html`
                <${this.buttonEl} variant="tertiary" class="al-c-toast__close-button" @click=${this.close} ?hideText=${true}>
                  Close
                  <${this.iconCloseEl} class="al-c-toast__icon-close" slot="before"></${this.iconCloseEl}>
                </${this.buttonEl}>
              `
            : html``}
          </div>
          ${this.autoClose && this.showProgress ? html`<${this.progressEl} duration=${this.autoCloseDelay} currentProgress="100" endProgress="0"></${this.progressEl}>` : html``}
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALToast.el) === undefined) {
  customElements.define(ALToast.el, ALToast);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-toast': ALToast;
  }
}
