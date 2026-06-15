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
 * T4.3 — module-level cache for the shared theme stylesheet.
 *
 * The legacy implementation regex-stripped a global `<style id="al-theme-sheet">`
 * element and adopted it into every shadow root. That coupled themed
 * components to a singleton document mutation and made multi-theme subtrees
 * impossible.
 *
 * The new model:
 *   - Tokens inherit through the document via CSS custom properties.
 *   - Constructable stylesheets adopted by `<al-theme>` (the scoped host,
 *     T4.2) provide the per-subtree token overrides.
 *   - This module-level `themeSheet` is a *bare* `CSSStyleSheet` that
 *     existed only to keep legacy components running; once T4.8 codemods
 *     every pilot to `scoped-complete`, this can be deleted.
 *   - **No regex transformation of any document content.**
 */
let themeSheet: CSSStyleSheet | null = null;

function getSharedThemeSheet(): CSSStyleSheet {
  if (themeSheet) return themeSheet;
  themeSheet = new CSSStyleSheet();
  return themeSheet;
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
   * T4.3 — returns the shared (empty) theme stylesheet. Kept for backward
   * compatibility with legacy components that call `this.getGlobalStyles()`
   * directly. The contents come from `<al-theme>` token overrides cascading
   * into the shadow root via CSS custom properties — NOT from regex-
   * scraping document `<style>` content.
   */
  getGlobalStyles(): CSSStyleSheet {
    return getSharedThemeSheet();
  }

  /**
   * Lifecycle connected callback
   */
  connectedCallback(): void {
    super.connectedCallback();

    // T4.3 — adopt the shared theme stylesheet so legacy components keep
    // their old shape. Once a component flips to `scoped-complete`, this
    // call is a no-op (the stylesheet is empty) and the component derives
    // all token values from `var(--al-…)` lookups against `<al-theme>`.
    if (this.shadowRoot) {
      const adopted = this.shadowRoot.adoptedStyleSheets || ([] as CSSStyleSheet[]);
      this.shadowRoot.adoptedStyleSheets = [...adopted, this.getGlobalStyles()];
    }
  }

  /**
   * Example render, should not be used
   */
  render() {
    return html` <slot></slot> `;
  }
}
