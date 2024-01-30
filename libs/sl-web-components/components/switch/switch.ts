import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { nanoid } from 'nanoid';
import { SLElement } from '../SLElement';
import styles from './switch.scss';

/**
 * Component: sl-switch
 *
 * Switch is used to toggle the on/off state of a single setting.
 */
export class SLSwitch extends SLElement {
  static el = 'sl-switch';

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Checked attribute
   * - If true, sets the treatment to represent an on state
   * - If false, sets the treatment to represent an off state
   */
  @property({ type: Boolean })
  accessor isChecked: boolean;

  /**
   * Disabled attribute
   * - Changes the component's treatment to represent a disabled state
   */
  @property({ type: Boolean })
  accessor isDisabled: boolean;

  /**
   * Field ID
   * - Links the label to the switch
   * - By default it is autogenerated by nanoid
   */
  @property()
  accessor fieldId: string;

  /**
   * Label
   * - The text inside the label tag
   * - Does not display on the front-end, but is used for A11y
   */
  @property()
  accessor label: string = 'Switch';

  /**
   * Name attribute
   * - The name attribute used on the switch
   */
  @property()
  accessor name: string;

  /**
   * Connected callback lifecycle
   * 1. Autogenerates Field ID for A11y if this property isn't provided
   */
  connectedCallback() {
    super.connectedCallback();
    this.fieldId = this.fieldId || nanoid(); /* 1 */
  }

  /**
   * Trigger switch event
   *  1. Toggle the component's checked state
   *  2. Dispatch the custom event
   */
  triggerSwitchEvent() {
    /* 1 */
    this.isChecked = !this.isChecked;

    /* 2 */
    this.dispatch({
      eventName: 'onSwitchChange',
      detailObj: {
        checked: this.isChecked
      }
    });
  }

  /**
   * Handle on keydown events
   * 1. If the Enter key is pressed, trigger the switch event
   */
  handleKeydown(e: KeyboardEvent) {
    if (e.code === 'Enter') {
      this.triggerSwitchEvent();
    }
  }

  render() {
    const componentClassNames = this.componentClassNames('sl-c-switch', {
      'sl-is-checked': this.isChecked === true,
      'sl-is-disabled': this.isDisabled === true
    });

    return html`
      <div class="${componentClassNames}">
        <input
          class="sl-c-switch__checkbox"
          type="checkbox"
          id="${this.fieldId}"
          name="${ifDefined(this.name)}"
          ?checked=${this.isChecked}
          ?disabled=${this.isDisabled}
          @change=${this.triggerSwitchEvent}
          @keydown=${this.handleKeydown}
        />
        <label class="sl-c-switch__label" for=${this.fieldId}>
          <span class="sl-u-is-vishidden">${this.label}</span>
        </label>
      </div>
    `;
  }
}

if ((globalThis as any).enAutoRegistry === true && customElements.get(SLSwitch.el) === undefined) {
  customElements.define(SLSwitch.el, SLSwitch);
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-switch': SLSwitch;
  }
}
