import { PropertyValueMap, TemplateResult, unsafeCSS } from 'lit';
import { property, query } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { SLElement } from '../SLElement';
import { SLButton } from '../button/button';
import { SLIconClose } from '../icon/icons/close';
import styles from './drawer.scss';

/**
 * Component: sl-drawer
 *
 * Drawer provides ergonomic access to context-sensitive actions and information.
 * - **slot**: The drawer content
 */
export class SLDrawer extends SLElement {
  static el = 'sl-drawer';

  private elementMap = register({
    elements: [
      [SLButton.el, SLButton],
      [SLIconClose.el, SLIconClose]
    ],
    suffix: (globalThis as any).enAutoRegistry === true ? '' : PackageJson.version
  });

  private buttonEl = unsafeStatic(this.elementMap.get(SLButton.el));
  private iconCloseEl = unsafeStatic(this.elementMap.get(SLIconClose.el));

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
   * width of drawer panel when expanded / collapsed as side panel
   *
   */
  @property({ type: Number })
  accessor width: number;

  /**
   * Fade/ghost back the page background content
   */
  @property({ type: Boolean })
  accessor hasBackdrop: boolean;

  /**
   * Aria labelledby attribute
   */
  @property()
  accessor ariaLabelledBy: string;

  /**
   *  Append an active state on the button
   */
  @property({ type: Boolean })
  accessor isActive: boolean;

  /**
   *  Disable to close the drawer on outside click
   */
  @property({ type: Boolean })
  accessor disableBackdropClick: boolean;

  /**
   * Query the drawer close button
   */
  @query('.sl-c-drawer__close-button')
  accessor drawerCloseButton: HTMLElement;

  /**
   * Initialize functions
   */
  constructor() {
    super();
    this.handleOnClickOutside = this.handleOnClickOutside.bind(this);
  }

  /**
   * Connected callback lifecycle
   * 1. Add event listeners
   * 2. Set the id and ariaLabelledBy
   */
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('mousedown', this.handleOnClickOutside, false);
    this.ariaLabelledBy = this.ariaLabelledBy || nanoid(); /* 2 */
  }

  /**
   * Disconnected callback lifecycle
   * 1. Remove event listeners
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('mousedown', this.handleOnClickOutside, false);
  }

  /**
   * Handle click outside the component
   * 1. Close the show hide panel on click outside
   * 2. If the nav is already closed then we don't care about outside clicks and we
   * can bail early
   * 3. By the time a user clicks on the page the shadowRoot will almost certainly be
   * defined, but TypeScript isn't that trusting and sees this.shadowRoot as possibly
   * undefined. To work around that we'll check that we have a shadowRoot (and a
   * rendered .host) element here to appease the TypeScript compiler. This should never
   * actually be shown or run for a human end user.
   * 4. If the panel is active and the backdrop click is enabled and we've clicked outside of the panel then it should
   * be closed.
   */
  handleOnClickOutside(event: MouseEvent) {
    /* 2 */
    if (!this.isActive) {
      return;
    }
    /* 3 */
    if (!this.shadowRoot?.host) {
      throw Error('Could not determine panel context during click handler');
    }
    const eventTarget = event.target as HTMLElement;
    /* 4 */
    if (this.isActive && eventTarget.getAttribute('role') === 'region' && !this.disableBackdropClick) {
      this.toggleActive();
    }
  }

  updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if (_changedProperties.has('width')) {
      this.style.setProperty('--sl-drawer-panel-width', this.width.toString() + 'px');
    }
    if (_changedProperties.has('isActive')) {
      const body = document.querySelector('body');
      if (this.isActive) {
        body.style.overflow = 'hidden';
      } else {
        body.style.removeProperty('overflow');
      }
    }
  }

  /**
   * Set drawer active state
   * 1. Toggle the active state between true and false
   * 2. If the active state is toggled to false, close the panel and return focus to the trigger
   *  @fires open/close - Fires when we open/close drawer by clicking close icon
   * 3. If isActive is set to true, then focus the user on the close button so the aria-describedby property reads out
   */
  toggleActive() {
    this.isActive = !this.isActive; /* 1 */
    if (this.isActive === true && this.drawerCloseButton) {
      setTimeout(() => {
        this.drawerCloseButton.shadowRoot.querySelector<HTMLButtonElement>('.sl-c-button').focus();
      }, 100);
    }
    if (this.isActive === false) {
      /* 2 */
      this.dispatch({ eventName: 'close', detailObj: { isActive: this.isActive } });
      return;
    } else {
      this.dispatch({ eventName: 'open', detailObj: { isActive: this.isActive } });
    }
  }

  /**
   * Handle on keydown
   * 1. If the panel is open and escape is keyed, close the menu and return focus to the trigger button
   */
  handleKeyDown(e: KeyboardEvent) {
    if (this.isActive === true && e.key === 'Escape') {
      this.toggleActive();
    }
  }

  render() {
    const componentClassName = this.componentClassNames('sl-c-drawer', {
      'sl-c-drawer--right': this.alignment === 'right',
      'sl-c-drawer--backdrop': this.hasBackdrop,
      'sl-is-active': this.isActive
    });

    return html`
      <section
        class="${componentClassName}"
        role="region"
        id="${this.id}"
        aria-hidden=${this.isActive ? false : true}
        @click=${this.handleOnClickOutside}
      >
        <article role="dialog" aria-labelledby=${ifDefined(this.ariaLabelledBy)} class="sl-c-drawer__panel">
          <header class="sl-c-drawer__header">
            <div class="sl-c-drawer__header-content" id=${this.ariaLabelledBy}>
              <slot name="header"></slot>
            </div>
            <${this.buttonEl} variant="tertiary" ?hideText=${true} class="sl-c-drawer__close-button" @click=${this.toggleActive}>
              Close
              <${this.iconCloseEl} slot="after"></${this.iconCloseEl}>
            </${this.buttonEl}>
          </header>
          <div class="sl-c-drawer__body">
            <slot></slot>
          </div>
          <footer class="sl-c-drawer__footer">
            <slot name="footer"></slot>
          </footer>
        </article>
      </section>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLDrawer.el) === undefined) {
  customElements.define(SLDrawer.el, SLDrawer);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-drawer': SLDrawer;
  }
}
