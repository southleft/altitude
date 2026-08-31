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
 * The element's parent in the **flattened (composed) tree** — through slot
 * assignment and shadow boundaries. This is the tree the accessibility tree and
 * axe-core walk, and it is not the same as `parentElement`: an
 * `<al-list-item>` is a light DOM child of `<al-list>`, while the
 * `<ul role="list">` that owns it lives inside `<al-list>`'s shadow root, so
 * the only path between them runs through `assignedSlot`.
 */
function flattenedParent(node: Element): Element | null {
  const assignedSlot = (node as HTMLElement).assignedSlot;
  if (assignedSlot) {
    return assignedSlot.parentElement ?? (assignedSlot.getRootNode() as ShadowRoot)?.host ?? null;
  }

  const parent = node.parentNode;
  return parent instanceof ShadowRoot ? parent.host : node.parentElement;
}

/**
 * Does any flattened ancestor of `start` expose one of `roles` (explicit
 * `role` attribute) or one of `tagNames` (implicit role)?
 *
 * Components like `al-list-item` / `al-stepper-item` / `al-tab` render
 * `role="listitem"` / `role="tab"` inside their own shadow root. Rendered
 * standalone — as every "Atoms/…" story does — that role has no required
 * parent and axe reports `aria-required-parent`. Callers use this to emit the
 * role only when the required context actually exists.
 */
function ancestorHasRole(start: Element, roles: string[], tagNames: string[]): boolean {
  let node: Element | null = flattenedParent(start);

  // Bounded so a malformed tree can never spin.
  for (let i = 0; i < 64 && node; i++) {
    const role = node.getAttribute?.('role');
    if (role && roles.includes(role)) return true;
    if (!role && tagNames.includes(node.tagName.toLowerCase())) return true;
    node = flattenedParent(node);
  }

  return false;
}

/**
 * Every element that should be made `inert` while `modal` is an open modal
 * surface: each flattened ancestor's *other* children, up to `<body>`. Never an
 * ancestor of the modal itself.
 */
function collectOutsideInert(modal: Element): Element[] {
  const inerted: Element[] = [];
  let node: Element | null = modal;

  while (node && node !== document.body) {
    const parent = flattenedParent(node);
    if (!parent) break;

    // Only walk same-root siblings; content inside another shadow root is not
    // ours to freeze.
    if (!(node.parentNode instanceof ShadowRoot)) {
      Array.from(parent.children).forEach((sibling) => {
        if (sibling === node || sibling.hasAttribute('inert')) return;
        inerted.push(sibling);
      });
    }

    node = parent;
  }

  return inerted;
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
   * A11y — does this element sit inside a container that supplies the ARIA
   * context its own internal role requires?
   *
   * Walks the **flattened (composed) tree** — through `<slot>` assignments and
   * shadow boundaries — which is the same tree the accessibility tree and
   * axe-core walk. A plain `parentElement` walk is not equivalent: an
   * `<al-list-item>` is a *light DOM* child of `<al-list>`, while the
   * `<ul role="list">` that owns it lives inside `<al-list>`'s shadow root, so
   * the only path between them runs through `assignedSlot`.
   *
   * Why it exists: components like `al-list-item` / `al-stepper-item` /
   * `al-tab` render `role="listitem"` / `role="tab"` inside their own shadow
   * root. Rendered standalone (as every "Atoms/…" story does) that role has no
   * required parent and axe reports `aria-required-parent`. Callers use this to
   * emit the role only when the required context actually exists.
   *
   * @param roles explicit `role` attribute values that satisfy the context
   * @param tagNames tag names whose *implicit* role satisfies it (e.g. `ul`)
   */
  protected hasAncestorRole(roles: string[], tagNames: string[] = []): boolean {
    return ancestorHasRole(this, roles, tagNames);
  }

  /**
   * A11y — make everything outside this element `inert` while a modal surface
   * is open, and undo it exactly.
   *
   * `inert` was used zero times in the library before this: a focus trap only
   * catches Tab *inside* itself, so a screen-reader user could still arrow into
   * the page behind an open dialog or drawer, and a pointer/AT user could reach
   * background controls. This walks from the host up to `<body>` and marks each
   * ancestor's *other* children inert, never an ancestor of the modal itself.
   *
   * Only elements this call actually changed are restored, so a page that
   * already had its own `inert` elements keeps them.
   */
  private _inerted: Element[] = [];

  protected setOutsideInert(enabled: boolean): void {
    if (!enabled) {
      this._inerted.forEach((el) => el.removeAttribute('inert'));
      this._inerted = [];
      return;
    }

    if (this._inerted.length || typeof document === 'undefined') return;

    this._inerted = collectOutsideInert(this);
    this._inerted.forEach((el) => el.setAttribute('inert', ''));
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
