import { html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

export interface ALElementProps {
  styleModifier?: string;
}

export interface DetailObj {
  [key: string]: unknown;
}

export interface ALDispatchProps {
  e?: Event;
  eventName: string;
  detailObj?: DetailObj;
  optionsObj?: { [key: string]: unknown };
}

export interface ALEvent extends Event {
  detail: {
    originalEvent: Event;
    detailObj: DetailObj;
  };
}

/**
 * A base element.
 */
export class ALElement extends LitElement {

  connectedCallback(): void {
    super.connectedCallback();
    // If the theme sheet is not available globally, create it
    if (!globalThis.hasOwnProperty('_AL_THEME_SHEET')) {
      const themeSheet = document.documentElement.querySelector('style#AL-THEME-SHEET');
      // Make the theme sheet available globally
      (globalThis as any)._AL_THEME_SHEET = new CSSStyleSheet();
      if (themeSheet) {
        (globalThis as any)._AL_THEME_SHEET.replaceSync(themeSheet.textContent);
      } else {
        console.warn('style#AL-THEME-SHEET not found');
      }
    }
    // Adopt the theme sheet
    this.shadowRoot.adoptedStyleSheets = [...this.shadowRoot.adoptedStyleSheets, (globalThis as any)._AL_THEME_SHEET];
  }
  /**
   * Append to the class name. Used for passing in utility classes
   */
  @property()
  accessor styleModifier: string;

  /**
   * Abstraction of `classMap` that automatically includes any style modifier
   * as well as any set variants.
   *
   * It is expected that `variant` would be overridden in a subclass with more
   * specific types, `@property() variant?: 'foo' | 'bar'`
   *
   * @param baseClassName
   */
  componentClassNames(baseClassName: string, additionalClassNames = {}) {
    return classMap({
      [baseClassName]: !!baseClassName,
      [this.styleModifier]: !!this.styleModifier,
      ...additionalClassNames
    });
  }

  /**
   * Check if a slot is empty
   *
   * @param slotName
   */
  slotEmpty(slotName?: string) {
    return !this.querySelector(`[slot${slotName ? `="${slotName}"` : ''}]`);
  }

  /**
   * Check if a slot is not empty
   *
   * @param slotName
   */
  slotNotEmpty(slotName?: string) {
    if (!this.slotEmpty(slotName) !== false) {
      return !this.slotEmpty(slotName);
    } else {
      return;
    }
  }

  /**
   * Dispatch a custom event.
   */
  dispatch({ e, eventName, detailObj = {}, optionsObj = {} }: ALDispatchProps): CustomEvent {
    const options = {
      bubbles: true,
      composed: true,
      ...optionsObj,
      detail: { ...(e && { originalEvent: e }), ...detailObj }
    };
    const event = new CustomEvent(eventName, options);
    this.dispatchEvent(event);
    return event;
  }

  /**
   * Example render, should not be used
   */
  render() {
    return html` <slot></slot> `;
  }
}
