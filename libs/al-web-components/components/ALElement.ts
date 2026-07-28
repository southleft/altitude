import { html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import sharedUtilities from '../styles/shadow-utilities.scss';

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
 *   - Global utility classes (`.al-u-*`) compiled from `styles/core/utilities`
 *     are adopted here so legacy components that accept utility values via
 *     `styleModifier` continue to work inside shadow DOM. The legacy build
 *     adopted the entire ~44 KB main.scss; this shared sheet holds only the
 *     ~7 KB utility surface — tokens still come from `var(--al-…)` lookups.
 *   - **No regex transformation of any document content.**
 */
let themeSheet: CSSStyleSheet | null = null;

function getSharedThemeSheet(): CSSStyleSheet {
  if (themeSheet) return themeSheet;
  themeSheet = new CSSStyleSheet();
  try {
    themeSheet.replaceSync(String(sharedUtilities ?? ''));
  } catch {
    // SSR / non-DOM environments: leave the sheet empty.
  }
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
   * T4.3 — returns the shared utility stylesheet. Kept for backward
   * compatibility with legacy components that call `this.getGlobalStyles()`
   * directly.
   *
   * It is NOT empty, whatever this comment used to say: `getSharedThemeSheet()`
   * fills it from `styles/shadow-utilities.scss` — the ~7 KB `.al-u-*` utility
   * surface, so `styleModifier` values keep working inside shadow DOM. It
   * contains no tokens. Tokens reach components purely by custom-property
   * inheritance from the nearest `<al-theme>` (or `:root`) — NOT from regex-
   * scraping document `<style>` content, and not from this sheet.
   */
  getGlobalStyles(): CSSStyleSheet {
    return getSharedThemeSheet();
  }

  /**
   * Lifecycle connected callback
   */
  connectedCallback(): void {
    super.connectedCallback();

    // T4.3 — adopt the shared utility stylesheet so `styleModifier` values
    // (`.al-u-*`) keep working inside shadow DOM. This is NOT a no-op for
    // `scoped-complete` components and the sheet is NOT empty; it is the
    // ~7 KB utility surface from `styles/shadow-utilities.scss`. Token values
    // come from `var(--al-…)` lookups resolved by inheritance from the nearest
    // `<al-theme>`, never from this sheet.
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
