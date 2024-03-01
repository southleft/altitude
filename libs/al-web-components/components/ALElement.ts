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
   * Get the global styles
   */
  getGlobalStyles() {
    const themeGlobal = `__AL__THEME_SHEET`;
    const themeSheetId = 'al-theme-sheet';
    // If the theme sheet is not available globally, create it from the themeSheetId
    if (!globalThis.hasOwnProperty(themeGlobal)) {
      const themeSheet = document.documentElement.querySelector(`style#${themeSheetId}`);
      // Make the theme sheet available globally
      (globalThis as any)[themeGlobal] = new CSSStyleSheet();
      if (themeSheet) {
        // Remove any custom properties or imports from the theme sheet
        // This is to prevent the theme sheet from overriding the custom properties
        // that are set in the mounted component
        const regex = /(@import\surl\(.+\);|(--[\w-]+:[^;]+;))/g;
        const themeSheetContent = themeSheet.textContent;
        const cleanedThemeSheetContent = themeSheetContent.replace(regex, '');
        (globalThis as any)[themeGlobal].replaceSync(cleanedThemeSheetContent);
        console.log('themeGlobal', (globalThis as any)[themeGlobal]);
      } else {
        console.error(`Altitude style#${themeSheetId} not found`);
      }
    }
    return (globalThis as any)[themeGlobal]
  }

  /**
   * Lifecycle connected callback
   */
  connectedCallback(): void {
    super.connectedCallback();
    // Adopt the theme sheet
    this.shadowRoot.adoptedStyleSheets = [...this.shadowRoot.adoptedStyleSheets, this.getGlobalStyles()];
  }

  /**
   * Example render, should not be used
   */
  render() {
    return html` <slot></slot> `;
  }
}
