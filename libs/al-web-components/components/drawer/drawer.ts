import { TemplateResult, unsafeCSS } from 'lit';
import { property, queryAsync, queryAssignedElements } from 'lit/decorators.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import styles from './drawer.scss';
import { ALButton } from '../button/button';
import { ALIconClose } from '../icon/icons/close';

/**
 * Component: al-drawer
 * - **slot**: The drawer content
 */
export class ALDrawer extends ALElement {
  static el = 'al-drawer';

  private elementMap = register({
    elements: [
      [ALButton.el, ALButton],
      [ALIconClose.el, ALIconClose]
    ],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private buttonEl = unsafeStatic(this.elementMap.get(ALButton.el));
  private iconCloseEl = unsafeStatic(this.elementMap.get(ALIconClose.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Alignment
   * - **right** Aligns the drawer to the right of the viewport
   */
  @property()
  accessor alignment: 'right';

  /**
   * Width of drawer panel when expanded / collapsed as side panel
   */
  @property({ type: Number })
  accessor width: number;

  /**
   * Fade/ghost back the page background content
   */
  @property({ type: Boolean })
  accessor hasBackdrop: boolean;

  /**
   * Is active?
   * - **true** Shows the drawer container
   * - **false** Hides the drawer container
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   * Aria Labelled By attribute
   * - Dynamically set for A11y
   */
  @property()
  accessor ariaLabelledBy: string;

  /**
   *  Disable to close the drawer on outside click
   */
  @property({ type: Boolean })
  accessor disableBackdropClick: boolean;

   /**
    * Query the drawer close button
    */
   @queryAsync('.al-c-drawer__close-button')
   accessor closeButton: any;

  /**
   * Query the drawer trigger
   */
  @queryAssignedElements({ slot: 'trigger' })
  accessor drawerTrigger: any[];

  /**
   * Query the drawer trigger inner element
   */
  get drawerTriggerButton(): any {
    if (this.drawerTrigger[0] && this.drawerTrigger[0].shadowRoot) {
      return this.drawerTrigger[0].shadowRoot.querySelector('*');
    }
  }

  /**
   * Initialize functions
   */
  constructor() {
    super();
    this.handleOnClickOutside = this.handleOnClickOutside.bind(this);
  }

  /**
   * Connected callback lifecycle
   * 1. Add mousedown event listener
   */
  connectedCallback() {
    super.connectedCallback();
    globalThis.addEventListener('mousedown', this.handleOnClickOutside, false); /* 1 */
  }

  /**
   * Disconnected callback lifecycle
   * 1. Remove mousedown event listener
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    globalThis.removeEventListener('mousedown', this.handleOnClickOutside, false); /* 1 */
  }

  /**
   * First updated lifecycle
   * 1. Wait for slotted components to be loaded
   * 2. Set aria-expanded on the trigger for A11y
   * 3. Set the width of the drawer container
   */
  async firstUpdated() {
    await this.updateComplete; /* 1 */
    this.setAria(); /* 2 */
    this.setWidth(); /* 3 */
  }

  /**
   * Updated lifecycle
   * 1. Update aria-expanded on the trigger based on if isActive
   * 2. Set the body overflow based on if the drawer is active
   */
  updated() {
    this.setAria(); /* 1 */
    this.setBodyOverflow(); /* 2 */
  }

  /**
   * Set aria-expanded to the trigger button
   * 1. Dynamically sets the aria-labelledby for A11y
   * 2. Set isExpanded to this.isActive if it's truthy, otherwise, set it to false
   */
  setAria() {
    /* 1 */
    this.ariaLabelledBy = this.ariaLabelledBy || nanoid();
    /* 2 */
    if (this.drawerTriggerButton) {
      this.drawerTriggerButton.isExpanded = this.isActive || false;
    }
  }

  /**
   * Set the width
   * 1. Add a custom property to adjust the width of the drawer container
   */
  setWidth() {
    if (this.width) {
      this.style.setProperty('--al-drawer-container-width', this.width.toString() + 'px');
    }
  }

  /**
   * Set body overflow
   * 1. If the drawer is active, prevent scrolling on the body
   * 2. If the drawer is inactive, allow scrolling on the body
   */
  setBodyOverflow() {
    const body = document.querySelector('body');
    if (this.isActive) {
      body.style.overflow = 'hidden'; /* 1 */
    } else {
      body.style.removeProperty('overflow'); /* 2 */
    }
  }

  /**
   * Handles the click event outside the component:
   * 1. Check if the drawer is active
   * 2. Determine if the click occurred inside the active drawer
   * 3. Check if the click occurred outside the active drawer
   * 4. Close the drawer if the click occurred outside it
   */
  handleOnClickOutside(e: MouseEvent) {
    /* 1 */
    if (this.isActive) {
      const didClickInside = e.composedPath().includes(this.shadowRoot.host); /* 2 */
      /* 3 */
      if (!didClickInside) {
        /* 4 */
        this.close();
      }
    }
  }

  /**
   * Handle on keydown events
   * 1. When the Enter key is pressed on the trigger, open the drawer and prevent default button click
   * 2. If the drawer is open and escape is keyed, close the drawer and return focus to the trigger button
   */
  handleOnKeydown(e: KeyboardEvent) {
    const { target } = e as any;
    /* 1 */
    if (this.slotNotEmpty('trigger') && target.matches('[slot="trigger"]') && e.code === 'Enter') {
      e.preventDefault();
      this.toggleActive();
    }
    /* 2 */
    if (this.isActive === true && e.code === 'Escape') {
      this.close();
    }
  }

  /**
   * Handle on click of close button
   * 1. Toggle the active state between true and false
   * 2. Dispatch a custom event on click of close button
   */
  handleOnCloseButton() {
    this.toggleActive();
    this.dispatch({
      eventName: 'onDrawerCloseButton',
      detailObj: {
        active: this.isActive
      }
    });
  }

  /**
   * Set drawer active state
   * 1. Toggle the active state between true and false
   * 2. Open/close the drawer container based on isActive
   */
  public toggleActive() {
    this.isActive = !this.isActive; /* 1 */

    /* 2 */
    if (this.isActive) {
      this.open();
    } else {
      this.close();
    }
  }

  /**
   * Open drawer
   * 1. Set isActive to true to show the drawer
   * 2. Dispatch a custom event on open
   */
  public open() {
    this.isActive = true; /* 1 */
    /* 2 */
    this.dispatch({
      eventName: 'onDrawerOpen',
      detailObj: {
        active: this.isActive
      }
    });
  }

  /**
   * Close drawer
   * 1. Set isActive to false to hide the drawer
   * 2. Set the focus on trigger button element when the drawer is closed
   * 3. Dispatch a custom event on close
   */
  public close() {
    this.isActive = false; /* 1 */
    /* 2 */
    if (this.drawerTriggerButton) {
      setTimeout(() => {
        this.drawerTriggerButton.focus();
      }, 1);
    }
    /* 3 */
    this.dispatch({
      eventName: 'onDrawerClose',
      detailObj: {
        active: this.isActive
      }
    });
  }

  render() {
    const componentClassName = this.componentClassNames('al-c-drawer', {
      'al-c-drawer--right': this.alignment === 'right',
      'al-c-drawer--backdrop': this.hasBackdrop,
      'al-is-active': this.isActive
    });

    return html`
      <div class="${componentClassName}" @keydown=${this.handleOnKeydown}>
      ${this.slotNotEmpty('trigger') &&
        html`
          <div class="al-c-drawer__trigger" @click=${this.toggleActive}>
            <slot name="trigger"></slot>
          </div>
        `}
        <div
          class="al-c-drawer__container"
          role="region"
          aria-labelledby=${this.ariaLabelledBy}
          aria-hidden=${this.isActive ? false : true}
        >
        ${this.slotNotEmpty('header') &&
          html`
            <div class="al-c-drawer__header">
              <div class="al-c-drawer__header-content" id=${this.ariaLabelledBy}>
                <slot name="header"></slot>
              </div>
              <${this.buttonEl} variant="tertiary" ?hideText=${true} class="al-c-drawer__close-button" @click=${this.handleOnCloseButton}>
                Close
                <${this.iconCloseEl} slot="after"></${this.iconCloseEl}>
              </${this.buttonEl}>
            </div>
          `}
          <div class="al-c-drawer__body">
            <slot></slot>
          </div>
          ${this.slotNotEmpty('footer') &&
          html`
            <div class="al-c-drawer__footer">
              <slot name="footer"></slot>
            </div>
          `}
        </div>
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALDrawer.el) === undefined) {
  customElements.define(ALDrawer.el, ALDrawer);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-drawer': ALDrawer;
  }
}
