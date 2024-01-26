import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLButton } from '../button/button';
import { SLIconClose } from '../icon/icons/close';
import { SLIconDone } from '../icon/icons/done';
import { SLIconInfo } from '../icon/icons/info';
import { SLIconWarningCircle } from '../icon/icons/warning-circle';
import { SLIconWarningTriangle } from '../icon/icons/warning-triangle';
import styles from './toast.scss';

/**
 * Component: sl-toast
 * - Toast provides a brief, temporary notification without interrupting a user's task.
 * @slot - The components content
 * @slot "actions" - Actions to optionally display in the toast
 * @slot "icon" - Slot in an icon to override the default one
 */
export class SLToast extends SLElement {
  static el = 'sl-toast';

  private elementMap = register({
    elements: [
      [SLButton.el, SLButton],
      [SLIconClose.el, SLIconClose],
      [SLIconDone.el, SLIconDone],
      [SLIconInfo.el, SLIconInfo],
      [SLIconWarningCircle.el, SLIconWarningCircle],
      [SLIconWarningTriangle.el, SLIconWarningTriangle]
    ],
    suffix: (globalThis as any).enAutoRegistry === true ? '' : PackageJson.version
  });

  private buttonEl = unsafeStatic(this.elementMap.get(SLButton.el));
  private iconCloseEl = unsafeStatic(this.elementMap.get(SLIconClose.el));
  private iconDoneEl = unsafeStatic(this.elementMap.get(SLIconDone.el));
  private iconInfoEl = unsafeStatic(this.elementMap.get(SLIconInfo.el));
  private iconWarningEl = unsafeStatic(this.elementMap.get(SLIconWarningCircle.el));
  private iconWarningTriangleEl = unsafeStatic(this.elementMap.get(SLIconWarningTriangle.el));

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
  accessor variant: 'success' | 'warning' | 'danger';

  /**
   * The toast description text
   */
  @property()
  accessor description: string = '';

  /**
   * Is active?
   * 1. Used if the toast is part of a toast group
   * 2. If true, the toast is the active slide in the toast group
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
   * Has Controls?
   * - Dynamically set by the toast group.
   * - **true** Shifts over the toast content to fit the controls
   */
  @property({ type: Boolean })
  accessor hasControls: boolean;

  /**
   * The index of the toast within its parent toast group
   */
  @property()
  accessor idx: number;

  /**
   * Close toast
   * 1. Set the toast's active state to false
   * 2. Dispatch a custom event
   */
  public close() {
    this.isActive = false; /* 1 */

    /* 2 */
    this.dispatch({
      eventName: 'closeToast',
      detailObj: {
        active: this.isActive,
        toastIdx: this.idx
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

  render() {
    const componentClassNames = this.componentClassNames('sl-c-toast', {
      'sl-c-toast--success': this.variant === 'success',
      'sl-c-toast--warning': this.variant === 'warning',
      'sl-c-toast--danger': this.variant === 'danger',
      'sl-is-active': this.isActive,
      'sl-is-dismissible': this.isDismissible,
      'sl-has-controls': this.hasControls,
      'sl-has-description': this.description?.length > 0
    });

    let toastIcon = html`<${this.iconInfoEl} size="lg"></${this.iconInfoEl}>`;
    if (this.variant === 'success') {
      toastIcon = html`<${this.iconDoneEl} size="lg"></${this.iconDoneEl}>`;
    } else if (this.variant === 'warning') {
      toastIcon = html`<${this.iconWarningTriangleEl} size="lg"></${this.iconWarningTriangleEl}>`;
    } else if (this.variant === 'danger') {
      toastIcon = html`<${this.iconWarningEl} size="lg"></${this.iconWarningEl}>`;
    }

    return html`
      <div role="alert" class=${componentClassNames} @keydown=${this.handleKeyDown}>
        <div class="sl-c-toast__icon">${this.slotNotEmpty('icon') ? html` <slot name="icon"></slot> ` : html` ${toastIcon} `}</div>
        <div class="sl-c-toast__body">
          <slot></slot>
          ${this.description ? html` <div class="sl-c-toast__description">${this.description}</div> ` : html``}
        </div>
        ${this.slotNotEmpty('actions')
          ? html`
              <div class="sl-c-toast__actions">
                <slot name="actions"></slot>
              </div>
            `
          : html``}
        ${this.isDismissible
          ? html`
              <${this.buttonEl} variant="tertiary" class="sl-c-toast__close-button" @click=${this.close} ?hideText=${true}>
                Close
                <${this.iconCloseEl} class="sl-c-toast__icon-close" slot="before"></${this.iconCloseEl}>
              </${this.buttonEl}>
            `
          : html``}
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLToast.el) === undefined) {
  customElements.define(SLToast.el, SLToast);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-toast': SLToast;
  }
}
