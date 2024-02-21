import { TemplateResult, unsafeCSS } from 'lit';
import { property, queryAssignedElements } from 'lit/decorators.js';
import { html } from 'lit/static-html.js';
import { ALElement } from '../ALElement';
import { ALToast } from '../toast/toast';
import styles from './toast-group.scss';

/**
 * Component: al-toast-group
 *
 * Toast Group contains one or multiple toasts, and provides positioning and group interactivity.
 * - **slot**: One or more individual toast components
 */
export class ALToastGroup extends ALElement {
  static el = 'al-toast-group';

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
  @property()
  accessor isActive: boolean;

  /**
   * Query the toast components in the toast group
   */
  @queryAssignedElements({ flatten: true })
  accessor toastList: Array<ALToast>;

  /**
   * Connected lifecycle
   * - Watch for the custom event when a toast in the group is dismissed
   */
  connectedCallback() {
    super.connectedCallback();

    this.addEventListener('onToastClose', () => {
      this.handleOnToastClose();
    });
  }

  /**
   * Handle a toast closed event
   * 1. Find the number of currently active toasts in the group
   * 2. If there are no active toasts, close the toast group
   */
  handleOnToastClose() {
    /* 1 */
    const numActiveToasts = this.toastList.filter((toast) => toast.isActive).length; 
    /* 2 */
    if (numActiveToasts === 0) {
      this.close();
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

  render() {
    const componentClassNames = this.componentClassNames('al-c-toast-group', {
      'al-c-toast-group--position-top': this.position === 'top',
      'al-c-toast-group--position-bottom': this.position === 'bottom',
      'al-is-active': this.isActive
    });

    return html`
      <div class=${componentClassNames} aria-relevant="additions" role="log">
        <slot></slot>
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALToastGroup.el) === undefined) {
  customElements.define(ALToastGroup.el, ALToastGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-toast-group': ALToastGroup;
  }
}
