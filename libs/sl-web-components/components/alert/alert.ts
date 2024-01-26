import { TemplateResult, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLIconChevronDown } from '../icon/icons/chevron-down';
import { SLIconDone } from '../icon/icons/done';
import { SLIconInfo } from '../icon/icons/info';
import { SLIconWarningCircle } from '../icon/icons/warning-circle';
import { SLIconWarningTriangle } from '../icon/icons/warning-triangle';
import styles from './alert.scss';

/**
 * Component: sl-alert
 * 
 * Alert displays a short important message that will attract a user's attention without interrupting the user's task.
 * - **slot**: The alert's main content or title
 * - slot "description": A description to include in the dropdown panel
 * - slot "icon": Slot in an icon to override the default one
 * 
 * */
export class SLAlert extends SLElement {
  static el = 'sl-alert';

  private elementMap = register({
    elements: [
      [SLIconChevronDown.el, SLIconChevronDown],
      [SLIconDone.el, SLIconDone],
      [SLIconInfo.el, SLIconInfo],
      [SLIconWarningCircle.el, SLIconWarningCircle],
      [SLIconWarningTriangle.el, SLIconWarningTriangle]
    ],
    suffix: (globalThis as any).enAutoRegistry === true ? '' : PackageJson.version
  });

  private iconChevronDownEl = unsafeStatic(this.elementMap.get(SLIconChevronDown.el));
  private iconDoneEl = unsafeStatic(this.elementMap.get(SLIconDone.el));
  private iconInfoEl = unsafeStatic(this.elementMap.get(SLIconInfo.el));
  private iconWarningEl = unsafeStatic(this.elementMap.get(SLIconWarningCircle.el));
  private iconWarningTriangleEl = unsafeStatic(this.elementMap.get(SLIconWarningTriangle.el));

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
   * isActive boolean
   * - If true, the alert displays on the page
   * - If false, the alert is hidden from the page
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   * isExpanded boolean
   * - If true, the panel will be expanded
   * - If false, the panel will be collapsed
   */
  @property({ type: Boolean })
  accessor isExpanded: boolean = false;

  /**
   * hasPanel boolean
   * 1. If true, include the dropdown panel and expand icon
   * 2. Default value is false unless description is provided
   */
  @property({ type: Boolean })
  accessor hasPanel: boolean = false;

  /**
   * Auto close?
   * - Set whether you want the alert to auto close. Adjust the autoCloseDelay if you want longer than 3 seconds
   */
  @property({ type: Boolean })
  accessor autoClose: boolean;

  /**
   * Delay property
   * 1. Number of seconds to close the alert when autoClose is enabled
   * 2. Default amount is 3
   */
  @property({ type: Number })
  accessor autoCloseDelay: number = 3; /* 2 */

  /**
   * Aria Controls attribute
   * - Dynamically set for A11y
   */
  @property()
  accessor ariaControls: string;

  /**
   * Aria Labelled By attribute
   * - Dynamically set for A11y
   */
  @property()
  accessor ariaLabelledBy: string;

  /**
   * Internal property store setTimeout() method so that we can clear timer later
   */
  private _timer: ReturnType<typeof setTimeout>;

  /**
   * Connected callback
   */
  connectedCallback() {
    super.connectedCallback();
  }

  /**
   * When the component is first updated
   * 1. Sets hasPanel to true if panel description is provided
   * 2. Set aria attributes for A11y
   * 3. Initializes auto close if there is no panel
   */
  firstUpdated() {
    this.hasPanel = this.slotNotEmpty('panel'); /* 1 */
    this.setAria(); /* 2 */

    /* 3 */
    this.handleAutoClose();
  }

  /**
   * Add aria attributes for A11y
   * 1. Dynamically sets the aria-labelledby for A11y
   * 2. If there is a panel, then add the aria-controls
   */
  setAria() {
    this.ariaLabelledBy = this.ariaLabelledBy || nanoid();
    /* 2 */
    if (this.hasPanel) {
      this.ariaControls = this.ariaControls || nanoid();
    }
  }

  /**
   * Handle on keydown
   * 1. If enter key is pressed, expand the panel
   * 2. If the panel is expanded and escape is keyed, close the panel
   * 3. Return focus to the trigger button
   */
  handleOnKeydown(e: KeyboardEvent) {
    if (this.hasPanel) {
      /* 1 */
      if (this.isExpanded === false && e.code === 'Enter') {
        this.toggleExpanded();
      }

      /* 2 */
      if (this.isExpanded === true && e.code === 'Escape') {
        this.toggleExpanded();
        /* 3 */
        const trigger = this.shadowRoot.querySelector<HTMLElement>('.sl-c-alert__header');
        trigger.focus();
      }
    }
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
   * Toggle expanded
   * 1. Toggle the expanded state
   * 2. Dispatch the custom change event
   */
  public toggleExpanded() {
    /* 1 */
    this.isExpanded = !this.isExpanded;

    /* 2 */
    this.dispatch({
      eventName: 'expanded',
      detailObj: {
        expanded: this.isExpanded
      }
    });
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
    const componentClassNames = this.componentClassNames('sl-c-alert', {
      'sl-c-alert--success': this.variant === 'success',
      'sl-c-alert--warning': this.variant === 'warning',
      'sl-c-alert--danger': this.variant === 'danger',
      'sl-is-active': this.isActive === true,
      'sl-is-expanded': this.isExpanded === true,
      'sl-c-alert--has-panel': this.hasPanel === true
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
        @keydown=${this.handleOnKeydown}
        @mouseover=${this.handleMouseOver}
        @mouseleave=${this.handleMouseLeave}
        aria-labelledby=${this.ariaLabelledBy}
        aria-expanded=${ifDefined(this.isExpanded)}
      >
        <div class="sl-c-alert__header" @click=${this.toggleExpanded} aria-controls=${ifDefined(this.ariaControls)} tabindex="0">
          <div class="sl-c-alert__title" id=${this.ariaLabelledBy}>
            <div class="sl-c-alert__icon">${this.slotNotEmpty('icon') ? html` <slot name="icon"></slot> ` : html` ${alertIcon} `}</div>
            <slot></slot>
          </div>
          ${this.hasPanel ? html`<${this.iconChevronDownEl} size="lg" class="sl-c-alert__icon-expand"></${this.iconChevronDownEl}>` : ''}
        </div>
        ${this.hasPanel &&
        html`
          <div class="sl-c-alert__panel" id=${this.ariaControls}>
            <slot name="panel"></slot>
          </div>
        `}
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
