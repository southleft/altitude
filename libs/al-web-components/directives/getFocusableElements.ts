/**
 * Traverse the shadow DOM and light DOM of a given root element and return an array of all focusable elements.
 */

/**
 * `.al-is-selected` used to be in this list. It is a *state* class, not a
 * focusability signal: components put it on already-focusable controls (menu
 * item links, selected list items), so including it added nothing there — but
 * it also matched plain `<div>`/`<span>` elements carrying the class, which
 * then became the first or last boundary of a focus trap and could not be
 * focused. `<al-focus-trap>` looks the class up separately when it decides
 * where to place *initial* focus.
 */
const focusableSelectors =
  'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const isFocusable = (node: HTMLElement): boolean => {
  return node.matches(focusableSelectors);
};

/**
 * Visibility check.
 *
 * `checkVisibility()` answers this in one call and lets the engine reuse
 * whatever layout/style information it already has. The previous
 * implementation ran `getBoundingClientRect()` **and** `getComputedStyle()` on
 * every node of every shadow root on each trap activation, which is two forced
 * style/layout reads per node. The manual path is kept as a fallback for
 * engines without `checkVisibility`.
 */
const isVisible = (node: HTMLElement): boolean => {
  if (typeof node.checkVisibility === 'function') {
    return node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true } as CheckVisibilityOptions);
  }

  const rect = node.getBoundingClientRect();
  const computed = getComputedStyle(node);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    computed.display !== 'none' &&
    computed.visibility !== 'hidden' &&
    computed.opacity !== '0'
  );
};

export default function getFocusableElements(root: HTMLElement | HTMLSlotElement | Node): Array<HTMLElement> {
  const focusableElements: Array<HTMLElement> = [];

  function traverse(node: Node): void {
    // An `inert` subtree cannot receive focus at all — skip it wholesale
    // instead of walking it and then handing back elements the browser will
    // refuse to focus.
    if (node instanceof HTMLElement && node.hasAttribute('inert')) {
      return;
    }

    if (node instanceof HTMLElement && isFocusable(node) && isVisible(node)) {
      focusableElements.push(node);
    }

    if (node instanceof HTMLSlotElement) {
      const assignedElements = node.assignedElements();
      assignedElements.forEach((assignedElement) => traverse(assignedElement));
    } else if (node instanceof HTMLElement && node.shadowRoot) {
      const rootChildren = node.shadowRoot.querySelectorAll('*');
      rootChildren.forEach((childNode: Node) => traverse(childNode));
    } else if (node instanceof HTMLElement && node.children) {
      [...node.children].forEach((child) => traverse(child));
    }
  }

  traverse(root);

  return focusableElements;
}
